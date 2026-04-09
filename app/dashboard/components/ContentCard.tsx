"use client";

import { useState } from "react";

type Props = {
  content: {
    id: string;
    title: string | null;
    body: string;
    wordCount: number | null;
    createdAt: Date;
  };
  jobType: string;
  brandName: string;
  platform: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  blog: "Blog Post",
  social: "Social Caption",
  newsletter: "Newsletter",
};

const PLATFORM_EMOJI: Record<string, string> = {
  linkedin: "💼",
  twitter: "🐦",
  instagram: "📸",
  email: "📧",
};

export default function ContentCard({ content, jobType, brandName, platform }: Props) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(content.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([content.body], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(content.title ?? jobType).replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const preview = content.body.slice(0, 200) + (content.body.length > 200 ? "…" : "");

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {TYPE_LABELS[jobType] ?? jobType}
              </span>
              {platform && (
                <span className="text-xs text-gray-400">
                  {PLATFORM_EMOJI[platform] ?? ""} {platform}
                </span>
              )}
              <span className="text-xs text-gray-300">·</span>
              <span className="text-xs text-gray-400">{brandName}</span>
              {content.wordCount && (
                <>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{content.wordCount} words</span>
                </>
              )}
            </div>
            {content.title && (
              <h3 className="font-semibold text-gray-900 text-base truncate">
                {content.title}
              </h3>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {expanded ? content.body : preview}
            </p>
            {content.body.length > 200 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-black font-medium mt-1 hover:underline"
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="border-t border-gray-50 px-6 py-3 flex gap-3">
        <button
          onClick={handleCopy}
          className="text-xs font-medium text-gray-600 hover:text-gray-900 transition"
        >
          {copied ? "✓ Copied!" : "Copy"}
        </button>
        <button
          onClick={handleDownload}
          className="text-xs font-medium text-gray-600 hover:text-gray-900 transition"
        >
          Download .md
        </button>
        <span className="text-xs text-gray-300 ml-auto">
          {new Date(content.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
