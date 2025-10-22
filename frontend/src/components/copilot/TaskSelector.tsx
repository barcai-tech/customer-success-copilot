"use client";

import { Zap } from "lucide-react";
import {
  useCopilotStore,
  TASKS,
  type TaskType,
} from "@/src/store/copilot-store";
import { cn } from "@/src/lib/utils";

export function TaskSelector() {
  const { selectedTask, setTask, status } = useCopilotStore();
  const isDisabled = status === "running";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">Choose Task</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(Object.keys(TASKS) as TaskType[]).map((taskKey) => {
          const task = TASKS[taskKey];
          const isSelected = selectedTask === taskKey;

          return (
            <button
              key={taskKey}
              onClick={() => setTask(taskKey)}
              disabled={isDisabled}
              className={cn(
                "relative px-4 py-4 rounded-lg border-2 text-left transition-all",
                "hover:border-primary/50 hover:bg-accent/50 hover:scale-[1.02]",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                isSelected
                  ? "border-primary bg-primary/5 shadow-md scale-[1.02]"
                  : "border-border bg-card"
              )}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{task.icon}</span>
                  <div className="font-semibold text-sm">{task.label}</div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {task.description}
                </p>
              </div>

              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
