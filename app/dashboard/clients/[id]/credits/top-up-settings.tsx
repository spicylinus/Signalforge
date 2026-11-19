"use client";

import { useState } from "react";
import { updateTopUpSettings } from "@/lib/actions/credits";

interface Props {
  customerId: number;
  topUpMode: string;
  autoTopUpTriggerCents: number | null;
  autoTopUpAmountCents: number | null;
  lowBalanceThresholdCents: number;
  cardSaved: boolean;
}

export function TopUpSettingsPanel({
  customerId,
  topUpMode,
  autoTopUpTriggerCents,
  autoTopUpAmountCents,
  lowBalanceThresholdCents,
  cardSaved,
}: Props) {
  const [mode, setMode] = useState<"manual" | "auto">(
    topUpMode === "auto" ? "auto" : "manual"
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-900 mb-1">
        Top-Up Settings
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        {mode === "auto"
          ? "Automatically charge the saved card when balance falls below the trigger."
          : "Send an alert when balance falls below the threshold."}
      </p>

      {/* Mode toggle */}
      <div className="flex rounded border border-gray-200 mb-4 overflow-hidden text-sm">
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`flex-1 py-1.5 text-center transition-colors ${
            mode === "manual"
              ? "bg-gray-900 text-white"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          Manual
        </button>
        <button
          type="button"
          onClick={() => setMode("auto")}
          className={`flex-1 py-1.5 text-center transition-colors ${
            mode === "auto"
              ? "bg-gray-900 text-white"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          Auto
        </button>
      </div>

      <form
        action={updateTopUpSettings.bind(null, customerId)}
        className="space-y-3"
      >
        <input type="hidden" name="top_up_mode" value={mode} />

        {mode === "auto" ? (
          <>
            <div
              className={`text-xs px-3 py-2 rounded ${
                cardSaved
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {cardSaved
                ? "Card saved — auto top-ups are enabled."
                : "No card on file yet. Customer must complete a Stripe checkout first."}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Trigger below ($)
              </label>
              <input
                name="auto_top_up_trigger_dollars"
                type="number"
                step="1"
                min="1"
                required
                defaultValue={
                  autoTopUpTriggerCents
                    ? (autoTopUpTriggerCents / 100).toFixed(0)
                    : ""
                }
                placeholder="20"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Charge amount ($)
              </label>
              <input
                name="auto_top_up_amount_dollars"
                type="number"
                step="1"
                min="1"
                required
                defaultValue={
                  autoTopUpAmountCents
                    ? (autoTopUpAmountCents / 100).toFixed(0)
                    : ""
                }
                placeholder="100"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Alert threshold ($)
            </label>
            <input
              name="threshold_dollars"
              type="number"
              step="1"
              min="0"
              required
              defaultValue={(lowBalanceThresholdCents / 100).toFixed(0)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-white border border-gray-300 rounded px-4 py-2 text-sm hover:bg-gray-50"
        >
          Save
        </button>
      </form>
    </div>
  );
}
