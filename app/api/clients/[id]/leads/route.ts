import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sfLeads, sfLeadScores } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

// NEVER include costCents or chargeCents in this response
function sanitizeLead(
  lead: typeof sfLeads.$inferSelect,
  score?: typeof sfLeadScores.$inferSelect | null
) {
  return {
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
          scoredAt: score.scoredAt,
        }
      : null,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const customerId = parseInt(id, 10);
  if (isNaN(customerId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10)),
    200
  );
  const offset = (page - 1) * limit;

  const leads = await db.query.sfLeads.findMany({
    where: eq(sfLeads.customerId, customerId),
    orderBy: [desc(sfLeads.ingestedAt)],
    limit,
    offset,
  });

  const leadIds = leads.map((l) => l.id);
  const scores =
    leadIds.length > 0
      ? await db.query.sfLeadScores.findMany({
          where: inArray(sfLeadScores.leadId, leadIds),
        })
      : [];

  const scoreMap = new Map(scores.map((s) => [s.leadId, s]));

  return NextResponse.json({
    data: leads.map((lead) => sanitizeLead(lead, scoreMap.get(lead.id))),
    page,
    limit,
  });
}
