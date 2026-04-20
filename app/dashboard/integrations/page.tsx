import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { customers, distributionSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import WordPressForm from "./WordPressForm";

export default async function IntegrationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.email, session.user.email))
    .limit(1);

  if (!customer) redirect("/login");

  const [wpSettings] = await db
    .select()
    .from(distributionSettings)
    .where(eq(distributionSettings.customerId, customer.id))
    .limit(1);

  const existing = wpSettings
    ? {
        wpSiteUrl: wpSettings.wpSiteUrl,
        wpUsername: wpSettings.wpUsername,
        wpPublishStatus: wpSettings.wpPublishStatus,
        autoPublishBlog: wpSettings.autoPublishBlog,
      }
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-black tracking-tight">
          ContentForge
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
            Dashboard
          </Link>
          <Link
            href="/dashboard/integrations"
            className="text-gray-900 font-medium"
          >
            Integrations
          </Link>
          <Link
            href="/dashboard/settings"
            className="text-gray-600 hover:text-gray-900"
          >
            Settings
          </Link>
          <Link
            href="/api/auth/signout"
            className="text-gray-400 hover:text-gray-700"
          >
            Sign out
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-8 py-10">
        <h1 className="text-2xl font-bold mb-8">Integrations</h1>

        <div className="space-y-6">
          {/* WordPress card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                  W
                </div>
                <div>
                  <h2 className="font-semibold">WordPress</h2>
                  <p className="text-xs text-gray-400">
                    Auto-publish blog posts to your WordPress site
                  </p>
                </div>
              </div>
              {wpSettings ? (
                <span className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  Connected
                </span>
              ) : (
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                  Not connected
                </span>
              )}
            </div>

            {wpSettings && (
              <div className="text-sm text-gray-500 mb-4">
                <span className="font-medium">{wpSettings.wpSiteUrl}</span>
                {" · "}
                <span>@{wpSettings.wpUsername}</span>
              </div>
            )}

            <WordPressForm existing={existing} />

            {wpSettings && (
              <form
                action="/api/integrations/wordpress/disconnect"
                method="DELETE"
                className="mt-4"
              >
                <DisconnectButton />
              </form>
            )}
          </div>

          {/* LinkedIn card — coming soon */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8 opacity-60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white font-bold text-lg">
                  in
                </div>
                <div>
                  <h2 className="font-semibold">LinkedIn</h2>
                  <p className="text-xs text-gray-400">
                    Auto-publish social posts to your LinkedIn page
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                Coming soon
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DisconnectButton() {
  return (
    <button
      type="submit"
      formAction="/api/integrations/wordpress/disconnect"
      className="text-xs text-red-500 hover:text-red-700"
      onClick={async (e) => {
        e.preventDefault();
        if (!confirm("Disconnect WordPress? Future posts will no longer auto-publish.")) return;
        await fetch("/api/integrations/wordpress/disconnect", { method: "DELETE" });
        window.location.reload();
      }}
    >
      Disconnect WordPress
    </button>
  );
}
