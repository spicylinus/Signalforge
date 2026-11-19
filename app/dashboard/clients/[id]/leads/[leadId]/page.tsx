import { db } from "@/lib/db";
import { sfLeads, sfLeadScores, sfCustomers, sfCampaigns } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";

const SEGMENT_COLOR: Record<string, string> = {
  A: "bg-green-100 text-green-700",
  B: "bg-blue-100 text-blue-700",
  C: "bg-gray-100 text-gray-600",
  off_icp: "bg-red-100 text-red-600",
};

const MQL_LABEL: Record<string, string> = {
  sql: "SQL",
  mql: "MQL",
  not_qualified: "Not Qualified",
};

const CAMPAIGN_STATUS_COLOR: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  ended: "bg-gray-100 text-gray-500",
};

const scoreColor = (n: number) =>
  n >= 70 ? "text-green-600" : n >= 40 ? "text-amber-500" : "text-red-500";

type Field = { label: string; value: string | null | undefined; href?: string };

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string; leadId: string }>;
}) {
  const { id, leadId } = await params;
  const customerId = parseInt(id, 10);
  const leadIdNum = parseInt(leadId, 10);

  const [customer, lead] = await Promise.all([
    db.query.sfCustomers.findFirst({
      where: eq(sfCustomers.id, customerId),
      columns: { id: true, plan: true },
    }),
    db.query.sfLeads.findFirst({
      where: and(eq(sfLeads.id, leadIdNum), eq(sfLeads.customerId, customerId)),
    }),
  ]);

  if (!customer || !lead) notFound();

  const [score, campaign] = await Promise.all([
    customer.plan !== "floor"
      ? db.query.sfLeadScores.findFirst({
          where: eq(sfLeadScores.leadId, leadIdNum),
        })
      : Promise.resolve(null),
    lead.campaignId
      ? db.query.sfCampaigns.findFirst({
          where: eq(sfCampaigns.id, lead.campaignId),
          columns: { id: true, name: true, leadType: true, status: true },
        })
      : Promise.resolve(null),
  ]);

  const fields: Field[] = [
    { label: "First name", value: lead.firstName },
    { label: "Last name", value: lead.lastName },
    { label: "Email", value: lead.email, href: lead.email ? `mailto:${lead.email}` : undefined },
    { label: "Phone", value: lead.phone, href: lead.phone ? `tel:${lead.phone}` : undefined },
    { label: "Title", value: lead.title },
    { label: "Company", value: lead.company },
    { label: "Website", value: lead.website, href: lead.website ?? undefined },
    { label: "LinkedIn", value: lead.linkedinUrl, href: lead.linkedinUrl ?? undefined },
    { label: "Mailing address", value: lead.mailingAddress },
    { label: "Lead type", value: lead.leadType.replace(/_/g, " ") },
    { label: "Click date", value: lead.clickDate ? new Date(lead.clickDate).toLocaleString() : null },
    { label: "Source", value: lead.source.replace(/_/g, " ") },
    { label: "Ingested", value: new Date(lead.ingestedAt).toLocaleString() },
  ];

  const timelineEvents: { label: string; ts: Date; sub?: string }[] = [];
  if (lead.clickDate) timelineEvents.push({ label: "Clicked", ts: new Date(lead.clickDate) });
  timelineEvents.push({
    label: "Ingested",
    ts: new Date(lead.ingestedAt),
    sub: lead.source === "make_webhook" ? "via Make.com" : "via CSV upload",
  });
  if (score) timelineEvents.push({ label: "Scored", ts: new Date(score.scoredAt) });

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/clients/${id}`}
        className="text-sm text-gray-400 hover:text-gray-600"
      >
        ← Back to overview
      </Link>

      <div className="grid grid-cols-2 gap-6">
        {/* Contact fields */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Contact Details</h2>
          <dl className="space-y-2">
            {fields.map((f) =>
              f.value ? (
                <div key={f.label} className="flex gap-4">
                  <dt className="text-xs text-gray-400 w-32 flex-shrink-0 pt-0.5">{f.label}</dt>
                  <dd className="text-sm break-all">
                    {f.href ? (
                      <a
                        href={f.href}
                        target={f.href.startsWith("http") ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {f.value}
                      </a>
                    ) : (
                      <span className="text-gray-900">{f.value}</span>
                    )}
                  </dd>
                </div>
              ) : null
            )}
          </dl>
        </div>

        {/* ICP Score */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">ICP Score</h2>
          {customer.plan === "floor" ? (
            <p className="text-sm text-gray-400">
              Upgrade to Guided or Enterprise to unlock AI scoring.
            </p>
          ) : !score ? (
            <p className="text-sm text-gray-400">
              Not yet scored — Scoring Agent runs hourly.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <span className={`text-4xl font-bold ${scoreColor(score.iqScore)}`}>
                  {score.iqScore}
                </span>
                <span className="text-sm text-gray-400">/100</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <span
                  className={`text-sm font-medium px-3 py-1 rounded ${
                    SEGMENT_COLOR[score.segment] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  Segment {score.segment}
                </span>
                <span className="text-sm text-gray-600">
                  {MQL_LABEL[score.mqlSql] ?? score.mqlSql}
                </span>
              </div>
              {score.claudeReasoning && (
                <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 leading-relaxed">
                  {score.claudeReasoning}
                </div>
              )}
              <p className="text-xs text-gray-400 text-center">
                Scored {new Date(score.scoredAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Campaign */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Campaign</h2>
          {!campaign ? (
            <p className="text-sm text-gray-400">No campaign assigned.</p>
          ) : (
            <div className="space-y-3">
              <Link
                href={`/dashboard/clients/${id}/campaigns`}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                {campaign.name}
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {campaign.leadType.replace(/_/g, " ")}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    CAMPAIGN_STATUS_COLOR[campaign.status] ?? "bg-gray-100 text-gray-500"
                  }`}
                >
                  {campaign.status}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Timeline</h2>
          <ol className="space-y-4">
            {timelineEvents.map((e, i) => (
              <li key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-400 mt-0.5 flex-shrink-0" />
                  {i < timelineEvents.length - 1 && (
                    <span className="w-px flex-1 bg-gray-200 mt-1" />
                  )}
                </div>
                <div className="pb-1">
                  <p className="text-sm font-medium text-gray-900">{e.label}</p>
                  <p className="text-xs text-gray-400">{e.ts.toLocaleString()}</p>
                  {e.sub && <p className="text-xs text-gray-400">{e.sub}</p>}
                </div>
              </li>
            ))}
          </ol>
          {!score && customer.plan !== "floor" && (
            <p className="text-xs text-gray-400 mt-4">Scoring Agent runs hourly.</p>
          )}
        </div>
      </div>
    </div>
  );
}
