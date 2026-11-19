"use server";

import { db } from "@/lib/db";
import { sfBrands, sfBrandTopics } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function upsertBrand(customerId: number, formData: FormData) {
  const name = (formData.get("name") as string).trim();
  const funnelStage = formData.get("funnel_stage") as
    | "awareness"
    | "consideration"
    | "decision";

  if (!name || !funnelStage) throw new Error("name and funnel_stage are required");

  const existing = await db.query.sfBrands.findFirst({
    where: eq(sfBrands.customerId, customerId),
    columns: { id: true },
  });

  if (existing) {
    await db
      .update(sfBrands)
      .set({ name, funnelStage, updatedAt: new Date() })
      .where(eq(sfBrands.id, existing.id));
  } else {
    await db.insert(sfBrands).values({ customerId, name, funnelStage });
  }

  revalidatePath(`/dashboard/clients/${customerId}/content`);
}

export async function addBrandTopic(
  customerId: number,
  brandId: number,
  formData: FormData
) {
  const topic = (formData.get("topic") as string).trim();
  if (!topic) throw new Error("topic is required");

  await db.insert(sfBrandTopics).values({ brandId, topic });
  revalidatePath(`/dashboard/clients/${customerId}/content`);
}

export async function removeBrandTopic(customerId: number, topicId: number) {
  await db.delete(sfBrandTopics).where(eq(sfBrandTopics.id, topicId));
  revalidatePath(`/dashboard/clients/${customerId}/content`);
}
