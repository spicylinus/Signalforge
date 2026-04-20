const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

export function validateWpSiteUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("URL must use http or https");
  }
  const hostname = url.hostname;
  if (PRIVATE_IP_PATTERNS.some((p) => p.test(hostname))) {
    throw new Error("Private or loopback addresses are not allowed");
  }
  // Return normalised URL without trailing slash
  return url.origin;
}

export function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const htmlLines: string[] = [];
  let paragraphBuffer: string[] = [];

  function flushParagraph() {
    if (paragraphBuffer.length > 0) {
      const content = paragraphBuffer.join(" ").trim();
      if (content) htmlLines.push(`<p>${content}</p>`);
      paragraphBuffer = [];
    }
  }

  for (const raw of lines) {
    const line = raw
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");

    if (/^### (.+)$/.test(line)) {
      flushParagraph();
      htmlLines.push(`<h3>${line.replace(/^### /, "")}</h3>`);
    } else if (/^## (.+)$/.test(line)) {
      flushParagraph();
      htmlLines.push(`<h2>${line.replace(/^## /, "")}</h2>`);
    } else if (/^# (.+)$/.test(line)) {
      flushParagraph();
      htmlLines.push(`<h1>${line.replace(/^# /, "")}</h1>`);
    } else if (line.trim() === "") {
      flushParagraph();
    } else {
      paragraphBuffer.push(line);
    }
  }
  flushParagraph();

  return htmlLines.join("\n");
}

export type WpSettings = {
  wpSiteUrl: string;
  wpUsername: string;
  wpAppPassword: string;
  wpPublishStatus: "draft" | "publish";
};

export type WpPostResult = {
  id: number;
  link: string;
};

export async function publishToWordPress(
  settings: WpSettings,
  post: { title: string; body: string }
): Promise<WpPostResult> {
  const { wpSiteUrl, wpUsername, wpAppPassword, wpPublishStatus } = settings;
  const token = Buffer.from(`${wpUsername}:${wpAppPassword}`).toString("base64");
  const endpoint = `${wpSiteUrl}/wp-json/wp/v2/posts`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${token}`,
    },
    body: JSON.stringify({
      title: post.title,
      content: markdownToHtml(post.body),
      status: wpPublishStatus,
    }),
  });

  if (!res.ok) {
    // Never include credentials in error messages
    throw new Error(`WordPress API returned ${res.status}`);
  }

  const data = (await res.json()) as { id: number; link: string };
  return { id: data.id, link: data.link };
}
