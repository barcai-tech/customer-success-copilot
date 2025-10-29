"use client";

import { useEffect } from "react";
import { Button } from "@/src/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEvalStore } from "@/src/store/eval-store";
import { useEvalStreaming } from "@/src/hooks/useEvalStreaming";
import { useDetailLogStore } from "@/src/store/eval-detail-store";
import { useEvalLogStore } from "@/src/store/eval-log-store";
import { UserSelector } from "./UserSelector";
import { CustomerSelector } from "./CustomerSelector";
import { ActionSelector } from "./ActionSelector";
import { ResultsDisplay } from "./ResultsDisplay";
import { EvalLogs } from "./EvalLogs";
import { logger } from "@/src/lib/logger";

type ServerAction<TArgs extends any[], TResult> = (
  ...args: TArgs
) => Promise<TResult>;

interface EvalDashboardProps {
  actions: {
    listAllUsers: ServerAction<[], any[]>;
    getCustomersForUser: ServerAction<[string], any[]>;
  };
}

export function EvalDashboard({ actions }: EvalDashboardProps) {
  // Get all state from Zustand store
  const {
    users,
    usersLoading,
    availableCustomers,
    customersLoading,
    selectedUserId,
    selectedCustomers,
    selectedActions,
    running,
    session,
    setUsers,
    setUsersLoading,
    setAvailableCustomers,
    setCustomersLoading,
    setSelectedUserId,
    toggleCustomer,
    toggleAction,
    setRunning,
    setSession,
  } = useEvalStore();

  // Get other stores
  const detailStore = useDetailLogStore();
  const logStore = useEvalLogStore();

  // Get streaming hook
  const { runEvaluationWithLogs } = useEvalStreaming();

  // Load users on mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setUsersLoading(true);
        const loadedUsers = await actions.listAllUsers();
        setUsers(loadedUsers);
        if (loadedUsers.length > 0) {
          setSelectedUserId(loadedUsers[0].id);
        }
      } catch (error) {
        toast.error("Failed to load users");
        logger.error(error);
      } finally {
        setUsersLoading(false);
      }
    };
    loadUsers();
  }, [actions, setUsers, setUsersLoading, setSelectedUserId]);

  // Load customers when user changes
  useEffect(() => {
    if (!selectedUserId) return;

    const loadCustomers = async () => {
      try {
        setCustomersLoading(true);
        const customers = await actions.getCustomersForUser(selectedUserId);
        setAvailableCustomers(customers);
      } catch (error) {
        toast.error("Failed to load customers");
        logger.error(error);
      } finally {
        setCustomersLoading(false);
      }
    };

    loadCustomers();
  }, [actions, selectedUserId, setAvailableCustomers, setCustomersLoading]);

  const handleRunEval = async () => {
    if (!selectedUserId) {
      toast.error("Select a user first");
      return;
    }
    if (selectedCustomers.length === 0 || selectedActions.length === 0) {
      toast.error("Select at least one customer and one action");
      return;
    }

    // Clear previous results and logs before starting new run
    logStore.clearLogs();
    detailStore.clearLogs();

    setRunning(true);
    try {
      const result = await runEvaluationWithLogs(
        selectedCustomers,
        selectedActions
      );

      // Final session received
      setSession(result);
      toast.success(
        `Eval complete: ${result.summary.passed}/${result.summary.total} passed`
      );
    } catch (e) {
      toast.error((e as Error).message);
      logger.error(e);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="rounded-lg border bg-card p-6 space-y-6">
        <h3 className="font-semibold">Quick Action Evaluation</h3>

        {/* User selection */}
        <UserSelector
          users={users}
          selectedUserId={selectedUserId}
          loading={usersLoading}
          onUserChange={setSelectedUserId}
        />

        {/* Customer selection */}
        <CustomerSelector
          selectedUserId={selectedUserId}
          customers={availableCustomers}
          selectedCustomers={selectedCustomers}
          loading={customersLoading}
          onCustomerToggle={toggleCustomer}
        />

        {/* Action selection */}
        <ActionSelector
          selectedActions={selectedActions}
          onActionToggle={toggleAction}
        />

        {/* Summary */}
        <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
          <div>
            <strong>Total tests:</strong>{" "}
            {selectedCustomers.length * selectedActions.length}
          </div>
          <div className="text-xs text-muted-foreground">
            {selectedCustomers.length} customer(s) × {selectedActions.length}{" "}
            action(s)
          </div>
          {selectedUserId && (
            <div className="text-xs text-muted-foreground">
              User:{" "}
              <code>
                {users.find((u) => u.id === selectedUserId)?.name} (
                {selectedUserId})
              </code>
            </div>
          )}
        </div>

        {/* Run button */}
        <Button
          onClick={handleRunEval}
          disabled={
            running ||
            !selectedUserId ||
            selectedCustomers.length === 0 ||
            selectedActions.length === 0
          }
          className="w-full"
          size="lg"
        >
          {running ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Evaluation...
            </>
          ) : (
            "Run Evaluation"
          )}
        </Button>
      </div>

      {/* Logs - shown while running or after completion */}
      {(running || logStore.logs.length > 0) && <EvalLogs />}

      {/* Results */}
      <ResultsDisplay session={session} />
    </div>
  );
}
