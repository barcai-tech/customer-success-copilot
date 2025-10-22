import { NextRequest } from "next/server";
import { parseIntent } from "@/src/agent/intent";
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

type ToolSchemaMap = Record<ToolName, z.ZodSchema<any>>;
const TOOL_SCHEMAS: ToolSchemaMap = {
  get_customer_usage: UsageSchema,
  get_recent_tickets: TicketsSchema,
  get_contract_info: ContractSchema,
  calculate_health: HealthSchema,
  generate_email: EmailSchema,
  generate_qbr_outline: QbrSchema,
};

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const message = searchParams.get("message") || "";
  const selectedCustomerId = searchParams.get("selectedCustomerId") || undefined;
  if (!message) return new Response("Missing message", { status: 400 });

  const stream = new ReadableStream({
    start: async (controller) => {
      const enc = new TextEncoder();
      const send = (type: string, data: unknown) => {
        controller.enqueue(enc.encode(`event: ${type}\n`));
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      const close = () => controller.close();

      try {
        // Resolve customer first to keep tools + UI aligned
        const parsed = await parseIntent(message);
        const customerId = parsed.customerId || selectedCustomerId;
        const task = parsed.task || null;
        if (!customerId) {
          send("final", { planSource: "heuristic", planHint: "No customer resolved from prompt or UI selection." });
          return close();
        }

        const tools = getToolRegistry();
        const usedTools: Array<{ name: string; tookMs?: number; error?: string }> = [];
        const cache: Partial<Record<ToolName, unknown>> = {};
        const messages: LlmMessage[] = [
          {
            role: "system",
            content: [
              "You are Customer Success Copilot.",
              "Use tools as the only source of facts.",
              "Max 5 tools. Final answer must be a single JSON object (summary, health?, actions?, emailDraft?, notes?, decisionLog?).",
            ].join("\n"),
          },
          {
            role: "user",
            content: [`User request: ${message}`, `Hint customerId: ${customerId}`].join("\n"),
          },
        ];

        const timed = async <T,>(fn: () => Promise<T>, name: string) => {
          const t0 = performance.now();
          try {
            const out = await fn();
            const t1 = performance.now();
            usedTools.push({ name, tookMs: Math.round(t1 - t0) });
            return out;
          } catch (e) {
            const t1 = performance.now();
            usedTools.push({ name, error: (e as Error).message });
            throw e;
          }
        };

        const daysUntil = (dateStr: string): number | null => {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return null;
          const ms = d.getTime() - Date.now();
          return Math.ceil(ms / (1000 * 60 * 60 * 24));
        };

        const synthesizeActions = (taskHint?: string | null): string[] => {
          const usage = cache["get_customer_usage"] as any | undefined;
          const tickets = cache["get_recent_tickets"] as any | undefined;
          const contract = cache["get_contract_info"] as any | undefined;
          const health = cache["calculate_health"] as any | undefined;
          const actions: string[] = [];
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
          if (typeof tickets?.openTickets === "number") {
            if (tickets.openTickets > 3) actions.push("Triage and resolve open tickets with support lead");
            else if (tickets.openTickets > 0) actions.push("Follow up on open tickets and communicate ETA");
          }
          if (contract?.renewalDate) {
            const days = daysUntil(contract.renewalDate);
            if (days !== null) {
              if (days <= 30) {
                actions.push(
                  "Lock renewal timeline and decision owners",
                  "Deliver value realization deck",
                  "Draft order form and route for legal review",
                  "Set weekly exec cadence until signature"
                );
              } else if (days <= 60) {
                actions.push(
                  "Run stakeholder alignment call",
                  "Confirm procurement steps and blockers",
                  "Share pricing and packaging options"
                );
              } else if (days <= 90) {
                actions.push(
                  "Prepare renewal brief and value summary",
                  "Book renewal prep call",
                  "Align pricing and legal timelines"
                );
              } else if (days <= 180) {
                actions.push("Plan pre-renewal business review and success plan");
              }
            }
          }
          const t = (taskHint || "").toLowerCase();
          if (t === "renewal") {
            actions.unshift("Create renewal success summary", "Identify expansion levers and risks");
          } else if (t === "qbr") {
            actions.unshift("Draft QBR agenda and collect metrics", "Confirm attendee list and goals");
          } else if (t === "churn" || String(health?.riskLevel || "").toLowerCase() === "high") {
            actions.unshift("Open risk mitigation plan", "Assign DRI and timeline");
          }
          const out: string[] = [];
          const seen = new Set<string>();
          for (const a of actions) {
            const k = a.toLowerCase();
            if (!seen.has(k)) { seen.add(k); out.push(a); }
          }
          return out;
        };

        const synthesizeSummary = (): string | undefined => {
          const usage = cache["get_customer_usage"] as any | undefined;
          const tickets = cache["get_recent_tickets"] as any | undefined;
          const contract = cache["get_contract_info"] as any | undefined;
          const health = cache["calculate_health"] as any | undefined;
          const parts: string[] = [];
          if (usage?.trend) parts.push(`Usage trend: ${usage.trend}`);
          if (typeof tickets?.openTickets === "number") parts.push(`Open tickets: ${tickets.openTickets}`);
          if (contract?.renewalDate) parts.push(`Renewal: ${contract.renewalDate}`);
          if (health?.score && health?.riskLevel) parts.push(`Health: ${health.score} (${health.riskLevel})`);
          return parts.length ? parts.join("; ") : undefined;
        };

        // LLM loop (minimal streaming)
        let toolRounds = 0;
        for (let step = 0; step < 8; step++) {
          const resp = await callLLM(messages, { tools });
          if (resp.type === "tool_calls" && resp.assistant?.tool_calls?.length) {
            // Stream plan right away
            send("plan", {
              planSource: "llm",
              customerId,
              task,
              decisionLog: resp.assistant.tool_calls.map((tc, i) => ({ step: i + 1, tool: tc.function.name, reason: "" })),
            });

            // Append assistant message
            messages.push({ role: "assistant", content: resp.assistant.content ?? "", tool_calls: resp.assistant.tool_calls });
            toolRounds++;

            // Execute tools in parallel per round
            await Promise.all(
              resp.assistant.tool_calls.map(async (tc) => {
                const name = tc.function.name as ToolName;
                let args: any = {};
                try { args = JSON.parse(tc.function.arguments || "{}"); } catch {}
                const cid = args.customerId || customerId;
                const params = args.params || {};
                send("tool:start", { name });
                let envelope: unknown;
                let endRecord: { name: string; tookMs?: number; error?: string } = { name };
                try {
                  const schema = TOOL_SCHEMAS[name];
                  const t0 = performance.now();
                  const res = await invokeTool(name, { customerId: cid, params }, schema);
                  const t1 = performance.now();
                  if ((res as any).ok) {
                    endRecord.tookMs = Math.round(t1 - t0);
                    usedTools.push({ name, tookMs: endRecord.tookMs });
                  } else {
                    endRecord.error = (res as any).error?.code || "ERROR";
                    usedTools.push({ name, error: endRecord.error });
                  }
                  envelope = res;
                  if ((res as any).ok) {
                    cache[name] = (res as any).data;
                    if (name === "calculate_health") send("patch", { health: (res as any).data });
                    if (name === "generate_email") send("patch", { emailDraft: (res as any).data });
                    if (name === "generate_qbr_outline") send("patch", { actions: ((res as any).data?.sections) || [] });
                    const summary = synthesizeSummary();
                    const actions = synthesizeActions(task);
                    const patch: any = {};
                    if (summary) patch.summary = summary;
                    if (actions && actions.length) patch.actions = actions;
                    if (Object.keys(patch).length) send("patch", patch);
                  }
                } catch (e) {
                  endRecord.error = (e as Error).message;
                  usedTools.push({ name, error: endRecord.error });
                  envelope = { ok: false, data: null, error: { code: "EXCEPTION", message: (e as Error).message } };
                }
                messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(envelope) });
                send("tool:end", endRecord);
              })
            );
            
            // Nudge to finalize after multiple rounds
            if (toolRounds >= 2) {
              messages.push({ role: "user", content: "Return the final JSON now. No markdown." });
            }
            continue;
          }

          // Try to parse final JSON
          const content = resp.message ?? "";
          let parsed: any = null;
          try {
            parsed = JSON.parse(content);
          } catch {
            const fence = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
            const match = fence?.[1] || content.match(/\{[\s\S]*\}/)?.[0];
            if (match) {
              try { parsed = JSON.parse(match); } catch {}
            }
          }
          const res = PlannerResultSchema.safeParse(parsed || {});
          let out: any = res.success ? res.data : {};
          // Backfill from cached tools
          if (!out.health && cache["calculate_health"]) out.health = cache["calculate_health"]; 
          if (!out.emailDraft && cache["generate_email"]) out.emailDraft = cache["generate_email"]; 
          if ((!out.actions || out.actions.length === 0) && cache["generate_qbr_outline"]) out.actions = (cache["generate_qbr_outline"] as any)?.sections || [];
          // Deterministic health if still missing
          if (!out.health) {
            try {
              const resH = await invokeTool("calculate_health", { customerId, params: {} }, HealthSchema);
              if ((resH as any).ok) {
                out.health = (resH as any).data;
                usedTools.push({ name: "calculate_health" });
                send("patch", { health: (resH as any).data });
              }
            } catch {}
          }
          if (!out.summary) {
            const s = synthesizeSummary();
            if (s) out.summary = s;
          }
          if (!out.actions || out.actions.length === 0) {
            const acts = synthesizeActions(task);
            if (acts.length) out.actions = acts;
          }
          out.planSource = "llm";
          out.customerId = customerId;
          if (task) (out as any).task = task;
          out.usedTools = usedTools;
          send("final", out);
          return close();
        }

        // Step limit fallback with partials
        send("final", {
          summary: "Partial results.",
          planSource: "llm",
          customerId,
          usedTools,
          ...(cache["calculate_health"] ? { health: cache["calculate_health"] } : {}),
          ...(cache["generate_email"] ? { emailDraft: cache["generate_email"] } : {}),
          ...(cache["generate_qbr_outline"] ? { actions: (cache["generate_qbr_outline"] as any)?.sections || [] } : {}),
        });
        close();
      } catch (e) {
        send("final", { planSource: "heuristic", planHint: (e as Error).message });
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
