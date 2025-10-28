"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Clock, Zap } from "lucide-react";
import type { ExecutionStep } from "@/src/store/eval-detail-store";

interface ExecutionStepViewProps {
  step: ExecutionStep;
  level?: number;
}

function ExecutionStepView({ step, level = 0 }: ExecutionStepViewProps) {
  const [expanded, setExpanded] = useState(level === 0);
  const hasChildren = step.children && step.children.length > 0;

  const getLevelColor = (stepLevel: string) => {
    switch (stepLevel) {
      case "success":
        return "text-emerald-600 dark:text-emerald-400";
      case "error":
        return "text-rose-600 dark:text-rose-400";
      case "warning":
        return "text-amber-600 dark:text-amber-400";
      case "debug":
        return "text-slate-500 dark:text-slate-400";
      default:
        return "text-sky-600 dark:text-sky-400";
    }
  };

  const getLevelBgColor = (stepLevel: string) => {
    switch (stepLevel) {
      case "success":
        return "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800";
      case "error":
        return "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800";
      case "warning":
        return "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800";
      case "debug":
        return "bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800";
      default:
        return "bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800";
    }
  };

  const getLevelIcon = (stepLevel: string) => {
    switch (stepLevel) {
      case "success":
        return "✓";
      case "error":
        return "✗";
      case "warning":
        return "⚠";
      case "debug":
        return "→";
      default:
        return "•";
    }
  };

  const paddingLeft = Math.min(level * 4, 16);

  return (
    <div
      className="space-y-1.5"
      style={{ marginLeft: `${paddingLeft * 0.25}rem` }}
    >
      <div
        className={`rounded-lg border p-3.5 transition-all hover:shadow-md ${getLevelBgColor(
          step.level
        )}`}
      >
        <div className="flex items-start gap-3">
          {hasChildren && (
            <button
              onClick={() => setExpanded(!expanded)}
              className={`mt-0.5 p-1 h-6 w-6 flex items-center justify-center hover:bg-white/50 dark:hover:bg-black/20 rounded transition-colors flex-shrink-0 ${getLevelColor(
                step.level
              )}`}
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          {!hasChildren && <span className="w-6" />}

          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <span
              className={`${getLevelColor(
                step.level
              )} text-lg font-semibold mt-0.5 flex-shrink-0`}
            >
              {getLevelIcon(step.level)}
            </span>

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm leading-snug text-foreground">
                {step.title}
              </div>
              {step.description && (
                <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {step.description}
                </div>
              )}
              {step.durationMs !== undefined && (
                <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-current/10">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/50 dark:bg-black/20 text-xs">
                    <Clock className="h-3 w-3" />
                    <span className="font-mono font-medium">
                      {(step.durationMs / 1000).toFixed(2)}s
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {expanded && step.children && step.children.length > 0 && (
        <div className="space-y-1.5">
          {step.children.map((child) => (
            <ExecutionStepView key={child.id} step={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

interface DetailedResultLogViewProps {
  log: {
    customerName: string;
    action: string;
    steps: ExecutionStep[];
    totalDurationMs: number;
  };
}

export function DetailedResultLogView({ log }: DetailedResultLogViewProps) {
  const totalSeconds = log.totalDurationMs / 1000;

  return (
    <div className="space-y-5 px-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-bold text-lg leading-tight text-foreground">
            {log.customerName}
          </h3>
          <p className="text-sm text-muted-foreground capitalize">
            Task: {log.action}
          </p>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800 flex-shrink-0">
              <Clock className="h-4 w-4 text-slate-700 dark:text-slate-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">
                Total Duration
              </p>
              <p className="text-lg font-bold font-mono text-foreground">
                {totalSeconds.toFixed(2)}s
              </p>
            </div>
          </div>
          <div className="text-right pl-4 border-l border-slate-300 dark:border-slate-700">
            <p className="text-xs text-muted-foreground font-medium">
              {log.steps.length}
            </p>
            <p className="text-xs text-muted-foreground">
              {log.steps.length === 1 ? "step" : "steps"}
            </p>
          </div>
        </div>
      </div>

      {/* Execution Steps */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Execution Breakdown
        </h4>
        <div className="space-y-1.5 max-h-96 overflow-y-auto pr-3">
          {log.steps.length === 0 ? (
            <div className="rounded-lg border border-dashed p-5 text-center">
              <p className="text-xs text-muted-foreground italic">
                No execution steps recorded
              </p>
            </div>
          ) : (
            log.steps.map((step) => (
              <ExecutionStepView key={step.id} step={step} level={0} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
