import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sfSignalQueue } from "@/lib/db/schema";

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

export async function POST(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get("customer_id");
  const campaignId = req.nextUrl.searchParams.get("campaign_id");

  if (!customerId) {
    return NextResponse.json({ error: "customer_id required" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows in CSV" }, { status: 400 });
  }

  const inserts = rows.map((row) => ({
    customerId: parseInt(customerId, 10),
    campaignId: campaignId ? parseInt(campaignId, 10) : null,
    rawPayload: JSON.stringify(row),
    source: "csv_upload" as const,
  }));

  await db.insert(sfSignalQueue).values(inserts);

  return NextResponse.json({ queued: inserts.length }, { status: 202 });
}
