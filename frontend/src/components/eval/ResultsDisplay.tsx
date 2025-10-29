import {
  CheckCircle,
  XCircle,
  Clock,
  Download,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import { DetailedLogModal } from "./DetailedLogModal";
import { useEvalStore } from "@/src/store/eval-store";
import type { EvalSession } from "@/src/contracts/eval";

interface ResultsDisplayProps {
  session: EvalSession | null;
}

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

export function ResultsDisplay({ session }: ResultsDisplayProps) {
  const [detailsResultId, setDetailsResultId] = useState<string | null>(null);
  const { sessionRuns, selectedRunId, selectRun } = useEvalStore();

  if (!session) return null;

  const handleExport = () => {
    const json = JSON.stringify(session, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eval-${session.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported evaluation");
  };

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Results</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export JSON
        </Button>
      </div>

      {/* Session Run History */}
      {sessionRuns.length > 1 && (
        <div className="pb-4 border-b space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            Previous Runs
          </p>
          <div className="flex flex-wrap gap-2">
            {sessionRuns.map((run) => (
              <button
                key={run.id}
                onClick={() => selectRun(run.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  selectedRunId === run.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
              >
                {run.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border p-3 bg-muted/50">
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="text-2xl font-bold">{session.summary.total}</div>
        </div>
        <div className="rounded-lg border p-3 bg-green-50 dark:bg-green-950/40">
          <div className="text-xs text-green-700 dark:text-green-300">
            Passed
          </div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300">
            {session.summary.passed}
          </div>
        </div>
        <div className="rounded-lg border p-3 bg-red-50 dark:bg-red-950/40">
          <div className="text-xs text-red-700 dark:text-red-300">Failed</div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-300">
            {session.summary.failed}
          </div>
        </div>
        <div className="rounded-lg border p-3 bg-muted/50">
          <div className="text-xs text-muted-foreground">Avg Time</div>
          <div className="text-2xl font-bold">
            {formatDuration(session.summary.avgDurationMs)}
          </div>
        </div>
      </div>

      {/* Results table */}
      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr className="border-b">
              <th className="text-left p-2">Customer</th>
              <th className="text-left p-2">Action</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Duration</th>
              <th className="text-left p-2">Metrics</th>
              <th className="text-left p-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {session.results.map((result) => (
              <tr
                key={result.id}
                className="border-b hover:bg-muted/50 transition-colors"
              >
                <td className="p-2">{result.customerName}</td>
                <td className="p-2 capitalize">{result.action}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {result.status === "success" && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                    {result.status === "failure" && (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    {result.status === "timeout" && (
                      <Clock className="h-4 w-4 text-orange-600" />
                    )}
                    <span className="capitalize text-xs">{result.status}</span>
                  </div>
                </td>
                <td className="p-2 text-xs text-muted-foreground">
                  {formatDuration(result.durationMs)}
                </td>
                <td className="p-2 text-xs">
                  <div className="flex flex-wrap gap-1">
                    {result.metrics.hasSummary && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-medium">
                        Summary
                      </span>
                    )}
                    {result.metrics.hasActions && (
                      <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 text-xs font-medium">
                        Actions
                      </span>
                    )}
                    {result.metrics.hasHealth && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-medium">
                        Health
                      </span>
                    )}
                    {result.metrics.hasEmail && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-medium">
                        Email
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDetailsResultId(result.id)}
                    className="h-6 w-6 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Errors */}
      {session.results.some((r) => r.error) && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40 p-4 space-y-2">
          <h4 className="font-medium text-sm text-red-900 dark:text-red-200">
            Errors
          </h4>
          <div className="space-y-1 text-xs text-red-800 dark:text-red-300">
            {session.results
              .filter((r) => r.error)
              .map((r) => (
                <div key={r.id}>
                  {r.customerName} / {r.action}: {r.error}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Details Modal */}
      <DetailedLogModal
        resultId={detailsResultId}
        isOpen={detailsResultId !== null}
        onClose={() => setDetailsResultId(null)}
      />
    </div>
  );
}
