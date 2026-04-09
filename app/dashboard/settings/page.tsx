import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import BillingPortalButton from "./BillingPortalButton";
import Link from "next/link";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.email, session.user.email))
    .limit(1);

  if (!customer) redirect("/login");

  const PLAN_PRICES: Record<string, string> = {
    solo: "$99/mo",
    business: "$199/mo",
    agency: "$349/mo",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-black tracking-tight">ContentForge</Link>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">← Dashboard</Link>
      </header>

      <div className="max-w-2xl mx-auto px-8 py-10 space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Account</h2>
          <div className="text-sm text-gray-500">
            <span className="font-medium text-gray-800">Email:</span>{" "}
            {customer.email}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Subscription</h2>
          {customer.plan ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium capitalize">{customer.plan} Plan</div>
                  <div className="text-sm text-gray-400">
                    {PLAN_PRICES[customer.plan]} ·{" "}
                    <span className="capitalize">{customer.subscriptionStatus}</span>
                  </div>
                </div>
                <BillingPortalButton />
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500">
              No active subscription.{" "}
              <Link href="/pricing" className="text-black font-medium hover:underline">
                Choose a plan →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
