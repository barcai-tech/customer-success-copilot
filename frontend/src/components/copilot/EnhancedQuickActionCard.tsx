"use client";

import React from "react";
import {
  Activity,
  FileText,
  Mail,
  PresentationIcon,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Button } from "../ui/button";
import type { TaskType } from "../../store/copilot-store";

interface EnhancedQuickActionCardProps {
  taskType: TaskType;
  label: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

const TASK_CONFIG: Record<
  TaskType,
  {
    icon: React.ComponentType<{ className?: string }>;
    bgColor: string;
    borderColor: string;
    badgeColor: string;
    badgeText: string;
  }
> = {
  health: {
    icon: Activity,
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    badgeColor:
      "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300",
    badgeText: "Health",
  },
  renewal: {
    icon: FileText,
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    badgeColor: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300",
    badgeText: "Contract",
  },
  qbr: {
    icon: PresentationIcon,
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800",
    badgeColor:
      "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300",
    badgeText: "Strategic",
  },
  email: {
    icon: Mail,
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    badgeColor:
      "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300",
    badgeText: "Engagement",
  },
  churn: {
    icon: AlertTriangle,
    bgColor: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-800",
    badgeColor: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300",
    badgeText: "Risk",
  },
};

export function EnhancedQuickActionCard({
  taskType,
  label,
  description,
  onClick,
  disabled = false,
}: EnhancedQuickActionCardProps) {
  const config = TASK_CONFIG[taskType];
  const Icon = config.icon;

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      className={`h-auto w-full justify-start p-3 border-2 transition-all duration-200 hover:shadow-md ${config.borderColor} ${config.bgColor} hover:scale-[1.01]`}
      title={description}
    >
      <div className="flex items-center justify-between gap-2.5 w-full">
        {/* Left: Icon + Title */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-md bg-white dark:bg-slate-900 shadow-sm">
            <Icon className="h-4 w-4 text-foreground" />
          </div>
          <h4 className="text-sm font-semibold text-foreground truncate">
            {label}
          </h4>
        </div>

        {/* Right: Badge + Arrow */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${config.badgeColor}`}
          >
            {config.badgeText}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Button>
  );
}
