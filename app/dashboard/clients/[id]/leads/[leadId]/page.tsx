import { db } from "@/lib/db";
import { sfLeads, sfLeadScores, sfCustomers } from "@/lib/db/schema";
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

  const score =
    customer.plan !== "floor"
      ? await db.query.sfLeadScores.findFirst({
          where: eq(sfLeadScores.leadId, leadIdNum),
        })
      : null;

  const fields: [string, string | null | undefined][] = [
    ["First name", lead.firstName],
    ["Last name", lead.lastName],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["Title", lead.title],
    ["Company", lead.company],
    ["Website", lead.website],
    ["LinkedIn", lead.linkedinUrl],
    ["Mailing address", lead.mailingAddress],
    ["Lead type", lead.leadType.replace("_", " ")],
    ["Click date", lead.clickDate ? new Date(lead.clickDate).toLocaleString() : null],
    ["Source", lead.source.replace("_", " ")],
    ["Ingested", new Date(lead.ingestedAt).toLocaleString()],
  ];

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
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Contact Details
          </h2>
          <dl className="space-y-2">
            {fields.map(([label, value]) =>
              value ? (
                <div key={label} className="flex gap-4">
                  <dt className="text-xs text-gray-400 w-32 flex-shrink-0 pt-0.5">
                    {label}
                  </dt>
                  <dd className="text-sm text-gray-900 break-all">{value}</dd>
                </div>
              ) : null
            )}
          </dl>
        </div>

        {/* Score */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            ICP Score
          </h2>
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
              <div className="flex items-center gap-3">
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
                <span className="ml-auto text-2xl font-bold text-gray-900">
                  {score.iqScore}
                  <span className="text-sm font-normal text-gray-400">/100</span>
                </span>
              </div>
              {score.claudeReasoning && (
                <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 leading-relaxed">
                  {score.claudeReasoning}
                </div>
              )}
              <p className="text-xs text-gray-400">
                Scored {new Date(score.scoredAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
