export type PlanKey = "floor" | "guided" | "enterprise";
export type BillingCycle = "monthly" | "annual";

export type BillingEventType =
  | "subscription.created"
  | "subscription.updated"
  | "subscription.cancelled"
  | "subscription.payment_failed"
  | "credit_payment.succeeded"
  | "setup_fee.succeeded";

export interface BillingEvent {
  type: BillingEventType | string;
  processorEventId: string;
  internalCustomerId: number | null;
  amountCents: number | null;
  processorSubscriptionId: string | null;
  raw: unknown;
}

export interface SubscriptionParams {
  processorCustomerId: string;
  plan: PlanKey;
  billingCycle: BillingCycle;
  internalCustomerId: number;
}

export interface CreditCheckoutParams {
  processorCustomerId: string;
  amountCents: number;
  internalCustomerId: number;
  successUrl: string;
  cancelUrl: string;
}

export interface SetupFeeCheckoutParams {
  processorCustomerId: string;
  amountCents: number;
  internalCustomerId: number;
  successUrl: string;
  cancelUrl: string;
}

export interface SubscriptionResult {
  processorSubscriptionId: string;
  status: string;
}

export interface CheckoutResult {
  url: string;
  sessionId: string;
}

export interface PaymentProcessor {
  readonly name: string;
  /** Create or retrieve the customer record in the processor's system. Returns external customer ID. */
  ensureCustomer(email: string, name: string, internalCustomerId: number): Promise<string>;
  createSubscription(params: SubscriptionParams): Promise<SubscriptionResult>;
  cancelSubscription(processorSubscriptionId: string): Promise<void>;
  createCreditCheckout(params: CreditCheckoutParams): Promise<CheckoutResult>;
  createSetupFeeCheckout(params: SetupFeeCheckoutParams): Promise<CheckoutResult>;
  /** Verify webhook signature and return a normalised BillingEvent. Throws on invalid signature. */
  constructWebhookEvent(rawBody: Buffer, signature: string): BillingEvent;
}
