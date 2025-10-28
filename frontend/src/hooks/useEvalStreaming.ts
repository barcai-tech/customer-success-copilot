"use client";

import { useCallback } from "react";
import { useEvalLogStore } from "@/src/store/eval-log-store";
import { useEvalStore } from "@/src/store/eval-store";
import type { EvalSession, EvalResult } from "@/src/contracts/eval";

interface Summary {
  total: number;
  passed: number;
  failed: number;
  avgDurationMs: number;
  successRate: number;
}

interface ProgressUpdate {
  results: EvalResult[];
  summary: Summary;
}

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

export function useEvalStreaming() {
  const { addLog, clearLogs } = useEvalLogStore();
  const { addSessionRun } = useEvalStore();

  const runEvaluationWithLogs = useCallback(
    async (
      customerIds: string[],
      actions: string[],
      onProgress?: (partial: ProgressUpdate) => void
    ): Promise<EvalSession> => {
      clearLogs();
      addLog("🚀 Evaluation session started", "info");
      addLog(
        `Testing ${customerIds.length} customer(s) × ${
          actions.length
        } action(s) = ${customerIds.length * actions.length} tests`,
        "info"
      );
      addLog("", "info");

      try {
        const response = await fetch("/api/eval/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerIds, actions }),
        });

        if (!response.ok) {
          const error = await response.json();
          addLog(`Error: ${error.error}`, "error");
          throw new Error(error.error);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        const partialSession: ProgressUpdate = {
          results: [],
          summary: {
            total: 0,
            passed: 0,
            failed: 0,
            avgDurationMs: 0,
            successRate: 0,
          },
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event: progress")) {
              continue;
            }
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "test_start") {
                  addLog(
                    `⏳ Running: ${data.customerName} → ${data.action}`,
                    "info"
                  );
                } else if (data.type === "phase:complete") {
                  // Relay phase completion events from copilot stream
                  if (data.phase === "planning") {
                    addLog(
                      `✓ Planning Phase (${formatDuration(data.durationMs)})`,
                      "success"
                    );
                  } else if (data.phase === "synthesis") {
                    addLog(
                      `✓ Processing & Synthesis (${formatDuration(
                        data.durationMs
                      )})`,
                      "success"
                    );
                  }
                } else if (data.type === "tool:complete") {
                  // Relay tool completion events from copilot stream
                  if (data.status === "success") {
                    addLog(
                      `✓ ${data.name} (${formatDuration(data.tookMs)})`,
                      "success"
                    );
                  } else {
                    addLog(`✗ ${data.name} - ${data.error}`, "error");
                  }
                } else if (data.type === "test_complete") {
                  const statusEmoji =
                    data.status === "success"
                      ? "✓"
                      : data.status === "timeout"
                      ? "⏱"
                      : "✗";
                  addLog(
                    `${statusEmoji} Completed: ${data.customerName} → ${
                      data.action
                    } (${formatDuration(data.durationMs)})`,
                    data.status === "success"
                      ? "success"
                      : data.status === "timeout"
                      ? "warning"
                      : "error"
                  );

                  if (data.result) {
                    partialSession.results = data.result.results;
                    partialSession.summary = data.result.summary;
                    onProgress?.(partialSession);

                    // Add a blank line for visual separation
                    addLog("", "info");
                  }
                } else if (data.type === "final") {
                  // Add session to run history
                  addSessionRun(data.session);
                  return data.session;
                }
              } catch (e) {
                console.error("Failed to parse log data:", e);
              }
            }
          }
        }

        throw new Error("Stream ended unexpectedly");
      } catch (error) {
        addLog(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          "error"
        );
        throw error;
      }
    },
    [addLog, clearLogs, addSessionRun]
  );

  return { runEvaluationWithLogs };
}
