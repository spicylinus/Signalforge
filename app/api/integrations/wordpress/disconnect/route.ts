import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { customers, distributionSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.email, session.user.email))
    .limit(1);

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  await db
    .delete(distributionSettings)
    .where(eq(distributionSettings.customerId, customer.id));

  return NextResponse.json({ ok: true });
}
