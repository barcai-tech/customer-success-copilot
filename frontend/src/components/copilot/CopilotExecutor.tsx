"use client";

import { Play, AlertCircle, Sparkles } from "lucide-react";
import { useCopilotStore } from "@/src/store/copilot-store";
import { Button } from "@/src/components/ui/button";
import { runPlannerAction } from "@/app/actions";
import { HealthSummary } from "./results/HealthSummary";
import { EmailDraftCard } from "./results/EmailDraftCard";
import { ToolExecutionTimeline } from "./results/ToolExecutionTimeline";
import { ActionItems } from "./results/ActionItems";
import { ResultsSummaryCard } from "./results/ResultsSummaryCard";

export function CopilotExecutor() {
  const {
    selectedCustomer,
    selectedTask,
    status,
    result,
    error,
    setStatus,
    setResult,
    setError,
  } = useCopilotStore();

  const canExecute = selectedCustomer && selectedTask && status !== "running";

  const handleExecute = async () => {
    if (!selectedCustomer) return;

    setStatus("running");
    setError(null);

    try {
      // Create FormData to match the existing server action
      const formData = new FormData();
      formData.append("customerId", selectedCustomer.id);

      const response = await runPlannerAction(undefined, formData);

      if (response?.ok) {
        setResult(response.result);
      } else {
        setError(response?.error || "Unknown error occurred");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execution failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Execute Button */}
      <div className="flex items-center justify-between p-6 rounded-lg border bg-card">
        <div className="space-y-1">
          <h3 className="font-semibold">Ready to Execute</h3>
          <p className="text-sm text-muted-foreground">
            {selectedCustomer && selectedTask
              ? `Run ${selectedTask} analysis for ${selectedCustomer.name}`
              : "Select a customer and task to continue"}
          </p>
        </div>

        <Button
          onClick={handleExecute}
          disabled={!canExecute}
          size="lg"
          className="gap-2"
        >
          {status === "running" ? (
            <>
              <Sparkles className="h-5 w-5 animate-pulse" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              Run Copilot
            </>
          )}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-medium text-red-900 dark:text-red-100">
              Execution Error
            </div>
            <div className="text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {(status === "running" || result) && (
        <div className="space-y-6">
          {/* Results Summary Card - Main insight */}
          {result && (
            <ResultsSummaryCard result={result} taskType={selectedTask || undefined} />
          )}

          {/* Tool Execution Timeline */}
          <ToolExecutionTimeline
            tools={result?.usedTools || []}
            isRunning={status === "running"}
          />

          {/* Health Summary */}
          {result?.health && <HealthSummary health={result.health} />}

          {/* Email Draft */}
          {result?.emailDraft && <EmailDraftCard email={result.emailDraft} />}

          {/* Summary & Actions */}
          {result && (
            <ActionItems
              summary={result.summary}
              actions={result.actions}
              notes={result.notes}
            />
          )}
        </div>
      )}
    </div>
  );
}
