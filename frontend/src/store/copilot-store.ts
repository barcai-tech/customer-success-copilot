import { create } from "zustand";
import type { PlannerResult } from "@/src/agent/planner";

export type TaskType = "health" | "renewal" | "qbr" | "email" | "churn";
export type ExecutionStatus = "idle" | "running" | "success" | "error";
export type MessageRole = "user" | "assistant" | "system";

export interface Customer {
  id: string;
  name: string;
  logo?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  taskId?: string;
  result?: PlannerResult;
  error?: string;
  isFromHistory?: boolean; // Mark messages loaded from history (not from current session)
}

export interface CopilotState {
  // Selection (for presets)
  selectedCustomer: Customer | null;
  selectedTask: TaskType | null;
  customers: Customer[];

  // Chat
  messages: ChatMessage[];
  inputValue: string;

  // Execution
  status: ExecutionStatus;
  result: PlannerResult | null;
  error: string | null;
  activeAssistantId?: string | null;
  stream?: EventSource | null;

  // Actions - Selection
  setCustomer: (customer: Customer | null) => void;
  setTask: (task: TaskType | null) => void;
  setCustomers: (customers: Customer[]) => void;

  // Actions - Chat
  setInputValue: (value: string) => void;
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;

  // Actions - Execution
  setStatus: (status: ExecutionStatus) => void;
  setResult: (result: PlannerResult | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // Streaming helpers
  beginAssistantMessage: (content?: string, id?: string) => string;
  patchActiveAssistantResult: (partial: Partial<PlannerResult>) => void;
  finalizeActiveAssistant: (final: PlannerResult, content?: string) => void;
  setStream: (es: EventSource | null) => void;
  cancelStream: () => void;
}

// Available customers
export const CUSTOMERS: Customer[] = [];

// Task definitions
export const TASKS: Record<
  TaskType,
  { label: string; description: string; icon: string }
> = {
  health: {
    label: "Health Check",
    description: "Get comprehensive customer health metrics and risk signals",
    icon: "❤️",
  },
  renewal: {
    label: "Renewal Brief",
    description:
      "Prepare renewal strategy with usage trends and contract details",
    icon: "🔄",
  },
  qbr: {
    label: "QBR Prep",
    description:
      "Generate quarterly business review outline and key talking points",
    icon: "📊",
  },
  email: {
    label: "Follow-up Email",
    description:
      "Draft personalized customer communication based on latest data",
    icon: "✉️",
  },
  churn: {
    label: "Churn Review",
    description: "Analyze churn risk factors and recommended actions",
    icon: "⚠️",
  },
};

export const useCopilotStore = create<CopilotState>((set) => ({
  // Initial state
  selectedCustomer: null,
  selectedTask: null,
  customers: [],
  messages: [],
  inputValue: "",
  status: "idle",
  result: null,
  error: null,
  activeAssistantId: null,
  stream: null,

  // Actions - Selection
  setCustomer: (customer) =>
    set({ selectedCustomer: customer, result: null, error: null }),
  setTask: (task) => set({ selectedTask: task, result: null, error: null }),
  setCustomers: (customers) => set({ customers }),

  // Actions - Chat
  setInputValue: (value) => set({ inputValue: value }),
  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: Math.random().toString(36).substring(7),
          timestamp: new Date(),
        },
      ],
    })),
  setMessages: (messages) => set({ messages }),
  clearMessages: () => set({ messages: [] }),

  // Actions - Execution
  setStatus: (status) => set({ status }),
  setResult: (result) => set({ result, status: "success", error: null }),
  setError: (error) => set({ error, status: "error", result: null }),
  reset: () =>
    set({
      selectedCustomer: null,
      selectedTask: null,
      messages: [],
      inputValue: "",
      status: "idle",
      result: null,
      error: null,
      activeAssistantId: null,
    }),

  // Streaming helpers
  beginAssistantMessage: (content = "", id) => {
    const newId = id || Math.random().toString(36).substring(7);
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: newId,
          role: "assistant",
          content,
          timestamp: new Date(),
          taskId: id,
          result: { usedTools: [] }, // Initialize with empty result to show skeleton
        },
      ],
      activeAssistantId: newId,
    }));
    return newId;
  },
  patchActiveAssistantResult: (partial: Partial<PlannerResult>) =>
    set((state) => {
      const id = state.activeAssistantId;
      if (!id) return {};
      const messages = state.messages.map((m) => {
        if (m.id !== id || m.role !== "assistant") return m;
        const merged: PlannerResult = {
          ...(m.result || {}),
          ...partial,
        } as PlannerResult;
        return { ...m, result: merged };
      });
      return { messages };
    }),
  finalizeActiveAssistant: (final, content) =>
    set((state) => {
      const id = state.activeAssistantId;
      const messages = state.messages.map((m) => {
        if (id && m.id === id && m.role === "assistant") {
          return {
            ...m,
            content: content ?? (final.summary || m.content),
            result: final,
          };
        }
        return m;
      });
      // Close stream if any
      try {
        state.stream?.close();
      } catch {}
      return {
        messages,
        activeAssistantId: null,
        status: "success",
        result: final,
        error: null,
        stream: null,
      };
    }),
  setStream: (es) => set({ stream: es }),
  cancelStream: () =>
    set((state) => {
      try {
        state.stream?.close();
      } catch {}
      // Mark active assistant as cancelled
      const messages = state.messages.map((m) => {
        if (
          state.activeAssistantId &&
          m.id === state.activeAssistantId &&
          m.role === "assistant"
        ) {
          return { ...m, content: "Cancelled.", result: m.result };
        }
        return m;
      });
      return {
        stream: null,
        activeAssistantId: null,
        status: "idle",
        messages,
      };
    }),
}));
