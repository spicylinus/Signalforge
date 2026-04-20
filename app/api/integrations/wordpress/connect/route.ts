import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { customers, distributionSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { validateWpSiteUrl } from "@/lib/integrations/wordpress";

export async function POST(req: NextRequest) {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const { wpUsername, wpAppPassword, wpPublishStatus, autoPublishBlog } = raw;

  let wpSiteUrl: string;
  try {
    wpSiteUrl = validateWpSiteUrl(String(raw.wpSiteUrl ?? ""));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid site URL" },
      { status: 400 }
    );
  }

  if (!wpUsername || typeof wpUsername !== "string" || !wpUsername.trim()) {
    return NextResponse.json({ error: "WordPress username is required" }, { status: 400 });
  }
  if (!wpAppPassword || typeof wpAppPassword !== "string" || !wpAppPassword.trim()) {
    return NextResponse.json({ error: "Application password is required" }, { status: 400 });
  }

  const publishStatus =
    wpPublishStatus === "publish" ? "publish" : "draft";
  const autoPublish = autoPublishBlog === true;

  await db
    .insert(distributionSettings)
    .values({
      customerId: customer.id,
      wpSiteUrl,
      wpUsername: wpUsername.trim(),
      wpAppPassword: wpAppPassword.trim(),
      wpPublishStatus: publishStatus,
      autoPublishBlog: autoPublish,
    })
    .onConflictDoUpdate({
      target: distributionSettings.customerId,
      set: {
        wpSiteUrl,
        wpUsername: wpUsername.trim(),
        wpAppPassword: wpAppPassword.trim(),
        wpPublishStatus: publishStatus,
        autoPublishBlog: autoPublish,
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}
