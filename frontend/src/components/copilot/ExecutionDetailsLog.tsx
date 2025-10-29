"use client";

import { useEffect, useRef, useMemo } from "react";
import { useCopilotExecutionLogStore } from "@/src/store/copilot-execution-log-store";

interface ExecutionDetailsLogProps {
  messageId: string;
  isRunning?: boolean;
}

export function ExecutionDetailsLog({
  messageId,
  isRunning = false,
}: ExecutionDetailsLogProps) {
  const allLogs = useCopilotExecutionLogStore((state) => state.logs);

  // Memoize the filtered logs to prevent re-creating the array on every render
  const logs = useMemo(
    () => allLogs.filter((log) => log.messageId === messageId),
    [allLogs, messageId]
  );

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isRunning) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isRunning]);

  if (logs.length === 0) return null;

  const getLogColor = (level: string) => {
    switch (level) {
      case "success":
        return "text-green-600 dark:text-green-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case "success":
        return "✓";
      case "error":
        return "✗";
      case "warning":
        return "⚠";
      default:
        return "→";
    }
  };

  return (
    <div className="w-full rounded-lg border bg-muted/50 overflow-hidden">
      {/* Header */}
      <div className="bg-muted px-3 py-1.5 border-b">
        <h4 className="font-mono text-xs font-semibold flex items-center gap-2">
          <span className="text-muted-foreground">Execution Details</span>
          {isRunning && (
            <span className="flex items-center gap-1 text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Running
            </span>
          )}
        </h4>
      </div>

      {/* Log display */}
      <div className="max-h-64 overflow-y-auto p-3 font-mono text-xs space-y-0.5">
        {logs.map((log) => (
          <div key={log.id} className={`flex gap-2 ${getLogColor(log.level)}`}>
            <span className="shrink-0 w-4">{getLogIcon(log.level)}</span>
            <div className="flex-1 wrap-break-word">
              <span className="text-muted-foreground">
                [
                {log.timestamp.toLocaleTimeString("en-US", {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
                ]
              </span>
              <span className="ml-2">{log.message}</span>
            </div>
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
