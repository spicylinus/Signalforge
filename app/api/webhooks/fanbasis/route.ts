import { NextRequest, NextResponse } from "next/server";
import { verifyFanbasisWebhook } from "@/lib/fanbasis/client";
import type { FanbasisWebhookEvent } from "@/lib/fanbasis/webhooks";
import { handleFanbasisEvent } from "@/lib/fanbasis/webhooks";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-fanbasis-signature") ?? "";

  if (!verifyFanbasisWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: FanbasisWebhookEvent;
  try {
    event = JSON.parse(rawBody) as FanbasisWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    await handleFanbasisEvent(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[fanbasis webhook]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
