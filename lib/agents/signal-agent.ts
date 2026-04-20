import { db } from "@/lib/db";
import {
  sfSignalQueue,
  sfLeads,
  sfCustomers,
  sfCreditAccounts,
} from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import { debitCredits, checkLowBalance } from "@/lib/credits";

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
        // Insufficient balance — still ingest lead, flag in logs
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
