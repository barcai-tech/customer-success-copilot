"use client";

import { Activity, AlertTriangle, TrendingUp, Minus } from "lucide-react";
import type { Health } from "@/src/contracts/tools";
import { cn } from "@/src/lib/utils";

interface HealthSummaryProps {
  health: Health;
}

export function HealthSummary({ health }: HealthSummaryProps) {
  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "low":
        return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900";
      case "medium":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900";
      case "high":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900";
      default:
        return "text-muted-foreground bg-muted border-border";
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "low":
        return <TrendingUp className="h-5 w-5" />;
      case "high":
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Minus className="h-5 w-5" />;
    }
  };

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Health Summary</h3>
        </div>

        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border",
            getRiskColor(health.riskLevel)
          )}
        >
          {getRiskIcon(health.riskLevel)}
          <span className="text-sm font-medium capitalize">
            {health.riskLevel} Risk
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-4xl font-bold">{health.score}</div>
        <div className="text-sm text-muted-foreground">/ 100</div>
      </div>

      {health.signals.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Key Signals</div>
          <div className="flex flex-wrap gap-2">
            {health.signals.map((signal, i) => (
              <div
                key={i}
                className="px-3 py-1.5 rounded-md bg-muted text-sm text-foreground"
              >
                {signal}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
