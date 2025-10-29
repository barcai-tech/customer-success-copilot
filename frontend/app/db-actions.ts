"use server";

import { db } from "@/src/db/client";
import { companies, messages } from "@/src/db/schema";
import { and, desc, eq, or } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { textSchema } from "@/src/lib/validation";

export async function upsertCompanyByExternalId(externalId: string, name: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const existing = await db
    .select()
    .from(companies)
    .where(and(eq(companies.externalId, externalId), eq(companies.ownerUserId, userId)))
    .limit(1);
  if (existing.length) return existing[0];
  const [inserted] = await db.insert(companies).values({ externalId, name, ownerUserId: userId }).returning();
  return inserted;
}

export async function saveMessage(args: {
  companyExternalId: string;
  role: "user" | "assistant" | "system";
  content: string;
  resultJson?: unknown;
  taskId?: string;
}) {
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

  const [inserted] = await db
    .insert(messages)
    .values({
      companyExternalId: payload.companyExternalId,
      ownerUserId: userId,
      role: payload.role,
      content: payload.content,
      resultJson: payload.resultJson as any,
      taskId: (payload.taskId as any) ?? null,
    })
    .returning();
  return inserted;
}

export async function listMessagesForCustomer(args: {
  companyExternalId: string;
  limit?: number;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const companyExternalId = z.string().min(1).parse(args.companyExternalId);
  const limit = args.limit && args.limit > 0 ? Math.min(args.limit, 500) : 200;
  const rows = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.ownerUserId, userId),
        eq(messages.companyExternalId, companyExternalId),
        eq(messages.hidden as any, false as any)
      )
    )
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  // Return ascending chronological order for UI
  return rows.reverse();
}

export async function hideMessage(args: { id: string }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const id = z.string().min(1).parse(args.id);
  await db
    .update(messages)
    .set({ hidden: true as any })
    .where(and(eq(messages.id, id as any), eq(messages.ownerUserId, userId)));
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
    .set({ hidden: true as any })
    .where(
      and(
        eq(messages.ownerUserId, userId),
        eq(messages.companyExternalId, companyExternalId),
        // Hide by task id if present, otherwise hide by message id fallback
        // This covers legacy rows without task_id
        or(eq(messages.taskId as any, taskId as any), eq(messages.id as any, taskId as any))
      )
    );
  return { ok: true } as const;
}
