import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  brands,
  contentEvents,
  contentJobs,
  customers,
  generatedContent,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const VALID_EVENT_TYPES = ["copy", "download", "regenerate"] as const;
type EventType = (typeof VALID_EVENT_TYPES)[number];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.email, session.user.email))
    .limit(1);

  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { contentId?: string; eventType?: string };

  if (!body.contentId || !body.eventType) {
    return NextResponse.json(
      { error: "contentId and eventType required" },
      { status: 400 }
    );
  }

  if (!VALID_EVENT_TYPES.includes(body.eventType as EventType)) {
    return NextResponse.json({ error: "Invalid eventType" }, { status: 400 });
  }

  // Verify content belongs to this customer
  const [row] = await db
    .select({ customerId: brands.customerId })
    .from(generatedContent)
    .innerJoin(contentJobs, eq(generatedContent.jobId, contentJobs.id))
    .innerJoin(brands, eq(contentJobs.brandId, brands.id))
    .where(eq(generatedContent.id, body.contentId))
    .limit(1);

  if (!row || row.customerId !== customer.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.insert(contentEvents).values({
    contentId: body.contentId,
    customerId: customer.id,
    eventType: body.eventType as EventType,
  });

  return NextResponse.json({ ok: true });
}
