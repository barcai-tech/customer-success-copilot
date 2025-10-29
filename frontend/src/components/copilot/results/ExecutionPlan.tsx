import { CheckCircle2, Circle } from "lucide-react";

interface ExecutionPlanProps {
  decisionLog?: Array<{
    step?: number;
    tool?: string;
    action?: string;
    reason: string;
  }>;
  planSummary?: string;
  usedTools?: Array<{ name: string; tookMs?: number; error?: string }>;
}

export function ExecutionPlan({
  decisionLog,
  planSummary,
  usedTools = [],
}: ExecutionPlanProps) {
  if (!decisionLog || decisionLog.length === 0) return null;

  // Map completed tools
  const completed = new Set(usedTools.map((t) => t.name));

  return (
    <div className="rounded-lg border border-primary/20 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <h3 className="font-semibold text-sm">Execution Plan</h3>
      </div>

      {planSummary && (
        <p className="text-sm text-muted-foreground italic">{planSummary}</p>
      )}

      <div className="space-y-2">
        {decisionLog.map((entry, idx) => {
          const toolName = entry.tool || "";
          const isComplete = completed.has(toolName);

          return (
            <div key={idx} className="flex items-start gap-3 text-sm">
              <div className="mt-0.5">
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    Step {entry.step || idx + 1}
                  </span>
                  <span className="font-medium">
                    {toolName.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {entry.reason}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
