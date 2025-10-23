import { NextRequest } from "next/server";
import { db } from "@/src/db/client";
import { companies, contracts, usageSummaries, ticketSummaries } from "@/src/db/schema";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { GLOBAL_COMPANIES, GLOBAL_CONTRACTS, GLOBAL_TICKETS, GLOBAL_USAGE } from "@/src/db/seed-data";

export const dynamic = "force-dynamic";

async function seedUserIfEmpty(ownerUserId: string) {
  const [{ value: c }] = (await db
    .select({ value: count() })
    .from(companies)
    .where(eq(companies.ownerUserId, ownerUserId))) as Array<{ value: number }>;
  if (c > 0) return;

  // Seed same demo set for this user
  for (const co of GLOBAL_COMPANIES) {
    await db.insert(companies).values({ externalId: co.id, name: co.name, ownerUserId });
    const cont = GLOBAL_CONTRACTS[co.id];
    if (cont) {
      await db.insert(contracts).values({ companyExternalId: co.id, ownerUserId, renewalDate: cont.renewalDate, arr: cont.arr });
    }
    const use = GLOBAL_USAGE[co.id];
    if (use) {
      await db.insert(usageSummaries).values({ companyExternalId: co.id, ownerUserId, trend: use.trend, avgDailyUsers: use.avgDailyUsers, sparkline: use.sparkline });
    }
    const t = GLOBAL_TICKETS[co.id];
    if (t) {
      await db.insert(ticketSummaries).values({ companyExternalId: co.id, ownerUserId, openTickets: t.openTickets, recentTickets: t.recentTickets });
    }
  }
}

export async function GET(_req: NextRequest) {
  const { userId } = auth();
  if (userId) {
    await seedUserIfEmpty(userId);
  }

  const owners = userId ? ["public", userId] : ["public"];
  const rows = await db
    .select({ externalId: companies.externalId, name: companies.name, ownerUserId: companies.ownerUserId })
    .from(companies)
    .where(inArray(companies.ownerUserId, owners))
    .orderBy(desc(companies.ownerUserId)); // prefer user-owned over public when deduping

  const seen = new Set<string>();
  const out: Array<{ id: string; name: string }> = [];
  for (const r of rows) {
    if (!seen.has(r.externalId)) {
      seen.add(r.externalId);
      out.push({ id: r.externalId, name: r.name });
    }
  }

  return new Response(JSON.stringify({ ok: true, customers: out }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

