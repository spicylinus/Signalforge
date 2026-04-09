import { db } from "@/lib/db";
import { brands, contentJobs, customers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { addDays, addWeeks, nextMonday } from "@/lib/utils/dates";

/**
 * Enqueue the next billing-cycle content jobs for all brands belonging to a customer.
 * Called after a successful payment or new subscription.
 */
export async function enqueueNextCycleJobs(customerId: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  if (!customer?.plan) return;

  const customerBrands = await db
    .select()
    .from(brands)
    .where(eq(brands.customerId, customerId));

  const now = new Date();

  for (const brand of customerBrands) {
    const jobs = buildJobsForPlan(customer.plan, brand.id, now);
    if (jobs.length > 0) {
      await db.insert(contentJobs).values(jobs);
    }
  }
}

function buildJobsForPlan(
  plan: "solo" | "business" | "agency",
  brandId: string,
  from: Date
) {
  const jobs: (typeof contentJobs.$inferInsert)[] = [];

  // All plans: 4 blog posts (weekly)
  for (let i = 0; i < 4; i++) {
    jobs.push({
      brandId,
      type: "blog",
      status: "pending",
      scheduledAt: nextMonday(addWeeks(from, i)),
    });
  }

  // All plans: 20 social captions (5/week, Mon-Fri)
  for (let week = 0; week < 4; week++) {
    for (let day = 0; day < 5; day++) {
      jobs.push({
        brandId,
        type: "social",
        status: "pending",
        scheduledAt: addDays(nextMonday(addWeeks(from, week)), day),
      });
    }
  }

  if (plan === "business" || plan === "agency") {
    // Monthly newsletter
    jobs.push({
      brandId,
      type: "newsletter",
      status: "pending",
      scheduledAt: nextMonday(from),
    });
  }

  return jobs;
}
