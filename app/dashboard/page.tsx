import { db } from "@/lib/db";
import { sfCustomers, sfCreditAccounts, sfLeads, sfSettings } from "@/lib/db/schema";
import { eq, sql, count } from "drizzle-orm";
import Link from "next/link";

const PLAN_LABEL: Record<string, string> = {
  floor: "Floor",
  guided: "Guided",
  enterprise: "Enterprise",
};

const PLAN_COLOR: Record<string, string> = {
  floor: "bg-gray-100 text-gray-700",
  guided: "bg-blue-100 text-blue-700",
  enterprise: "bg-purple-100 text-purple-700",
};

function BalanceBadge({ cents, thresholdCents }: { cents: number; thresholdCents: number }) {
  const dollars = (cents / 100).toFixed(2);
  if (cents <= 0) return <span className="text-xs font-medium text-red-600">${dollars}</span>;
  if (cents < thresholdCents) return <span className="text-xs font-medium text-amber-600">${dollars}</span>;
  return <span className="text-xs font-medium text-green-700">${dollars}</span>;
}

export default async function DashboardPage() {
  const [customers, creditRows, leadCounts, founderSetting] = await Promise.all([
    db.query.sfCustomers.findMany({ orderBy: (t, { asc }) => [asc(t.createdAt)] }),
    db.query.sfCreditAccounts.findMany(),
    db
      .select({ customerId: sfLeads.customerId, cnt: count() })
      .from(sfLeads)
      .groupBy(sfLeads.customerId),
    db.query.sfSettings.findFirst({ where: eq(sfSettings.key, "founder_spots_taken") }),
  ]);

  const creditMap = new Map(creditRows.map((c) => [c.customerId, c]));
  const leadMap = new Map(leadCounts.map((r) => [r.customerId, r.cnt]));
  const founderCount = parseInt(founderSetting?.value ?? "0", 10);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {customers.length} total · Founder spots: {founderCount}/60
          </p>
        </div>
        <Link
          href="/clients/new"
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
        >
          + New Client
        </Link>
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          No clients yet.{" "}
          <Link href="/clients/new" className="underline">
            Add the first one.
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Plan</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Credit Balance</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Leads</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((c) => {
                const credit = creditMap.get(c.id);
                const leads = leadMap.get(c.id) ?? 0;
                const isAtRisk =
                  credit &&
                  credit.balanceCents < credit.lowBalanceThresholdCents;
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/clients/${c.id}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {c.name}
                      </Link>
                      {c.companyName && (
                        <div className="text-xs text-gray-400">{c.companyName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          PLAN_COLOR[c.plan] ?? "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {PLAN_LABEL[c.plan] ?? c.plan}
                      </span>
                      {c.isFounder && (
                        <span className="ml-1 inline-block px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                          Founder #{c.founderSpotNumber}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {credit ? (
                        <BalanceBadge
                          cents={credit.balanceCents}
                          thresholdCents={credit.lowBalanceThresholdCents}
                        />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {leads.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {isAtRisk ? (
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                          Low Balance
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
