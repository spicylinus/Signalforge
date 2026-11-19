import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sfGscConnections, sfGscQueries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchSearchAnalytics, refreshAccessToken } from "@/lib/gsc";
import { env } from "@/lib/env";

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.INTERNAL_AGENT_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connections = await db.query.sfGscConnections.findMany();
  let synced = 0;
  let errors = 0;

  for (const conn of connections) {
    try {
      let accessToken = conn.accessToken;

      // Refresh token if expiring within 5 minutes
      if (conn.tokenExpiresAt <= new Date(Date.now() + 5 * 60 * 1000)) {
        const refreshed = await refreshAccessToken(conn.refreshToken);
        accessToken = refreshed.access_token;
        await db
          .update(sfGscConnections)
          .set({
            accessToken,
            tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
            updatedAt: new Date(),
          })
          .where(eq(sfGscConnections.id, conn.id));
      }

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
      const rows = await fetchSearchAnalytics(
        accessToken,
        conn.siteUrl,
        isoDate(startDate),
        isoDate(endDate)
      );

      // Replace all existing queries for this connection
      await db.delete(sfGscQueries).where(eq(sfGscQueries.connectionId, conn.id));

      if (rows.length > 0) {
        await db.insert(sfGscQueries).values(
          rows.map((row) => ({
            connectionId: conn.id,
            customerId: conn.customerId,
            query: row.query,
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr,
            position: row.position,
            periodStart: startDate,
            periodEnd: endDate,
          }))
        );
      }

      await db
        .update(sfGscConnections)
        .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
        .where(eq(sfGscConnections.id, conn.id));

      synced++;
    } catch (err) {
      console.error(`GSC sync error for connection ${conn.id}:`, err);
      errors++;
    }
  }

  return NextResponse.json({ synced, errors });
}
