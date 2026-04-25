import { db } from "@/lib/db";
import {
  sfCustomers,
  sfBrands,
  sfBrandTopics,
  sfGscConnections,
  sfGscQueries,
  sfContentJobs,
} from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { upsertBrand, addBrandTopic, removeBrandTopic } from "@/lib/actions/brands";
import { queueContentJob } from "@/lib/actions/content";
import { isGscConfigured, gapScore } from "@/lib/gsc";

const FUNNEL_LABELS: Record<string, string> = {
  awareness: "Awareness — top-of-funnel, educational content",
  consideration: "Consideration — comparison & guide content",
  decision: "Decision — conversion-focused content",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  running: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
};

export default async function ContentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ gsc?: string }>;
}) {
  const { id } = await params;
  const { gsc: gscStatus } = await searchParams;
  const customerId = parseInt(id, 10);

  const customer = await db.query.sfCustomers.findFirst({
    where: eq(sfCustomers.id, customerId),
    columns: { id: true, companyName: true, name: true },
  });
  if (!customer) notFound();

  const [brand, gscConnection, contentJobs] = await Promise.all([
    db.query.sfBrands.findFirst({ where: eq(sfBrands.customerId, customerId) }),
    db.query.sfGscConnections.findFirst({
      where: eq(sfGscConnections.customerId, customerId),
    }),
    db.query.sfContentJobs.findMany({
      where: eq(sfContentJobs.customerId, customerId),
      orderBy: [desc(sfContentJobs.createdAt)],
      limit: 20,
    }),
  ]);

  const topics = brand
    ? await db.query.sfBrandTopics.findMany({
        where: eq(sfBrandTopics.brandId, brand.id),
        orderBy: [asc(sfBrandTopics.createdAt)],
      })
    : [];

  const topQueries = gscConnection
    ? await db.query.sfGscQueries
        .findMany({
          where: eq(sfGscQueries.connectionId, gscConnection.id),
          limit: 50,
        })
        .then((rows) =>
          rows.sort((a, b) => gapScore(b) - gapScore(a)).slice(0, 10)
        )
    : [];

  const gscConfigured = isGscConfigured();
  const defaultName = customer.companyName ?? customer.name;

  return (
    <div className="space-y-8">
      {/* Flash message */}
      {gscStatus && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            gscStatus === "connected"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {gscStatus === "connected" && "Google Search Console connected successfully."}
          {gscStatus === "denied" && "Google OAuth was cancelled or denied."}
          {gscStatus === "no_properties" && "No verified GSC properties found on this account."}
          {gscStatus === "no_refresh_token" &&
            "No refresh token returned. Reconnect and ensure you grant offline access."}
          {gscStatus === "error" && "An error occurred connecting to Google Search Console."}
          {gscStatus === "misconfigured" &&
            "GSC OAuth is not configured on this server (missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)."}
        </div>
      )}

      {/* ── Brand Configuration ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Brand Configuration</h2>
        <form
          action={upsertBrand.bind(null, customerId)}
          className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end"
        >
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Brand name</label>
            <input
              name="name"
              required
              defaultValue={brand?.name ?? defaultName}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Funnel stage
              <span className="ml-1 text-gray-400 font-normal">(set once, reflects strategic intent)</span>
            </label>
            <select
              name="funnel_stage"
              defaultValue={brand?.funnelStage ?? "awareness"}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              {Object.entries(FUNNEL_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="bg-gray-900 text-white rounded px-4 py-2 text-sm font-medium hover:bg-gray-800"
          >
            Save
          </button>
        </form>
      </div>

      {/* ── Manual Topics (fallback) ────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Content Topics</h2>
        <p className="text-xs text-gray-400 mb-4">
          Used as the content source when no GSC account is connected.
        </p>

        {brand ? (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {topics.map((t) => (
                <form key={t.id} action={removeBrandTopic.bind(null, customerId, t.id)}>
                  <button
                    type="submit"
                    title="Remove topic"
                    className="inline-flex items-center gap-1 bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 text-xs px-2 py-1 rounded"
                  >
                    {t.topic}
                    <span className="ml-0.5 text-gray-300">×</span>
                  </button>
                </form>
              ))}
              {topics.length === 0 && (
                <span className="text-xs text-gray-400">No topics yet</span>
              )}
            </div>

            <form
              action={addBrandTopic.bind(null, customerId, brand.id)}
              className="flex gap-2 items-center"
            >
              <input
                name="topic"
                required
                className="border border-gray-300 rounded px-2 py-1.5 text-xs w-64"
                placeholder="e.g. email marketing for small business"
              />
              <button
                type="submit"
                className="text-xs bg-gray-900 text-white rounded px-3 py-1.5 hover:bg-gray-800"
              >
                + Add
              </button>
            </form>
          </>
        ) : (
          <p className="text-xs text-gray-400">Save brand configuration first.</p>
        )}
      </div>

      {/* ── Google Search Console ────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-gray-900">Google Search Console</h2>
          {gscConnection && (
            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
              Connected
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Available on all plans. When connected, content jobs target real keyword gaps instead of
          manual topics.
        </p>

        {gscConnection ? (
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-gray-500">Property:</span>{" "}
              <span className="font-medium text-gray-900">{gscConnection.siteUrl}</span>
            </div>
            {gscConnection.lastSyncedAt && (
              <div className="text-sm">
                <span className="text-gray-500">Last synced:</span>{" "}
                <span className="text-gray-700">
                  {gscConnection.lastSyncedAt.toLocaleDateString()}
                </span>
              </div>
            )}
            <form
              method="DELETE"
              action={`/api/integrations/gsc/disconnect?customer_id=${customerId}`}
              onSubmit={(e) => {
                if (!confirm("Disconnect GSC? Existing queries will be deleted.")) {
                  e.preventDefault();
                }
              }}
            >
              <button
                type="submit"
                className="text-xs text-red-600 hover:underline"
              >
                Disconnect
              </button>
            </form>
          </div>
        ) : (
          <div>
            {gscConfigured ? (
              <a
                href={`/api/integrations/gsc/connect?customer_id=${customerId}`}
                className="inline-block bg-white border border-gray-300 rounded px-4 py-2 text-sm hover:bg-gray-50"
              >
                Connect Google Search Console
              </a>
            ) : (
              <p className="text-xs text-amber-600">
                Set <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> to enable
                GSC integration.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Top Keyword Gaps ─────────────────────────────────────────────────── */}
      {topQueries.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Top Keyword Gaps</h2>
          <p className="text-xs text-gray-400 mb-4">
            High impressions + low CTR = highest content opportunity. Sorted by gap score.
          </p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="pb-2 font-medium">Query</th>
                <th className="pb-2 font-medium text-right">Impressions</th>
                <th className="pb-2 font-medium text-right">Clicks</th>
                <th className="pb-2 font-medium text-right">CTR</th>
                <th className="pb-2 font-medium text-right">Avg position</th>
              </tr>
            </thead>
            <tbody>
              {topQueries.map((q) => (
                <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 text-gray-900 font-medium max-w-xs truncate">{q.query}</td>
                  <td className="py-2 text-right text-gray-600">
                    {q.impressions.toLocaleString()}
                  </td>
                  <td className="py-2 text-right text-gray-600">{q.clicks.toLocaleString()}</td>
                  <td className="py-2 text-right text-gray-600">
                    {(q.ctr * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 text-right text-gray-600">{q.position.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Content Jobs ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-gray-900">Content Jobs</h2>
          {brand && (
            <form action={queueContentJob.bind(null, customerId)}>
              <button
                type="submit"
                className="bg-gray-900 text-white rounded px-4 py-1.5 text-xs font-medium hover:bg-gray-800"
              >
                + Queue Next Job
              </button>
            </form>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Jobs are processed by the <code>generate-content</code> internal agent. Run it manually
          or via cron: <code>POST /api/internal/generate-content</code>
        </p>

        {contentJobs.length === 0 ? (
          <p className="text-sm text-gray-400">No content jobs yet.</p>
        ) : (
          <div className="space-y-3">
            {contentJobs.map((job) => (
              <details key={job.id} className="border border-gray-100 rounded-lg">
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${
                        STATUS_BADGE[job.status] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {job.status}
                    </span>
                    <span className="text-sm text-gray-900 font-medium truncate">
                      {job.targetQuery}
                    </span>
                  </div>
                  <div className="shrink-0 flex items-center gap-3 ml-4">
                    <span className="text-xs text-gray-400 capitalize">{job.funnelStage}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                      {job.source}
                    </span>
                    <span className="text-xs text-gray-400">
                      {job.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                </summary>
                {job.generatedContent && (
                  <div className="border-t border-gray-100 px-4 py-4">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                      {job.generatedContent}
                    </pre>
                  </div>
                )}
                {job.errorMessage && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    <p className="text-xs text-red-600">{job.errorMessage}</p>
                  </div>
                )}
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
