import { db } from "@/lib/db";
import { sfCreditAccounts, sfCreditPurchases, sfCustomers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { addCredits, updateLowBalanceThreshold } from "@/lib/actions/credits";

const BONUS_TIERS = [
  { min: 500000, label: "$5,000+", pct: "15%" },
  { min: 100000, label: "$1,000–$4,999", pct: "10%" },
  { min: 50000, label: "$500–$999", pct: "5%" },
];

export default async function CreditsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customerId = parseInt(id, 10);

  const [customer, account, purchases] = await Promise.all([
    db.query.sfCustomers.findFirst({
      where: eq(sfCustomers.id, customerId),
      columns: { id: true },
    }),
    db.query.sfCreditAccounts.findFirst({
      where: eq(sfCreditAccounts.customerId, customerId),
    }),
    db.query.sfCreditPurchases.findMany({
      where: eq(sfCreditPurchases.customerId, customerId),
      orderBy: [desc(sfCreditPurchases.loadedAt)],
    }),
  ]);

  if (!customer || !account) notFound();

  const isLow = account.balanceCents < account.lowBalanceThresholdCents;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Balance",
            value: `$${(account.balanceCents / 100).toFixed(2)}`,
            alert: isLow,
          },
          {
            label: "Total Loaded",
            value: `$${(account.totalLoadedCents / 100).toFixed(2)}`,
          },
          {
            label: "Total Spent",
            value: `$${(account.totalSpentCents / 100).toFixed(2)}`,
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`bg-white rounded-lg border p-4 ${
              s.alert ? "border-amber-300" : "border-gray-200"
            }`}
          >
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div
              className={`text-xl font-bold ${
                s.alert ? "text-amber-600" : "text-gray-900"
              }`}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Add credits */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            Add Credits
          </h2>
          <div className="text-xs text-gray-400 mb-4">
            Load bonuses: 5% ≥$500 · 10% ≥$1,000 · 15% ≥$5,000
          </div>
          <form
            action={addCredits.bind(null, customerId)}
            className="space-y-3"
          >
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Amount ($)
              </label>
              <input
                name="amount_dollars"
                type="number"
                step="0.01"
                min="1"
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="500.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Payment reference
              </label>
              <input
                name="payment_reference"
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="INV-1234 or stripe_pi_..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Loaded by
              </label>
              <input
                name="loaded_by"
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="your name"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gray-900 text-white rounded py-2 text-sm font-medium hover:bg-gray-800"
            >
              Load Credits
            </button>
          </form>
        </div>

        {/* Low-balance threshold */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            Low-Balance Alert
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Alert fires when balance drops below this threshold. Current:{" "}
            <strong className="text-gray-700">
              ${(account.lowBalanceThresholdCents / 100).toFixed(0)}
            </strong>
          </p>
          <form
            action={updateLowBalanceThreshold.bind(null, customerId)}
            className="flex gap-3 items-end"
          >
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                New threshold ($)
              </label>
              <input
                name="threshold_dollars"
                type="number"
                step="1"
                min="0"
                required
                defaultValue={(account.lowBalanceThresholdCents / 100).toFixed(0)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="bg-white border border-gray-300 rounded px-4 py-2 text-sm hover:bg-gray-50"
            >
              Update
            </button>
          </form>
        </div>
      </div>

      {/* Purchase history */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          Credit History
        </h2>
        {purchases.length === 0 ? (
          <p className="text-sm text-gray-400">No transactions yet.</p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Date</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Amount</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Bonus</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Reference</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 text-gray-500 text-xs">
                      {new Date(p.loadedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">
                      ${(p.amountCents / 100).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right text-green-700 text-xs">
                      {p.bonusCents > 0
                        ? `+$${(p.bonusCents / 100).toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">
                      {p.paymentReference ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">
                      {p.loadedBy ?? "—"}
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
