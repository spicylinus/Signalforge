import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sfCreditAccounts, sfCreditPurchases } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { loadCredits } from "@/lib/credits";
import { z } from "zod";

const addCreditsSchema = z.object({
  amount_cents: z.number().int().positive().min(100),
  payment_reference: z.string().min(1),
  loaded_by: z.string().min(1),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const customerId = parseInt(id, 10);
  if (isNaN(customerId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const account = await db.query.sfCreditAccounts.findFirst({
    where: eq(sfCreditAccounts.customerId, customerId),
  });

  if (!account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const purchases = await db.query.sfCreditPurchases.findMany({
    where: eq(sfCreditPurchases.customerId, customerId),
    orderBy: [desc(sfCreditPurchases.loadedAt)],
    limit: 50,
  });

  return NextResponse.json({
    balanceCents: account.balanceCents,
    totalLoadedCents: account.totalLoadedCents,
    totalSpentCents: account.totalSpentCents,
    lowBalanceThresholdCents: account.lowBalanceThresholdCents,
    purchases: purchases.map((p) => ({
      id: p.id,
      amountCents: p.amountCents,
      bonusCents: p.bonusCents,
      paymentReference: p.paymentReference,
      loadedBy: p.loadedBy,
      loadedAt: p.loadedAt,
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const customerId = parseInt(id, 10);
  if (isNaN(customerId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = addCreditsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { amount_cents, payment_reference, loaded_by } = parsed.data;

  const result = await loadCredits(
    customerId,
    amount_cents,
    payment_reference,
    loaded_by
  );

  return NextResponse.json(result, { status: 201 });
}
