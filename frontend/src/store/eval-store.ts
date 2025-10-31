import { create } from "zustand";
import type { StateCreator } from "zustand";
import { devtools } from "zustand/middleware";
import type { ClerkUser } from "@/src/contracts/user";
import type { CustomerRow } from "@/app/eval/actions";
import type { EvalSession, QuickActionType } from "@/src/contracts/eval";

export interface EvalSessionRun {
  id: string;
  session: EvalSession;
  timestamp: Date;
  label: string;
}

interface EvalState {
  // User and customer data
  users: ClerkUser[];
  usersLoading: boolean;
  availableCustomers: CustomerRow[];
  customersLoading: boolean;

  // Selection state
  selectedUserId: string;
  selectedCustomers: string[];
  selectedActions: QuickActionType[];

  // Execution state
  running: boolean;
  session: EvalSession | null;
  sessionRuns: EvalSessionRun[];
  selectedRunId: string | null;

  // Actions
  setUsers: (users: ClerkUser[]) => void;
  setUsersLoading: (loading: boolean) => void;
  setAvailableCustomers: (customers: CustomerRow[]) => void;
  setCustomersLoading: (loading: boolean) => void;
  setSelectedUserId: (userId: string) => void;
  setSelectedCustomers: (customers: string[]) => void;
  toggleCustomer: (customerId: string) => void;
  setSelectedActions: (actions: QuickActionType[]) => void;
  toggleAction: (action: QuickActionType) => void;
  setRunning: (running: boolean) => void;
  setSession: (session: EvalSession | null) => void;
  addSessionRun: (session: EvalSession) => void;
  selectRun: (runId: string) => void;
  clearSessionRuns: () => void;
  reset: () => void;
}

const initialState = {
  users: [],
  usersLoading: false,
  availableCustomers: [],
  customersLoading: false,
  selectedUserId: "",
  selectedCustomers: [],
  selectedActions: ["health" as const, "renewal" as const],
  running: false,
  session: null,
  sessionRuns: [],
  selectedRunId: null,
};

export const useEvalStore = create<EvalState>()(
  devtools(
    (set) => ({
      ...initialState,
      setUsers: (users: ClerkUser[]) => set(() => ({ users })),
      setUsersLoading: (loading: boolean) =>
        set(() => ({ usersLoading: loading })),
      setAvailableCustomers: (customers: CustomerRow[]) =>
        set(() => ({ availableCustomers: customers })),
      setCustomersLoading: (loading: boolean) =>
        set(() => ({ customersLoading: loading })),
      setSelectedUserId: (userId: string) =>
        set(() => ({ selectedUserId: userId, selectedCustomers: [] })),
      setSelectedCustomers: (customers: string[]) =>
        set(() => ({ selectedCustomers: customers })),
      toggleCustomer: (customerId: string) =>
        set((state) => ({
          selectedCustomers: state.selectedCustomers.includes(customerId)
            ? state.selectedCustomers.filter((id) => id !== customerId)
            : [...state.selectedCustomers, customerId],
        })),
      setSelectedActions: (actions: QuickActionType[]) =>
        set(() => ({ selectedActions: actions })),
      toggleAction: (action: QuickActionType) =>
        set((state) => ({
          selectedActions: state.selectedActions.includes(action)
            ? state.selectedActions.filter((a) => a !== action)
            : [...state.selectedActions, action],
        })),
      setRunning: (running: boolean) => set(() => ({ running })),
      setSession: (session: EvalSession | null) => set(() => ({ session })),
      addSessionRun: (session: EvalSession) =>
        set((state) => {
          const runId = `run-${Date.now()}`;
          const timestamp = new Date();
          const label = `${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`;
          const newRun: EvalSessionRun = {
            id: runId,
            session,
            timestamp,
            label,
          };
          return {
            sessionRuns: [...state.sessionRuns, newRun],
            selectedRunId: runId,
            session,
          };
        }),
      selectRun: (runId: string) =>
        set((state) => {
          const run = state.sessionRuns.find((r) => r.id === runId);
          if (run) {
            return {
              selectedRunId: runId,
              session: run.session,
            };
          }
          return state;
        }),
      clearSessionRuns: () =>
        set(() => ({ sessionRuns: [], selectedRunId: null, session: null })),
      reset: () => set(() => initialState),
    }),
    { name: "EvalStore" }
  )
);
