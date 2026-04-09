/**
 * FanBasis API client
 * Docs: https://apidocs.fan/
 * Set FANBASIS_API_KEY and FANBASIS_WEBHOOK_SECRET in .env.local
 */

const BASE_URL = "https://api.fanbasis.com/v1";

async function fanbasisfetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = process.env.FANBASIS_API_KEY;
  if (!apiKey) throw new Error("FANBASIS_API_KEY is not set");

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`FanBasis ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ── Customers ─────────────────────────────────────────────────────────────────

export async function createFanbasisCustomer(email: string, name?: string) {
  return fanbasisfetch<{ id: string; email: string }>("/customers", {
    method: "POST",
    body: JSON.stringify({ email, name }),
  });
}

// ── Checkout ──────────────────────────────────────────────────────────────────

export type CheckoutSession = {
  id: string;
  url: string;
};

export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
  metadata,
}: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<CheckoutSession> {
  return fanbasisfetch<CheckoutSession>("/checkout/sessions", {
    method: "POST",
    body: JSON.stringify({
      customer_id: customerId,
      price_id: priceId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    }),
  });
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export async function getSubscription(subscriptionId: string) {
  return fanbasisfetch<{
    id: string;
    status: string;
    plan_id: string;
    customer_id: string;
    current_period_end: number;
  }>(`/subscriptions/${subscriptionId}`);
}

export async function cancelSubscription(subscriptionId: string) {
  return fanbasisfetch<{ id: string; status: string }>(
    `/subscriptions/${subscriptionId}/cancel`,
    { method: "POST" }
  );
}

export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  return fanbasisfetch<{ url: string }>("/billing/portal", {
    method: "POST",
    body: JSON.stringify({ customer_id: customerId, return_url: returnUrl }),
  });
}

// ── Webhook verification ───────────────────────────────────────────────────────

import { createHmac } from "crypto";

export function verifyFanbasisWebhook(
  rawBody: string,
  signature: string
): boolean {
  const secret = process.env.FANBASIS_WEBHOOK_SECRET;
  if (!secret) throw new Error("FANBASIS_WEBHOOK_SECRET is not set");
  const expected = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}

// ── Price IDs (set in .env.local) ─────────────────────────────────────────────

export const PRICE_IDS = {
  solo: process.env.FANBASIS_PRICE_SOLO!,
  business: process.env.FANBASIS_PRICE_BUSINESS!,
  agency: process.env.FANBASIS_PRICE_AGENCY!,
} as const;
