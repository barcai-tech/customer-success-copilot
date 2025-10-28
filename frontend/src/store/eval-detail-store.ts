"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface ExecutionStep {
  id: string;
  timestamp: Date;
  level: "info" | "success" | "error" | "warning" | "debug";
  title: string;
  description?: string;
  durationMs?: number;
  startTime?: Date;
  endTime?: Date;
  children?: ExecutionStep[];
}

export interface DetailedResultLog {
  resultId: string;
  customerName: string;
  action: string;
  steps: ExecutionStep[];
  totalDurationMs: number;
  startTime: Date;
  endTime: Date;
}

interface DetailLogState {
  currentResult: DetailedResultLog | null;
  logs: Map<string, DetailedResultLog>;

  // Actions
  startResult: (resultId: string, customerName: string, action: string) => void;
  endResult: (resultId: string, totalDurationMs?: number) => void;
  addStep: (
    resultId: string,
    step: Omit<ExecutionStep, "id" | "timestamp">
  ) => void;
  addChildStep: (
    resultId: string,
    parentStepId: string,
    step: Omit<ExecutionStep, "id" | "timestamp">
  ) => void;
  getResultLog: (resultId: string) => DetailedResultLog | undefined;
  clearLogs: () => void;
}

export const useDetailLogStore = create<DetailLogState>()(
  devtools(
    (set, get) => ({
      currentResult: null,
      logs: new Map(),

      startResult: (resultId, customerName, action) => {
        const newResult: DetailedResultLog = {
          resultId,
          customerName,
          action,
          steps: [],
          totalDurationMs: 0,
          startTime: new Date(),
          endTime: new Date(),
        };
        set((state) => ({
          currentResult: newResult,
          logs: new Map(state.logs).set(resultId, newResult),
        }));
      },

      endResult: (resultId, totalDurationMs) => {
        set((state) => {
          const result = state.logs.get(resultId);
          if (result) {
            result.endTime = new Date();
            // Use provided totalDurationMs if available, otherwise calculate from timestamps
            result.totalDurationMs =
              totalDurationMs !== undefined
                ? totalDurationMs
                : result.endTime.getTime() - result.startTime.getTime();
            const newLogs = new Map(state.logs);
            newLogs.set(resultId, result);
            return { logs: newLogs };
          }
          return state;
        });
      },

      addStep: (resultId, step) => {
        set((state) => {
          const result = state.logs.get(resultId);
          if (!result) return state;

          const newStep: ExecutionStep = {
            ...step,
            id: `step-${Date.now()}-${Math.random()}`,
            timestamp: new Date(),
            children: [],
          };

          result.steps.push(newStep);
          const newLogs = new Map(state.logs);
          newLogs.set(resultId, result);

          return {
            logs: newLogs,
            currentResult:
              state.currentResult?.resultId === resultId
                ? result
                : state.currentResult,
          };
        });
      },

      addChildStep: (resultId, parentStepId, step) => {
        set((state) => {
          const result = state.logs.get(resultId);
          if (!result) return state;

          const findAndAddChild = (steps: ExecutionStep[]): boolean => {
            for (const s of steps) {
              if (s.id === parentStepId) {
                const newStep: ExecutionStep = {
                  ...step,
                  id: `step-${Date.now()}-${Math.random()}`,
                  timestamp: new Date(),
                  children: [],
                };
                if (!s.children) s.children = [];
                s.children.push(newStep);
                return true;
              }
              if (s.children && findAndAddChild(s.children)) {
                return true;
              }
            }
            return false;
          };

          findAndAddChild(result.steps);
          const newLogs = new Map(state.logs);
          newLogs.set(resultId, result);

          return {
            logs: newLogs,
            currentResult:
              state.currentResult?.resultId === resultId
                ? result
                : state.currentResult,
          };
        });
      },

      getResultLog: (resultId) => {
        return get().logs.get(resultId);
      },

      clearLogs: () => {
        set({ currentResult: null, logs: new Map() });
      },
    }),
    { name: "DetailLogStore" }
  )
);
