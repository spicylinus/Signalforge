import { NextRequest, NextResponse } from "next/server";
import { runSignalAgent } from "@/lib/agents/signal-agent";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.INTERNAL_AGENT_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runSignalAgent();
  return NextResponse.json(result);
}
