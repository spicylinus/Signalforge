"use server";

import { db } from "@/lib/db";
import { sfCustomers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { paymentProcessor } from "@/lib/payments";
import { env } from "@/lib/env";

function appUrl(path: string): string {
  return `${env.NEXT_PUBLIC_APP_URL}${path}`;
}

async function ensureStripeCustomer(
  customer: typeof sfCustomers.$inferSelect
): Promise<string> {
  if (!paymentProcessor) throw new Error("Payment processor not configured");
  if (customer.stripeCustomerId) return customer.stripeCustomerId;

  const stripeCustomerId = await paymentProcessor.ensureCustomer(
    customer.email,
    customer.name,
    customer.id
  );
  await db
    .update(sfCustomers)
    .set({ stripeCustomerId, updatedAt: new Date() })
    .where(eq(sfCustomers.id, customer.id));
  return stripeCustomerId;
}

export async function createOrUpdateSubscription(customerId: number): Promise<void> {
  if (!paymentProcessor) throw new Error("Payment processor not configured");

  const customer = await db.query.sfCustomers.findFirst({
    where: eq(sfCustomers.id, customerId),
  });
  if (!customer) throw new Error("Customer not found");

  const processorCustomerId = await ensureStripeCustomer(customer);

  const result = await paymentProcessor.createSubscription({
    processorCustomerId,
    plan: customer.plan,
    billingCycle: customer.billingCycle,
    internalCustomerId: customerId,
  });

  await db
    .update(sfCustomers)
    .set({
      stripeSubscriptionId: result.processorSubscriptionId,
      subscriptionStatus: result.status === "active" ? "active" : "trialing",
      updatedAt: new Date(),
    })
    .where(eq(sfCustomers.id, customerId));

  revalidatePath(`/dashboard/clients/${customerId}`);
}

export async function cancelCustomerSubscription(customerId: number): Promise<void> {
  if (!paymentProcessor) throw new Error("Payment processor not configured");

  const customer = await db.query.sfCustomers.findFirst({
    where: eq(sfCustomers.id, customerId),
    columns: { id: true, stripeSubscriptionId: true },
  });
  if (!customer?.stripeSubscriptionId) throw new Error("No active subscription found");

  await paymentProcessor.cancelSubscription(customer.stripeSubscriptionId);
  await db
    .update(sfCustomers)
    .set({ subscriptionStatus: "cancelled", updatedAt: new Date() })
    .where(eq(sfCustomers.id, customerId));

  revalidatePath(`/dashboard/clients/${customerId}`);
}

export async function generateCreditCheckoutLink(
  customerId: number,
  amountCents: number
): Promise<string> {
  if (!paymentProcessor) throw new Error("Payment processor not configured");

  const customer = await db.query.sfCustomers.findFirst({
    where: eq(sfCustomers.id, customerId),
  });
  if (!customer) throw new Error("Customer not found");

  const processorCustomerId = await ensureStripeCustomer(customer);

  const result = await paymentProcessor.createCreditCheckout({
    processorCustomerId,
    amountCents,
    internalCustomerId: customerId,
    successUrl: appUrl(`/dashboard/clients/${customerId}/credits?payment=success`),
    cancelUrl: appUrl(`/dashboard/clients/${customerId}/credits?payment=cancelled`),
  });

  return result.url;
}

export async function generateSetupFeeCheckoutLink(
  customerId: number,
  amountCents: number
): Promise<string> {
  if (!paymentProcessor) throw new Error("Payment processor not configured");

  const customer = await db.query.sfCustomers.findFirst({
    where: eq(sfCustomers.id, customerId),
  });
  if (!customer) throw new Error("Customer not found");

  const processorCustomerId = await ensureStripeCustomer(customer);

  const result = await paymentProcessor.createSetupFeeCheckout({
    processorCustomerId,
    amountCents,
    internalCustomerId: customerId,
    successUrl: appUrl(`/dashboard/clients/${customerId}?payment=setup_success`),
    cancelUrl: appUrl(`/dashboard/clients/${customerId}?payment=cancelled`),
  });

  return result.url;
}
