"use server";

import { enqueueNextContentJob } from "@/lib/agents/content-agent";
import { revalidatePath } from "next/cache";

export async function queueContentJob(customerId: number) {
  await enqueueNextContentJob(customerId);
  revalidatePath(`/dashboard/clients/${customerId}/content`);
}
