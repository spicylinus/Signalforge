// Skip validation during Next.js build — env vars only exist at runtime.
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

function required(key: string): string {
  const value = process.env[key];
  if (!value && !isBuild) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
        `Copy .env.local.example to .env.local and fill in all values.`
    );
  }
  return value ?? "";
}

export const env = {
  get DATABASE_URL() {
    return required("DATABASE_URL");
  },
  get ANTHROPIC_API_KEY() {
    return required("ANTHROPIC_API_KEY");
  },
  get INTERNAL_AGENT_SECRET() {
    return required("INTERNAL_AGENT_SECRET");
  },
  get MAKE_WEBHOOK_SECRET() {
    return required("MAKE_WEBHOOK_SECRET");
  },
  get STAFF_API_KEY() {
    return required("STAFF_API_KEY");
  },
  get AUTH_SECRET() {
    return required("AUTH_SECRET");
  },
  // Optional — required only when GSC integration is used
  get GOOGLE_CLIENT_ID() {
    return process.env.GOOGLE_CLIENT_ID ?? "";
  },
  get GOOGLE_CLIENT_SECRET() {
    return process.env.GOOGLE_CLIENT_SECRET ?? "";
  },
  get NEXT_PUBLIC_APP_URL() {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  },
  // Optional — required only when Stripe integration is active
  get STRIPE_SECRET_KEY() {
    return process.env.STRIPE_SECRET_KEY ?? "";
  },
  get STRIPE_WEBHOOK_SECRET() {
    return process.env.STRIPE_WEBHOOK_SECRET ?? "";
  },
  // Stripe Price IDs — one per plan/billing-cycle combination
  get STRIPE_PRICE_FLOOR_MONTHLY() { return process.env.STRIPE_PRICE_FLOOR_MONTHLY ?? ""; },
  get STRIPE_PRICE_FLOOR_ANNUAL() { return process.env.STRIPE_PRICE_FLOOR_ANNUAL ?? ""; },
  get STRIPE_PRICE_GUIDED_MONTHLY() { return process.env.STRIPE_PRICE_GUIDED_MONTHLY ?? ""; },
  get STRIPE_PRICE_GUIDED_ANNUAL() { return process.env.STRIPE_PRICE_GUIDED_ANNUAL ?? ""; },
  get STRIPE_PRICE_ENTERPRISE_MONTHLY() { return process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ?? ""; },
  get STRIPE_PRICE_ENTERPRISE_ANNUAL() { return process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL ?? ""; },
} as const;
