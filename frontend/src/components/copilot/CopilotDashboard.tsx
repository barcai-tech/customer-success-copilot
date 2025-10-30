"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CopilotInput } from "./CopilotInput";
import { MessageList } from "./MessageList";
import { CustomerCombobox } from "./CustomerCombobox";
import { QuickActions } from "./QuickActions";
import { useCopilotStore } from "../../store/copilot-store";
import { useCopilotExecutionLogStore } from "../../store/copilot-execution-log-store";
// import { runLlmPlannerFromPromptAction } from "../../../app/actions";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { SignedOut } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import type { PlannerResult } from "@/src/agent/planner";
import { sanitizePlannerResult } from "@/src/agent/synthesizer";
import type { PlannerResultJson } from "@/src/contracts/planner";

type ServerAction<TArgs extends readonly unknown[], TResult> = (
  ...args: TArgs
) => Promise<TResult>;

type SaveMessageArgs = {
  companyExternalId: string;
  role: "user" | "assistant" | "system";
  content: string;
  resultJson?: unknown;
  taskId?: string;
};

type StoredMessage = {
  id: string;
  companyExternalId: string;
  ownerUserId: string;
  role: "user" | "assistant" | "system";
  content: string;
  resultJson: unknown | null;
  taskId: string | null;
  createdAt: string | Date;
  hidden: boolean;
};

type ListMessagesArgs = { companyExternalId: string; limit?: number };
type HideTaskArgs = { companyExternalId: string; taskId: string };
type HideTaskResult = { ok: true };

interface CopilotDashboardProps {
  actions: {
    saveMessage: ServerAction<[SaveMessageArgs], StoredMessage>;
    listMessagesForCustomer: ServerAction<[ListMessagesArgs], StoredMessage[]>;
    hideTask: ServerAction<[HideTaskArgs], HideTaskResult>;
  };
}

export function CopilotDashboard({ actions }: CopilotDashboardProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const searchParams = useSearchParams();

  const selectedCustomer = useCopilotStore((state) => state.selectedCustomer);
  const customers = useCopilotStore((state) => state.customers);
  const addMessage = useCopilotStore((state) => state.addMessage);
  const setMessages = useCopilotStore((state) => state.setMessages);
  const reset = useCopilotStore((state) => state.reset);
  const cancelStream = useCopilotStore((state) => state.cancelStream);
  const { isSignedIn } = useAuth();
  const setStatus = useCopilotStore((state) => state.setStatus);
  const setCustomer = useCopilotStore((state) => state.setCustomer);
  const setInputValue = useCopilotStore((state) => state.setInputValue);
  // const setResult = useCopilotStore((state) => state.setResult);
  const setError = useCopilotStore((state) => state.setError);
  const quickActionAppliedRef = useRef(false);

  const handleSubmit = useCallback(
    async (message: string, customerIdOverride?: string) => {
      // Add user message
      const supportsRandomUuid =
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function";
      const taskId = supportsRandomUuid
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2);
      addMessage({
        role: "user",
        content: message,
        taskId,
      });
      try {
        // Ensure any previous stream is cancelled before starting a new one
        try {
          useCopilotStore.getState().cancelStream();
        } catch {}
        const companyId =
          customerIdOverride || useCopilotStore.getState().selectedCustomer?.id;
        if (companyId) {
          await actions.saveMessage({
            companyExternalId: companyId,
            role: "user",
            content: message,
            taskId,
          });
        }
      } catch {}

      // Set loading state
      setStatus("running");

      try {
        // Prefer streaming endpoint for progressive updates
        const params = new URLSearchParams({ message });
        const companyId2 =
          customerIdOverride || useCopilotStore.getState().selectedCustomer?.id;
        if (companyId2) params.set("selectedCustomerId", companyId2);

        // Start a placeholder assistant message to stream into
        const assistantId = useCopilotStore
          .getState()
          .beginAssistantMessage("Preparing...", taskId);

        // Helper to format duration
        const formatDuration = (ms: number) => {
          if (ms < 1000) return `${ms}ms`;
          return `${(ms / 1000).toFixed(2)}s`;
        };

        // Helper to add execution log
        const addLog = (msg: string, level?: "info" | "success" | "error") => {
          useCopilotExecutionLogStore
            .getState()
            .addLog(msg, level || "info", assistantId);
        };

        // Clear any previous logs for this message
        useCopilotExecutionLogStore.getState().clearLogs(assistantId);

        const source = new EventSource(
          `/api/copilot/stream?${params.toString()}`
        );
        useCopilotStore.getState().setStream(source);
        source.addEventListener("plan", (ev: MessageEvent) => {
          try {
            const data = JSON.parse(ev.data) as Partial<PlannerResult> &
              Record<string, unknown>;
            const rawPlanSource = data.planSource;
            const planSource =
              rawPlanSource === "llm" || rawPlanSource === "heuristic"
                ? rawPlanSource
                : undefined;
            useCopilotStore.getState().patchActiveAssistantResult({
              planSource,
              customerId: data.customerId as string | undefined,
              task: data.task as PlannerResult["task"],
              decisionLog: data.decisionLog,
              planSummary: data.planSummary as string | undefined, // Show the plan to the user
              usedTools: [],
            });
            // Show plan summary as a toast notification
            if (typeof data.planSummary === "string") {
              toast("Plan created", { description: data.planSummary });
            }
          } catch {}
        });
        source.addEventListener("tool:start", (ev: MessageEvent) => {
          try {
            const data = JSON.parse(ev.data) as { name: string };
            const st = useCopilotStore.getState();
            const current = st.messages.find(
              (m) => m.id === st.activeAssistantId
            );
            const used = [...(current?.result?.usedTools || [])];
            if (!used.some((u) => u.name === data.name))
              used.push({ name: data.name });
            st.patchActiveAssistantResult({ usedTools: used });
          } catch {}
        });
        source.addEventListener("tool:end", (ev: MessageEvent) => {
          try {
            const data = JSON.parse(ev.data) as {
              name: string;
              tookMs?: number;
              error?: string;
            };
            const st = useCopilotStore.getState();
            const current = st.messages.find(
              (m) => m.id === st.activeAssistantId
            );
            const used = [...(current?.result?.usedTools || [])];
            const idx = used.findIndex((u) => u.name === data.name);
            if (idx >= 0) used[idx] = { ...used[idx], ...data };
            else used.push(data);
            st.patchActiveAssistantResult({ usedTools: used });
          } catch {}
        });
        // Real-time execution detail events
        source.addEventListener("phase:complete", (ev: MessageEvent) => {
          try {
            const data = JSON.parse(ev.data) as {
              phase: string;
              durationMs: number;
            };
            if (data.phase === "planning") {
              addLog(
                `Planning Phase (${formatDuration(data.durationMs)})`,
                "success"
              );
            } else if (data.phase === "synthesis") {
              addLog(
                `Processing & Synthesis (${formatDuration(data.durationMs)})`,
                "success"
              );
            }
          } catch {}
        });
        source.addEventListener("tool:complete", (ev: MessageEvent) => {
          try {
            const data = JSON.parse(ev.data) as {
              name: string;
              tookMs?: number;
              status?: string;
            };
            const level = data.status === "error" ? "error" : "success";
            const tookMs = typeof data.tookMs === "number" ? data.tookMs : 0;
            addLog(`${data.name} (${formatDuration(tookMs)})`, level);
          } catch {}
        });
        source.addEventListener("patch", (ev: MessageEvent) => {
          try {
            const data = JSON.parse(ev.data) as Partial<PlannerResult>;
            useCopilotStore.getState().patchActiveAssistantResult(data);
          } catch {}
        });
        source.addEventListener("final", async (ev: MessageEvent) => {
          try {
            const data = JSON.parse(ev.data) as PlannerResult &
              Record<string, unknown>;
            if (
              data.planSource === "heuristic" &&
              typeof data.planHint === "string"
            ) {
              toast("LLM planner fallback", { description: data.planHint });
            }
            useCopilotStore
              .getState()
              .finalizeActiveAssistant(
                data,
                (data.summary as string | undefined) || "Here are the results:"
              );
            // Persist assistant message with final result
            const companyId3 =
              customerIdOverride ||
              useCopilotStore.getState().selectedCustomer?.id;
            if (companyId3) {
              await actions.saveMessage({
                companyExternalId: companyId3,
                role: "assistant",
                content: (data.summary as string | undefined) || "",
                resultJson: data,
                taskId,
              });
            }
            toast.success("Plan complete", {
              description:
                data.planSource === "llm"
                  ? "LLM plan finished."
                  : "Heuristic plan finished.",
            });
          } catch (e) {
            const msg =
              e instanceof Error ? e.message : "Failed to parse final";
            setError(msg);
          } finally {
            source.close();
            useCopilotStore.getState().setStream(null);
          }
        });
        source.addEventListener("error", () => {
          source.close();
          toast("Streaming error", {
            description: "Stream closed unexpectedly",
          });
          useCopilotStore.getState().setStream(null);
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An unexpected error occurred";
        addMessage({
          role: "assistant",
          content: "I encountered an error while processing your request.",
          error: errorMessage,
        });
        setError(errorMessage);
      }
    },
    [actions, addMessage, setStatus, setError]
  );

  // Load persisted messages when customer changes
  useEffect(() => {
    (async () => {
      if (!isSignedIn || !selectedCustomer?.id) return;
      try {
        const rows = await actions.listMessagesForCustomer({
          companyExternalId: selectedCustomer.id,
          limit: 200,
        });
        const mapped = rows.map((row) => {
          let plannerResult: PlannerResult | undefined;
          const rawResult = row.resultJson;
          if (rawResult && typeof rawResult === "object") {
            try {
              const sanitized = sanitizePlannerResult(
                rawResult as Partial<PlannerResultJson>
              );
              plannerResult = {
                summary: sanitized.summary,
                health: sanitized.health,
                actions: sanitized.actions,
                emailDraft: sanitized.emailDraft,
                usedTools: sanitized.usedTools ?? [],
                notes: sanitized.notes,
                decisionLog: sanitized.decisionLog,
                planSource: sanitized.planSource,
                planHint: sanitized.planHint,
                customerId: sanitized.customerId,
                task: sanitized.task as PlannerResult["task"],
              };
            } catch {}
          }
          const maybeLegacyTaskId = (row as Record<string, unknown>)["task_id"];
          const normalizedTaskId =
            typeof row.taskId === "string"
              ? row.taskId
              : typeof maybeLegacyTaskId === "string"
              ? maybeLegacyTaskId
              : undefined;
          const createdAt =
            row.createdAt instanceof Date
              ? row.createdAt
              : new Date(row.createdAt);
          return {
            id: row.id,
            role: row.role,
            content: row.content,
            timestamp: createdAt,
            taskId: normalizedTaskId,
            result: plannerResult,
          };
        });
        // Avoid overriding in-flight UI messages (e.g., just-sent prompt)
        const current = useCopilotStore.getState().messages;
        if (current.length === 0) setMessages(mapped);
      } catch {}
    })();
  }, [actions, isSignedIn, selectedCustomer?.id, setMessages]);

  // Clear in-memory chat state when signing out to avoid showing private history
  useEffect(() => {
    if (!isSignedIn) {
      try {
        cancelStream();
      } catch {}
      reset();
    }
  }, [isSignedIn, cancelStream, reset]);

  // Handle URL parameters for quick actions from Dashboard
  useEffect(() => {
    const customerId = searchParams.get("selectedCustomerId");
    const task = searchParams.get("task");

    if (customerId && task && customers.length > 0) {
      if (quickActionAppliedRef.current) return; // Prevent double-run in Strict Mode/dev
      // Find and set the customer
      const customer = customers.find((c) => c.id === customerId);
      if (customer) {
        setCustomer(customer);

        // Generate the appropriate prompt based on task
        let prompt = "";
        switch (task) {
          case "health":
            prompt = `What's the health status of ${customer.name}?`;
            break;
          case "renewal":
            prompt = `Generate a renewal brief for ${customer.name}`;
            break;
          case "qbr":
            prompt = `Create a QBR outline for ${customer.name}`;
            break;
          case "email":
            prompt = `Draft a check-in email for ${customer.name}`;
            break;
          case "churn":
            prompt = `Analyze churn risk for ${customer.name}`;
            break;
          default:
            return;
        }

        // Set the input value and auto-submit
        setInputValue(prompt);

        // Auto-submit after a brief delay to ensure UI is ready
        setTimeout(() => {
          if (!quickActionAppliedRef.current) {
            quickActionAppliedRef.current = true;
            handleSubmit(prompt, customer.id);
          }
        }, 100);

        // Clear URL parameters to avoid re-triggering
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [searchParams, customers, setCustomer, setInputValue, handleSubmit]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Demo Disclaimer - Only shown when signed out */}
      <SignedOut>
        <div className="w-full bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-900 px-4 md:px-6 lg:px-8 py-3 shrink-0">
          <div className="flex items-start gap-3 max-w-4xl mx-auto">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Demo Mode:</strong> You&apos;re using a shared demo set
                of customers.{" "}
                <Link
                  href="/sign-up"
                  className="underline font-medium hover:text-blue-700 dark:hover:text-blue-300"
                >
                  Create an account
                </Link>{" "}
                to create and manage your own set of customers.
              </p>
            </div>
          </div>
        </div>
      </SignedOut>

      {/* Main container with sidebar and chat area */}
      <div className="flex flex-1 overflow-hidden min-h-0 relative">
        {/* Mobile Backdrop - Click to close sidebar */}
        {isSidebarOpen && (
          <div
            className="absolute inset-0 z-20 bg-black/40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar - Slides over on mobile, static on desktop */}
        <aside
          className={`${
            isSidebarOpen
              ? "translate-x-0"
              : "translate-x-full md:translate-x-0"
          } absolute md:relative right-0 top-0 bottom-0 w-80 max-w-[calc(100vw-1rem)] md:max-w-none md:w-80 border-l border-border bg-background md:bg-muted/30 overflow-y-auto transition-transform duration-200 ease-in-out md:order-2 md:shrink-0 z-30 md:z-auto flex flex-col`}
        >
          {/* Sidebar Header with Close Button (Mobile only) */}
          <div className="flex justify-end items-center p-4 md:p-6 shrink-0 border-b border-border md:hidden">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="h-8 w-8 flex items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-muted"
              aria-label="Hide presets"
            >
              <span className="text-xs">×</span>
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="p-4 md:p-6 space-y-4 md:space-y-6 flex flex-col overflow-y-auto flex-1">
            {/* Customer Selection */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Customer
              </h3>
              <CustomerCombobox />
            </div>

            {/* Quick Actions */}
            <QuickActions />
          </div>
        </aside>

        {/* Main Chat Area - Flex column with MessageList and Input */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden md:order-1">
          {/* Empty State when no customers */}
          {customers.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
              <div className="max-w-md text-center space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-2">
                  <Info className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No Customers Yet</h3>
                <p className="text-muted-foreground text-sm">
                  You haven&apos;t added any customers yet. To get started with
                  the Copilot, you need to add customers first.
                </p>
                <div className="pt-2">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Go to Dashboard
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  On the Dashboard, you can seed demo customers or create your
                  own.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Messages - Independent scroll container with sticky toggle button */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
                {/* Sidebar Toggle Button - Sticky at top, mobile only */}
                <div className="sticky top-0 z-50 md:hidden -mx-4 px-4 py-3 mb-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-muted"
                    aria-label={isSidebarOpen ? "Hide presets" : "Show presets"}
                  >
                    <span className="text-xs">{isSidebarOpen ? "×" : "☰"}</span>
                  </button>
                </div>

                {/* Message List */}
                <div className="px-4 md:px-6 lg:px-8">
                  <MessageList
                    onHide={async ({ id: taskId, assistantId }) => {
                      try {
                        if (!selectedCustomer?.id) return;
                        await actions.hideTask({
                          companyExternalId: selectedCustomer.id,
                          taskId,
                        });
                        if (assistantId && assistantId !== taskId) {
                          // Hide legacy assistant message without taskId
                          const { hideMessage } = await import(
                            "@/app/db-actions"
                          );
                          await hideMessage({ id: assistantId });
                        }
                        // Remove all messages for this task from the store
                        setMessages(
                          useCopilotStore
                            .getState()
                            .messages.filter(
                              (m) =>
                                m.taskId !== taskId &&
                                m.id !== taskId &&
                                m.id !== assistantId
                            )
                        );
                      } catch {}
                    }}
                  />
                </div>
              </div>

              {/* Input - Fixed at bottom, outside scroll area */}
              <div className="shrink-0 border-t border-border bg-background px-4 md:px-6 lg:px-8 py-4">
                <CopilotInput onSubmit={handleSubmit} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
