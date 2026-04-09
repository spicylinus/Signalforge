import { NextRequest, NextResponse } from "next/server";
import { processPendingJobs } from "@/lib/agents/content-agent";
import { db } from "@/lib/db";
import { contentJobs } from "@/lib/db/schema";
import { eq, and, lte } from "drizzle-orm";

export async function POST(req: NextRequest) {
  // Verify internal secret (used by Paperclip AI agent)
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CONTENTFORGE_INTERNAL_SECRET}`;
  if (!process.env.CONTENTFORGE_INTERNAL_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [totalPendingRows] = await db
    .select()
    .from(contentJobs)
    .where(
      and(
        eq(contentJobs.status, "pending"),
        lte(contentJobs.scheduledAt, new Date())
      )
    );

  const totalPending = totalPendingRows ? 1 : 0; // approximate; processPendingJobs re-queries

  const { processed, failed } = await processPendingJobs();

  return NextResponse.json({ processed, failed, totalPending });
}
