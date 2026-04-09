import { db } from "@/lib/db";
import { customers, fanbasisEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { enqueueNextCycleJobs } from "@/lib/jobs/scheduler";

export type FanbasisWebhookEvent = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  created_at: number;
};

export async function handleFanbasisEvent(event: FanbasisWebhookEvent) {
  // Idempotency: skip already-processed events
  const existing = await db
    .select()
    .from(fanbasisEvents)
    .where(eq(fanbasisEvents.eventId, event.id))
    .limit(1);
  if (existing.length > 0) return;

  // Record the event
  await db.insert(fanbasisEvents).values({
    eventId: event.id,
    eventType: event.type,
    payload: event.data,
  });

  switch (event.type) {
    case "checkout.completed":
    case "subscription.created":
    case "subscription.updated": {
      const sub = event.data as {
        id: string;
        customer_id: string;
        customer_email: string;
        plan_id: string;
        status: string;
      };
      const plan = resolvePlan(sub.plan_id);
      if (!plan) break;

      await db
        .update(customers)
        .set({
          fanbasisCustomerId: sub.customer_id,
          plan,
          subscriptionStatus: sub.status as "active" | "trialing" | "past_due" | "canceled",
          subscriptionId: sub.id,
          updatedAt: new Date(),
        })
        .where(eq(customers.email, sub.customer_email));

      // Enqueue the first cycle of content jobs
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.email, sub.customer_email))
        .limit(1);
      if (customer) await enqueueNextCycleJobs(customer.id);
      break;
    }

    case "subscription.canceled":
    case "subscription.deleted": {
      const sub = event.data as { id: string };
      await db
        .update(customers)
        .set({
          subscriptionStatus: "canceled",
          plan: null,
          updatedAt: new Date(),
        })
        .where(eq(customers.subscriptionId, sub.id));
      break;
    }

    case "invoice.payment_failed": {
      const inv = event.data as { subscription_id: string };
      await db
        .update(customers)
        .set({ subscriptionStatus: "past_due", updatedAt: new Date() })
        .where(eq(customers.subscriptionId, inv.subscription_id));
      break;
    }
  }
}

function resolvePlan(planId: string): "solo" | "business" | "agency" | null {
  const { FANBASIS_PRICE_SOLO, FANBASIS_PRICE_BUSINESS, FANBASIS_PRICE_AGENCY } =
    process.env;
  if (planId === FANBASIS_PRICE_SOLO) return "solo";
  if (planId === FANBASIS_PRICE_BUSINESS) return "business";
  if (planId === FANBASIS_PRICE_AGENCY) return "agency";
  return null;
}
