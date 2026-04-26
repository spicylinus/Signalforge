"use client";

import { useState } from "react";
import { generateCreditCheckoutLink } from "@/lib/actions/billing";

export function StripeCheckoutButton({ customerId }: { customerId: number }) {
  const [amountDollars, setAmountDollars] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    const dollars = parseFloat(amountDollars);
    if (!dollars || dollars <= 0) return;
    setLoading(true);
    setUrl(null);
    setError(null);
    try {
      const link = await generateCreditCheckoutLink(customerId, Math.round(dollars * 100));
      setUrl(link);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleGenerate} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Amount ($)</label>
          <input
            type="number"
            step="0.01"
            min="1"
            required
            value={amountDollars}
            onChange={(e) => setAmountDollars(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            placeholder="500.00"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white rounded py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate Stripe Link"}
        </button>
      </form>

      {url && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Send this link to the customer:</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={url}
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 bg-gray-50"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={() => navigator.clipboard.writeText(url)}
              className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
