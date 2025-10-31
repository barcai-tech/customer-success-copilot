"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, User, Trash2, ChevronDown } from "lucide-react";
import { EmailDraftCard } from "./results/EmailDraftCard";
import { TechnicalDetails } from "./results/TechnicalDetails";
import { ExecutionPlan } from "./results/ExecutionPlan";
import { ResultsSummaryCard } from "./results/ResultsSummaryCard";
import { Button } from "@/src/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/src/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/src/components/ui/collapsible";
import { useCopilotStore } from "../../store/copilot-store";

export function MessageList({
  onHide,
}: {
  onHide?: (args: { id: string; assistantId?: string }) => Promise<void>;
}) {
  const messages = useCopilotStore((state) => state.messages);
  const activeAssistantId = useCopilotStore((s) => s.activeAssistantId);
  const status = useCopilotStore((s) => s.status);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Collapsible per-message details (must be declared before any early return)
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const autoExpandedRef = useRef<Set<string>>(new Set());
  const userToggledRef = useRef<Set<string>>(new Set());

  // Timestamp formatter (not a hook, safe anywhere)
  const formatTimestamp = (d: Date) => {
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Group messages into tasks before any early return to keep hooks order stable
  const tasks = useMemo(() => {
    type Thread = {
      id: string;
      user?: (typeof messages)[number];
      assistant?: (typeof messages)[number];
    };
    const result: Thread[] = [];
    const indexById = new Map<string, number>();
    let lastOpenIndex: number | null = null;

    const upsert = (id: string, next: (current?: Thread) => Thread) => {
      const existingIndex = indexById.get(id);
      if (existingIndex === undefined) {
        const created = next();
        indexById.set(id, result.length);
        result.push(created);
        return result.length - 1;
      }
      const updated = next(result[existingIndex]);
      result[existingIndex] = updated;
      return existingIndex;
    };

    for (const message of messages) {
      if (message.role === "user") {
        const key = message.taskId || message.id;
        const idx = upsert(key, (current) => ({
          id: key,
          assistant: current?.assistant,
          user: message,
        }));
        lastOpenIndex = idx;
        continue;
      }

      if (message.role === "assistant") {
        const taskKey = message.taskId || "";
        let idx = taskKey !== "" ? indexById.get(taskKey) : undefined;
        if (idx === undefined && lastOpenIndex !== null) {
          const candidate = result[lastOpenIndex];
          if (!candidate.assistant) {
            idx = lastOpenIndex;
          }
        }
        if (idx === undefined) {
          const fallbackKey = taskKey || message.id;
          idx = upsert(fallbackKey, (current) => ({
            id: fallbackKey,
            user: current?.user,
            assistant: message,
          }));
          if (taskKey) {
            indexById.set(taskKey, idx);
          }
        } else {
          // Instead of mutating, create a new object
          const existing = result[idx];
          result[idx] = { ...existing, assistant: message };
        }
        lastOpenIndex = null;
      }
    }

    return result;
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-expand tasks with assistant replies (only once when assistant arrives)
  // For messages from history: collapse all except the latest one
  const assistantStatusKey = useMemo(
    () => tasks.map((t) => t.id + (t.assistant ? "1" : "0")).join(","),
    [tasks]
  );

  useEffect(() => {
    // Separate history messages from current session
    const historyMessages = messages.filter(
      (m) => (m as unknown as Record<string, unknown>).isFromHistory
    );

    // Find the latest history message task ID to keep it expanded
    let latestHistoryTaskId: string | null = null;
    if (historyMessages.length > 0) {
      // Get the last task ID from history (messages are in chronological order)
      for (let i = historyMessages.length - 1; i >= 0; i--) {
        const taskId = historyMessages[i].taskId || historyMessages[i].id;
        if (taskId) {
          latestHistoryTaskId = taskId;
          break;
        }
      }
    }

    const nextExpanded = new Set(expanded);
    let changed = false;

    tasks.forEach((task) => {
      const hasAssistant =
        !!task.assistant ||
        messages.some(
          (m) =>
            m.role === "assistant" && (m.taskId === task.id || m.id === task.id)
        );

      // Check if this task has history messages
      const taskHasHistoryMessages = historyMessages.some(
        (m) => m.taskId === task.id || m.id === task.id
      );

      // For history messages: only expand the latest one, collapse others
      // BUT: respect manual user toggles (don't auto-collapse if user manually opened it)
      if (hasAssistant && taskHasHistoryMessages) {
        if (
          task.id === latestHistoryTaskId &&
          !autoExpandedRef.current.has(task.id)
        ) {
          // Expand latest history task
          autoExpandedRef.current.add(task.id);
          if (!nextExpanded.has(task.id)) {
            nextExpanded.add(task.id);
            changed = true;
          }
        } else if (
          task.id !== latestHistoryTaskId &&
          !userToggledRef.current.has(task.id)
        ) {
          // Collapse older history tasks ONLY if user hasn't manually toggled them
          if (nextExpanded.has(task.id)) {
            nextExpanded.delete(task.id);
            changed = true;
          }
        }
      } else if (hasAssistant && !autoExpandedRef.current.has(task.id)) {
        // For current session messages: auto-expand when assistant arrives
        autoExpandedRef.current.add(task.id);
        if (!nextExpanded.has(task.id)) {
          nextExpanded.add(task.id);
          changed = true;
        }
      }

      // If a task is actively running, ensure it is expanded so users see progress
      if (
        status === "running" &&
        activeAssistantId === task.id &&
        !nextExpanded.has(task.id)
      ) {
        nextExpanded.add(task.id);
        changed = true;
      }
    });

    // Only update state if something actually changed (defer to callback to avoid cascading)
    if (changed) {
      const timer = requestAnimationFrame(() => setExpanded(nextExpanded));
      return () => cancelAnimationFrame(timer);
    }
  }, [
    assistantStatusKey,
    tasks,
    status,
    activeAssistantId,
    expanded,
    messages,
  ]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full text-center p-8">
        <Bot className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Welcome to Customer Success Copilot
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          I&apos;m your AI assistant for customer success management. Ask me
          about customer health, renewals, or request me to draft emails and QBR
          outlines.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full py-4 space-y-6">
      {tasks.map((task) => (
        <Collapsible
          key={task.id}
          open={expanded.has(task.id)}
          onOpenChange={(isOpen) => {
            // Track that user manually toggled this message
            userToggledRef.current.add(task.id);
            setExpanded((prev) => {
              const next = new Set(prev);
              if (isOpen) next.add(task.id);
              else next.delete(task.id);
              return next;
            });
          }}
          asChild
        >
          <div className="flex flex-col gap-2">
            {/* User message: two rows layout, right-aligned */}
            <div className="flex flex-col gap-1 items-end w-auto max-w-[80%] ml-auto">
              {/* Row 1: Message | Chevron | User Avatar */}
              <div className="flex items-start gap-2">
                {/* Message bubble */}
                <div className="rounded-lg px-3 py-2 bg-primary text-primary-foreground w-auto">
                  <p className="text-sm whitespace-pre-wrap">
                    {task.user?.content || ""}
                  </p>
                </div>

                {/* Chevron trigger */}
                {(task.assistant ||
                  messages.some(
                    (m) =>
                      m.role === "assistant" &&
                      (m.taskId === task.id || m.id === task.id)
                  ) ||
                  (status === "running" && activeAssistantId === task.id)) && (
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      aria-label={expanded.has(task.id) ? "Collapse" : "Expand"}
                      className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted transition"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          expanded.has(task.id) ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </CollapsibleTrigger>
                )}

                {/* User Avatar */}
                <div className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                  <User className="h-4 w-4" />
                </div>
              </div>

              {/* Row 2: Timestamp | Delete button */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {formatTimestamp(
                    new Date(task.user?.timestamp || new Date())
                  )}
                </span>
                {onHide && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:text-foreground"
                        aria-label="Delete task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will hide both the question and the reply from
                          the Copilot view. The data remains in the database for
                          troubleshooting.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () =>
                            onHide?.({
                              id: task.id,
                              assistantId: task.assistant?.id,
                            })
                          }
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>

            {/* Assistant content - CollapsibleContent */}
            <CollapsibleContent asChild>
              <div className="mt-4 w-full space-y-4">
                {task.assistant?.result && (
                  <div className="flex gap-3">
                    {/* Bot avatar */}
                    <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary mt-1">
                      <Bot className="h-5 w-5" />
                    </div>

                    {/* Assistant content column */}
                    <div className="flex-1 space-y-4">
                      {task.assistant.result.decisionLog &&
                        task.assistant.result.decisionLog.length > 0 && (
                          <ExecutionPlan
                            decisionLog={task.assistant.result.decisionLog}
                            planSummary={task.assistant.result.planSummary}
                            usedTools={task.assistant.result.usedTools}
                          />
                        )}

                      {(task.assistant.result.health ||
                        task.assistant.result.actions) && (
                        <ResultsSummaryCard result={task.assistant.result} />
                      )}

                      {task.assistant.result.emailDraft && (
                        <EmailDraftCard
                          email={task.assistant.result.emailDraft}
                        />
                      )}

                      <TechnicalDetails
                        result={task.assistant!.result}
                        isRunning={
                          status === "running" && activeAssistantId === task.id
                        }
                        messageId={task.id}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
