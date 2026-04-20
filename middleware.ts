import { NextRequest, NextResponse } from "next/server";

function safeCompare(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) {
    diff |= bufA[i] ^ bufB[i];
  }
  return diff === 0;
}

export function middleware(req: NextRequest) {
  const staffKey = process.env.STAFF_API_KEY;
  if (!staffKey) {
    return NextResponse.json(
      { error: "Server misconfigured: STAFF_API_KEY not set" },
      { status: 500 }
    );
  }

  const provided = req.headers.get("x-staff-api-key") ?? "";
  if (!safeCompare(provided, staffKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/clients/:path*", "/api/leads/:path*"],
};
