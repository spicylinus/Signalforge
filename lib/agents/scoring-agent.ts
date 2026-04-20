import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { sfLeads, sfLeadScores, sfCustomers, sfKeywords, sfCampaigns } from "@/lib/db/schema";
import { eq, isNull, inArray } from "drizzle-orm";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a B2B lead scoring specialist. Given a contact record and a client's ICP (Ideal Customer Profile), evaluate whether the lead is a strong fit.

Return valid JSON matching this exact shape:
{
  "mql_sql": "mql" | "sql" | "not_qualified",
  "iq_score": <integer 1-100>,
  "segment": "A" | "B" | "C" | "off_icp",
  "reasoning": "<1-3 sentence explanation>"
}

Scoring guide:
- "sql" + segment "A": strong intent signal, closely matches ICP, ready for outreach
- "mql" + segment "B": decent fit, some ICP alignment, worth nurturing
- "mql" + segment "C": weak fit, partial ICP alignment
- "not_qualified" + segment "off_icp": clearly outside ICP
- iq_score reflects overall quality: 80-100 = A-tier, 50-79 = B-tier, 20-49 = C-tier, 1-19 = off-ICP`;

interface LeadRecord {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  company: string | null;
  title: string | null;
  linkedinUrl: string | null;
  website: string | null;
  leadType: string;
  clickDate: Date | null;
}

interface ScoreResult {
  mql_sql: "mql" | "sql" | "not_qualified";
  iq_score: number;
  segment: "A" | "B" | "C" | "off_icp";
  reasoning: string;
}

async function scoreLead(
  lead: LeadRecord,
  icpDescription: string,
  keywords: string[]
): Promise<ScoreResult> {
  const leadContext = [
    `Name: ${[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unknown"}`,
    lead.title ? `Title: ${lead.title}` : null,
    lead.company ? `Company: ${lead.company}` : null,
    lead.email ? `Email: ${lead.email}` : null,
    lead.website ? `Website: ${lead.website}` : null,
    lead.linkedinUrl ? `LinkedIn: ${lead.linkedinUrl}` : null,
    `Lead type: ${lead.leadType}`,
    lead.clickDate
      ? `Search click date: ${lead.clickDate.toISOString().split("T")[0]}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const userMessage = `
ICP Description:
${icpDescription}

Target keywords: ${keywords.join(", ")}

Lead record:
${leadContext}

Score this lead.`.trim();

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON in scoring response: ${text}`);

  return JSON.parse(jsonMatch[0]) as ScoreResult;
}

export async function runScoringAgent(): Promise<{
  processed: number;
  errors: number;
}> {
  // Only score leads for guided/enterprise customers
  const eligibleCustomers = await db.query.sfCustomers.findMany({
    where: inArray(sfCustomers.plan, ["guided", "enterprise"]),
    columns: { id: true, icpDescription: true, plan: true },
  });

  if (eligibleCustomers.length === 0) return { processed: 0, errors: 0 };

  const eligibleIds = eligibleCustomers.map((c) => c.id);

  const unscoredLeads = await db
    .select({
      lead: sfLeads,
    })
    .from(sfLeads)
    .leftJoin(sfLeadScores, eq(sfLeads.id, sfLeadScores.leadId))
    .where(
      inArray(sfLeads.customerId, eligibleIds)
    )
    .then((rows) => rows.filter((r) => {
      // filter where score doesn't exist yet
      return true;
    }));

  // Simpler approach: find leads without scores
  const scoredLeadIds = await db
    .select({ leadId: sfLeadScores.leadId })
    .from(sfLeadScores)
    .where(inArray(sfLeadScores.customerId, eligibleIds));

  const scoredSet = new Set(scoredLeadIds.map((r) => r.leadId));

  const leads = await db.query.sfLeads.findMany({
    where: inArray(sfLeads.customerId, eligibleIds),
  });

  const unscored = leads.filter((l) => !scoredSet.has(l.id));

  let processed = 0;
  let errors = 0;

  for (const lead of unscored) {
    try {
      const customer = eligibleCustomers.find((c) => c.id === lead.customerId)!;
      if (!customer.icpDescription) continue;

      // Get campaign keywords
      const keywords: string[] = [];
      if (lead.campaignId) {
        const kws = await db.query.sfKeywords.findMany({
          where: eq(sfKeywords.campaignId, lead.campaignId),
          columns: { keyword: true },
        });
        keywords.push(...kws.map((k) => k.keyword));
      }

      const result = await scoreLead(lead, customer.icpDescription, keywords);

      await db.insert(sfLeadScores).values({
        leadId: lead.id,
        customerId: lead.customerId,
        mqlSql: result.mql_sql,
        iqScore: result.iq_score,
        segment: result.segment,
        claudeReasoning: result.reasoning,
      });

      processed++;
    } catch {
      errors++;
    }
  }

  return { processed, errors };
}
