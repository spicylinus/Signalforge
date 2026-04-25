import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sfGscConnections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decodeState, exchangeCodeForTokens, listProperties, isGscConfigured } from "@/lib/gsc";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  if (!isGscConfigured()) {
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/dashboard?gsc=misconfigured`);
  }

  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/dashboard?gsc=denied`);
  }

  let customerId: number;
  try {
    customerId = decodeState(state);
    if (!customerId || isNaN(customerId)) throw new Error("invalid state");
  } catch {
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/dashboard?gsc=invalid_state`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        `${env.NEXT_PUBLIC_APP_URL}/dashboard/clients/${customerId}/content?gsc=no_refresh_token`
      );
    }

    // Pick the first verified property
    const properties = await listProperties(tokens.access_token);
    if (properties.length === 0) {
      return NextResponse.redirect(
        `${env.NEXT_PUBLIC_APP_URL}/dashboard/clients/${customerId}/content?gsc=no_properties`
      );
    }

    const siteUrl = properties[0].siteUrl;
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Upsert connection
    const existing = await db.query.sfGscConnections.findFirst({
      where: eq(sfGscConnections.customerId, customerId),
      columns: { id: true },
    });

    if (existing) {
      await db
        .update(sfGscConnections)
        .set({
          siteUrl,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(sfGscConnections.id, existing.id));
    } else {
      await db.insert(sfGscConnections).values({
        customerId,
        siteUrl,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt,
      });
    }

    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/dashboard/clients/${customerId}/content?gsc=connected`
    );
  } catch (err) {
    console.error("GSC callback error:", err);
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/dashboard/clients/${customerId}/content?gsc=error`
    );
  }
}
