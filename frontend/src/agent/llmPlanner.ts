"use server";

import { getToolRegistry } from "@/src/agent/tool-registry";
import { callLLM, type LlmMessage } from "@/src/llm/provider";
import { invokeTool, type ToolName } from "@/src/agent/invokeTool";
import type { z } from "zod";
import {
  UsageSchema,
  TicketsSchema,
  ContractSchema,
  HealthSchema,
  EmailSchema,
  QbrSchema,
} from "@/src/contracts/tools";
import { PlannerResultSchema } from "@/src/contracts/planner";
import { parseIntent } from "@/src/agent/intent";

type ToolSchemaMap = Record<ToolName, z.ZodSchema<any>>;

const TOOL_SCHEMAS: ToolSchemaMap = {
  get_customer_usage: UsageSchema,
  get_recent_tickets: TicketsSchema,
  get_contract_info: ContractSchema,
  calculate_health: HealthSchema,
  generate_email: EmailSchema,
  generate_qbr_outline: QbrSchema,
};

export async function runLlmPlanner(prompt: string, selectedCustomerId?: string) {
  const usedTools: Array<{ name: string; tookMs?: number; error?: string }> = [];
  let resolvedCustomerId: string | undefined = selectedCustomerId;
  const resultCache: Partial<Record<ToolName, unknown>> = {};
  const parsed = await parseIntent(prompt);
  const taskHint = parsed.task || null;

  const system: LlmMessage = {
    role: "system",
    content: [
      "You are Customer Success Copilot.",
      "Follow these rules strictly:",
      "1) Use tool outputs as the only source of facts.",
      "2) Avoid hallucinations. If data is missing, say so.",
      "3) You may call up to 5 tools per request.",
      "4) Stop calling tools once you have enough to answer.",
      "5) Final answer MUST be a single JSON object. Include only applicable keys: summary, health?, actions?, emailDraft?, notes?, decisionLog?.",
      "   If you called calculate_health, include a health object: { score:number, riskLevel:string, signals:string[] }.",
      "   The system will populate usedTools itself; you may omit usedTools or set it to an empty array.",
      "6) Be concise and actionable.",
      "7) For decisionLog, include 1-sentence reasons for each tool you decided to call (no chain-of-thought).",
    ].join("\n"),
  };

  const tools = getToolRegistry();

  const messages: LlmMessage[] = [
    system,
    {
      role: "user",
      content: [
        `User request: ${prompt}`,
        selectedCustomerId ? `Hint customerId: ${selectedCustomerId}` : "",
        "Return only JSON in the final assistant message.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  const maxSteps = 8;
  let toolRounds = 0;
  let repairAttempts = 0;
  for (let step = 0; step < maxSteps; step++) {
    const resp = await callLLM(messages, { tools });

    if (resp.type === "tool_calls" && resp.assistant?.tool_calls?.length) {
      // Append the assistant message that proposed tool calls, as required by the API
      messages.push({
        role: "assistant",
        content: resp.assistant.content ?? "",
        tool_calls: resp.assistant.tool_calls,
      });

      toolRounds += 1;
      for (const tc of resp.assistant.tool_calls) {
        const name = tc.function?.name as ToolName;
        const argsRaw = tc.function?.arguments ?? "{}";
        let args: any = {};
        try {
          args = JSON.parse(argsRaw);
        } catch {
          // If args can't be parsed, mark error and continue
          usedTools.push({ name, error: "INVALID_ARGS" });
          messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify({ ok: false, data: null, error: { code: "INVALID_ARGS", message: "Arguments must be valid JSON" } }) });
          continue;
        }

        // Normalize envelope
        const customerId: string | undefined = args.customerId ?? selectedCustomerId;
        const params: Record<string, unknown> = args.params ?? {};
        if (!customerId) {
          usedTools.push({ name, error: "MISSING_CUSTOMER_ID" });
          messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify({ ok: false, data: null, error: { code: "MISSING_CUSTOMER_ID", message: "customerId is required" } }) });
          continue;
        }
        resolvedCustomerId = customerId;

        // Time + call tool with schema validation
        const t0 = performance.now();
        let envelope: unknown;
        try {
          const schema = TOOL_SCHEMAS[name];
          const res = await invokeTool(name, { customerId, params }, schema);
          const t1 = performance.now();
          if (res.ok) usedTools.push({ name, tookMs: Math.round(t1 - t0) });
          else usedTools.push({ name, error: res.error.code });
          envelope = res;
          if ((res as any).ok) {
            // Cache successful tool data for post-processing backfill
            resultCache[name] = (res as any).data;
          }
        } catch (e) {
          const t1 = performance.now();
          usedTools.push({ name, error: (e as Error).message });
          envelope = { ok: false, data: null, error: { code: "EXCEPTION", message: (e as Error).message } } as const;
        }

        messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(envelope) });
      }

      // Nudge the model to finalize after multiple tool rounds
      if (toolRounds >= 2) {
        messages.push({
          role: "user",
          content:
            "You already have the tool outputs. Return the final JSON now strictly following the Standard Output Format.",
        });
      }

      // Continue to next turn after providing tool outputs
      continue;
    }

    // No tool calls this turn: attempt to read final JSON
    const content = resp.message ?? "";
    if (process.env["LLM_DEBUG"] === "1") {
      console.log("LLM final content:", content);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // Try to salvage JSON object from fences or extra prose
      const fence = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const match = fence?.[1] || content.match(/\{[\s\S]*\}/)?.[0];
      if (match) {
        try {
          parsed = JSON.parse(match);
        } catch {
          parsed = undefined;
        }
      }
      if (!parsed) {
        if (repairAttempts < 1) {
          repairAttempts++;
          messages.push({
            role: "user",
            content:
              "Your last message was not valid JSON. Respond with ONLY a valid JSON object matching: { summary?: string, health?: { score:number, riskLevel:string, signals:string[] }, actions?: string[], emailDraft?: { subject:string, body:string }, usedTools: Array<{ name:string, tookMs?:number, error?:string }>, notes?: string, decisionLog?: Array<{ step?:number, tool?:string, action?:string, reason:string }> }. No markdown, no code fences, no extra text.",
          });
          continue;
        }
        throw new Error("LLM did not return valid JSON");
      }
    }

    // Validate against planner result schema
    const result = PlannerResultSchema.safeParse(parsed);
    if (!result.success) {
      if (process.env["LLM_DEBUG"] === "1") {
        console.error("Planner result validation error:", result.error.message);
      }
      if (repairAttempts < 1) {
        repairAttempts++;
        messages.push({
          role: "user",
          content:
            `Your JSON did not match the required schema (${result.error.message}). Return ONLY a valid JSON object with the required keys and types. Do not include markdown or comments.`,
        });
        continue;
      }
      throw new Error(`Final JSON validation failed: ${result.error.message}`);
    }

    // Merge usedTools collected by us into final result
    const out: any = result.data;
    // Try to map high-level reasons from decisionLog into usedTools entries by order
    if (out.decisionLog && out.decisionLog.length) {
      const log = [...out.decisionLog];
      const assigned = usedTools.map((ut) => ({ ...ut }));
      let logIdx = 0;
      for (let i = 0; i < assigned.length; i++) {
        // Find next log item that mentions this tool by name if possible
        const matchIdx = log.findIndex((l, idx) => idx >= logIdx && (l.tool?.toLowerCase() === assigned[i].name.toLowerCase() || !l.tool));
        if (matchIdx !== -1) {
          assigned[i].reason = log[matchIdx].reason;
          logIdx = matchIdx + 1;
        }
      }
      out.usedTools = assigned;
    } else {
      out.usedTools = usedTools;
    }
    // Backfill structured fields from tool outputs if the LLM omitted them
    if (!out.health && resultCache["calculate_health"]) {
      out.health = resultCache["calculate_health"];
    }
    if (!out.emailDraft && resultCache["generate_email"]) {
      out.emailDraft = resultCache["generate_email"];
    }
    if (!out.actions && resultCache["generate_qbr_outline"]) {
      const q = resultCache["generate_qbr_outline"] as any;
      if (q && Array.isArray(q.sections)) out.actions = q.sections;
    }

    // Heuristic actions backfill (renewal / health / usage / tickets)
    if (!out.actions || out.actions.length === 0) {
      const usage = resultCache["get_customer_usage"] as any | undefined;
      const tickets = resultCache["get_recent_tickets"] as any | undefined;
      const contract = resultCache["get_contract_info"] as any | undefined;
      const health = out.health as any | undefined;
      const actions: string[] = [];

      // Health-driven suggestions
      if (health?.riskLevel) {
        const risk = String(health.riskLevel).toLowerCase();
        if (risk === "low") {
          actions.push(
            "Share recent wins and outcomes with sponsor",
            "Identify expansion opportunities and champions",
            "Schedule next QBR"
          );
        } else if (risk === "medium") {
          actions.push(
            "Confirm rollout of priority features",
            "Schedule health review with champion",
            "Review support tickets for emerging risks"
          );
        } else if (risk === "high") {
          actions.push(
            "Create recovery plan with measurable milestones",
            "Escalate to executive sponsor for alignment",
            "Daily check-in until risk subsides"
          );
        }
      }

      // Usage trend
      if (usage?.trend === "down") {
        actions.push(
          "Investigate drop in usage with product analytics",
          "Run adoption campaign and refresher training"
        );
      } else if (usage?.trend === "flat") {
        actions.push("Drive adoption of underused features");
      } else if (usage?.trend === "up") {
        actions.push("Highlight adoption growth in executive update");
      }

      // Tickets volume
      if (typeof tickets?.openTickets === "number") {
        if (tickets.openTickets > 3) actions.push("Triage and resolve open tickets with support lead");
        else if (tickets.openTickets > 0) actions.push("Follow up on open tickets and communicate ETA");
      }

      // Renewal timing
      if (contract?.renewalDate) {
        const days = daysUntil(contract.renewalDate);
        if (days !== null && days <= 90) {
          actions.push(
            "Prepare renewal brief and value summary",
            "Book renewal prep call",
            "Align pricing and legal timelines"
          );
        } else if (days !== null && days <= 60) {
          actions.push(
            "Run stakeholder alignment call",
            "Confirm procurement steps and blockers",
            "Share pricing and packaging options"
          );
        } else if (days !== null && days <= 30) {
          actions.push(
            "Lock renewal timeline and decision owners",
            "Deliver value realization deck",
            "Draft order form and route for legal review",
            "Set weekly exec cadence until signature"
          );
        } else if (days !== null && days <= 180) {
          actions.push("Plan pre-renewal business review and success plan");
        }
      }

      // Task-specific emphasis
      const t = (taskHint || "").toLowerCase();
      if (t === "renewal") {
        actions.unshift("Create renewal success summary", "Identify expansion levers and risks");
      } else if (t === "qbr") {
        actions.unshift("Draft QBR agenda and collect metrics", "Confirm attendee list and goals");
      } else if (t === "churn" || String(health?.riskLevel || "").toLowerCase() === "high") {
        actions.unshift("Open risk mitigation plan", "Assign DRI and timeline");
      }

      out.actions = dedupe(actions);
    }

    // Summary backfill when the model omitted it
    if (!out.summary) {
      const usage = resultCache["get_customer_usage"] as any | undefined;
      const tickets = resultCache["get_recent_tickets"] as any | undefined;
      const contract = resultCache["get_contract_info"] as any | undefined;
      const parts: string[] = [];
      if (usage?.trend) parts.push(`Usage trend: ${usage.trend}`);
      if (typeof tickets?.openTickets === "number") parts.push(`Open tickets: ${tickets.openTickets}`);
      if (contract?.renewalDate) parts.push(`Renewal: ${contract.renewalDate}`);
      if (out.health?.score && out.health?.riskLevel) parts.push(`Health: ${out.health.score} (${out.health.riskLevel})`);
      if (parts.length) out.summary = parts.join("; ");
    }

    // Drop incomplete emailDrafts
    if (out.emailDraft && (typeof out.emailDraft.subject !== "string" || typeof out.emailDraft.body !== "string")) {
      out.emailDraft = undefined;
    }

    // If health is still missing but we have a customer, fetch it deterministically
    if (!out.health && resolvedCustomerId) {
      try {
        const t0h = performance.now();
        const resH = await invokeTool("calculate_health", { customerId: resolvedCustomerId }, HealthSchema);
        const t1h = performance.now();
        if (resH.ok) {
          out.health = resH.data;
          usedTools.push({ name: "calculate_health", tookMs: Math.round(t1h - t0h) });
        } else {
          usedTools.push({ name: "calculate_health", error: resH.error.code });
        }
      } catch (e) {
        usedTools.push({ name: "calculate_health", error: (e as Error).message });
      }
    }

    out.planSource = "llm";
    if (taskHint) (out as any).task = taskHint;
    if (resolvedCustomerId) out.customerId = resolvedCustomerId;
    return out;
  }

  // If max steps reached, return partial
  return {
    summary: "Some customer data may be unavailable. Showing partial results.",
    actions: ["Reduce scope", "Try again later"],
    usedTools,
    notes: "Planner reached step limit without finalizing.",
    planSource: "llm",
    customerId: resolvedCustomerId,
    ...(taskHint ? { task: taskHint } : {}),
    // Provide any structured fields we already fetched
    ...(resultCache["calculate_health"] ? { health: resultCache["calculate_health"] as any } : {}),
    ...(resultCache["generate_email"] ? { emailDraft: resultCache["generate_email"] as any } : {}),
    ...(resultCache["generate_qbr_outline"]
      ? { actions: (resultCache["generate_qbr_outline"] as any)?.sections }
      : {}),
    ...(function () {
      const usage = resultCache["get_customer_usage"] as any | undefined;
      const tickets = resultCache["get_recent_tickets"] as any | undefined;
      const contract = resultCache["get_contract_info"] as any | undefined;
      const parts: string[] = [];
      if (usage?.trend) parts.push(`Usage trend: ${usage.trend}`);
      if (typeof tickets?.openTickets === "number") parts.push(`Open tickets: ${tickets.openTickets}`);
      if (contract?.renewalDate) parts.push(`Renewal: ${contract.renewalDate}`);
      return parts.length ? { summary: parts.join("; ") } : {};
    })(),
  };
}

function daysUntil(dateStr: string): number | null {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const ms = d.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function dedupe(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of arr) {
    const key = a.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(a);
    }
  }
  return out;
}
