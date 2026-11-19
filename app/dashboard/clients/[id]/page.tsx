import { db } from "@/lib/db";
import {
  sfCustomers,
  sfCreditAccounts,
  sfLeads,
  sfLeadScores,
} from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { paymentProcessor } from "@/lib/payments";
import {
  createOrUpdateSubscription,
  cancelCustomerSubscription,
} from "@/lib/actions/billing";

const SUB_STATUS_STYLE: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  trialing: "bg-blue-50 text-blue-700",
  paused: "bg-amber-50 text-amber-700",
  cancelled: "bg-red-50 text-red-700",
};

const SEGMENT_COLOR: Record<string, string> = {
  A: "bg-green-100 text-green-700",
  B: "bg-blue-100 text-blue-700",
  C: "bg-gray-100 text-gray-600",
  off_icp: "bg-red-100 text-red-600",
};

export default async function ClientOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { id } = await params;
  const { payment } = await searchParams;
  const customerId = parseInt(id, 10);

  const [customer, creditAccount, recentLeads, segmentRows, scoredCount] =
    await Promise.all([
      db.query.sfCustomers.findFirst({ where: eq(sfCustomers.id, customerId) }),
      db.query.sfCreditAccounts.findFirst({
        where: eq(sfCreditAccounts.customerId, customerId),
      }),
      db.query.sfLeads.findMany({
        where: eq(sfLeads.customerId, customerId),
        orderBy: [desc(sfLeads.ingestedAt)],
        limit: 10,
      }),
      db
        .select({ segment: sfLeadScores.segment, cnt: count() })
        .from(sfLeadScores)
        .where(eq(sfLeadScores.customerId, customerId))
        .groupBy(sfLeadScores.segment),
      db
        .select({ cnt: count() })
        .from(sfLeadScores)
        .where(eq(sfLeadScores.customerId, customerId)),
    ]);

  if (!customer) notFound();

  const stripeActive = paymentProcessor !== null;
  const totalLeads = recentLeads.length; // approximate for display
  const scored = scoredCount[0]?.cnt ?? 0;
  const calibrationPct = Math.min(100, Math.round((scored / 200) * 100));

  // Burn rate: total spent / days since first purchase (approx)
  const burnRatePerDay = creditAccount
    ? creditAccount.totalSpentCents / Math.max(1, 30)
    : 0;
  const runwayDays =
    burnRatePerDay > 0 && creditAccount
      ? Math.floor(creditAccount.balanceCents / burnRatePerDay)
      : null;

  return (
    <div className="space-y-6">
      {/* Payment flash */}
      {payment && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            payment === "setup_success"
              ? "bg-green-50 text-green-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {payment === "setup_success" && "Setup fee payment completed."}
          {payment === "cancelled" && "Payment was cancelled."}
        </div>
      )}

      {/* Credit summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Credit Balance",
            value: creditAccount
              ? `$${(creditAccount.balanceCents / 100).toFixed(2)}`
              : "—",
            sub:
              creditAccount &&
              creditAccount.balanceCents < creditAccount.lowBalanceThresholdCents
                ? "Low balance"
                : undefined,
            alert:
              creditAccount &&
              creditAccount.balanceCents < creditAccount.lowBalanceThresholdCents,
          },
          {
            label: "Total Loaded",
            value: creditAccount
              ? `$${(creditAccount.totalLoadedCents / 100).toFixed(2)}`
              : "—",
          },
          {
            label: "Est. Runway",
            value: runwayDays != null ? `${runwayDays}d` : "—",
            sub: burnRatePerDay > 0 ? `$${(burnRatePerDay / 100).toFixed(2)}/day` : undefined,
          },
          {
            label: "ICP Calibration",
            value: `${calibrationPct}%`,
            sub:
              calibrationPct >= 100
                ? "Signal Locked"
                : `${Math.max(0, 200 - scored)} leads to full lock`,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`bg-white rounded-lg border p-4 ${
              stat.alert ? "border-amber-300" : "border-gray-200"
            }`}
          >
            <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
            <div
              className={`text-xl font-bold ${
                stat.alert ? "text-amber-600" : "text-gray-900"
              }`}
            >
              {stat.value}
            </div>
            {stat.sub && (
              <div className="text-xs text-gray-400 mt-0.5">{stat.sub}</div>
            )}
          </div>
        ))}
      </div>

      {/* Lead asset counter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
        <div>
          <span className="text-sm text-gray-500">Owned lead database</span>
          <div className="text-2xl font-bold text-gray-900 mt-0.5">
            {totalLeads.toLocaleString()} contacts
          </div>
        </div>
        {customer.plan !== "floor" && (
          <div className="text-right">
            {segmentRows.map((row) => (
              <span
                key={row.segment}
                className={`inline-block ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                  SEGMENT_COLOR[row.segment] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {row.segment}: {row.cnt}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Subscription */}
      {stripeActive && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 mb-1">Subscription</div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  SUB_STATUS_STYLE[customer.subscriptionStatus] ??
                  "bg-gray-100 text-gray-600"
                }`}
              >
                {customer.subscriptionStatus}
              </span>
              <span className="text-sm text-gray-700 font-medium capitalize">
                {customer.plan} · {customer.billingCycle}
              </span>
              {customer.isFounder && (
                <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                  Founder locked
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {customer.stripeSubscriptionId &&
            customer.subscriptionStatus !== "cancelled" ? (
              <form action={cancelCustomerSubscription.bind(null, customerId)}>
                <button
                  type="submit"
                  className="text-xs border border-gray-300 rounded px-3 py-1.5 text-red-600 hover:bg-red-50"
                >
                  Cancel subscription
                </button>
              </form>
            ) : (
              <form action={createOrUpdateSubscription.bind(null, customerId)}>
                <button
                  type="submit"
                  className="text-xs bg-gray-900 text-white rounded px-3 py-1.5 hover:bg-gray-800"
                >
                  Create subscription
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Recent leads */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Recent Leads
        </h2>
        {recentLeads.length === 0 ? (
          <p className="text-sm text-gray-400">No leads yet.</p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Company</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Click Date</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Ingested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <Link
                        href={`/dashboard/clients/${id}/leads/${lead.id}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "—"}
                      </Link>
                      {lead.email && (
                        <div className="text-xs text-gray-400">{lead.email}</div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{lead.company ?? "—"}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {lead.leadType.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">
                      {lead.clickDate
                        ? new Date(lead.clickDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-400 text-xs">
                      {new Date(lead.ingestedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
