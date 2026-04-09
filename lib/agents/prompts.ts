import type { Brand } from "@/lib/agents/types";

export function buildBlogPrompt(brand: Brand, topic?: string): string {
  const selectedTopic =
    topic ?? brand.topics[Math.floor(Math.random() * brand.topics.length)];
  return `You are a professional content writer for ${brand.name}, a ${brand.industry} company.

Brand voice: ${brand.tone.join(", ")}
Target audience: ${brand.targetAudience}
${brand.sampleContent ? `\nHere is a sample of their existing content for reference:\n${brand.sampleContent}\n` : ""}

Write a complete, SEO-friendly blog post about: "${selectedTopic}"

Requirements:
- 800–1200 words
- Engaging headline (H1)
- 3–4 subheadings (H2)
- Conversational yet authoritative tone matching the brand voice
- One clear call to action at the end
- No generic filler — every paragraph must add real value

Return ONLY the blog post content in Markdown format starting with the H1 headline. No preamble.`;
}

export function buildSocialPrompt(brand: Brand, platform: "linkedin" | "twitter" | "instagram"): string {
  const topic = brand.topics[Math.floor(Math.random() * brand.topics.length)];
  const limits: Record<string, string> = {
    linkedin: "150–300 words, professional tone, 3–5 relevant hashtags",
    twitter: "under 280 characters, punchy, 1–2 hashtags",
    instagram: "100–150 words, visual and engaging, 5–10 hashtags",
  };
  return `You are a social media manager for ${brand.name}, a ${brand.industry} company.

Brand voice: ${brand.tone.join(", ")}
Target audience: ${brand.targetAudience}
Platform: ${platform.charAt(0).toUpperCase() + platform.slice(1)}
Topic: ${topic}

Write a single ${platform} post. Constraints: ${limits[platform]}.

Return ONLY the post text. No preamble, no explanation.`;
}

export function buildNewsletterPrompt(brand: Brand): string {
  return `You are an email copywriter for ${brand.name}, a ${brand.industry} company.

Brand voice: ${brand.tone.join(", ")}
Target audience: ${brand.targetAudience}
Topics to cover this month: ${brand.topics.slice(0, 3).join(", ")}
${brand.sampleContent ? `\nSample content for tone reference:\n${brand.sampleContent}\n` : ""}

Write a monthly email newsletter.

Requirements:
- Subject line (compelling, under 60 chars)
- Preview text (under 90 chars)
- Greeting
- 3 short sections covering the topics above (100–150 words each)
- One featured tip or resource
- Sign-off from the brand

Return as Markdown with clear section labels (Subject:, Preview:, Body:).`;
}
