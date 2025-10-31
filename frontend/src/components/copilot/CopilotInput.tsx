"use client";

import { useRef, useEffect, FormEvent, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { useCopilotStore } from "../../store/copilot-store";

interface CopilotInputProps {
  onSubmit?: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CopilotInput({
  onSubmit,
  placeholder = "Ask me anything about your customers...",
  disabled = false,
}: CopilotInputProps) {
  const inputValue = useCopilotStore((state) => state.inputValue);
  const setInputValue = useCopilotStore((state) => state.setInputValue);
  const status = useCopilotStore((state) => state.status);
  const customers = useCopilotStore((state) => state.customers);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [randomIndices, setRandomIndices] = useState<number[]>([]);

  // Initialize random customers on first render or when customers change
  useEffect(() => {
    const indices: number[] = [];
    
    if (customers.length > 0) {
      for (let i = 0; i < Math.min(3, customers.length); i++) {
        let idx = Math.floor(Math.random() * customers.length);
        while (indices.includes(idx) && indices.length < customers.length) {
          idx = Math.floor(Math.random() * customers.length);
        }
        indices.push(idx);
      }
    }
    
    // Defer setState to avoid cascading renders
    const frameId = requestAnimationFrame(() => {
      setRandomIndices(indices);
    });
    
    return () => cancelAnimationFrame(frameId);
  }, [customers.length]);  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [inputValue]);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const trimmedValue = inputValue.trim();
    if (!trimmedValue || disabled || status === "running") return;

    onSubmit?.(trimmedValue);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isLoading = status === "running";
  const isDisabled = disabled || isLoading;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="gradient-border-wrapper">
        <div className="relative flex items-end gap-2 rounded-lg border border-border bg-background p-3 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 max-h-32 overflow-y-auto"
          />
          <Button
            type="submit"
            size="sm"
            disabled={isDisabled || !inputValue.trim()}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>

      {/* Helpful hints - only show if customers exist */}
      {customers.length > 0 && randomIndices.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>Try:</span>
          <button
            type="button"
            onClick={() =>
              setInputValue(
                `What's the health status of ${
                  customers[randomIndices[0]].name
                }?`
              )
            }
            className="text-primary hover:underline"
            disabled={isDisabled}
          >
            Check customer health
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() =>
              setInputValue(
                `Generate a renewal brief for ${
                  customers[randomIndices[1] ?? randomIndices[0]].name
                }`
              )
            }
            className="text-primary hover:underline"
            disabled={isDisabled}
          >
            Renewal brief
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() =>
              setInputValue(
                `Draft an email for ${
                  customers[randomIndices[2] ?? randomIndices[0]].name
                }`
              )
            }
            className="text-primary hover:underline"
            disabled={isDisabled}
          >
            Draft email
          </button>
        </div>
      )}
    </form>
  );
}
