// In-memory sliding-window rate limiter.
// NOTE: Does not persist across serverless instances. For multi-instance production,
// replace with Upstash Redis + @upstash/ratelimit.

const windows = new Map<string, number[]>();

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export function checkRateLimit(key: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const cutoff = now - config.windowMs;

  const timestamps = (windows.get(key) ?? []).filter((t) => t > cutoff);
  if (timestamps.length >= config.limit) return false;

  timestamps.push(now);
  windows.set(key, timestamps);
  return true;
}

export const RATE_LIMITS = {
  webhook: { limit: 100, windowMs: 60_000 },
  csvUpload: { limit: 10, windowMs: 60_000 },
  internalAgent: { limit: 20, windowMs: 60_000 },
} satisfies Record<string, RateLimitConfig>;
