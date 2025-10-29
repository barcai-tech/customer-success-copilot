import { create } from "zustand";
import type { StateCreator } from "zustand";
import { devtools } from "zustand/middleware";

export interface CopilotExecutionLog {
  id: string;
  timestamp: Date;
  level: "info" | "success" | "error" | "warning";
  message: string;
  messageId?: string; // Associate log with specific assistant message
}

interface CopilotExecutionLogState {
  logs: CopilotExecutionLog[];
  addLog: (
    message: string,
    level?: CopilotExecutionLog["level"],
    messageId?: string
  ) => void;
  clearLogs: (messageId?: string) => void;
}

const initializer: StateCreator<CopilotExecutionLogState> = (set) => ({
  logs: [],

  addLog: (
    message: string,
    level: CopilotExecutionLog["level"] = "info",
    messageId?: string
  ) =>
    set((state: CopilotExecutionLogState) => ({
      logs: [
        ...state.logs,
        {
          id: `${Date.now()}-${Math.random()}`,
          timestamp: new Date(),
          level,
          message,
          messageId,
        } as CopilotExecutionLog,
      ],
    })),

  clearLogs: (messageId?: string) =>
    set((state: CopilotExecutionLogState) => ({
      logs: messageId
        ? state.logs.filter((log) => log.messageId !== messageId)
        : [],
    })),
});

export const useCopilotExecutionLogStore = create<CopilotExecutionLogState>()(
  devtools(initializer, { name: "CopilotExecutionLogStore" })
);
