"use server";

import { db } from "@/lib/db";
import { sfCustomers, sfCreditAccounts, sfSettings } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const PLATFORM_FEES: Record<string, number> = {
  floor: 99500,
  guided: 199500,
  enterprise: 399500,
};

export async function createClient(formData: FormData) {
  const name = (formData.get("name") as string).trim();
  const email = (formData.get("email") as string).trim().toLowerCase();
  const companyName = (formData.get("company_name") as string | null)?.trim() || null;
  const plan = formData.get("plan") as "floor" | "guided" | "enterprise";
  const billingCycle = formData.get("billing_cycle") as "monthly" | "annual";
  const isFounder = formData.get("is_founder") === "on";
  const icpDescription = (formData.get("icp_description") as string | null)?.trim() || null;
  const setupFeePaidCents = parseInt(
    (formData.get("setup_fee_paid_cents") as string) || "0",
    10
  );

  if (!name || !email || !plan) throw new Error("name, email, and plan are required");

  let founderSpotNumber: number | null = null;
  if (isFounder) {
    const setting = await db.query.sfSettings.findFirst({
      where: eq(sfSettings.key, "founder_spots_taken"),
    });
    const taken = parseInt(setting?.value ?? "0", 10);
    if (taken >= 60) throw new Error("All 60 Founder spots are taken");
    founderSpotNumber = taken + 1;
    if (setting) {
      await db
        .update(sfSettings)
        .set({ value: String(founderSpotNumber), updatedAt: new Date() })
        .where(eq(sfSettings.key, "founder_spots_taken"));
    } else {
      await db.insert(sfSettings).values({
        key: "founder_spots_taken",
        value: String(founderSpotNumber),
      });
    }
  }

  const platformFeeCents = PLATFORM_FEES[plan] ?? PLATFORM_FEES.floor;

  const [customer] = await db
    .insert(sfCustomers)
    .values({
      name,
      email,
      companyName,
      plan,
      billingCycle,
      monthlyPlatformFeeCents: platformFeeCents,
      isFounder,
      founderSpotNumber,
      lockedPlatformFeeCents: isFounder ? platformFeeCents : null,
      setupFeePaidCents: setupFeePaidCents || null,
      setupFeePaidAt: setupFeePaidCents ? new Date() : null,
      icpDescription,
    })
    .returning({ id: sfCustomers.id });

  // Create credit account
  await db.insert(sfCreditAccounts).values({ customerId: customer.id });

  revalidatePath("/dashboard");
  redirect(`/dashboard/clients/${customer.id}`);
}
