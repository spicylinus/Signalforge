import type { Brand } from "@/lib/agents/types";

function currentMonthYear(): string {
  return new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function buildBlogPrompt(brand: Brand, topic: string, recentTitles: string[]): string {
  const date = currentMonthYear();
  const avoidBlock =
    recentTitles.length > 0
      ? `\nRecent posts already published — do NOT repeat these angles:\n${recentTitles.map((t) => `- ${t}`).join("\n")}\n`
      : "";
  const websiteLine = brand.websiteUrl ? `\nWebsite: ${brand.websiteUrl}` : "";
  const sampleBlock = brand.sampleContent
    ? `\nSample of their existing content — match this voice closely:\n${brand.sampleContent}\n`
    : "";

  return `You are a professional content writer for ${brand.name}, a ${brand.industry} company.${websiteLine}

Brand voice: ${brand.tone.join(", ")}
Target audience: ${brand.targetAudience}
${sampleBlock}${avoidBlock}
Write a complete, SEO-optimised blog post about: "${topic}"
Current month: ${date}

Requirements:
- 900–1200 words
- Engaging H1 headline a real human would click on in Google search results
- 3–4 H2 subheadings that break the post into scannable sections
- Tone must match: ${brand.tone.join(", ")}
- One clear, specific call to action at the end
- No generic filler — every paragraph must deliver concrete value to ${brand.targetAudience}
- Where seasonally relevant, weave in ${date} context naturally

Return ONLY the blog post in Markdown starting with the H1 headline. No preamble.`;
}

export function buildSocialPrompt(
  brand: Brand,
  platform: "linkedin" | "twitter" | "instagram",
  topic: string
): string {
  const date = currentMonthYear();
  const limits: Record<string, string> = {
    linkedin:
      "150–300 words, professional tone, 3–5 relevant hashtags, close with a question to encourage comments",
    twitter:
      "STRICT MAXIMUM 270 characters total including hashtags and spaces — count carefully before returning",
    instagram: "100–150 words, visual and aspirational tone, 5–8 relevant hashtags",
  };
  const websiteLine = brand.websiteUrl ? ` (${brand.websiteUrl})` : "";

  return `You are a social media manager for ${brand.name}${websiteLine}, a ${brand.industry} company.

Brand voice: ${brand.tone.join(", ")}
Target audience: ${brand.targetAudience}
Platform: ${platform.charAt(0).toUpperCase() + platform.slice(1)}
Topic: ${topic}
Month: ${date}

Write a single ${platform} post. Constraints: ${limits[platform]}.

Return ONLY the post text. No label, no preamble, no explanation.`;
}

export function buildNewsletterPrompt(brand: Brand, topics: string[]): string {
  const date = currentMonthYear();
  const websiteLine = brand.websiteUrl ? `\nWebsite: ${brand.websiteUrl}` : "";
  const sampleBlock = brand.sampleContent
    ? `\nTone reference:\n${brand.sampleContent}\n`
    : "";

  return `You are an email copywriter for ${brand.name}, a ${brand.industry} company.${websiteLine}

Brand voice: ${brand.tone.join(", ")}
Target audience: ${brand.targetAudience}
Month: ${date}
Topics to cover: ${topics.join(", ")}
${sampleBlock}
Write the ${date} email newsletter.

Requirements:
- Subject line: compelling, specific to ${date}, under 60 characters
- Preview text: under 90 characters, tease the value inside
- Warm, human greeting
- 3 short sections (100–150 words each), one per topic above
- One featured tip, tool, or resource that will genuinely help ${brand.targetAudience}
- Friendly sign-off from the ${brand.name} team
- Write as a human expert, not a content machine

Return as Markdown with these exact labels on their own lines: Subject:, Preview:, Body:`;
}
