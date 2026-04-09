import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { brands, contentJobs, customers, generatedContent } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import ContentCard from "@/app/dashboard/components/ContentCard";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.email, session.user.email))
    .limit(1);

  if (!customer) redirect("/login");

  // If no subscription, prompt to subscribe
  if (!customer.plan || customer.subscriptionStatus === "canceled") {
    redirect("/pricing");
  }

  const customerBrands = await db
    .select()
    .from(brands)
    .where(eq(brands.customerId, customer.id));

  if (customerBrands.length === 0) redirect("/onboarding");

  // Fetch recent generated content across all brands
  const recentContent = await db
    .select({
      content: generatedContent,
      job: contentJobs,
      brand: brands,
    })
    .from(generatedContent)
    .innerJoin(contentJobs, eq(generatedContent.jobId, contentJobs.id))
    .innerJoin(brands, eq(contentJobs.brandId, brands.id))
    .where(eq(brands.customerId, customer.id))
    .orderBy(desc(generatedContent.createdAt))
    .limit(20);

  const pendingCount = await db
    .select()
    .from(contentJobs)
    .innerJoin(brands, eq(contentJobs.brandId, brands.id))
    .where(eq(brands.customerId, customer.id))
    // status = pending
    .then((rows) => rows.filter((r) => r.cf_content_jobs.status === "pending").length);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-black tracking-tight">ContentForge</Link>
        <div className="flex items-center gap-6 text-sm">
          <span className="text-gray-500">{session.user.email}</span>
          <Link href="/dashboard/settings" className="text-gray-600 hover:text-gray-900">Settings</Link>
          <Link href="/api/auth/signout" className="text-gray-400 hover:text-gray-700">Sign out</Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-10">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="text-3xl font-black">{recentContent.length}</div>
            <div className="text-sm text-gray-400 mt-1">Pieces generated</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="text-3xl font-black">{pendingCount}</div>
            <div className="text-sm text-gray-400 mt-1">Jobs queued</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="text-3xl font-black capitalize">{customer.plan}</div>
            <div className="text-sm text-gray-400 mt-1">Current plan</div>
          </div>
        </div>

        {/* Content list */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Your content</h2>
        </div>

        {recentContent.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <div className="text-4xl mb-4">✍️</div>
            <h3 className="text-lg font-semibold mb-2">Content is being generated</h3>
            <p className="text-gray-400 text-sm">
              Your first batch of content will be ready within 24 hours.
              Check back soon!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentContent.map(({ content, job, brand }) => (
              <ContentCard
                key={content.id}
                content={content}
                jobType={job.type}
                brandName={brand.name}
                platform={content.platform}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
