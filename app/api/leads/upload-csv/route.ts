import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import { db } from "@/lib/db";
import { sfSignalQueue } from "@/lib/db/schema";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 5_000;
const ALLOWED_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "text/plain",
]);

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`csv:${ip}`, RATE_LIMITS.csvUpload)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const customerId = req.nextUrl.searchParams.get("customer_id");
  const campaignId = req.nextUrl.searchParams.get("campaign_id");

  if (!customerId || isNaN(parseInt(customerId, 10))) {
    return NextResponse.json({ error: "customer_id required" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  // MIME type validation
  const mimeType = file.type.split(";")[0].trim().toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: "Invalid file type. Upload a CSV file." },
      { status: 400 }
    );
  }

  // File size cap
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 5 MB." },
      { status: 400 }
    );
  }

  const text = await file.text();

  let rows: Record<string, string>[];
  try {
    rows = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    }) as Record<string, string>[];
  } catch {
    return NextResponse.json(
      { error: "Could not parse CSV. Ensure the file is valid RFC 4180 format." },
      { status: 400 }
    );
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV contains no data rows." }, { status: 400 });
  }

  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `CSV exceeds maximum of ${MAX_ROWS} rows per upload.` },
      { status: 400 }
    );
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
