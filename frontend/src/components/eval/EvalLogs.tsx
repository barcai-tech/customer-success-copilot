import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { useEvalLogStore } from "@/src/store/eval-log-store";

export function EvalLogs() {
  const { logs, clearLogs } = useEvalLogStore();
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const getLogColor = (level: string) => {
    switch (level) {
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "warning":
        return "text-yellow-400";
      default:
        return "text-gray-300";
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
    <div className="rounded-lg border border-gray-700 bg-[#0d1117] overflow-hidden flex flex-col h-96">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-900 px-4 py-2 border-b border-gray-700">
        <h4 className="font-mono text-sm font-semibold text-gray-200">
          Evaluation Log
        </h4>
        {logs.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearLogs}
            className="h-6 px-2 text-xs text-gray-400 hover:text-gray-200"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Log display */}
      <div className="flex-1 overflow-y-auto bg-[#0d1117] p-4 font-mono text-xs">
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            Logs will appear here when evaluation starts...
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`flex gap-3 ${getLogColor(log.level)}`}
              >
                <span className="text-gray-600 shrink-0 w-4">
                  {getLogIcon(log.level)}
                </span>
                <div className="flex-1 wrap-break-word">
                  <span className="text-gray-400">
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
        )}
      </div>
    </div>
  );
}
