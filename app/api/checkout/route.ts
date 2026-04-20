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
import {
  FOUNDING_PRICE_IDS,
  isFoundingAvailable,
} from "@/lib/founding";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as {
    plan: "solo" | "business" | "agency";
    founding?: boolean;
  };
  const { plan, founding = false } = body;

  if (!PRICE_IDS[plan]) {
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

  // Determine price — read spot count from DB, never trust client
  let priceId: string;
  let foundingExpired = false;

  if (founding) {
    const available = await isFoundingAvailable();
    if (available && FOUNDING_PRICE_IDS[plan]) {
      priceId = FOUNDING_PRICE_IDS[plan];
    } else {
      priceId = PRICE_IDS[plan];
      foundingExpired = true;
    }
  } else {
    priceId = PRICE_IDS[plan];
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
  const checkoutSession = await createCheckoutSession({
    customerId: fanbasisCustomerId,
    priceId,
    successUrl: `${baseUrl}/dashboard?checkout=success`,
    cancelUrl: `${baseUrl}/pricing`,
    metadata: {
      customerId: customer.id,
      plan,
      founding: founding && !foundingExpired ? "true" : "false",
    },
  });

  return NextResponse.json({ url: checkoutSession.url, foundingExpired });
}
