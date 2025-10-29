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

export const useEvalLogStore = create<EvalLogState>()(
  devtools(
    (set) => ({
      logs: [],
      addLog: (message: string, level: EvalLog["level"] = "info") =>
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
      clearLogs: () => set(() => ({ logs: [] })),
    }),
    { name: "EvalLogStore" }
  )
);
