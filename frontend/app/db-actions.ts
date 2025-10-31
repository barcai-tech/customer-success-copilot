"use server";

import { db } from "@/src/db/client";
import { companies, messages } from "@/src/db/schema";
import { and, desc, eq, or } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { textSchema } from "@/src/lib/validation";

type MessageInsert = typeof messages.$inferInsert;
type MessageRow = typeof messages.$inferSelect;

export type StoredMessage = {
  id: string;
  companyExternalId: string;
  ownerUserId: string;
  role: "user" | "assistant" | "system";
  content: string;
  resultJson: unknown | null;
  taskId: string | null;
  hidden: boolean;
  createdAt: Date;
};

function toStoredMessage(row: MessageRow): StoredMessage {
  return {
    id: row.id,
    companyExternalId: row.companyExternalId,
    ownerUserId: row.ownerUserId,
    role: row.role as StoredMessage["role"],
    content: row.content,
    resultJson: row.resultJson ?? null,
    taskId: row.taskId ?? null,
    hidden: Boolean(row.hidden),
    createdAt: new Date(row.createdAt),
  };
}

export async function upsertCompanyByExternalId(
  externalId: string,
  name: string
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const existing = await db
    .select()
    .from(companies)
    .where(
      and(
        eq(companies.externalId, externalId),
        eq(companies.ownerUserId, userId)
      )
    )
    .limit(1);
  if (existing.length) return existing[0];
  const [inserted] = await db
    .insert(companies)
    .values({ externalId, name, ownerUserId: userId })
    .returning();
  return inserted;
}

export type SaveMessageArgs = {
  companyExternalId: string;
  role: "user" | "assistant" | "system";
  content: string;
  resultJson?: unknown;
  taskId?: string;
};

export async function saveMessage(args: SaveMessageArgs) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  // Validate inputs
  const RoleSchema = z.enum(["user", "assistant", "system"]);
  const payload = {
    companyExternalId: z.string().min(1).parse(args.companyExternalId),
    role: RoleSchema.parse(args.role),
    content: textSchema(5000).parse(args.content),
    resultJson: args.resultJson ?? null,
    taskId: args.taskId ? z.string().uuid().parse(args.taskId) : null,
  } as const;

  const values: MessageInsert = {
    companyExternalId: payload.companyExternalId,
    ownerUserId: userId,
    role: payload.role,
    content: payload.content,
    resultJson: payload.resultJson,
    taskId: payload.taskId,
  };

  const [inserted] = await db.insert(messages).values(values).returning();
  return toStoredMessage(inserted);
}

export async function listMessagesForCustomer(args: {
  companyExternalId: string;
  limit?: number;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const companyExternalId = z.string().min(1).parse(args.companyExternalId);
  const limit = args.limit && args.limit > 0 ? Math.min(args.limit, 500) : 200;
  const rows: MessageRow[] = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.ownerUserId, userId),
        eq(messages.companyExternalId, companyExternalId),
        eq(messages.hidden, false)
      )
    )
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  // Return ascending chronological order for UI
  return rows.reverse().map(toStoredMessage);
}

/**
 * Load all messages for the signed-in user across all customers
 * Used on page load to restore full conversation history
 * Returns messages in ascending chronological order
 */
export async function listAllMessagesForUser(args?: { limit?: number }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const limit =
    args?.limit && args.limit > 0 ? Math.min(args.limit, 2000) : 2000;
  const rows: MessageRow[] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.ownerUserId, userId), eq(messages.hidden, false)))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  // Return ascending chronological order for UI
  return rows.reverse().map(toStoredMessage);
}

export async function hideMessage(args: { id: string }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const id = z.string().min(1).parse(args.id);
  await db
    .update(messages)
    .set({ hidden: true })
    .where(and(eq(messages.id, id), eq(messages.ownerUserId, userId)));
  return { ok: true } as const;
}

export async function hideTask(args: {
  companyExternalId: string;
  taskId: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const companyExternalId = z.string().min(1).parse(args.companyExternalId);
  const taskId = z.string().min(1).parse(args.taskId);
  await db
    .update(messages)
    .set({ hidden: true })
    .where(
      and(
        eq(messages.ownerUserId, userId),
        eq(messages.companyExternalId, companyExternalId),
        // Hide by task id if present, otherwise hide by message id fallback
        // This covers legacy rows without task_id
        or(eq(messages.taskId, taskId), eq(messages.id, taskId))
      )
    );
  return { ok: true } as const;
}
