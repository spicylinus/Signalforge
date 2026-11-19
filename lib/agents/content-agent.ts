import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import {
  sfBrands,
  sfBrandTopics,
  sfGscConnections,
  sfGscQueries,
  sfContentJobs,
} from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { refreshAccessToken, gapScore } from "@/lib/gsc";

const anthropic = new Anthropic();

const FUNNEL_SYSTEM_PROMPTS: Record<string, string> = {
  awareness: `You are writing an educational, SEO-optimized blog post for someone at the top of the funnel discovering this topic for the first time. Focus on answering "what" and "why" questions. Be informative, accessible, and authoritative.`,
  consideration: `You are writing an in-depth guide or comparison article for someone actively evaluating options. Focus on "how" and "which is best" questions. Include comparisons, pros/cons, and practical advice that helps the reader make an informed decision.`,
  decision: `You are writing persuasive, conversion-focused content for someone ready to take action. Focus on specific benefits, clear calls to action, and addressing final objections. Drive the reader toward a decision.`,
};

async function generateContent(
  query: string,
  funnelStage: "awareness" | "consideration" | "decision",
  brandName: string,
  source: "gsc" | "manual"
): Promise<string> {
  const isDecision = funnelStage === "decision";
  const contentType = isDecision ? "landing page" : "blog post";
  const sourceNote =
    source === "gsc"
      ? "This is a real search query from Google Search Console — people are already searching for it."
      : "This is a manually specified topic.";

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: FUNNEL_SYSTEM_PROMPTS[funnelStage],
    messages: [
      {
        role: "user",
        content: `Brand: ${brandName}
Target keyword/topic: "${query}"
Funnel stage: ${funnelStage}
Note: ${sourceNote}

Write a complete, SEO-optimized ${contentType} targeting this keyword. Include:
- A compelling H1 title that naturally contains the keyword
- An engaging introduction (2-3 sentences)
- 3-5 well-structured sections with H2 headers
- A conclusion with a clear next step

Format as clean Markdown.`,
      },
    ],
  });

  return message.content[0].type === "text" ? message.content[0].text : "";
}

async function getValidAccessToken(conn: {
  id: number;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
}): Promise<string> {
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  if (conn.tokenExpiresAt > fiveMinutesFromNow) return conn.accessToken;

  const refreshed = await refreshAccessToken(conn.refreshToken);
  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000);
  await db
    .update(sfGscConnections)
    .set({ accessToken: refreshed.access_token, tokenExpiresAt: newExpiry, updatedAt: new Date() })
    .where(eq(sfGscConnections.id, conn.id));

  return refreshed.access_token;
}

/**
 * Picks the best next target for a customer and enqueues one content job.
 * Source priority: GSC keyword gap → manual topics → nothing.
 * Returns the job id, or null if nothing to queue.
 */
export async function enqueueNextContentJob(
  customerId: number
): Promise<number | null> {
  const brand = await db.query.sfBrands.findFirst({
    where: eq(sfBrands.customerId, customerId),
  });
  if (!brand) return null;

  const connection = await db.query.sfGscConnections.findFirst({
    where: eq(sfGscConnections.customerId, customerId),
  });

  let targetQuery: string | null = null;
  let source: "gsc" | "manual" = "manual";

  if (connection) {
    // Sort by gap score (high impressions, low CTR) server-side by impressions desc, ctr asc
    const queries = await db.query.sfGscQueries.findMany({
      where: eq(sfGscQueries.connectionId, connection.id),
      orderBy: [desc(sfGscQueries.impressions), asc(sfGscQueries.ctr)],
      limit: 20,
    });

    // Skip queries already in the job queue
    const existingQueries = await db.query.sfContentJobs.findMany({
      where: eq(sfContentJobs.brandId, brand.id),
      columns: { targetQuery: true },
    });
    const usedSet = new Set(existingQueries.map((j) => j.targetQuery));

    const best = queries
      .sort((a, b) => gapScore(b) - gapScore(a))
      .find((q) => !usedSet.has(q.query));

    if (best) {
      targetQuery = best.query;
      source = "gsc";
    }
  }

  if (!targetQuery) {
    const existingQueries = await db.query.sfContentJobs.findMany({
      where: eq(sfContentJobs.brandId, brand.id),
      columns: { targetQuery: true },
    });
    const usedSet = new Set(existingQueries.map((j) => j.targetQuery));

    const topics = await db.query.sfBrandTopics.findMany({
      where: eq(sfBrandTopics.brandId, brand.id),
      orderBy: [asc(sfBrandTopics.createdAt)],
    });
    const unused = topics.find((t) => !usedSet.has(t.topic));
    if (unused) {
      targetQuery = unused.topic;
      source = "manual";
    }
  }

  if (!targetQuery) return null;

  const [job] = await db
    .insert(sfContentJobs)
    .values({
      customerId,
      brandId: brand.id,
      targetQuery,
      funnelStage: brand.funnelStage,
      source,
    })
    .returning({ id: sfContentJobs.id });

  return job.id;
}

/** Processes all pending content jobs (max 10 per run). */
export async function runContentAgent(): Promise<{ processed: number; errors: number }> {
  const pending = await db.query.sfContentJobs.findMany({
    where: eq(sfContentJobs.status, "pending"),
    limit: 10,
    orderBy: [asc(sfContentJobs.createdAt)],
  });

  let processed = 0;
  let errors = 0;

  for (const job of pending) {
    try {
      await db
        .update(sfContentJobs)
        .set({ status: "running" })
        .where(eq(sfContentJobs.id, job.id));

      const brand = await db.query.sfBrands.findFirst({
        where: eq(sfBrands.id, job.brandId),
      });
      if (!brand) throw new Error("Brand not found");

      const content = await generateContent(
        job.targetQuery,
        job.funnelStage as "awareness" | "consideration" | "decision",
        brand.name,
        job.source as "gsc" | "manual"
      );

      await db
        .update(sfContentJobs)
        .set({ status: "completed", generatedContent: content, completedAt: new Date() })
        .where(eq(sfContentJobs.id, job.id));

      processed++;
    } catch (err) {
      await db
        .update(sfContentJobs)
        .set({
          status: "failed",
          errorMessage: err instanceof Error ? err.message : "Unknown error",
        })
        .where(eq(sfContentJobs.id, job.id));
      errors++;
    }
  }

  return { processed, errors };
}
