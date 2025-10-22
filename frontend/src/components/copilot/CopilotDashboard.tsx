"use client";

import { useState } from "react";
import { CopilotInput } from "./CopilotInput";
import { MessageList } from "./MessageList";
import { CustomerCombobox } from "./CustomerCombobox";
import { QuickActions } from "./QuickActions";
import { useCopilotStore } from "../../store/copilot-store";
import { runPlannerAction } from "../../../app/actions";

export function CopilotDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const selectedCustomer = useCopilotStore((state) => state.selectedCustomer);
  const addMessage = useCopilotStore((state) => state.addMessage);
  const setStatus = useCopilotStore((state) => state.setStatus);
  const setResult = useCopilotStore((state) => state.setResult);
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
      // For now, we'll extract customer from the message or use selected customer
      // In the future, this would use LLM to parse the intent
      const customerId = selectedCustomer?.id || "acme-001"; // Default fallback

      // Create FormData for the server action
      const formData = new FormData();
      formData.append("customerId", customerId);

      // Call the server action
      const result = await runPlannerAction(undefined, formData);

      if (result && "error" in result && result.error) {
        addMessage({
          role: "assistant",
          content: "I encountered an error while processing your request.",
          error: result.error,
        });
        setError(result.error);
      } else if (result && "result" in result && result.result) {
        addMessage({
          role: "assistant",
          content: result.result.summary || "Here are the results:",
          result: result.result,
        });
        setResult(result.result);
      }
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
      <div className="flex-1 flex flex-col h-full overflow-hidden md:order-1">
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
