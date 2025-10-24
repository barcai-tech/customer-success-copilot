"use server";

import { invokeTool, type ResponseEnvelope } from "@/src/agent/invokeTool";
import {
  UsageSchema,
  TicketsSchema,
  ContractSchema,
  HealthSchema,
  EmailSchema,
  QbrSchema,
  type Usage,
  type Tickets,
  type Contract,
  type Health,
  type Email,
  type Qbr,
} from "@/src/contracts/tools";

export interface PlannerResult {
  summary?: string;
  health?: Health;
  actions?: string[];
  emailDraft?: Email;
  usedTools: Array<{ name: string; tookMs?: number; error?: string; reason?: string; missing?: boolean }>;
  notes?: string;
  decisionLog?: Array<{ step?: number; tool?: string; action?: string; reason: string }>;
  planSource?: "llm" | "heuristic";
  planHint?: string;
  customerId?: string;
  task?: PlannerTask;
}

export type PlannerTask = "health" | "renewal" | "qbr" | "email" | "churn";

async function timed<T>(fn: () => Promise<ResponseEnvelope<T>>, name: string, used: PlannerResult["usedTools"]) {
  const t0 = performance.now();
  try {
    const out = await fn();
    const t1 = performance.now();
    if (out.ok) used.push({ name, tookMs: Math.round(t1 - t0) });
    else used.push({ name, error: out.error.code });
    return out;
  } catch (e) {
    used.push({ name, error: (e as Error).message });
    throw e;
  }
}

export async function runPlanner(customerId: string, task?: PlannerTask): Promise<PlannerResult> {
  const usedTools: PlannerResult["usedTools"] = [];
  let usage: Usage | undefined;
  let tickets: Tickets | undefined;
  let contract: Contract | undefined;
  let health: Health | undefined;
  let email: Email | undefined;
  let qbr: Qbr | undefined;

  // Branch execution by task for targeted results
  const runUsage = async () => {
    try {
      const r = await timed(
        () => invokeTool<Usage>("get_customer_usage", { customerId, params: { periodDays: 30 } }, UsageSchema),
        "get_customer_usage",
        usedTools
      );
      if (r.ok) usage = r.data;
    } catch {}
  };
  const runTickets = async () => {
    try {
      const r = await timed(
        () => invokeTool<Tickets>("get_recent_tickets", { customerId }, TicketsSchema),
        "get_recent_tickets",
        usedTools
      );
      if (r.ok) tickets = r.data;
    } catch {}
  };
  const runContract = async () => {
    try {
      const r = await timed(
        () => invokeTool<Contract>("get_contract_info", { customerId }, ContractSchema),
        "get_contract_info",
        usedTools
      );
      if (r.ok) contract = r.data;
    } catch {}
  };
  const runHealth = async () => {
    try {
      const r = await timed(
        () => invokeTool<Health>("calculate_health", { customerId }, HealthSchema),
        "calculate_health",
        usedTools
      );
      if (r.ok) health = r.data;
    } catch {}
  };
  const runEmail = async () => {
    try {
      const r = await timed(
        () => invokeTool<Email>("generate_email", { customerId }, EmailSchema),
        "generate_email",
        usedTools
      );
      if (r.ok) email = r.data;
    } catch {}
  };
  const runQbr = async () => {
    try {
      const r = await timed(
        () => invokeTool<Qbr>("generate_qbr_outline", { customerId }, QbrSchema),
        "generate_qbr_outline",
        usedTools
      );
      if (r.ok) qbr = r.data;
    } catch {}
  };

  // Execute minimal set per task
  switch (task) {
    case "health":
      await runHealth();
      break;
    case "email":
      await runEmail();
      // Give the email a bit of context if quick to compute
      await runHealth();
      break;
    case "renewal":
      await runContract();
      await runUsage();
      await runTickets();
      break;
    case "qbr":
      await runQbr();
      await runUsage();
      break;
    case "churn":
      await runHealth();
      await runTickets();
      await runUsage();
      break;
    default:
      // Full sweep for unspecified task
      await runUsage();
      await runTickets();
      await runContract();
      await runHealth();
      await runEmail();
  }

  // Synthesize results based on what we have
  const summaryParts: string[] = [];
  if (task === "health" && health) {
    summaryParts.push(`Health score ${health.score} (${health.riskLevel} risk)`);
  }
  if (usage) summaryParts.push(`Usage trend: ${usage.trend}`);
  if (tickets) summaryParts.push(`Open tickets: ${tickets.openTickets}`);
  if (contract) summaryParts.push(`Renewal: ${contract.renewalDate}`);
  if (task === "qbr" && qbr) {
    summaryParts.push("Prepared QBR outline");
  }

  let actions: string[] | undefined;
  if (task === "qbr" && qbr) {
    actions = qbr.sections;
  } else if (task === "churn") {
    actions = [
      "Review risk drivers with support lead",
      "Create recovery plan and milestones",
      "Schedule executive check-in",
    ];
  } else if (task === "renewal") {
    actions = [
      "Confirm renewal stakeholders and timeline",
      "Validate value metrics and outcomes",
      "Draft renewal proposal",
    ];
  } else {
    actions = [
      "Confirm rollout of priority features",
      "Schedule renewal prep call",
      "Share QBR draft with sponsor",
    ];
  }

  return {
    summary: summaryParts.length ? summaryParts.join("; ") : undefined,
    health,
    actions,
    emailDraft: email,
    usedTools,
    notes: !usage && task !== "health" ? "Usage data missing." : undefined,
  };
}
