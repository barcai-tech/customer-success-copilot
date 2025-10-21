"use server";

import { invokeTool, type ResponseEnvelope } from "@/src/agent/invokeTool";
import {
  UsageSchema,
  TicketsSchema,
  ContractSchema,
  HealthSchema,
  EmailSchema,
  type Usage,
  type Tickets,
  type Contract,
  type Health,
  type Email,
} from "@/src/contracts/tools";

export interface PlannerResult {
  summary?: string;
  health?: Health;
  actions?: string[];
  emailDraft?: Email;
  usedTools: Array<{ name: string; tookMs?: number; error?: string }>;
  notes?: string;
}

async function timed<T>(fn: () => Promise<ResponseEnvelope<T>>, name: string, used: PlannerResult["usedTools"]) {
  const t0 = performance.now();
  try {
    const out = await fn();
    const t1 = performance.now();
    if (out.ok) used.push({ name, tookMs: Math.round(t1 - t0) });
    else used.push({ name, error: out.error.code });
    return out;
  } catch (e) {
    const t1 = performance.now();
    used.push({ name, error: (e as Error).message });
    throw e;
  }
}

export async function runPlanner(customerId: string): Promise<PlannerResult> {
  const usedTools: PlannerResult["usedTools"] = [];
  let usage: Usage | undefined;
  let tickets: Tickets | undefined;
  let contract: Contract | undefined;
  let health: Health | undefined;
  let email: Email | undefined;

  // usage
  try {
    const r = await timed(() => invokeTool<Usage>("get_customer_usage", { customerId, params: { periodDays: 30 } }, UsageSchema), "get_customer_usage", usedTools);
    if (r.ok) usage = r.data;
  } catch {}

  // tickets
  try {
    const r = await timed(() => invokeTool<Tickets>("get_recent_tickets", { customerId }, TicketsSchema), "get_recent_tickets", usedTools);
    if (r.ok) tickets = r.data;
  } catch {}

  // contract
  try {
    const r = await timed(() => invokeTool<Contract>("get_contract_info", { customerId }, ContractSchema), "get_contract_info", usedTools);
    if (r.ok) contract = r.data;
  } catch {}

  // health
  try {
    const r = await timed(() => invokeTool<Health>("calculate_health", { customerId }, HealthSchema), "calculate_health", usedTools);
    if (r.ok) health = r.data;
  } catch {}

  // email
  try {
    const r = await timed(() => invokeTool<Email>("generate_email", { customerId }, EmailSchema), "generate_email", usedTools);
    if (r.ok) email = r.data;
  } catch {}

  const summaryParts: string[] = [];
  if (usage) summaryParts.push(`Usage trend: ${usage.trend}`);
  if (tickets) summaryParts.push(`Open tickets: ${tickets.openTickets}`);
  if (contract) summaryParts.push(`Renewal: ${contract.renewalDate}`);

  const actions: string[] = [
    "Confirm rollout of priority features",
    "Schedule renewal prep call",
    "Share QBR draft with sponsor",
  ];

  return {
    summary: summaryParts.length ? summaryParts.join("; ") : "Partial data available.",
    health,
    actions,
    emailDraft: email,
    usedTools,
    notes: !usage ? "Usage data missing." : undefined,
  };
}
