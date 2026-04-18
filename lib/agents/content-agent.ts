import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { brands, contentJobs, generatedContent } from "@/lib/db/schema";
import { eq, and, lte, desc } from "drizzle-orm";
import { buildBlogPrompt, buildNewsletterPrompt, buildSocialPrompt } from "./prompts";
import type { Brand, GeneratedResult, JobType } from "./types";

const anthropic = new Anthropic();

const PLATFORMS: ("linkedin" | "twitter" | "instagram")[] = [
  "linkedin",
  "twitter",
  "instagram",
  "linkedin",
  "twitter",
];

async function callClaude(prompt: string, maxTokens = 4096): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type from Claude");
  return block.text;
}

function extractTitle(markdown: string): string | null {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

async function countBrandJobs(brandId: string, type: JobType): Promise<number> {
  const rows = await db
    .select({ id: contentJobs.id })
    .from(contentJobs)
    .where(and(eq(contentJobs.brandId, brandId), eq(contentJobs.type, type)));
  return rows.length;
}

async function getRecentBlogTitles(brandId: string): Promise<string[]> {
  const rows = await db
    .select({ title: generatedContent.title })
    .from(generatedContent)
    .innerJoin(contentJobs, eq(generatedContent.jobId, contentJobs.id))
    .where(and(eq(contentJobs.brandId, brandId), eq(contentJobs.type, "blog")))
    .orderBy(desc(generatedContent.createdAt))
    .limit(4);
  return rows.map((r) => r.title).filter((t): t is string => t !== null);
}

export async function generateForJob(jobId: string): Promise<GeneratedResult> {
  await db
    .update(contentJobs)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(contentJobs.id, jobId));

  try {
    const [job] = await db
      .select()
      .from(contentJobs)
      .where(eq(contentJobs.id, jobId))
      .limit(1);

    if (!job) throw new Error(`Job ${jobId} not found`);

    const [brand] = await db
      .select()
      .from(brands)
      .where(eq(brands.id, job.brandId))
      .limit(1);

    if (!brand) throw new Error(`Brand not found for job ${jobId}`);

    const brandData: Brand = {
      id: brand.id,
      name: brand.name,
      industry: brand.industry,
      tone: brand.tone,
      topics: brand.topics,
      targetAudience: brand.targetAudience,
      sampleContent: brand.sampleContent,
      websiteUrl: brand.websiteUrl,
    };

    let result: GeneratedResult;

    switch (job.type as JobType) {
      case "blog": {
        const jobIndex = await countBrandJobs(brand.id, "blog");
        // Deterministic rotation through topics — no random repeats within a cycle
        const topic = brandData.topics[jobIndex % brandData.topics.length];
        const recentTitles = await getRecentBlogTitles(brand.id);
        const content = await callClaude(buildBlogPrompt(brandData, topic, recentTitles));
        result = {
          title: extractTitle(content),
          body: content,
          platform: null,
          wordCount: countWords(content),
        };
        break;
      }
      case "social": {
        const jobIndex = await countBrandJobs(brand.id, "social");
        const platform = PLATFORMS[jobIndex % PLATFORMS.length];
        const topic = brandData.topics[jobIndex % brandData.topics.length];
        let content = await callClaude(buildSocialPrompt(brandData, platform, topic), 512);
        // Twitter hard limit — re-prompt once if over
        if (platform === "twitter" && content.replace(/\s+/g, " ").trim().length > 280) {
          content = await callClaude(
            `Shorten this tweet to strictly under 280 characters. Keep the core message and hashtags.\n\n${content}`,
            256
          );
        }
        result = {
          title: null,
          body: content.trim(),
          platform,
          wordCount: countWords(content),
        };
        break;
      }
      case "newsletter": {
        const jobIndex = await countBrandJobs(brand.id, "newsletter");
        // Rotate the 3-topic window through the full topic list each month
        const t = brandData.topics;
        const start = (jobIndex * 3) % t.length;
        const topics = [...t, ...t].slice(start, start + 3);
        const content = await callClaude(buildNewsletterPrompt(brandData, topics));
        result = {
          title:
            extractTitle(content) ??
            `${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })} Newsletter`,
          body: content,
          platform: "email",
          wordCount: countWords(content),
        };
        break;
      }
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    await db.insert(generatedContent).values({
      jobId,
      title: result.title,
      body: result.body,
      platform: result.platform,
      wordCount: result.wordCount,
    });

    await db
      .update(contentJobs)
      .set({ status: "done", completedAt: new Date() })
      .where(eq(contentJobs.id, jobId));

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(contentJobs)
      .set({ status: "failed", error: message })
      .where(eq(contentJobs.id, jobId));
    throw err;
  }
}

export async function processPendingJobs(): Promise<{ processed: number; failed: number }> {
  const pending = await db
    .select()
    .from(contentJobs)
    .where(and(eq(contentJobs.status, "pending"), lte(contentJobs.scheduledAt, new Date())));

  let processed = 0;
  let failed = 0;

  for (const job of pending) {
    try {
      await generateForJob(job.id);
      processed++;
    } catch {
      failed++;
    }
  }

  return { processed, failed };
}
