"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/src/db/client";
import {
  companies,
  contracts,
  ticketSummaries,
  usageSummaries,
} from "@/src/db/schema";
import { and, count, eq } from "drizzle-orm";
import {
  GLOBAL_COMPANIES,
  GLOBAL_CONTRACTS,
  GLOBAL_TICKETS,
  GLOBAL_USAGE,
} from "@/src/db/seed-data";
import {
  sanitizeExternalId,
  createCustomerSchema,
  upsertContractSchema,
  upsertTicketsSchema,
  upsertUsageSchema,
} from "@/src/lib/validation";
import type { CustomerRow } from "@/src/store/customer-store";

type ContractInsert = typeof contracts.$inferInsert;

export async function listCustomersForUser(): Promise<CustomerRow[]> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const rows = await db
    .select({
      id: companies.externalId,
      name: companies.name,
      trend: usageSummaries.trend,
      openTickets: ticketSummaries.openTickets,
      renewalDate: contracts.renewalDate,
    })
    .from(companies)
    .leftJoin(
      usageSummaries,
      and(
        eq(usageSummaries.companyExternalId, companies.externalId),
        eq(usageSummaries.ownerUserId, companies.ownerUserId)
      )
    )
    .leftJoin(
      ticketSummaries,
      and(
        eq(ticketSummaries.companyExternalId, companies.externalId),
        eq(ticketSummaries.ownerUserId, companies.ownerUserId)
      )
    )
    .leftJoin(
      contracts,
      and(
        eq(contracts.companyExternalId, companies.externalId),
        eq(contracts.ownerUserId, companies.ownerUserId)
      )
    )
    .where(eq(companies.ownerUserId, userId));
  const seen = new Set<string>();
  const deduped: CustomerRow[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    deduped.push({
      id: row.id,
      name: row.name,
      trend: row.trend,
      openTickets: row.openTickets,
      renewalDate: row.renewalDate,
    });
  }
  return deduped;
}

export async function getCustomerDetails(externalId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const id = String(externalId || "").trim();
  if (!id) throw new Error("externalId required");

  const company = await db
    .select({ id: companies.externalId, name: companies.name })
    .from(companies)
    .where(
      and(eq(companies.ownerUserId, userId), eq(companies.externalId, id))
    );

  const contract = await db
    .select({ renewalDate: contracts.renewalDate, arr: contracts.arr })
    .from(contracts)
    .where(
      and(
        eq(contracts.ownerUserId, userId),
        eq(contracts.companyExternalId, id)
      )
    );

  const tickets = await db
    .select({
      openTickets: ticketSummaries.openTickets,
      recentTickets: ticketSummaries.recentTickets,
    })
    .from(ticketSummaries)
    .where(
      and(
        eq(ticketSummaries.ownerUserId, userId),
        eq(ticketSummaries.companyExternalId, id)
      )
    );

  const usage = await db
    .select({
      trend: usageSummaries.trend,
      avgDailyUsers: usageSummaries.avgDailyUsers,
      sparkline: usageSummaries.sparkline,
    })
    .from(usageSummaries)
    .where(
      and(
        eq(usageSummaries.ownerUserId, userId),
        eq(usageSummaries.companyExternalId, id)
      )
    );

  return {
    company: company[0] || { id, name: "" },
    contract: contract[0] || null,
    tickets: tickets[0] || { openTickets: 0, recentTickets: [] },
    usage: usage[0] || { trend: "flat", avgDailyUsers: 0, sparkline: [] },
  };
}

export async function seedDemoCustomersAction() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const result = await db
    .select({ value: count() })
    .from(companies)
    .where(eq(companies.ownerUserId, userId));
  const c = Number(result?.[0]?.value ?? 0);
  if (c === 0) {
    for (const co of GLOBAL_COMPANIES) {
      await db
        .insert(companies)
        .values({ externalId: co.id, name: co.name, ownerUserId: userId });
      const cont = GLOBAL_CONTRACTS[co.id];
      if (cont)
        await db.insert(contracts).values({
          companyExternalId: co.id,
          ownerUserId: userId,
          renewalDate: new Date(cont.renewalDate),
          arr: cont.arr,
        });
      const use = GLOBAL_USAGE[co.id];
      if (use)
        await db.insert(usageSummaries).values({
          companyExternalId: co.id,
          ownerUserId: userId,
          trend: use.trend,
          avgDailyUsers: use.avgDailyUsers,
          sparkline: use.sparkline,
        });
      const t = GLOBAL_TICKETS[co.id];
      if (t)
        await db.insert(ticketSummaries).values({
          companyExternalId: co.id,
          ownerUserId: userId,
          openTickets: t.openTickets,
          recentTickets: t.recentTickets,
        });
    }
  }
  revalidatePath("/dashboard");
}

export async function createCustomerAction(input: {
  externalId?: string;
  name: string;
  seed?: boolean;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Validate and sanitize using Zod schema
  const validated = createCustomerSchema.parse({
    name: input.name,
    externalId: input.externalId || input.name, // Auto-generate from name if not provided
  });

  // Attempt to insert with retry logic for duplicate external_ids
  let externalId = validated.externalId;
  let inserted = false;
  let finalError: Error | null = null;

  for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
    try {
      // Append suffix on retry attempts (e.g., "-2", "-3", etc.)
      if (attempt > 0) {
        externalId = `${validated.externalId}-${attempt + 1}`;
      }

      await db.insert(companies).values({
        externalId,
        name: validated.name,
        ownerUserId: userId,
      });

      inserted = true;
      break;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      finalError = err;
      const message = err.message ?? "";
      // Only retry on duplicate key errors
      if (!message.includes("duplicate key") && !message.includes("unique")) {
        throw err;
      }
      // If this is the last attempt, prepare final error message
      if (attempt === 4) {
        throw new Error(
          `Customer "${validated.externalId}" already exists for this account. ` +
            `Could not generate a unique ID after multiple attempts. Please use a different name.`
        );
      }
    }
  }

  if (!inserted) {
    throw finalError || new Error("Failed to create customer");
  }
  if (input.seed) {
    // Create renewal date 120 days from now
    const renewalDate = new Date(Date.now() + 120 * 86400000);

    await db.insert(contracts).values({
      companyExternalId: validated.externalId,
      ownerUserId: userId,
      renewalDate,
      arr: 100000,
    });
    await db.insert(usageSummaries).values({
      companyExternalId: validated.externalId,
      ownerUserId: userId,
      trend: "flat",
      avgDailyUsers: 10,
      sparkline: [10, 10, 10, 10],
    });
    await db.insert(ticketSummaries).values({
      companyExternalId: validated.externalId,
      ownerUserId: userId,
      openTickets: 0,
      recentTickets: [],
    });
  }
  revalidatePath("/dashboard");
}

export async function deleteCustomerAction(externalId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  await db
    .delete(contracts)
    .where(
      and(
        eq(contracts.companyExternalId, externalId),
        eq(contracts.ownerUserId, userId)
      )
    );
  await db
    .delete(usageSummaries)
    .where(
      and(
        eq(usageSummaries.companyExternalId, externalId),
        eq(usageSummaries.ownerUserId, userId)
      )
    );
  await db
    .delete(ticketSummaries)
    .where(
      and(
        eq(ticketSummaries.companyExternalId, externalId),
        eq(ticketSummaries.ownerUserId, userId)
      )
    );
  await db
    .delete(companies)
    .where(
      and(
        eq(companies.externalId, externalId),
        eq(companies.ownerUserId, userId)
      )
    );
  revalidatePath("/dashboard");
}

export async function updateCustomerAction(input: {
  externalId: string;
  name?: string;
  trend?: "up" | "down" | "flat";
  openTickets?: number;
  renewalDate?: string; // ISO date string
  arr?: number;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const externalId = String(input.externalId || "").trim();
  if (!externalId) throw new Error("externalId required");

  // Update company name
  if (typeof input.name === "string" && input.name.trim()) {
    await db
      .update(companies)
      .set({ name: input.name.trim() })
      .where(
        and(
          eq(companies.externalId, externalId),
          eq(companies.ownerUserId, userId)
        )
      );
  }

  // Update usage trend
  if (
    input.trend === "up" ||
    input.trend === "down" ||
    input.trend === "flat"
  ) {
    await db
      .insert(usageSummaries)
      .values({
        companyExternalId: externalId,
        ownerUserId: userId,
        trend: input.trend,
        avgDailyUsers: 0,
        sparkline: [],
      })
      .onConflictDoUpdate({
        target: [usageSummaries.ownerUserId, usageSummaries.companyExternalId],
        set: { trend: input.trend },
      });
  }

  // Update open tickets
  if (
    typeof input.openTickets === "number" &&
    !Number.isNaN(input.openTickets)
  ) {
    await db
      .insert(ticketSummaries)
      .values({
        companyExternalId: externalId,
        ownerUserId: userId,
        openTickets: input.openTickets,
        recentTickets: [],
      })
      .onConflictDoUpdate({
        target: [
          ticketSummaries.ownerUserId,
          ticketSummaries.companyExternalId,
        ],
        set: { openTickets: input.openTickets },
      });
  }

  // Update contract
  if (
    (typeof input.renewalDate === "string" && input.renewalDate) ||
    typeof input.arr === "number"
  ) {
    let renewalDate: Date | undefined;
    const updateValues: Partial<Pick<ContractInsert, "renewalDate" | "arr">> =
      {};

    if (typeof input.renewalDate === "string" && input.renewalDate) {
      // Parse the date string to a Date object
      renewalDate = new Date(input.renewalDate);
      updateValues.renewalDate = renewalDate;
    }

    if (typeof input.arr === "number" && !Number.isNaN(input.arr)) {
      updateValues.arr = input.arr;
    }

    if (Object.keys(updateValues).length) {
      // Ensure we have defaults for insert (in case this is a new contract)
      const defaultDate = new Date();

      await db
        .insert(contracts)
        .values({
          companyExternalId: externalId,
          ownerUserId: userId,
          renewalDate: renewalDate || defaultDate,
          arr: input.arr ?? 0,
        })
        .onConflictDoUpdate({
          target: [contracts.ownerUserId, contracts.companyExternalId],
          set: updateValues,
        });
    }
  }

  revalidatePath("/dashboard");
}

export async function updateCompanyIdentityAction(input: {
  oldExternalId: string;
  newExternalId: string;
  name?: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const oldId = String(input.oldExternalId || "").trim();
  const newId = String(input.newExternalId || "").trim();
  if (!oldId || !newId) throw new Error("external ids required");
  if (oldId !== newId) {
    const exists = await db
      .select({ id: companies.externalId })
      .from(companies)
      .where(
        and(eq(companies.ownerUserId, userId), eq(companies.externalId, newId))
      );
    if (exists.length)
      throw new Error("external_id already exists for this account");
  }
  // Update companies row
  await db
    .update(companies)
    .set({ externalId: newId, name: (input.name || "").trim() || undefined })
    .where(
      and(eq(companies.externalId, oldId), eq(companies.ownerUserId, userId))
    );
  if (oldId !== newId) {
    // Cascade to summaries
    await db
      .update(contracts)
      .set({ companyExternalId: newId })
      .where(
        and(
          eq(contracts.companyExternalId, oldId),
          eq(contracts.ownerUserId, userId)
        )
      );
    await db
      .update(ticketSummaries)
      .set({ companyExternalId: newId })
      .where(
        and(
          eq(ticketSummaries.companyExternalId, oldId),
          eq(ticketSummaries.ownerUserId, userId)
        )
      );
    await db
      .update(usageSummaries)
      .set({ companyExternalId: newId })
      .where(
        and(
          eq(usageSummaries.companyExternalId, oldId),
          eq(usageSummaries.ownerUserId, userId)
        )
      );
  }
  revalidatePath("/dashboard");
}

export async function upsertContractAction(input: {
  externalId: string;
  renewalDate?: string;
  arr?: number;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const id = sanitizeExternalId(input.externalId);
  if (!id) throw new Error("externalId required");

  // Build validated values using Zod schema
  const validated = upsertContractSchema.parse({
    customerId: id,
    renewalDate: input.renewalDate || new Date().toISOString(),
    arr: input.arr ?? 0,
  });

  await db
    .insert(contracts)
    .values({
      companyExternalId: validated.customerId,
      ownerUserId: userId,
      renewalDate: new Date(validated.renewalDate),
      arr: validated.arr,
    })
    .onConflictDoUpdate({
      target: [contracts.ownerUserId, contracts.companyExternalId],
      set: {
        renewalDate: new Date(validated.renewalDate),
        arr: validated.arr,
      },
    });
  revalidatePath("/dashboard");
}

export async function upsertTicketsAction(input: {
  externalId: string;
  tickets: Array<{ id: string; severity: string }>;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const id = sanitizeExternalId(input.externalId);
  if (!id) throw new Error("externalId required");

  // Validate using Zod schema
  const validated = upsertTicketsSchema.parse({
    customerId: id,
    tickets: input.tickets,
  });

  await db
    .insert(ticketSummaries)
    .values({
      companyExternalId: validated.customerId,
      ownerUserId: userId,
      openTickets: validated.tickets.length,
      recentTickets: validated.tickets,
    })
    .onConflictDoUpdate({
      target: [ticketSummaries.ownerUserId, ticketSummaries.companyExternalId],
      set: {
        openTickets: validated.tickets.length,
        recentTickets: validated.tickets,
      },
    });
  revalidatePath("/dashboard");
}

export async function upsertUsageAction(input: {
  externalId: string;
  sparkline: number[];
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const id = sanitizeExternalId(input.externalId);
  if (!id) throw new Error("externalId required");

  // Validate using Zod schema
  const validated = upsertUsageSchema.parse({
    customerId: id,
    sparkline: input.sparkline,
  });

  const avg = validated.sparkline.length
    ? Math.round(
        validated.sparkline.reduce((a, b) => a + b, 0) /
          validated.sparkline.length
      )
    : 0;
  // Compute simple linear regression slope of y over x (x = 0..n-1)
  let trend: "up" | "down" | "flat" = "flat";
  if (validated.sparkline.length >= 2) {
    const n = validated.sparkline.length;
    const meanX = (n - 1) / 2;
    const meanY = validated.sparkline.reduce((a, b) => a + b, 0) / n;
    let num = 0,
      den = 0;
    for (let i = 0; i < n; i++) {
      const dx = i - meanX;
      const dy = validated.sparkline[i] - meanY;
      num += dx * dy;
      den += dx * dx;
    }
    const slope = den === 0 ? 0 : num / den;
    const thresh = Math.max(0.1, meanY * 0.001); // scale threshold lightly with magnitude
    if (slope > thresh) trend = "up";
    else if (slope < -thresh) trend = "down";
    else trend = "flat";
  }
  await db
    .insert(usageSummaries)
    .values({
      companyExternalId: validated.customerId,
      ownerUserId: userId,
      sparkline: validated.sparkline,
      avgDailyUsers: avg,
      trend,
    })
    .onConflictDoUpdate({
      target: [usageSummaries.ownerUserId, usageSummaries.companyExternalId],
      set: { sparkline: validated.sparkline, avgDailyUsers: avg, trend },
    });
  revalidatePath("/dashboard");
}
