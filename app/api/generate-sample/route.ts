import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { sampleRequests } from "@/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { buildBlogPrompt } from "@/lib/agents/prompts";
import type { Brand } from "@/lib/agents/types";
import { hashIp, getClientIp } from "@/lib/integrations/sample";
import { getRemainingFoundingSpots } from "@/lib/founding";

const RATE_LIMIT = 3; // per IP per 24h
const anthropic = new Anthropic();

function cap(value: unknown, max = 200): string {
  if (typeof value !== "string") throw new Error("Expected string");
  return value.trim().slice(0, max);
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

function extractTitle(md: string): string | null {
  const match = md.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const ipHash = hashIp(ip);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sampleRequests)
    .where(and(eq(sampleRequests.ipHash, ipHash), gte(sampleRequests.createdAt, since)));

  if ((count ?? 0) >= RATE_LIMIT) {
    return NextResponse.json(
      { error: "You've already generated your free samples. Sign up to get more!" },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  let businessName: string, industry: string, topic: string, targetAudience: string;
  try {
    businessName = cap(raw.businessName);
    industry = cap(raw.industry);
    topic = cap(raw.topic);
    targetAudience = cap(raw.targetAudience);
  } catch {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (!businessName || !industry || !topic || !targetAudience) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const brand: Brand = {
    id: "sample",
    name: businessName,
    industry,
    tone: ["Professional", "Helpful", "Clear"],
    topics: [topic],
    targetAudience,
    sampleContent: null,
    websiteUrl: null,
  };

  const prompt = buildBlogPrompt(brand, topic, []);
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  if (block.type !== "text") {
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }

  const resultBody = block.text;
  const resultTitle = extractTitle(resultBody);

  const [inserted] = await db
    .insert(sampleRequests)
    .values({ ipHash, businessName, industry, topic, targetAudience, resultTitle, resultBody })
    .returning({ id: sampleRequests.id });

  const foundingSpotsRemaining = await getRemainingFoundingSpots();

  return NextResponse.json({
    sampleId: inserted.id,
    title: resultTitle,
    body: resultBody,
    wordCount: countWords(resultBody),
    foundingSpotsRemaining,
  });
}
