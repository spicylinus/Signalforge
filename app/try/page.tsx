import type { Metadata } from "next";
import TryForm from "./TryForm";

export const metadata: Metadata = {
  title: "Try ContentForge Free — See Your Brand's AI Blog Post",
  description:
    "Enter your business details and get a real AI-generated blog post in 20 seconds. No account required.",
};

export default function TryPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <a href="/" className="text-2xl font-black tracking-tight">
            ContentForge
          </a>
          <h1 className="text-4xl font-black mt-6 mb-3">
            See your brand&apos;s AI blog post — free
          </h1>
          <p className="text-gray-500 text-lg">
            Fill in your details. We&apos;ll write a real, publish-ready blog
            post in about 20 seconds. No account, no credit card.
          </p>
        </div>
        <TryForm />
      </div>
    </div>
  );
}
