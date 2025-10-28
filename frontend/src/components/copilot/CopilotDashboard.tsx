"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CopilotInput } from "./CopilotInput";
import { MessageList } from "./MessageList";
import { CustomerCombobox } from "./CustomerCombobox";
import { QuickActions } from "./QuickActions";
import { useCopilotStore } from "../../store/copilot-store";
// import { runLlmPlannerFromPromptAction } from "../../../app/actions";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { SignedOut } from "@clerk/nextjs";

export function CopilotDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const searchParams = useSearchParams();

  const selectedCustomer = useCopilotStore((state) => state.selectedCustomer);
  const customers = useCopilotStore((state) => state.customers);
  const addMessage = useCopilotStore((state) => state.addMessage);
  const setStatus = useCopilotStore((state) => state.setStatus);
  const setCustomer = useCopilotStore((state) => state.setCustomer);
  const setInputValue = useCopilotStore((state) => state.setInputValue);
  // const setResult = useCopilotStore((state) => state.setResult);
  const setError = useCopilotStore((state) => state.setError);

  const handleSubmit = useCallback(
    async (message: string) => {
      // Add user message
      addMessage({
        role: "user",
        content: message,
      });

      // Set loading state
      setStatus("running");

      try {
        // Prefer streaming endpoint for progressive updates
        const params = new URLSearchParams({ message });
        if (selectedCustomer?.id)
          params.set("selectedCustomerId", selectedCustomer.id);

        // Start a placeholder assistant message to stream into
        useCopilotStore.getState().beginAssistantMessage("Preparing...");

        const source = new EventSource(
          `/api/copilot/stream?${params.toString()}`
        );
        useCopilotStore.getState().setStream(source);
        source.addEventListener("plan", (ev) => {
          try {
            const data = JSON.parse((ev as MessageEvent).data);
            useCopilotStore.getState().patchActiveAssistantResult({
              planSource: data.planSource,
              customerId: data.customerId,
              task: data.task,
              decisionLog: data.decisionLog,
              planSummary: data.planSummary, // Show the plan to the user
              usedTools: [],
            });
            // Show plan summary as a toast notification
            if (data.planSummary) {
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
        source.addEventListener("patch", (ev: MessageEvent) => {
          try {
            const data = JSON.parse(ev.data) as Record<string, unknown>;
            useCopilotStore.getState().patchActiveAssistantResult(data);
          } catch {}
        });
        source.addEventListener("final", (ev) => {
          try {
            const data = JSON.parse((ev as MessageEvent).data);
            if (data.planSource === "heuristic" && data.planHint) {
              toast("LLM planner fallback", { description: data.planHint });
            }
            useCopilotStore
              .getState()
              .finalizeActiveAssistant(
                data,
                data.summary || "Here are the results:"
              );
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
    [addMessage, setStatus, setError, selectedCustomer?.id]
  );

  // Handle URL parameters for quick actions from Dashboard
  useEffect(() => {
    const customerId = searchParams.get("selectedCustomerId");
    const task = searchParams.get("task");

    if (customerId && task && customers.length > 0) {
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
          handleSubmit(prompt);
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

      {/* Main content area with sidebar */}
      <div className="flex flex-col md:flex-row flex-1 md:gap-6 overflow-hidden min-h-0">
        {/* Presets Section - In flow on mobile, sidebar on desktop */}
        {isSidebarOpen && (
          <aside className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-l border-border bg-muted/30 overflow-y-auto md:order-2">
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
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
        )}

        {/* Main Chat Area */}
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
              {/* Messages - Independent scroll container */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-6 lg:px-8">
                <MessageList />
              </div>

              {/* Input - Fixed at bottom */}
              <div className="shrink-0 border-t border-border bg-background px-4 md:px-6 lg:px-8 py-4">
                <CopilotInput onSubmit={handleSubmit} />
              </div>
            </>
          )}
        </div>

        {/* Sidebar Toggle - Mobile: Hamburger menu, Desktop: Collapse arrows */}
        <button
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed right-4 top-20 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:bg-muted"
          aria-label={isSidebarOpen ? "Hide presets" : "Show presets"}
        >
          {/* Mobile icons */}
          <span className="text-xs md:hidden">{isSidebarOpen ? "×" : "☰"}</span>
          {/* Desktop icons */}
          <span className="text-xs hidden md:inline">
            {isSidebarOpen ? "→" : "←"}
          </span>
        </button>
      </div>
    </div>
  );
}
