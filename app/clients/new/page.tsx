import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/actions/clients";
import Link from "next/link";

export default async function NewClientPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
            ← Dashboard
          </Link>
          <span className="text-sm font-semibold text-gray-900">New Client</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <form action={createClient} className="bg-white rounded-lg border border-gray-200 p-8 space-y-6">
          <h1 className="text-xl font-bold text-gray-900">Onboard New Client</h1>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full name *
              </label>
              <input
                name="name"
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                name="email"
                type="email"
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                placeholder="jane@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company name
            </label>
            <input
              name="company_name"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Acme Corp"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan *
              </label>
              <select
                name="plan"
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="floor">Floor — $995/mo</option>
                <option value="guided">Guided — $1,995/mo</option>
                <option value="enterprise">Enterprise — $3,995/mo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Billing cycle *
              </label>
              <select
                name="billing_cycle"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Annual (10 mo price, 12 mo service)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Setup fee paid ($)
            </label>
            <input
              name="setup_fee_paid_cents"
              type="number"
              step="1"
              min="0"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="4500 (enter cents, e.g. 450000 for $4,500)"
            />
            <p className="text-xs text-gray-400 mt-1">
              Enter in cents: Floor $250000 · Guided $450000 · Enterprise $750000
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_founder"
              name="is_founder"
              className="w-4 h-4 rounded border-gray-300"
            />
            <label htmlFor="is_founder" className="text-sm text-gray-700">
              Founder spot — locks platform fee permanently (first 60 clients)
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ICP Description
            </label>
            <textarea
              name="icp_description"
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Describe the ideal customer profile: industry, company size, job titles, pain points, keywords they search..."
            />
            <p className="text-xs text-gray-400 mt-1">
              Used by Claude AI to score leads against this client's ICP (Guided/Enterprise).
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="bg-gray-900 text-white rounded-md px-6 py-2 text-sm font-medium hover:bg-gray-800"
            >
              Create Client
            </button>
            <Link
              href="/dashboard"
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
