import { NextRequest, NextResponse } from "next/server";
import { runScoringAgent } from "@/lib/agents/scoring-agent";
import { env } from "@/lib/env";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`score:${ip}`, RATE_LIMITS.internalAgent)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.INTERNAL_AGENT_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runScoringAgent();
  return NextResponse.json(result);
}
