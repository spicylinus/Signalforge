"use server";

import { loadCredits } from "@/lib/credits";
import { db } from "@/lib/db";
import { sfCreditAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function addCredits(customerId: number, formData: FormData) {
  const amountDollars = parseFloat(formData.get("amount_dollars") as string);
  const paymentReference = (formData.get("payment_reference") as string).trim();
  const loadedBy = (formData.get("loaded_by") as string).trim();

  if (!amountDollars || amountDollars <= 0) throw new Error("Amount must be positive");
  if (!paymentReference) throw new Error("Payment reference required");
  if (!loadedBy) throw new Error("Loaded by required");

  const amountCents = Math.round(amountDollars * 100);
  await loadCredits(customerId, amountCents, paymentReference, loadedBy);
  revalidatePath(`/dashboard/clients/${customerId}/credits`);
}

export async function updateLowBalanceThreshold(
  customerId: number,
  formData: FormData
) {
  const thresholdDollars = parseFloat(
    formData.get("threshold_dollars") as string
  );
  if (isNaN(thresholdDollars) || thresholdDollars < 0)
    throw new Error("Invalid threshold");

  const thresholdCents = Math.round(thresholdDollars * 100);
  await db
    .update(sfCreditAccounts)
    .set({ lowBalanceThresholdCents: thresholdCents, updatedAt: new Date() })
    .where(eq(sfCreditAccounts.customerId, customerId));

  revalidatePath(`/dashboard/clients/${customerId}/credits`);
}
