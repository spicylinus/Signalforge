"use client";

export default function BillingPortalButton() {
  async function handleClick() {
    const res = await fetch("/api/billing-portal", { method: "POST" });
    const { url } = await res.json() as { url: string };
    window.location.href = url;
  }

  return (
    <button
      onClick={handleClick}
      className="text-sm font-medium border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
    >
      Manage billing
    </button>
  );
}
