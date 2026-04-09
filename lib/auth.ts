import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const authOptions: NextAuthOptions = {
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      // Upsert customer on first sign-in
      const existing = await db
        .select()
        .from(customers)
        .where(eq(customers.email, user.email))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(customers).values({
          email: user.email,
          name: user.name ?? null,
        });
      }
      return true;
    },
    async session({ session }) {
      if (!session.user?.email) return session;
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.email, session.user.email))
        .limit(1);
      if (customer) {
        // Attach plan info to session
        (session.user as typeof session.user & { customerId: string; plan: string | null }).customerId = customer.id;
        (session.user as typeof session.user & { plan: string | null }).plan = customer.plan ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/login?verify=1",
  },
  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
