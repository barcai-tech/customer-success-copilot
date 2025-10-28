import { create } from "zustand";
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

export const useCopilotExecutionLogStore = create<CopilotExecutionLogState>()(
  devtools(
    (set) => ({
      logs: [],

      addLog: (message, level = "info", messageId) =>
        set((state) => ({
          logs: [
            ...state.logs,
            {
              id: `${Date.now()}-${Math.random()}`,
              timestamp: new Date(),
              level,
              message,
              messageId,
            },
          ],
        })),

      clearLogs: (messageId) =>
        set((state) => ({
          logs: messageId
            ? state.logs.filter((log) => log.messageId !== messageId)
            : [],
        })),
    }),
    { name: "CopilotExecutionLogStore" }
  )
);
