import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { brands, customers } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";

const BRAND_LIMITS = { solo: 1, business: 1, agency: 3 } as const;

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
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Check brand limit (allow creation before subscription for onboarding flow)
  const plan = customer.plan ?? "solo";
  const limit = BRAND_LIMITS[plan as keyof typeof BRAND_LIMITS] ?? 1;

  const [{ value: brandCount }] = await db
    .select({ value: count() })
    .from(brands)
    .where(eq(brands.customerId, customer.id));

  if (brandCount >= limit) {
    return NextResponse.json(
      { error: `Your plan allows up to ${limit} brand(s)` },
      { status: 403 }
    );
  }

  const body = await req.json() as {
    brandName: string;
    industry: string;
    tone: string[];
    topics: string[];
    targetAudience: string;
    sampleContent?: string;
    websiteUrl?: string;
  };

  const [brand] = await db
    .insert(brands)
    .values({
      customerId: customer.id,
      name: body.brandName,
      industry: body.industry,
      tone: body.tone,
      topics: body.topics,
      targetAudience: body.targetAudience,
      sampleContent: body.sampleContent ?? null,
      websiteUrl: body.websiteUrl ?? null,
    })
    .returning();

  return NextResponse.json(brand, { status: 201 });
}

export async function GET(req: NextRequest) {
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
    return NextResponse.json([], { status: 200 });
  }

  const result = await db
    .select()
    .from(brands)
    .where(eq(brands.customerId, customer.id));

  return NextResponse.json(result);
}
