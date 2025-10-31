"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendBadgeProps {
  trend: string | null;
}

export function TrendBadge({ trend }: TrendBadgeProps) {
  if (!trend) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400">
        <Minus className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">Flat</span>
      </div>
    );
  }

  if (trend === "up") {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
        <TrendingUp className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">Growing</span>
      </div>
    );
  }

  if (trend === "down") {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
        <TrendingDown className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">At Risk</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400">
      <Minus className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">—</span>
    </div>
  );
}
