"use client";

import { Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { PlannerResult } from "@/src/agent/planner";
import { cn } from "@/src/lib/utils";

interface ToolExecutionTimelineProps {
  tools: PlannerResult["usedTools"];
  isRunning?: boolean;
  embedded?: boolean;
  compact?: boolean;
}

export function ToolExecutionTimeline({ tools, isRunning = false, embedded = false, compact = false }: ToolExecutionTimelineProps) {
  if (tools.length === 0 && !isRunning) return null;

  const content = (
    <div className={compact ? "space-y-1" : "space-y-2"}>
        {tools.map((tool, index) => {
          const hasError = !!tool.error;
          const isSuccess = !hasError && typeof tool.tookMs === "number";

          return (
            <div
              key={`${tool.name}-${index}`}
              className={cn(
                "flex items-center justify-between rounded-md border transition-all",
                compact ? "px-3 py-2 text-xs" : "px-4 py-3",
                hasError
                  ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                  : "bg-muted border-border"
              )}
            >
              <div className="flex items-center gap-3">
                {hasError ? (
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                ) : isSuccess ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                ) : (
                  <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                )}

                <div className="flex flex-col">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      hasError && "text-red-700 dark:text-red-300"
                    )}
                  >
                    {tool.name}
                  </span>
                  {tool.reason && (
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {tool.reason}
                    </span>
                  )}
                  {tool.error && (
                    <span className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                      {tool.error}
                    </span>
                  )}
                </div>
              </div>

              {typeof tool.tookMs === "number" && (
                <span className={compact ? "text-[10px] text-muted-foreground font-mono" : "text-xs text-muted-foreground font-mono"}>
                  {tool.tookMs}ms
                </span>
              )}
            </div>
          );
        })}

        {isRunning && tools.length === 0 && (
          <div className={cn("flex items-center gap-3 rounded-md bg-muted border border-border", compact ? "px-3 py-2" : "px-4 py-3") }>
            <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
            <span className={compact ? "text-xs text-muted-foreground" : "text-sm text-muted-foreground"}>
              Initializing copilot...
            </span>
          </div>
        )}
      </div>
  );

  if (embedded) return content;

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Tool Execution</h3>
      </div>
      {content}
    </div>
  );
}
