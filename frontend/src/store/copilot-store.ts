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
  result?: PlannerResult;
  error?: string;
}

export interface CopilotState {
  // Selection (for presets)
  selectedCustomer: Customer | null;
  selectedTask: TaskType | null;

  // Chat
  messages: ChatMessage[];
  inputValue: string;

  // Execution
  status: ExecutionStatus;
  result: PlannerResult | null;
  error: string | null;

  // Actions - Selection
  setCustomer: (customer: Customer | null) => void;
  setTask: (task: TaskType | null) => void;

  // Actions - Chat
  setInputValue: (value: string) => void;
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  clearMessages: () => void;

  // Actions - Execution
  setStatus: (status: ExecutionStatus) => void;
  setResult: (result: PlannerResult | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// Available customers
export const CUSTOMERS: Customer[] = [
  { id: "acme-001", name: "Acme Corp" },
  { id: "globex-001", name: "Globex Corporation" },
  { id: "initech-001", name: "Initech" },
];

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
  messages: [],
  inputValue: "",
  status: "idle",
  result: null,
  error: null,

  // Actions - Selection
  setCustomer: (customer) =>
    set({ selectedCustomer: customer, result: null, error: null }),
  setTask: (task) => set({ selectedTask: task, result: null, error: null }),

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
    }),
}));
