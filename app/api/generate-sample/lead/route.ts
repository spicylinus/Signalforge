import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sampleRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getRemainingFoundingSpots } from "@/lib/founding";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { sampleId, email } = body as { sampleId?: string; email?: string };

  if (!sampleId || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "sampleId and valid email required" }, { status: 400 });
  }

  await db
    .update(sampleRequests)
    .set({ leadEmail: email.trim().toLowerCase().slice(0, 254) })
    .where(eq(sampleRequests.id, sampleId));

  const foundingSpotsRemaining = await getRemainingFoundingSpots();

  return NextResponse.json({ ok: true, foundingSpotsRemaining });
}
