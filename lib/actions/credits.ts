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

export async function updateTopUpSettings(
  customerId: number,
  formData: FormData
) {
  const mode = formData.get("top_up_mode") as string;
  if (mode !== "manual" && mode !== "auto") throw new Error("Invalid mode");

  if (mode === "auto") {
    const triggerDollars = parseFloat(
      formData.get("auto_top_up_trigger_dollars") as string
    );
    const amountDollars = parseFloat(
      formData.get("auto_top_up_amount_dollars") as string
    );
    if (isNaN(triggerDollars) || triggerDollars <= 0)
      throw new Error("Invalid trigger amount");
    if (isNaN(amountDollars) || amountDollars <= 0)
      throw new Error("Invalid charge amount");

    await db
      .update(sfCreditAccounts)
      .set({
        topUpMode: "auto",
        autoTopUpTriggerCents: Math.round(triggerDollars * 100),
        autoTopUpAmountCents: Math.round(amountDollars * 100),
        updatedAt: new Date(),
      })
      .where(eq(sfCreditAccounts.customerId, customerId));
  } else {
    const thresholdDollars = parseFloat(
      formData.get("threshold_dollars") as string
    );
    if (isNaN(thresholdDollars) || thresholdDollars < 0)
      throw new Error("Invalid threshold");

    await db
      .update(sfCreditAccounts)
      .set({
        topUpMode: "manual",
        lowBalanceThresholdCents: Math.round(thresholdDollars * 100),
        updatedAt: new Date(),
      })
      .where(eq(sfCreditAccounts.customerId, customerId));
  }

  revalidatePath(`/dashboard/clients/${customerId}/credits`);
}
