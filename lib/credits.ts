import { db } from "@/lib/db";
import { sfCreditAccounts, sfCreditPurchases } from "@/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

export const LEAD_MARKUP = 3;

export function computeCharge(costCents: number): number {
  return costCents * LEAD_MARKUP;
}

export function computeBonus(amountCents: number): number {
  if (amountCents >= 500_00) return Math.floor(amountCents * 0.15);
  if (amountCents >= 100_00) return Math.floor(amountCents * 0.10);
  if (amountCents >= 50_00) return Math.floor(amountCents * 0.05);
  return 0;
}

export async function debitCredits(
  customerId: number,
  costCents: number
): Promise<{ success: boolean; newBalanceCents: number }> {
  const chargeCents = computeCharge(costCents);

  const result = await db
    .update(sfCreditAccounts)
    .set({
      balanceCents: sql`${sfCreditAccounts.balanceCents} - ${chargeCents}`,
      totalSpentCents: sql`${sfCreditAccounts.totalSpentCents} + ${chargeCents}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(sfCreditAccounts.customerId, customerId),
        gte(sfCreditAccounts.balanceCents, chargeCents)
      )
    )
    .returning({ newBalance: sfCreditAccounts.balanceCents });

  if (result.length === 0) {
    const account = await db.query.sfCreditAccounts.findFirst({
      where: eq(sfCreditAccounts.customerId, customerId),
    });
    return { success: false, newBalanceCents: account?.balanceCents ?? 0 };
  }

  return { success: true, newBalanceCents: result[0].newBalance };
}

export async function checkLowBalance(customerId: number): Promise<boolean> {
  const account = await db.query.sfCreditAccounts.findFirst({
    where: eq(sfCreditAccounts.customerId, customerId),
  });
  if (!account) return false;

  const isLow = account.balanceCents < account.lowBalanceThresholdCents;
  if (!isLow) return false;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentAlert =
    account.lastAlertSentAt && account.lastAlertSentAt > sevenDaysAgo;

  return !recentAlert;
}

export async function loadCredits(
  customerId: number,
  amountCents: number,
  paymentReference: string,
  loadedBy: string,
  processor = "manual"
): Promise<{ balanceCents: number; bonusCents: number }> {
  const bonusCents = computeBonus(amountCents);
  const totalCents = amountCents + bonusCents;

  await db.insert(sfCreditPurchases).values({
    customerId,
    amountCents,
    bonusCents,
    paymentReference,
    loadedBy,
    processor,
  });

  const updated = await db
    .update(sfCreditAccounts)
    .set({
      balanceCents: sql`${sfCreditAccounts.balanceCents} + ${totalCents}`,
      totalLoadedCents: sql`${sfCreditAccounts.totalLoadedCents} + ${totalCents}`,
      updatedAt: new Date(),
    })
    .where(eq(sfCreditAccounts.customerId, customerId))
    .returning({ balanceCents: sfCreditAccounts.balanceCents });

  return { balanceCents: updated[0].balanceCents, bonusCents };
}
