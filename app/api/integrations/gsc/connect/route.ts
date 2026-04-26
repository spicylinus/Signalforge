import { NextRequest, NextResponse } from "next/server";
import { getOAuthUrl, isGscConfigured } from "@/lib/gsc";

export async function GET(req: NextRequest) {
  if (!isGscConfigured()) {
    return NextResponse.json(
      { error: "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." },
      { status: 503 }
    );
  }

  const customerIdParam = req.nextUrl.searchParams.get("customer_id");
  const customerId = customerIdParam ? parseInt(customerIdParam, 10) : NaN;
  if (!customerId || isNaN(customerId)) {
    return NextResponse.json({ error: "customer_id is required" }, { status: 400 });
  }

  const url = getOAuthUrl(customerId);
  return NextResponse.redirect(url);
}
