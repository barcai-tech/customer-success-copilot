"use server";

import { db } from "@/src/db";
import { companies, messages } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export async function upsertCompanyByExternalId(externalId: string, name: string) {
  const existing = await db.select().from(companies).where(eq(companies.externalId, externalId)).limit(1);
  if (existing.length) return existing[0];
  const [inserted] = await db.insert(companies).values({ externalId, name }).returning();
  return inserted;
}

export async function saveMessage(args: {
  companyExternalId: string;
  role: "user" | "assistant" | "system";
  content: string;
  resultJson?: unknown;
}) {
  const [inserted] = await db
    .insert(messages)
    .values({
      companyExternalId: args.companyExternalId,
      role: args.role,
      content: args.content,
      resultJson: args.resultJson,
    })
    .returning();
  return inserted;
}
