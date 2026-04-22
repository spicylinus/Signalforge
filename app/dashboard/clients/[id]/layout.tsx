import { db } from "@/lib/db";
import { sfCustomers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customerId = parseInt(id, 10);

  const customer = await db.query.sfCustomers.findFirst({
    where: eq(sfCustomers.id, customerId),
    columns: { id: true, name: true, companyName: true, plan: true },
  });
  if (!customer) notFound();

  const tabs = [
    { label: "Overview", href: `/dashboard/clients/${id}` },
    { label: "Campaigns", href: `/dashboard/clients/${id}/campaigns` },
    { label: "Credits", href: `/dashboard/clients/${id}/credits` },
  ];

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
          ← Clients
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{customer.name}</h1>
        {customer.companyName && (
          <p className="text-sm text-gray-500">{customer.companyName}</p>
        )}
      </div>
      <nav className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 -mb-px"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
