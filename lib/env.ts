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
} as const;
