"use server";

import type { TaskType } from "@/src/store/copilot-store";
import { db } from "@/src/db/client";
import { companies } from "@/src/db/schema";
import { auth } from "@clerk/nextjs/server";
import { inArray } from "drizzle-orm";

export interface ParsedIntent {
  customerId?: string;
  task?: TaskType;
}

const TASK_KEYWORDS: Record<TaskType, string[]> = {
  health: ["health", "health check", "status", "score"],
  renewal: ["renewal", "renew", "brief", "renewal brief"],
  qbr: ["qbr", "quarterly business review", "review", "outline"],
  email: ["email", "draft", "check-in", "message", "compose"],
  churn: ["churn", "risk", "churn risk", "likelihood"],
};

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function matchTask(text: string): TaskType | undefined {
  const t = normalize(text);
  for (const [task, keywords] of Object.entries(TASK_KEYWORDS) as [TaskType, string[]][]) {
    if (keywords.some((k) => t.includes(k))) return task;
  }
  return undefined;
}

function variantsForName(name: string): string[] {
  const n = normalize(name);
  const parts = n.split(" ");
  const filtered = parts.filter((p) => !["corp", "corporation", "inc", "ltd", "limited"].includes(p));
  return Array.from(new Set([n, filtered.join(" "), ...(filtered.length ? filtered : [])]));
}

async function resolveCustomers(): Promise<Array<{ id: string; name: string }>> {
  const { userId } = auth();
  const owners = userId ? ["public", userId] : ["public"];
  const rows = await db
    .select({ id: companies.externalId, name: companies.name, owner: companies.ownerUserId })
    .from(companies)
    .where(inArray(companies.ownerUserId, owners));
  // Deduplicate by external id, prefer user-owned if present (processed in query order undefined; leave as is)
  const seen = new Set<string>();
  const out: Array<{ id: string; name: string }> = [];
  for (const r of rows) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      out.push({ id: r.id, name: r.name });
    }
  }
  return out;
}

async function matchCustomer(text: string): Promise<string | undefined> {
  const t = normalize(text);
  const all = await resolveCustomers();
  for (const c of all) {
    const candidates = new Set<string>([normalize(c.id), ...variantsForName(c.name)]);
    for (const cand of candidates) {
      if (!cand) continue;
      if (t.includes(cand)) return c.id;
    }
  }
  return undefined;
}

export async function parseIntent(message: string): Promise<ParsedIntent> {
  const customerId = await matchCustomer(message);
  const task = matchTask(message);
  return { customerId, task };
}
