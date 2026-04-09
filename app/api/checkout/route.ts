import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  createFanbasisCustomer,
  createCheckoutSession,
  PRICE_IDS,
} from "@/lib/fanbasis/client";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan } = await req.json() as { plan: "solo" | "business" | "agency" };
  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.email, session.user.email))
    .limit(1);

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Create Fanbasis customer if needed
  let fanbasisCustomerId = customer.fanbasisCustomerId;
  if (!fanbasisCustomerId) {
    const fbCustomer = await createFanbasisCustomer(
      session.user.email,
      session.user.name ?? undefined
    );
    fanbasisCustomerId = fbCustomer.id;
    await db
      .update(customers)
      .set({ fanbasisCustomerId, updatedAt: new Date() })
      .where(eq(customers.id, customer.id));
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const session_ = await createCheckoutSession({
    customerId: fanbasisCustomerId,
    priceId,
    successUrl: `${baseUrl}/dashboard?checkout=success`,
    cancelUrl: `${baseUrl}/pricing`,
    metadata: { customerId: customer.id, plan },
  });

  return NextResponse.json({ url: session_.url });
}
