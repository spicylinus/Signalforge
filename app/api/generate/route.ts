import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { brands, contentJobs, customers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateForJob } from "@/lib/agents/content-agent";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.email, session.user.email))
    .limit(1);

  if (!customer?.subscriptionStatus || customer.subscriptionStatus === "canceled") {
    return NextResponse.json({ error: "No active subscription" }, { status: 403 });
  }

  const body = await req.json() as { jobId?: string; brandId?: string; type?: string };

  // If a specific job is requested
  if (body.jobId) {
    const [job] = await db
      .select()
      .from(contentJobs)
      .where(eq(contentJobs.id, body.jobId))
      .limit(1);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Verify the job belongs to this customer
    const [brand] = await db
      .select()
      .from(brands)
      .where(eq(brands.id, job.brandId))
      .limit(1);

    if (!brand || brand.customerId !== customer.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await generateForJob(body.jobId);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "jobId required" }, { status: 400 });
}
