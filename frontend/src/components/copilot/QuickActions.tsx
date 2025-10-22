"use client";

import {
  Activity,
  FileText,
  Mail,
  PresentationIcon,
  AlertTriangle,
} from "lucide-react";
import { useCopilotStore, TASKS } from "../../store/copilot-store";
import type { TaskType } from "../../store/copilot-store";

const TASK_ICONS = {
  health: Activity,
  renewal: FileText,
  qbr: PresentationIcon,
  email: Mail,
  churn: AlertTriangle,
};

interface QuickActionsProps {
  onActionClick?: (taskType: TaskType, prompt: string) => void;
  disabled?: boolean;
}

export function QuickActions({
  onActionClick,
  disabled = false,
}: QuickActionsProps) {
  const selectedCustomer = useCopilotStore((state) => state.selectedCustomer);
  const setInputValue = useCopilotStore((state) => state.setInputValue);

  const handleQuickAction = (taskType: TaskType) => {
    const customerName = selectedCustomer?.name || "[Customer]";

    let prompt = "";
    switch (taskType) {
      case "health":
        prompt = `What's the health status of ${customerName}?`;
        break;
      case "renewal":
        prompt = `Generate a renewal brief for ${customerName}`;
        break;
      case "qbr":
        prompt = `Create a QBR outline for ${customerName}`;
        break;
      case "email":
        prompt = `Draft a check-in email for ${customerName}`;
        break;
      case "churn":
        prompt = `Analyze churn risk for ${customerName}`;
        break;
    }

    setInputValue(prompt);
    onActionClick?.(taskType, prompt);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
        <span className="text-xs text-muted-foreground">
          {selectedCustomer
            ? `for ${selectedCustomer.name}`
            : "Select a customer"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {(Object.keys(TASKS) as TaskType[]).map((taskType) => {
          const task = TASKS[taskType];
          const Icon = TASK_ICONS[taskType];

          return (
            <button
              key={taskType}
              type="button"
              onClick={() => handleQuickAction(taskType)}
              disabled={disabled}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-primary hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground mb-1">
                  {task.label}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {task.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          💡 Click any action to populate the chat input, or type your own
          question
        </p>
      </div>
    </div>
  );
}
