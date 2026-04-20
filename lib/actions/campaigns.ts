"use server";

import { db } from "@/lib/db";
import { sfCampaigns, sfKeywords } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createCampaign(customerId: number, formData: FormData) {
  const name = (formData.get("name") as string).trim();
  const leadType = formData.get("lead_type") as
    | "web_basic"
    | "web_advanced"
    | "b2c_search"
    | "b2b_search";
  const budgetDollars = formData.get("budget_dollars") as string;

  if (!name || !leadType) throw new Error("name and lead_type required");

  await db.insert(sfCampaigns).values({
    customerId,
    name,
    leadType,
    budgetCents: budgetDollars ? Math.round(parseFloat(budgetDollars) * 100) : null,
  });

  revalidatePath(`/dashboard/clients/${customerId}/campaigns`);
}

export async function toggleCampaign(
  customerId: number,
  campaignId: number,
  status: "active" | "paused"
) {
  await db
    .update(sfCampaigns)
    .set({ status, updatedAt: new Date() })
    .where(eq(sfCampaigns.id, campaignId));

  revalidatePath(`/dashboard/clients/${customerId}/campaigns`);
}

export async function addKeyword(
  customerId: number,
  campaignId: number,
  formData: FormData
) {
  const keyword = (formData.get("keyword") as string).trim().toLowerCase();
  const monthlySearchVolume = formData.get("monthly_search_volume") as string;
  const intentNotes = (formData.get("intent_notes") as string | null)?.trim() || null;
  const icpRelevanceScore = parseInt(
    (formData.get("icp_relevance_score") as string) || "3",
    10
  );

  if (!keyword) throw new Error("keyword required");

  await db.insert(sfKeywords).values({
    campaignId,
    keyword,
    monthlySearchVolume: monthlySearchVolume ? parseInt(monthlySearchVolume, 10) : null,
    intentNotes,
    icpRelevanceScore,
  });

  revalidatePath(`/dashboard/clients/${customerId}/campaigns`);
}

export async function deleteKeyword(customerId: number, keywordId: number) {
  await db.delete(sfKeywords).where(eq(sfKeywords.id, keywordId));
  revalidatePath(`/dashboard/clients/${customerId}/campaigns`);
}
