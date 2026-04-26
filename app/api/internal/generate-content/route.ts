import { NextRequest, NextResponse } from "next/server";
import { runContentAgent } from "@/lib/agents/content-agent";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.INTERNAL_AGENT_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runContentAgent();
  return NextResponse.json(result);
}
