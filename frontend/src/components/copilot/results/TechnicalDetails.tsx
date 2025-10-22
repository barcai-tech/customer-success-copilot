"use client";

import { Wrench, X } from "lucide-react";
import type { PlannerResult } from "@/src/agent/planner";
import { PlanRationale } from "./PlanRationale";
import { ToolExecutionTimeline } from "./ToolExecutionTimeline";
import { CUSTOMERS } from "@/src/store/copilot-store";
import { useCopilotStore } from "@/src/store/copilot-store";
import { Button } from "@/src/components/ui/button";

interface TechnicalDetailsProps {
  result: PlannerResult;
  isRunning?: boolean;
}

export function TechnicalDetails({ result, isRunning = false }: TechnicalDetailsProps) {
  const showRationale = !!(result.decisionLog || (result.usedTools && result.usedTools.length > 0));
  const showTimeline = !!(result.usedTools && (result.usedTools.length > 0 || isRunning));
  if (!showRationale && !showTimeline) return null;

  const customerLabel = (() => {
    if (!result.customerId) return undefined;
    const found = CUSTOMERS.find((c) => c.id === result.customerId);
    return found ? `${found.name} (${found.id})` : result.customerId;
  })();

  const cancelStream = useCopilotStore((s) => s.cancelStream);
  const status = useCopilotStore((s) => s.status);

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Wrench className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Technical Details</h3>
        {result.planSource && (
          <span
            className={
              result.planSource === "llm"
                ? "ml-2 text-xs px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary"
                : "ml-2 text-xs px-2 py-0.5 rounded-full border bg-muted text-muted-foreground"
            }
          >
            {result.planSource === "llm" ? "LLM Plan" : "Heuristic Plan"}
          </span>
        )}
        {result.task && (
          <span className="ml-2 text-xs px-2 py-0.5 rounded-full border bg-muted text-muted-foreground capitalize">
            {result.task}
          </span>
        )}
        {customerLabel && (
          <span className="ml-2 text-xs px-2 py-0.5 rounded-full border bg-muted text-muted-foreground">
            {customerLabel}
          </span>
        )}
        <div className="ml-auto">
          {isRunning && status === "running" && (
            <Button variant="outline" size="sm" onClick={cancelStream} className="gap-1">
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
          )}
        </div>
      </div>
      {result.planSource === "heuristic" && result.planHint && (
        <div className="text-xs text-muted-foreground -mt-2">
          Fell back to heuristic planner: {result.planHint}
        </div>
      )}

      {showRationale && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Plan</div>
          <PlanRationale
            decisionLog={result.decisionLog}
            usedTools={result.usedTools}
            embedded
            compact
          />
        </div>
      )}

      {showTimeline && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Tools</div>
          <ToolExecutionTimeline tools={result.usedTools || []} isRunning={isRunning} embedded compact />
        </div>
      )}
    </div>
  );
}
