"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const verified = searchParams.get("verify") === "1";
  const plan = searchParams.get("plan");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("email", {
      email,
      callbackUrl: plan ? `/onboarding?plan=${plan}` : "/dashboard",
      redirect: false,
    });
    setSent(true);
    setLoading(false);
  }

  if (verified || sent) {
    return (
      <div className="text-center">
        <div className="text-5xl mb-4">📬</div>
        <h2 className="text-2xl font-bold mb-2">Check your email</h2>
        <p className="text-gray-500">
          We sent a magic link to <strong>{email || "your email"}</strong>.
          Click it to sign in — no password needed.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-8">
        <Link href="/" className="text-2xl font-black tracking-tight">ContentForge</Link>
        <p className="text-gray-500 mt-2">Sign in or create your account</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 transition disabled:opacity-60"
        >
          {loading ? "Sending…" : "Continue with email"}
        </button>
      </form>
      <p className="text-center text-xs text-gray-400 mt-6">
        We&apos;ll email you a magic link — no password required.
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-md">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
