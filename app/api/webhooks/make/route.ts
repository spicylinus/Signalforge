import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sfSignalQueue } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const bodySchema = z.object({
  customer_id: z.number().int().positive(),
  campaign_id: z.number().int().positive().optional(),
  payload: z.record(z.unknown()),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`webhook:${ip}`, RATE_LIMITS.webhook)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const secret = req.headers.get("x-make-secret");
  if (secret !== env.MAKE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { customer_id, campaign_id, payload } = parsed.data;

  await db.insert(sfSignalQueue).values({
    customerId: customer_id,
    campaignId: campaign_id ?? null,
    rawPayload: JSON.stringify(payload),
    source: "make_webhook",
  });

  return NextResponse.json({ queued: true }, { status: 202 });
}
