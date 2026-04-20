import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export const FOUNDING_MEMBER_LIMIT = 50;

export const FOUNDING_PRICE_IDS = {
  solo: process.env.FANBASIS_FOUNDING_PRICE_SOLO!,
  business: process.env.FANBASIS_FOUNDING_PRICE_BUSINESS!,
  agency: process.env.FANBASIS_FOUNDING_PRICE_AGENCY!,
} as const;

// Monthly cents for each founding rate
export const FOUNDING_RATES = {
  solo: 4900,     // $49/mo
  business: 9900, // $99/mo
  agency: 17400,  // $174/mo
} as const;

export async function getFoundingMemberCount(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customers)
    .where(eq(customers.foundingMember, true));
  return row?.count ?? 0;
}

export async function getRemainingFoundingSpots(): Promise<number> {
  const count = await getFoundingMemberCount();
  return Math.max(0, FOUNDING_MEMBER_LIMIT - count);
}

export async function isFoundingAvailable(): Promise<boolean> {
  const remaining = await getRemainingFoundingSpots();
  return remaining > 0;
}
