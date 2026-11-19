import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sfCustomers, sfCreditAccounts, sfPaymentEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { paymentProcessor } from "@/lib/payments";
import { loadCredits } from "@/lib/credits";

// Disable body parsing so we can verify the raw Stripe signature
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!paymentProcessor) {
    return NextResponse.json({ error: "Payment processor not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = Buffer.from(await req.arrayBuffer());

  let event;
  try {
    event = paymentProcessor.constructWebhookEvent(rawBody, sig);
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  // Idempotency check
  const already = await db.query.sfPaymentEvents.findFirst({
    where: eq(sfPaymentEvents.processorEventId, event.processorEventId),
    columns: { id: true },
  });
  if (already) return NextResponse.json({ ok: true, skipped: true });

  const customerId = event.internalCustomerId;

  try {
    switch (event.type) {
      case "credit_payment.succeeded": {
        if (customerId && event.amountCents) {
          await loadCredits(
            customerId,
            event.amountCents,
            event.processorEventId,
            "stripe",
            "stripe"
          );
          // Mark card as saved — checkout used setup_future_usage: off_session
          await db
            .update(sfCustomers)
            .set({ stripePaymentMethodSaved: true, updatedAt: new Date() })
            .where(eq(sfCustomers.id, customerId));
        }
        break;
      }

      case "auto_topup.succeeded": {
        if (customerId && event.amountCents) {
          await loadCredits(
            customerId,
            event.amountCents,
            event.processorEventId,
            "stripe (auto)",
            "stripe"
          );
          await db
            .update(sfCreditAccounts)
            .set({ lastAutoTopUpAt: new Date(), updatedAt: new Date() })
            .where(eq(sfCreditAccounts.customerId, customerId));
        }
        break;
      }

      case "setup_fee.succeeded": {
        if (customerId && event.amountCents) {
          await db
            .update(sfCustomers)
            .set({
              setupFeePaidCents: event.amountCents,
              setupFeePaidAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(sfCustomers.id, customerId));
        }
        break;
      }

      case "subscription.created":
      case "subscription.updated": {
        if (customerId && event.processorSubscriptionId) {
          await db
            .update(sfCustomers)
            .set({
              stripeSubscriptionId: event.processorSubscriptionId,
              subscriptionStatus: "active",
              updatedAt: new Date(),
            })
            .where(eq(sfCustomers.id, customerId));
        }
        break;
      }

      case "subscription.cancelled": {
        if (customerId) {
          await db
            .update(sfCustomers)
            .set({ subscriptionStatus: "cancelled", updatedAt: new Date() })
            .where(eq(sfCustomers.id, customerId));
        }
        break;
      }

      case "subscription.payment_failed": {
        if (customerId) {
          await db
            .update(sfCustomers)
            .set({ subscriptionStatus: "paused", updatedAt: new Date() })
            .where(eq(sfCustomers.id, customerId));
        }
        break;
      }
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  // Record processed event
  await db.insert(sfPaymentEvents).values({
    processorEventId: event.processorEventId,
    type: event.type,
    customerId: customerId ?? undefined,
    amountCents: event.amountCents ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
