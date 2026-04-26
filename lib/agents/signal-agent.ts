import { db } from "@/lib/db";
import {
  sfSignalQueue,
  sfLeads,
  sfCustomers,
  sfCreditAccounts,
} from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { debitCredits, checkLowBalance } from "@/lib/credits";
import { paymentProcessor } from "@/lib/payments";

const WHOLESALE_COST_CENTS: Record<string, number> = {
  web_basic: 20,
  web_advanced: 30,
  b2c_search: 90,
  b2b_search: 190,
};

function parseLeadType(
  value: string
): "web_basic" | "web_advanced" | "b2c_search" | "b2b_search" {
  const valid = ["web_basic", "web_advanced", "b2c_search", "b2b_search"];
  return valid.includes(value) ? (value as ReturnType<typeof parseLeadType>) : "web_basic";
}

function extractLeadFields(raw: Record<string, unknown>) {
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  return {
    firstName: str(raw.first_name ?? raw.firstName),
    lastName: str(raw.last_name ?? raw.lastName),
    email: str(raw.email),
    phone: str(raw.phone),
    linkedinUrl: str(raw.linkedin_url ?? raw.linkedinUrl),
    mailingAddress: str(raw.mailing_address ?? raw.mailingAddress),
    website: str(raw.website),
    company: str(raw.company),
    title: str(raw.title),
    leadType: parseLeadType(str(raw.lead_type ?? raw.leadType) ?? "web_basic"),
    clickDate: raw.click_date
      ? new Date(str(raw.click_date ?? raw.clickDate) ?? "")
      : null,
  };
}

const AUTO_TOPUP_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes between auto top-ups

async function maybeAutoTopUp(customerId: number): Promise<void> {
  if (!paymentProcessor) return;

  const [account, customer] = await Promise.all([
    db.query.sfCreditAccounts.findFirst({
      where: eq(sfCreditAccounts.customerId, customerId),
    }),
    db.query.sfCustomers.findFirst({
      where: eq(sfCustomers.id, customerId),
      columns: { stripeCustomerId: true, stripePaymentMethodSaved: true },
    }),
  ]);

  if (
    !account ||
    account.topUpMode !== "auto" ||
    !account.autoTopUpTriggerCents ||
    !account.autoTopUpAmountCents
  ) return;

  if (account.balanceCents >= account.autoTopUpTriggerCents) return;

  if (!customer?.stripeCustomerId || !customer.stripePaymentMethodSaved) return;

  // Rate-limit: skip if a top-up fired within the cooldown window
  if (
    account.lastAutoTopUpAt &&
    Date.now() - account.lastAutoTopUpAt.getTime() < AUTO_TOPUP_COOLDOWN_MS
  ) return;

  // Mark the attempt immediately to prevent concurrent retriggers
  await db
    .update(sfCreditAccounts)
    .set({ lastAutoTopUpAt: new Date(), updatedAt: new Date() })
    .where(eq(sfCreditAccounts.customerId, customerId));

  try {
    await paymentProcessor.chargeAutoTopUp(
      customer.stripeCustomerId,
      account.autoTopUpAmountCents,
      customerId
    );
    console.log(
      `[SignalAgent] Auto top-up triggered for customer ${customerId}: ` +
      `$${(account.autoTopUpAmountCents / 100).toFixed(2)}`
    );
  } catch (err) {
    console.error(`[SignalAgent] Auto top-up failed for customer ${customerId}:`, err);
  }
}

export async function runSignalAgent(): Promise<{
  processed: number;
  errors: number;
  lowBalanceAlerts: number;
}> {
  const pending = await db.query.sfSignalQueue.findMany({
    where: isNull(sfSignalQueue.processedAt),
    limit: 200,
  });

  let processed = 0;
  let errors = 0;
  let lowBalanceAlerts = 0;

  for (const item of pending) {
    try {
      const raw = JSON.parse(item.rawPayload) as Record<string, unknown>;
      const fields = extractLeadFields(raw);
      const costCents = WHOLESALE_COST_CENTS[fields.leadType] ?? 20;
      const chargeCents = costCents * 3; // LEAD_MARKUP

      await db.insert(sfLeads).values({
        customerId: item.customerId,
        campaignId: item.campaignId ?? null,
        ...fields,
        costCents,
        chargeCents,
        source: item.source,
      });

      const { success } = await debitCredits(item.customerId, costCents);
      if (!success) {
        console.warn(`[SignalAgent] Insufficient credits for customer ${item.customerId}`);
      }

      const needsAlert = await checkLowBalance(item.customerId);
      if (needsAlert) {
        await db
          .update(sfCreditAccounts)
          .set({ lastAlertSentAt: new Date() })
          .where(eq(sfCreditAccounts.customerId, item.customerId));

        console.log(`[SignalAgent] LOW BALANCE ALERT: customer ${item.customerId}`);
        lowBalanceAlerts++;
      }

      // Fire auto top-up if configured — non-blocking, errors are caught internally
      await maybeAutoTopUp(item.customerId);

      await db
        .update(sfSignalQueue)
        .set({ processedAt: new Date() })
        .where(eq(sfSignalQueue.id, item.id));

      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await db
        .update(sfSignalQueue)
        .set({ errorMessage: message })
        .where(eq(sfSignalQueue.id, item.id));
      errors++;
    }
  }

  return { processed, errors, lowBalanceAlerts };
}
