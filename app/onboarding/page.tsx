"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const TONE_OPTIONS = [
  "Professional", "Friendly", "Witty", "Authoritative",
  "Conversational", "Bold", "Empathetic", "Educational",
];

function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") ?? "solo";

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    brandName: "",
    industry: "",
    tone: [] as string[],
    topics: "",
    targetAudience: "",
    sampleContent: "",
    websiteUrl: "",
  });

  function toggleTone(t: string) {
    setForm((f) => ({
      ...f,
      tone: f.tone.includes(t) ? f.tone.filter((x) => x !== t) : [...f.tone, t].slice(0, 3),
    }));
  }

  async function handleFinish() {
    setLoading(true);
    try {
      // Save brand
      const brandRes = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          topics: form.topics.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      if (!brandRes.ok) throw new Error("Failed to save brand");

      // Redirect to checkout
      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const { url } = await checkoutRes.json() as { url: string };
      window.location.href = url;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-xl">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full ${s <= step ? "bg-black" : "bg-gray-200"}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-bold">Tell us about your brand</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Business name</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Acme Corp"
                value={form.brandName}
                onChange={(e) => setForm({ ...form, brandName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Industry</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="e.g. SaaS, Real Estate, Fitness coaching"
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Website (optional)</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="https://yoursite.com"
                value={form.websiteUrl}
                onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
              />
            </div>
            <button
              className="w-full bg-black text-white py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 transition"
              disabled={!form.brandName || !form.industry}
              onClick={() => setStep(2)}
            >
              Continue →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-bold">Define your voice</h2>
            <div>
              <label className="block text-sm font-medium mb-2">
                Tone (pick up to 3)
              </label>
              <div className="flex flex-wrap gap-2">
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleTone(t)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                      form.tone.includes(t)
                        ? "bg-black text-white border-black"
                        : "border-gray-200 text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target audience</label>
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="e.g. small business owners, early-stage founders"
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 border border-gray-200 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
                Back
              </button>
              <button
                className="flex-1 bg-black text-white py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 transition"
                disabled={form.tone.length === 0 || !form.targetAudience}
                onClick={() => setStep(3)}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-bold">What should we write about?</h2>
            <div>
              <label className="block text-sm font-medium mb-1">
                Content topics (comma-separated)
              </label>
              <input
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="productivity, remote work, leadership, growth hacking"
                value={form.topics}
                onChange={(e) => setForm({ ...form, topics: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">Enter 3–6 topics</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Sample content (optional)
              </label>
              <textarea
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black h-28 resize-none"
                placeholder="Paste a blog post or social caption you've written so we can match your voice…"
                value={form.sampleContent}
                onChange={(e) => setForm({ ...form, sampleContent: e.target.value })}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 border border-gray-200 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
                Back
              </button>
              <button
                className="flex-1 bg-black text-white py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 transition disabled:opacity-60"
                disabled={!form.topics || loading}
                onClick={handleFinish}
              >
                {loading ? "Setting up…" : "Launch my content →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingForm />
    </Suspense>
  );
}
