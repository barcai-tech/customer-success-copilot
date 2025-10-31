"use client";

import React, { useState } from "react";
import { AlertCircle, ChevronRight, Sparkles, Target } from "lucide-react";
import type { PlannerResult } from "@/src/agent/planner";
import { cn } from "@/src/lib/utils";

interface ResultsSummaryCardProps {
  result: PlannerResult;
  taskType?: string;
}

export function ResultsSummaryCard({
  result,
  taskType = "analysis",
}: ResultsSummaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { summary, health, actions, notes } = result;

  // Determine priority based on health score
  const getPriorityColor = (score?: number) => {
    if (!score)
      return "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800";
    if (score >= 80)
      return "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800";
    if (score >= 60)
      return "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800";
    return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";
  };

  const getPriorityBadge = (score?: number) => {
    if (!score)
      return {
        text: "Neutral",
        color: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
      };
    if (score >= 80)
      return {
        text: "Healthy",
        color:
          "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300",
      };
    if (score >= 60)
      return {
        text: "At Risk",
        color:
          "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300",
      };
    return {
      text: "Critical",
      color: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300",
    };
  };

  const priorityBadge = getPriorityBadge(health?.score);
  const priorityColors = getPriorityColor(health?.score);

  return (
    <div
      className={cn(
        "border-2 rounded-lg p-6 space-y-6 transition-all duration-200",
        priorityColors
      )}
    >
      {/* Header with Priority Badge */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-foreground" />
            <h3 className="text-lg font-semibold text-foreground">
              {taskType.charAt(0).toUpperCase() + taskType.slice(1)} Results
            </h3>
          </div>
          {summary && (
            <p
              className={cn(
                "text-sm text-foreground/80",
                !isExpanded && "line-clamp-2"
              )}
            >
              {summary}
            </p>
          )}
        </div>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0",
            priorityBadge.color
          )}
        >
          {priorityBadge.text}
        </span>
      </div>

      {/* Key Metrics Grid */}
      {health && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Health Score */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground/70">
              Health Score
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">
                {health.score}
              </span>
              <span className="text-xs text-foreground/60">/100</span>
            </div>
            {/* Simple bar indicator */}
            <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  health.score >= 80
                    ? "bg-emerald-500"
                    : health.score >= 60
                    ? "bg-amber-500"
                    : "bg-red-500"
                )}
                style={{ width: `${Math.min(health.score, 100)}%` }}
              />
            </div>
          </div>

          {/* Risk Level */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground/70">Risk Level</p>
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-foreground">
                {health.riskLevel.charAt(0).toUpperCase() +
                  health.riskLevel.slice(1)}
              </span>
            </div>
          </div>

          {/* Signals Count */}
          {health.signals && health.signals.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground/70">
                Key Signals
              </p>
              <p className="text-2xl font-bold text-foreground">
                {health.signals.length}
              </p>
            </div>
          )}

          {/* Action Count */}
          {actions && actions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground/70">
                Next Steps
              </p>
              <p className="text-2xl font-bold text-foreground">
                {actions.length}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Key Signals Summary */}
      {health?.signals && health.signals.length > 0 && (
        <div className="space-y-3 border-t border-foreground/10 pt-4">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Key Signals
          </p>
          <ul className="space-y-2">
            {health.signals
              .slice(0, isExpanded ? health.signals.length : 3)
              .map((signal: string, idx: number) => (
                <li key={idx} className="text-sm text-foreground/80 flex gap-2">
                  <span className="shrink-0 mt-0.5">•</span>
                  <span className={!isExpanded ? "line-clamp-1" : ""}>
                    {signal}
                  </span>
                </li>
              ))}
            {health.signals.length > 3 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-foreground/60 hover:text-foreground/80 italic transition-colors cursor-pointer mt-1"
              >
                {isExpanded
                  ? "Show less signals"
                  : `+${health.signals.length - 3} more signals`}
              </button>
            )}
          </ul>
        </div>
      )}

      {/* Action Items */}
      {actions && actions.length > 0 && (
        <div className="space-y-3 border-t border-foreground/10 pt-4">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Target className="h-4 w-4" />
            Recommended Actions
          </p>
          <ol className="space-y-2">
            {actions
              .slice(0, isExpanded ? actions.length : 3)
              .map((action, idx) => (
                <li key={idx} className="text-sm text-foreground/80 flex gap-2">
                  <span className="shrink-0 font-semibold text-foreground/60 min-w-6">
                    {idx + 1}.
                  </span>
                  <span className={!isExpanded ? "line-clamp-2" : ""}>
                    {action}
                  </span>
                </li>
              ))}
            {actions.length > 3 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-foreground/60 hover:text-foreground/80 italic transition-colors cursor-pointer mt-1 flex gap-2"
              >
                <span className="shrink-0">+</span>
                <span>
                  {isExpanded
                    ? "Show less actions"
                    : `${actions.length - 3} more action${
                        actions.length - 3 !== 1 ? "s" : ""
                      }`}
                </span>
              </button>
            )}
          </ol>
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div className="border-t border-foreground/10 pt-4 space-y-2">
          <p className="text-xs font-semibold text-foreground/70">
            Additional Notes
          </p>
          <p
            className={cn(
              "text-sm text-foreground/75",
              !isExpanded && "line-clamp-3"
            )}
          >
            {notes}
          </p>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium text-foreground rounded-md hover:bg-foreground/10 transition-all"
      >
        {isExpanded ? "Collapse Details" : "View Full Report"}
        <ChevronRight
          className={cn(
            "h-4 w-4 transition-transform",
            isExpanded && "rotate-90"
          )}
        />
      </button>
    </div>
  );
}
