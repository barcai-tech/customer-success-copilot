"use server";

import { db } from "@/src/db/client";
import { companies, messages } from "@/src/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

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
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const [inserted] = await db
    .insert(messages)
    .values({
      companyExternalId: args.companyExternalId,
      ownerUserId: userId,
      role: args.role,
      content: args.content,
      resultJson: args.resultJson,
    })
    .returning();
  return inserted;
}
