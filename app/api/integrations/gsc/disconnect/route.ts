import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sfGscConnections, sfGscQueries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(req: NextRequest) {
  const customerIdParam = req.nextUrl.searchParams.get("customer_id");
  const customerId = customerIdParam ? parseInt(customerIdParam, 10) : NaN;
  if (!customerId || isNaN(customerId)) {
    return NextResponse.json({ error: "customer_id is required" }, { status: 400 });
  }

  const connection = await db.query.sfGscConnections.findFirst({
    where: eq(sfGscConnections.customerId, customerId),
    columns: { id: true },
  });

  if (connection) {
    await db.delete(sfGscQueries).where(eq(sfGscQueries.connectionId, connection.id));
    await db.delete(sfGscConnections).where(eq(sfGscConnections.id, connection.id));
  }

  return NextResponse.json({ ok: true });
}
