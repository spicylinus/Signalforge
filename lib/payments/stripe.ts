import Stripe from "stripe";
import { env } from "@/lib/env";
import type {
  PaymentProcessor,
  BillingEvent,
  SubscriptionParams,
  SubscriptionResult,
  CreditCheckoutParams,
  SetupFeeCheckoutParams,
  CheckoutResult,
  PlanKey,
  BillingCycle,
} from "./types";

function getPriceId(plan: PlanKey, cycle: BillingCycle): string {
  const map: Record<string, string> = {
    floor_monthly: env.STRIPE_PRICE_FLOOR_MONTHLY,
    floor_annual: env.STRIPE_PRICE_FLOOR_ANNUAL,
    guided_monthly: env.STRIPE_PRICE_GUIDED_MONTHLY,
    guided_annual: env.STRIPE_PRICE_GUIDED_ANNUAL,
    enterprise_monthly: env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    enterprise_annual: env.STRIPE_PRICE_ENTERPRISE_ANNUAL,
  };
  const key = `${plan}_${cycle}`;
  const priceId = map[key];
  if (!priceId) throw new Error(`Stripe Price ID not configured for ${key}`);
  return priceId;
}

function extractCustomerId(metadata: Stripe.Metadata | null): number | null {
  const raw = metadata?.sf_customer_id;
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

export class StripeProcessor implements PaymentProcessor {
  readonly name = "stripe";

  private readonly stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });
  }

  async ensureCustomer(
    email: string,
    name: string,
    internalCustomerId: number
  ): Promise<string> {
    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: { sf_customer_id: String(internalCustomerId) },
    });
    return customer.id;
  }

  async createSubscription(params: SubscriptionParams): Promise<SubscriptionResult> {
    const priceId = getPriceId(params.plan, params.billingCycle);
    const subscription = await this.stripe.subscriptions.create({
      customer: params.processorCustomerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      metadata: { sf_customer_id: String(params.internalCustomerId) },
    });
    return {
      processorSubscriptionId: subscription.id,
      status: subscription.status,
    };
  }

  async cancelSubscription(processorSubscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.cancel(processorSubscriptionId);
  }

  async createCreditCheckout(params: CreditCheckoutParams): Promise<CheckoutResult> {
    const session = await this.stripe.checkout.sessions.create({
      customer: params.processorCustomerId,
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Signalforge Credits" },
            unit_amount: params.amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        sf_customer_id: String(params.internalCustomerId),
        type: "credit_topup",
      },
    });
    return { url: session.url!, sessionId: session.id };
  }

  async createSetupFeeCheckout(params: SetupFeeCheckoutParams): Promise<CheckoutResult> {
    const session = await this.stripe.checkout.sessions.create({
      customer: params.processorCustomerId,
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Signalforge Setup Fee" },
            unit_amount: params.amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        sf_customer_id: String(params.internalCustomerId),
        type: "setup_fee",
      },
    });
    return { url: session.url!, sessionId: session.id };
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): BillingEvent {
    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = extractCustomerId(session.metadata);
        const type =
          session.metadata?.type === "setup_fee"
            ? "setup_fee.succeeded"
            : "credit_payment.succeeded";
        return {
          type,
          processorEventId: event.id,
          internalCustomerId: customerId,
          amountCents: session.amount_total,
          processorSubscriptionId: null,
          raw: event,
        };
      }

      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        return {
          type: "subscription.created",
          processorEventId: event.id,
          internalCustomerId: extractCustomerId(sub.metadata),
          amountCents: null,
          processorSubscriptionId: sub.id,
          raw: event,
        };
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        return {
          type: "subscription.updated",
          processorEventId: event.id,
          internalCustomerId: extractCustomerId(sub.metadata),
          amountCents: null,
          processorSubscriptionId: sub.id,
          raw: event,
        };
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        return {
          type: "subscription.cancelled",
          processorEventId: event.id,
          internalCustomerId: extractCustomerId(sub.metadata),
          amountCents: null,
          processorSubscriptionId: sub.id,
          raw: event,
        };
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subDetails = invoice.parent?.type === "subscription_details"
          ? invoice.parent.subscription_details
          : null;
        const meta = subDetails?.metadata ?? null;
        const subId = subDetails?.subscription;
        return {
          type: "subscription.payment_failed",
          processorEventId: event.id,
          internalCustomerId: extractCustomerId(meta),
          amountCents: invoice.amount_due,
          processorSubscriptionId:
            typeof subId === "string" ? subId : null,
          raw: event,
        };
      }

      default:
        return {
          type: event.type,
          processorEventId: event.id,
          internalCustomerId: null,
          amountCents: null,
          processorSubscriptionId: null,
          raw: event,
        };
    }
  }
}
