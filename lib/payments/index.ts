import { env } from "@/lib/env";
import { StripeProcessor } from "./stripe";
import type { PaymentProcessor } from "./types";

export const paymentProcessor: PaymentProcessor | null = env.STRIPE_SECRET_KEY
  ? new StripeProcessor()
  : null;

export type { PaymentProcessor, BillingEvent, BillingEventType } from "./types";
