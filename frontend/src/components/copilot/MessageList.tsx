"use client";

import { useEffect, useRef } from "react";
import { Bot, User } from "lucide-react";
import { useCopilotStore } from "../../store/copilot-store";
import { HealthSummary } from "./results/HealthSummary";
import { EmailDraftCard } from "./results/EmailDraftCard";
import { ActionItems } from "./results/ActionItems";
import { TechnicalDetails } from "./results/TechnicalDetails";

export function MessageList() {
  const messages = useCopilotStore((state) => state.messages);
  const activeAssistantId = useCopilotStore((s) => s.activeAssistantId);
  const status = useCopilotStore((s) => s.status);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
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
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex gap-3 ${
            message.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          {message.role === "assistant" && (
            <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
          )}

          <div
            className={`flex flex-col gap-2 max-w-[80%] ${
              message.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>

            {/* Show timestamp */}
            <span className="text-xs text-muted-foreground">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>

            {/* Show error if present */}
            {message.error && (
              <div className="w-full rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
                <p className="text-sm text-destructive">{message.error}</p>
              </div>
            )}

            {/* Show result if present */}
            {message.result && (
              <div className="w-full space-y-4">
                {/* Health Summary always first if available */}
                {message.result.health && (
                  <HealthSummary health={message.result.health} />
                )}

                {/* Email Draft */}
                {message.result.emailDraft && (
                  <EmailDraftCard email={message.result.emailDraft} />
                )}

                {/* Summary & Actions */}
                {(message.result.summary || message.result.actions) && (
                  <ActionItems
                    summary={message.result.summary}
                    actions={message.result.actions}
                  />
                )}

                {/* Technical details last: rationale + timeline */}
                <TechnicalDetails
                  result={message.result}
                  isRunning={status === "running" && activeAssistantId === message.id}
                />
              </div>
            )}
          </div>

          {message.role === "user" && (
            <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <User className="h-5 w-5" />
            </div>
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
