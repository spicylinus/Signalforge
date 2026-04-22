import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sfLeads, sfLeadScores } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  const { id, leadId } = await params;
  const customerId = parseInt(id, 10);
  const leadIdNum = parseInt(leadId, 10);

  if (isNaN(customerId) || isNaN(leadIdNum)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const lead = await db.query.sfLeads.findFirst({
    where: and(
      eq(sfLeads.id, leadIdNum),
      eq(sfLeads.customerId, customerId)
    ),
  });

  if (!lead) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const score = await db.query.sfLeadScores.findFirst({
    where: eq(sfLeadScores.leadId, leadIdNum),
  });

  // NEVER expose costCents or chargeCents
  return NextResponse.json({
    id: lead.id,
    campaignId: lead.campaignId,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    linkedinUrl: lead.linkedinUrl,
    mailingAddress: lead.mailingAddress,
    website: lead.website,
    company: lead.company,
    title: lead.title,
    leadType: lead.leadType,
    clickDate: lead.clickDate,
    source: lead.source,
    ingestedAt: lead.ingestedAt,
    score: score
      ? {
          mqlSql: score.mqlSql,
          iqScore: score.iqScore,
          segment: score.segment,
          claudeReasoning: score.claudeReasoning,
          scoredAt: score.scoredAt,
        }
      : null,
  });
}
