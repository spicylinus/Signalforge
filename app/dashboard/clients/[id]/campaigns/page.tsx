import { db } from "@/lib/db";
import { sfCampaigns, sfKeywords, sfCustomers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  createCampaign,
  toggleCampaign,
  addKeyword,
  deleteKeyword,
} from "@/lib/actions/campaigns";

const LEAD_TYPE_LABEL: Record<string, string> = {
  web_basic: "Web Basic ($0.20)",
  web_advanced: "Web Advanced ($0.30)",
  b2c_search: "B2C Search ($0.90)",
  b2b_search: "B2B Search ($1.90)",
};

export default async function CampaignsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customerId = parseInt(id, 10);

  const [customer, campaigns] = await Promise.all([
    db.query.sfCustomers.findFirst({
      where: eq(sfCustomers.id, customerId),
      columns: { id: true },
    }),
    db.query.sfCampaigns.findMany({
      where: eq(sfCampaigns.customerId, customerId),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    }),
  ]);

  if (!customer) notFound();

  const keywordsByCampaign = await Promise.all(
    campaigns.map((c) =>
      db.query.sfKeywords
        .findMany({ where: eq(sfKeywords.campaignId, c.id) })
        .then((kws) => [c.id, kws] as const)
    )
  );
  const kwMap = new Map(keywordsByCampaign);

  return (
    <div className="space-y-8">
      {/* New campaign form */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          New Campaign
        </h2>
        <form
          action={createCampaign.bind(null, customerId)}
          className="grid grid-cols-4 gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Campaign name
            </label>
            <input
              name="name"
              required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder="Q3 Outbound"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Lead type
            </label>
            <select
              name="lead_type"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              {Object.entries(LEAD_TYPE_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Monthly budget ($)
            </label>
            <input
              name="budget_dollars"
              type="number"
              step="0.01"
              min="0"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder="500"
            />
          </div>
          <button
            type="submit"
            className="bg-gray-900 text-white rounded px-4 py-2 text-sm font-medium hover:bg-gray-800"
          >
            Create
          </button>
        </form>
      </div>

      {/* CSV upload */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          Upload Leads CSV
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Leadhacker export — RFC 4180 CSV, max 5 MB / 5,000 rows
        </p>
        <form
          action={`/api/leads/upload-csv?customer_id=${customerId}`}
          method="post"
          encType="multipart/form-data"
          className="flex gap-3 items-center"
        >
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            className="text-sm text-gray-600"
          />
          <button
            type="submit"
            className="bg-white border border-gray-300 rounded px-4 py-2 text-sm hover:bg-gray-50"
          >
            Upload
          </button>
        </form>
      </div>

      {/* Campaign list */}
      {campaigns.length === 0 ? (
        <p className="text-sm text-gray-400">No campaigns yet.</p>
      ) : (
        campaigns.map((campaign) => {
          const keywords = kwMap.get(campaign.id) ?? [];
          return (
            <div
              key={campaign.id}
              className="bg-white rounded-lg border border-gray-200 p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="font-semibold text-gray-900">
                    {campaign.name}
                  </span>
                  <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    {LEAD_TYPE_LABEL[campaign.leadType] ?? campaign.leadType}
                  </span>
                  {campaign.budgetCents && (
                    <span className="ml-2 text-xs text-gray-400">
                      ${(campaign.budgetCents / 100).toFixed(0)}/mo budget
                    </span>
                  )}
                </div>
                <form
                  action={toggleCampaign.bind(
                    null,
                    customerId,
                    campaign.id,
                    campaign.status === "active" ? "paused" : "active"
                  )}
                >
                  <button
                    type="submit"
                    className={`text-xs px-3 py-1 rounded border ${
                      campaign.status === "active"
                        ? "border-amber-300 text-amber-700 hover:bg-amber-50"
                        : "border-green-300 text-green-700 hover:bg-green-50"
                    }`}
                  >
                    {campaign.status === "active" ? "Pause" : "Activate"}
                  </button>
                </form>
              </div>

              {/* Keywords */}
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {keywords.map((kw) => (
                    <form key={kw.id} action={deleteKeyword.bind(null, customerId, kw.id)}>
                      <button
                        type="submit"
                        title="Remove keyword"
                        className="inline-flex items-center gap-1 bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 text-xs px-2 py-1 rounded"
                      >
                        {kw.keyword}
                        {kw.icpRelevanceScore != null && (
                          <span className="text-gray-400">
                            ·{kw.icpRelevanceScore}/5
                          </span>
                        )}
                        <span className="ml-0.5 text-gray-300">×</span>
                      </button>
                    </form>
                  ))}
                  {keywords.length === 0 && (
                    <span className="text-xs text-gray-400">No keywords yet</span>
                  )}
                </div>

                {/* Add keyword */}
                <form
                  action={addKeyword.bind(null, customerId, campaign.id)}
                  className="flex gap-2 items-center"
                >
                  <input
                    name="keyword"
                    required
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-48"
                    placeholder="keyword phrase"
                  />
                  <input
                    name="monthly_search_volume"
                    type="number"
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-28"
                    placeholder="search vol."
                  />
                  <select
                    name="icp_relevance_score"
                    className="border border-gray-300 rounded px-2 py-1 text-xs"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n}/5 ICP fit
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="text-xs bg-gray-900 text-white rounded px-3 py-1 hover:bg-gray-800"
                  >
                    + Add
                  </button>
                </form>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
