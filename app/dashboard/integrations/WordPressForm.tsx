"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Existing = {
  wpSiteUrl: string;
  wpUsername: string;
  wpPublishStatus: "draft" | "publish";
  autoPublishBlog: boolean;
};

export default function WordPressForm({ existing }: { existing: Existing | null }) {
  const router = useRouter();
  const [form, setForm] = useState({
    wpSiteUrl: existing?.wpSiteUrl ?? "",
    wpUsername: existing?.wpUsername ?? "",
    wpAppPassword: "",
    wpPublishStatus: existing?.wpPublishStatus ?? "draft",
    autoPublishBlog: existing?.autoPublishBlog ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/integrations/wordpress/test", { method: "POST" });
      setTestResult(res.ok ? "ok" : "fail");
    } catch {
      setTestResult("fail");
    } finally {
      setTesting(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    const res = await fetch("/api/integrations/wordpress/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      router.refresh();
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setSaveError(data.error ?? "Failed to save. Please try again.");
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 mt-4">
      {saveError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {saveError}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          WordPress site URL
        </label>
        <input
          type="url"
          required
          value={form.wpSiteUrl}
          onChange={(e) => setForm({ ...form, wpSiteUrl: e.target.value })}
          placeholder="https://yourblog.com"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          WordPress username
        </label>
        <input
          type="text"
          required
          value={form.wpUsername}
          onChange={(e) => setForm({ ...form, wpUsername: e.target.value })}
          placeholder="your-wp-username"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Application password
          <span className="text-gray-400 font-normal ml-1">
            (WP Admin → Users → Profile → Application Passwords)
          </span>
        </label>
        <input
          type="password"
          required={!existing}
          value={form.wpAppPassword}
          onChange={(e) => setForm({ ...form, wpAppPassword: e.target.value })}
          placeholder={existing ? "Leave blank to keep existing password" : "xxxx xxxx xxxx xxxx xxxx xxxx"}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Publish posts as
        </label>
        <select
          value={form.wpPublishStatus}
          onChange={(e) =>
            setForm({
              ...form,
              wpPublishStatus: e.target.value as "draft" | "publish",
            })
          }
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
        >
          <option value="draft">Draft (review before publishing)</option>
          <option value="publish">Published (go live immediately)</option>
        </select>
      </div>
      <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
        <div>
          <div className="text-sm font-medium text-gray-700">Auto-publish blog posts</div>
          <div className="text-xs text-gray-400 mt-0.5">
            Automatically send generated posts to WordPress
          </div>
        </div>
        <button
          type="button"
          onClick={() => setForm({ ...form, autoPublishBlog: !form.autoPublishBlog })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            form.autoPublishBlog ? "bg-black" : "bg-gray-200"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              form.autoPublishBlog ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="flex gap-3 pt-2">
        {existing && (
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="border border-gray-200 text-gray-700 px-5 py-3 rounded-xl font-medium text-sm hover:bg-gray-50 transition disabled:opacity-60"
          >
            {testing ? "Testing…" : "Test connection"}
          </button>
        )}
        {testResult === "ok" && (
          <span className="text-green-600 text-sm self-center">Connected</span>
        )}
        {testResult === "fail" && (
          <span className="text-red-600 text-sm self-center">Connection failed</span>
        )}
        <button
          type="submit"
          disabled={saving}
          className="ml-auto bg-black text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 transition disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save & connect"}
        </button>
      </div>
    </form>
  );
}
