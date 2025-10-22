"use client";

import { Lightbulb } from "lucide-react";
import type { PlannerResult } from "@/src/agent/planner";
import { CUSTOMERS } from "@/src/store/copilot-store";

interface PlanRationaleProps {
  decisionLog?: Array<{ step?: number; tool?: string; action?: string; reason: string }>;
  usedTools?: PlannerResult["usedTools"];
  planSource?: PlannerResult["planSource"];
  planHint?: string;
  customerId?: string;
  embedded?: boolean;
  compact?: boolean;
  showHeader?: boolean;
}

const DEFAULT_TOOL_REASONS: Record<string, string> = {
  get_customer_usage: "Check recent usage trends and engagement.",
  get_recent_tickets: "Review support volume and severity.",
  get_contract_info: "Identify ARR and renewal timing.",
  calculate_health: "Compute overall health score and risk.",
  generate_email: "Draft a customer-facing email summary.",
  generate_qbr_outline: "Prepare a QBR outline and talking points.",
};

function simplifyReason(reason: string, tool?: string): string {
  let r = reason.trim();
  // Strip leading "Called <tool> to" or similar phrasing
  r = r.replace(/^called\s+[a-zA-Z0-9_]+\s+to\s*/i, "");
  r = r.replace(/^call(ed)?\s+([a-zA-Z0-9_]+)\s*(?:to|for)\s*/i, "");
  // Remove trailing period
  r = r.replace(/[\.]\s*$/g, "");
  // If the reason still just restates the tool name, drop it
  if (tool && r.toLowerCase().includes(tool.toLowerCase())) return "";
  return r;
}

export function PlanRationale({ decisionLog, usedTools, planSource, planHint, customerId, embedded = false, compact = false, showHeader = true }: PlanRationaleProps) {
  const entries = (decisionLog && decisionLog.length
    ? decisionLog
    : (usedTools || []).map((t, i) => ({
        step: i + 1,
        tool: t.name,
        reason: t.reason || DEFAULT_TOOL_REASONS[t.name] || "Use tool to collect required data.",
      }))
  ).slice(0, 10);

  const customerLabel = (() => {
    if (!customerId) return undefined;
    const found = CUSTOMERS.find((c) => c.id === customerId);
    return found ? `${found.name} (${found.id})` : customerId;
  })();

  if (!entries || entries.length === 0) return null;

  const content = (
    <ol className={compact ? "space-y-1 list-decimal ml-4" : "space-y-2 list-decimal ml-5"}>
      {entries.map((item, idx) => {
        const text = compact ? simplifyReason(item.reason, item.tool) : item.reason;
        if (compact && !text) return null;
        return (
          <li key={`${item.tool || "step"}-${idx}`} className={compact ? "text-xs text-muted-foreground" : "text-sm text-muted-foreground"}>
            {compact ? (
              <>
                {item.tool ? <span className="text-foreground/80 mr-1">{item.tool}</span> : null}
                {text}
              </>
            ) : (
              <>
                <span className="text-foreground">{item.tool ? `${item.tool}: ` : ""}</span>
                {item.reason}
              </>
            )}
          </li>
        );
      })}
    </ol>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      {showHeader && (
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Plan Rationale</h3>
          {planSource && (
            <span
              className={
                planSource === "llm"
                  ? "ml-2 text-xs px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary"
                  : "ml-2 text-xs px-2 py-0.5 rounded-full border bg-muted text-muted-foreground"
              }
            >
              {planSource === "llm" ? "LLM Plan" : "Heuristic Plan"}
            </span>
          )}
          {customerLabel && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full border bg-muted text-muted-foreground">
              {customerLabel}
            </span>
          )}
        </div>
      )}

      {planSource === "heuristic" && planHint && (
        <div className="text-xs text-muted-foreground -mt-2">
          Fell back to heuristic planner: {planHint}
        </div>
      )}

      {content}
    </div>
  );
}
