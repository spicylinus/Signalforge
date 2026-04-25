import { env } from "@/lib/env";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GSC_API_BASE = "https://www.googleapis.com/webmasters/v3";
const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

function redirectUri(): string {
  return `${env.NEXT_PUBLIC_APP_URL}/api/integrations/gsc/callback`;
}

export function isGscConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function getOAuthUrl(customerId: number): string {
  const state = Buffer.from(String(customerId)).toString("base64url");
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GSC_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

export function decodeState(state: string): number {
  return parseInt(Buffer.from(state, "base64url").toString(), 10);
}

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GSC token exchange failed: ${body}`);
  }
  return res.json() as Promise<GoogleTokens>;
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GSC token refresh failed: ${body}`);
  }
  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}

export interface GscProperty {
  siteUrl: string;
  permissionLevel: string;
}

export async function listProperties(accessToken: string): Promise<GscProperty[]> {
  const res = await fetch(`${GSC_API_BASE}/sites`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to list GSC properties: ${body}`);
  }
  const data = (await res.json()) as { siteEntry?: GscProperty[] };
  return data.siteEntry ?? [];
}

export interface SearchAnalyticsRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export async function fetchSearchAnalytics(
  accessToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  rowLimit = 1000
): Promise<SearchAnalyticsRow[]> {
  const res = await fetch(
    `${GSC_API_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit,
        dataState: "all",
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch GSC search analytics: ${body}`);
  }
  type RawRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };
  const data = (await res.json()) as { rows?: RawRow[] };
  return (data.rows ?? []).map((row) => ({
    query: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position,
  }));
}

/** Keyword gap score: high impressions + low CTR = high opportunity */
export function gapScore(row: SearchAnalyticsRow): number {
  return row.impressions * (1 - row.ctr);
}
