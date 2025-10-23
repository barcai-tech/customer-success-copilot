"use client";

import { useState } from "react";
import { CopilotInput } from "./CopilotInput";
import { MessageList } from "./MessageList";
import { CustomerCombobox } from "./CustomerCombobox";
import { QuickActions } from "./QuickActions";
import { useCopilotStore } from "../../store/copilot-store";
// import { runLlmPlannerFromPromptAction } from "../../../app/actions";
import { toast } from "sonner";

export function CopilotDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const selectedCustomer = useCopilotStore((state) => state.selectedCustomer);
  const addMessage = useCopilotStore((state) => state.addMessage);
  const setStatus = useCopilotStore((state) => state.setStatus);
  // const setResult = useCopilotStore((state) => state.setResult);
  const setError = useCopilotStore((state) => state.setError);

  const handleSubmit = async (message: string) => {
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
            usedTools: [],
          });
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
          const msg = e instanceof Error ? e.message : "Failed to parse final";
          setError(msg);
        } finally {
          source.close();
          useCopilotStore.getState().setStream(null);
        }
      });
      source.addEventListener("error", () => {
        source.close();
        toast("Streaming error", { description: "Stream closed unexpectedly" });
        useCopilotStore.getState().setStream(null);
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      addMessage({
        role: "assistant",
        content: "I encountered an error while processing your request.",
        error: errorMessage,
      });
      setError(errorMessage);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full md:gap-6">
      {/* Presets Section - In flow on mobile, sidebar on desktop */}
      {isSidebarOpen && (
        <aside className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-l border-border bg-muted/30 p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto md:order-2">
          {/* Customer Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Customer</h3>
            <CustomerCombobox />
          </div>

          {/* Quick Actions */}
          <QuickActions />
        </aside>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden md:order-1 px-4 md:px-6 lg:px-8">
        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <MessageList />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-border bg-background p-4">
          <CopilotInput onSubmit={handleSubmit} />
        </div>
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
  );
}
