"use client";

import { useCallback } from "react";
import { useEvalLogStore } from "@/src/store/eval-log-store";
import { useDetailLogStore } from "@/src/store/eval-detail-store";
import { useEvalStore } from "@/src/store/eval-store";
import { saveEvalSession, saveExecutionSteps } from "@/src/db/eval-actions";
import type { EvalSession, EvalResult } from "@/src/contracts/eval";
import { logger } from "@/src/lib/logger";

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
  const { startResult, addStep, endResult } = useDetailLogStore();
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
        const selectedUserId =
          useEvalStore.getState().selectedUserId || undefined;
        const response = await fetch("/api/eval/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerIds,
            actions,
            ownerUserId: selectedUserId,
          }),
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
        let currentResultId: string | null = null;
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

                logger.debug("[useEvalStreaming] Event:", data.type, data);

                if (data.type === "test_start") {
                  logger.debug(
                    "[useEvalStreaming] test_start, resultId:",
                    data.resultId
                  );
                  addLog(
                    `⏳ Running: ${data.customerName} → ${data.action}`,
                    "info"
                  );
                  // Start a new result log for detailed execution tracking
                  currentResultId = data.resultId;
                  if (currentResultId) {
                    logger.debug(
                      "[useEvalStreaming] Calling startResult with",
                      currentResultId
                    );
                    startResult(
                      currentResultId,
                      data.customerName,
                      data.action
                    );
                  }
                } else if (data.type === "phase:complete") {
                  // Relay phase completion events from copilot stream
                  if (data.phase === "planning") {
                    addLog(
                      `✓ Planning Phase (${formatDuration(data.durationMs)})`,
                      "success"
                    );
                    if (currentResultId) {
                      logger.debug(
                        "[useEvalStreaming] Adding planning step to",
                        currentResultId
                      );
                      addStep(currentResultId, {
                        title: "Planning Phase",
                        description: `LLM planning completed`,
                        level: "success",
                        durationMs: data.durationMs,
                      });
                    }
                  } else if (data.phase === "synthesis") {
                    addLog(
                      `✓ Processing & Synthesis (${formatDuration(
                        data.durationMs
                      )})`,
                      "success"
                    );
                    if (currentResultId) {
                      logger.debug(
                        "[useEvalStreaming] Adding synthesis step to",
                        currentResultId
                      );
                      addStep(currentResultId, {
                        title: "Processing & Synthesis",
                        description: `LLM synthesis completed`,
                        level: "success",
                        durationMs: data.durationMs,
                      });
                    }
                  }
                } else if (data.type === "tool:complete") {
                  // Relay tool completion events from copilot stream
                  if (data.status === "success") {
                    addLog(
                      `✓ ${data.name} (${formatDuration(data.tookMs)})`,
                      "success"
                    );
                    if (currentResultId) {
                      logger.debug(
                        "[useEvalStreaming] Adding tool step to",
                        currentResultId
                      );
                      addStep(currentResultId, {
                        title: `Tool: ${data.name}`,
                        description: `Executed successfully`,
                        level: "success",
                        durationMs: data.tookMs,
                      });
                    }
                  } else {
                    addLog(`✗ ${data.name} - ${data.error}`, "error");
                    if (currentResultId) {
                      logger.debug(
                        "[useEvalStreaming] Adding error step to",
                        currentResultId
                      );
                      addStep(currentResultId, {
                        title: `Tool: ${data.name}`,
                        description: `Failed: ${data.error}`,
                        level: "error",
                        durationMs: data.tookMs,
                      });
                    }
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

                  // End the result log
                  if (currentResultId) {
                    endResult(currentResultId, data.durationMs);
                    currentResultId = null;
                  }

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

                  // Persist to database
                  try {
                    logger.debug("[useEvalStreaming] Saving eval session...");
                    const { sessionId, resultIdMap } = await saveEvalSession(
                      data.session
                    );
                    logger.debug(
                      "[useEvalStreaming] Session saved with ID:",
                      sessionId,
                      "Result map:",
                      resultIdMap
                    );

                    // Save execution steps for each result
                    const store = useDetailLogStore.getState();
                    for (const result of data.session.results) {
                      const dbResultId = resultIdMap.get(result.id);
                      const log = store.getResultLog(result.id);
                      logger.debug(
                        `[useEvalStreaming] Result ${
                          result.id
                        } (db: ${dbResultId}) has ${
                          log?.steps.length || 0
                        } steps`
                      );
                      if (log && log.steps.length > 0 && dbResultId) {
                        logger.debug(
                          `[useEvalStreaming] Saving ${log.steps.length} steps for result ${dbResultId}`
                        );
                        await saveExecutionSteps(dbResultId, log.steps);
                      }
                    }

                    addLog("✓ Session saved to database", "success");
                  } catch (error) {
                    logger.error(
                      "[useEvalStreaming] Failed to save session to database:",
                      error
                    );
                    addLog(`Warning: Session not saved to database`, "warning");
                  }

                  return data.session;
                }
              } catch (e) {
                logger.error("Failed to parse log data:", e);
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
    [addLog, clearLogs, addSessionRun, startResult, addStep, endResult]
  );

  return { runEvaluationWithLogs };
}
