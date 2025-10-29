"use server";

import { db } from "@/src/db/client";
import { companies, contracts, usageSummaries, ticketSummaries } from "@/src/db/schema";
import { GLOBAL_COMPANIES, GLOBAL_CONTRACTS, GLOBAL_TICKETS, GLOBAL_USAGE, GLOBAL_OWNER_ID } from "@/src/db/seed-data";
import { and, eq } from "drizzle-orm";

export async function seedGlobalCustomers() {
  // Idempotent seed: upsert per company under the global owner id
  for (const c of GLOBAL_COMPANIES) {
    const existing = await db
      .select()
      .from(companies)
      .where(and(eq(companies.externalId, c.id), eq(companies.ownerUserId, GLOBAL_OWNER_ID)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(companies).values({ externalId: c.id, name: c.name, ownerUserId: GLOBAL_OWNER_ID });
    }

    // Contracts
    const cont = GLOBAL_CONTRACTS[c.id];
    if (cont) {
      // delete then insert to keep it simple and idempotent
      await db
        .delete(contracts)
        .where(
          and(
            eq(contracts.companyExternalId, c.id),
            eq(contracts.ownerUserId, GLOBAL_OWNER_ID)
          )
        );
      await db.insert(contracts).values({
        companyExternalId: c.id,
        ownerUserId: GLOBAL_OWNER_ID,
        // Contracts.renewalDate is a timestamp; store as Date
        renewalDate: new Date(cont.renewalDate),
        arr: cont.arr,
      });
    }

    // Usage
    const use = GLOBAL_USAGE[c.id];
    if (use) {
      await db
        .delete(usageSummaries)
        .where(and(eq(usageSummaries.companyExternalId, c.id), eq(usageSummaries.ownerUserId, GLOBAL_OWNER_ID)));
      await db.insert(usageSummaries).values({
        companyExternalId: c.id,
        ownerUserId: GLOBAL_OWNER_ID,
        trend: use.trend,
        avgDailyUsers: use.avgDailyUsers,
        sparkline: use.sparkline,
      });
    }

    // Tickets
    const t = GLOBAL_TICKETS[c.id];
    if (t) {
      await db
        .delete(ticketSummaries)
        .where(and(eq(ticketSummaries.companyExternalId, c.id), eq(ticketSummaries.ownerUserId, GLOBAL_OWNER_ID)));
      await db.insert(ticketSummaries).values({
        companyExternalId: c.id,
        ownerUserId: GLOBAL_OWNER_ID,
        openTickets: t.openTickets,
        recentTickets: t.recentTickets,
      });
    }
  }

  return { ok: true } as const;
}
