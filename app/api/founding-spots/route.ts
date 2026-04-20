import { NextResponse } from "next/server";
import { getRemainingFoundingSpots, FOUNDING_MEMBER_LIMIT } from "@/lib/founding";

export async function GET() {
  const remaining = await getRemainingFoundingSpots();
  return NextResponse.json({ remaining, total: FOUNDING_MEMBER_LIMIT });
}
