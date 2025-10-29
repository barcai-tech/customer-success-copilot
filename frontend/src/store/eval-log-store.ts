import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface EvalLog {
  id: string;
  timestamp: Date;
  level: "info" | "success" | "error" | "warning";
  message: string;
}

interface EvalLogState {
  logs: EvalLog[];
  addLog: (message: string, level?: EvalLog["level"]) => void;
  clearLogs: () => void;
}

const withDevtools = <T extends object>(initializer: any, name: string) =>
  process.env.NODE_ENV !== "production" ? devtools(initializer, { name }) : initializer;

export const useEvalLogStore = create<EvalLogState>()(
  withDevtools(
    (set: any) => ({
      logs: [],

      addLog: (message, level = "info") =>
        set((state) => ({
          logs: [
            ...state.logs,
            {
              id: `${Date.now()}-${Math.random()}`,
              timestamp: new Date(),
              level,
              message,
            },
          ],
        })),

      clearLogs: () => set({ logs: [] }),
    }),
    "EvalLogStore"
  )
);
