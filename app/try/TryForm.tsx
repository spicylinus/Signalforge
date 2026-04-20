"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type State = "form" | "loading" | "result";

type SampleResult = {
  sampleId: string;
  title: string | null;
  body: string;
  wordCount: number;
  foundingSpotsRemaining: number;
};

export default function TryForm() {
  const router = useRouter();
  const [state, setState] = useState<State>("form");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SampleResult | null>(null);
  const [spots, setSpots] = useState<number | null>(null);
  const [leadEmail, setLeadEmail] = useState("");
  const [leadSubmitting, setLeadSubmitting] = useState(false);

  const [form, setForm] = useState({
    businessName: "",
    industry: "",
    topic: "",
    targetAudience: "",
  });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll founding spots every 30s while result is visible
  useEffect(() => {
    if (state !== "result") return;
    const fetchSpots = async () => {
      try {
        const res = await fetch("/api/founding-spots");
        if (res.ok) {
          const data = (await res.json()) as { remaining: number };
          setSpots(data.remaining);
        }
      } catch {
        // non-critical
      }
    };
    fetchSpots();
    pollRef.current = setInterval(fetchSpots, 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [state]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setState("loading");

    try {
      const res = await fetch("/api/generate-sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.status === 429) {
        setError(
          "You've already generated your 3 free samples today. Come back tomorrow or sign up to get started!"
        );
        setState("form");
        return;
      }

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Something went wrong. Please try again.");
        setState("form");
        return;
      }

      const data = (await res.json()) as SampleResult;
      setResult(data);
      setSpots(data.foundingSpotsRemaining);
      setState("result");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setState("form");
    }
  }

  async function handleLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!result) return;
    setLeadSubmitting(true);

    try {
      const res = await fetch("/api/generate-sample/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sampleId: result.sampleId, email: leadEmail }),
      });

      const data = (await res.json()) as { foundingSpotsRemaining?: number };
      const remaining = data.foundingSpotsRemaining ?? spots ?? 0;
      const encodedEmail = encodeURIComponent(leadEmail);
      const foundingParam = remaining > 0 ? "&founding=1" : "";
      router.push(`/login?plan=solo&email=${encodedEmail}${foundingParam}`);
    } catch {
      setLeadSubmitting(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
        <div className="text-4xl mb-4 animate-pulse">✍️</div>
        <p className="text-lg font-semibold mb-1">Writing your blog post…</p>
        <p className="text-sm text-gray-400">This takes about 15–20 seconds</p>
      </div>
    );
  }

  if (state === "result" && result) {
    const spotsLeft = spots ?? result.foundingSpotsRemaining;
    const hasSpots = spotsLeft > 0;

    return (
      <div className="space-y-6">
        {/* Blog post */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
            <span>{result.wordCount} words</span>
            <span>·</span>
            <span>AI-generated for {form.businessName}</span>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-gray-800">
            {result.body}
          </pre>
        </div>

        {/* Founding CTA */}
        <div
          className={`rounded-2xl border-2 p-8 ${
            hasSpots
              ? "border-orange-400 bg-orange-50"
              : "border-gray-200 bg-white"
          }`}
        >
          {hasSpots ? (
            <>
              <div className="text-sm font-bold text-orange-600 mb-2">
                {spotsLeft} founding member {spotsLeft === 1 ? "spot" : "spots"} remaining
              </div>
              <h2 className="text-2xl font-black mb-1">
                Get 4 posts like this every month — forever at $49/mo
              </h2>
              <p className="text-gray-500 text-sm mb-4">
                Regular price $99/mo · Annual billing · Rate locked forever · 30-day money-back guarantee
              </p>
              <div className="flex items-center gap-3 text-sm text-gray-600 mb-6">
                <span>✓ Rate locked forever</span>
                <span>✓ Cancel anytime after year 1</span>
                <span>✓ 30-day refund</span>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-black mb-1">
                Get 4 posts like this every month
              </h2>
              <p className="text-gray-500 text-sm mb-4">
                Starting at $99/mo · Cancel anytime · 30-day money-back guarantee
              </p>
            </>
          )}

          <form onSubmit={handleLeadSubmit} className="flex gap-3">
            <input
              type="email"
              required
              value={leadEmail}
              onChange={(e) => setLeadEmail(e.target.value)}
              placeholder="you@company.com"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button
              type="submit"
              disabled={leadSubmitting}
              className="bg-black text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 transition disabled:opacity-60 whitespace-nowrap"
            >
              {leadSubmitting ? "…" : hasSpots ? "Lock in my spot →" : "Get started →"}
            </button>
          </form>
        </div>

        <button
          onClick={() => { setState("form"); setResult(null); setError(null); }}
          className="text-sm text-gray-400 hover:text-gray-600 w-full text-center"
        >
          Generate another sample
        </button>
      </div>
    );
  }

  // Form state
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
          {error}
        </div>
      )}
      <form onSubmit={handleGenerate} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business name
          </label>
          <input
            type="text"
            required
            maxLength={200}
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            placeholder="e.g. Bloom Bakery"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Industry
          </label>
          <input
            type="text"
            required
            maxLength={200}
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
            placeholder="e.g. Artisan bakery &amp; café"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Blog topic
          </label>
          <input
            type="text"
            required
            maxLength={200}
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            placeholder="e.g. Why sourdough is healthier than regular bread"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target audience
          </label>
          <input
            type="text"
            required
            maxLength={200}
            value={form.targetAudience}
            onChange={(e) =>
              setForm({ ...form, targetAudience: e.target.value })
            }
            placeholder="e.g. Health-conscious families in Sydney"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-black text-white py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 transition"
        >
          Generate my free sample →
        </button>
        <p className="text-center text-xs text-gray-400">
          No account required · Takes ~20 seconds
        </p>
      </form>
    </div>
  );
}
