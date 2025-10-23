import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/src/db/client";
import { companies, contracts, usageSummaries, ticketSummaries } from "@/src/db/schema";
import { GLOBAL_COMPANIES, GLOBAL_CONTRACTS, GLOBAL_TICKETS, GLOBAL_USAGE } from "@/src/db/seed-data";
import { and, count, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let { userId } = auth();
    // Dev fallback: allow ?owner=<userId> to seed if auth cookie not resolved (e.g., dev browser quirk)
    if (!userId && process.env.NODE_ENV !== "production") {
      const url = new URL(req.url);
      const owner = url.searchParams.get("owner");
      if (owner) userId = owner;
    }
    if (!userId) return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401 });

    const result = await db
      .select({ value: count() })
      .from(companies)
      .where(eq(companies.ownerUserId, userId));
    const c = Number(result?.[0]?.value ?? 0);
    if (c > 0) {
      return new Response(JSON.stringify({ ok: true, alreadySeeded: true }), { headers: { "Content-Type": "application/json" } });
    }

    for (const co of GLOBAL_COMPANIES) {
      await db.insert(companies).values({ externalId: co.id, name: co.name, ownerUserId: userId });
      const cont = GLOBAL_CONTRACTS[co.id];
      if (cont) {
        await db.insert(contracts).values({ companyExternalId: co.id, ownerUserId: userId, renewalDate: cont.renewalDate, arr: cont.arr });
      }
      const use = GLOBAL_USAGE[co.id];
      if (use) {
        await db.insert(usageSummaries).values({ companyExternalId: co.id, ownerUserId: userId, trend: use.trend, avgDailyUsers: use.avgDailyUsers, sparkline: use.sparkline });
      }
      const t = GLOBAL_TICKETS[co.id];
      if (t) {
        await db.insert(ticketSummaries).values({ companyExternalId: co.id, ownerUserId: userId, openTickets: t.openTickets, recentTickets: t.recentTickets });
      }
    }

    return new Response(JSON.stringify({ ok: true, seeded: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 500 });
  }
}
