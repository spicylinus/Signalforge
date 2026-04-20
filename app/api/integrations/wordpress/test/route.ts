import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { customers, distributionSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.email, session.user.email))
    .limit(1);

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const [settings] = await db
    .select()
    .from(distributionSettings)
    .where(eq(distributionSettings.customerId, customer.id))
    .limit(1);

  if (!settings) {
    return NextResponse.json({ error: "No WordPress connection configured" }, { status: 404 });
  }

  try {
    const token = Buffer.from(
      `${settings.wpUsername}:${settings.wpAppPassword}`
    ).toString("base64");

    const res = await fetch(
      `${settings.wpSiteUrl}/wp-json/wp/v2/posts?per_page=1`,
      {
        headers: { Authorization: `Basic ${token}` },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      // Log detail server-side only — never expose to client
      console.error(`[wp-test] customer=${customer.id} status=${res.status}`);
      return NextResponse.json(
        { error: "WordPress connection failed" },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[wp-test] customer=${customer.id}`, err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "WordPress connection failed" },
      { status: 502 }
    );
  }
}
