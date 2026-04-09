import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import {
  brands,
  contentJobs,
  generatedContent,
} from "@/lib/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { buildBlogPrompt, buildNewsletterPrompt, buildSocialPrompt } from "./prompts";
import type { Brand, GeneratedResult, JobType } from "./types";

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const PLATFORM_ROTATION: ("linkedin" | "twitter" | "instagram")[] = [
  "linkedin",
  "twitter",
  "instagram",
  "linkedin",
  "twitter",
];

async function callClaude(prompt: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
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

export async function generateForJob(
  jobId: string
): Promise<GeneratedResult> {
  // Mark job as running
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
    };

    let result: GeneratedResult;

    switch (job.type as JobType) {
      case "blog": {
        const content = await callClaude(buildBlogPrompt(brandData));
        result = {
          title: extractTitle(content),
          body: content,
          platform: null,
          wordCount: countWords(content),
        };
        break;
      }
      case "social": {
        // Rotate through platforms based on job creation order
        const jobCount = await db
          .select()
          .from(contentJobs)
          .where(and(eq(contentJobs.brandId, brand.id), eq(contentJobs.type, "social")));
        const platform = PLATFORM_ROTATION[jobCount.length % PLATFORM_ROTATION.length];
        const content = await callClaude(buildSocialPrompt(brandData, platform));
        result = {
          title: null,
          body: content,
          platform,
          wordCount: countWords(content),
        };
        break;
      }
      case "newsletter": {
        const content = await callClaude(buildNewsletterPrompt(brandData));
        result = {
          title: extractTitle(content) ?? "Monthly Newsletter",
          body: content,
          platform: "email",
          wordCount: countWords(content),
        };
        break;
      }
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    // Save output and mark done
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

/**
 * Process all pending jobs that are due now or overdue.
 * Called by Paperclip AI heartbeat or the scheduled API route.
 */
export async function processPendingJobs(): Promise<{
  processed: number;
  failed: number;
}> {
  const pending = await db
    .select()
    .from(contentJobs)
    .where(
      and(
        eq(contentJobs.status, "pending"),
        lte(contentJobs.scheduledAt, new Date())
      )
    );

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
