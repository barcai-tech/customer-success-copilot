"use client";

import { ListTodo, Info } from "lucide-react";

interface ActionItemsProps {
  summary?: string;
  actions?: string[];
  notes?: string;
}

export function ActionItems({ summary, actions, notes }: ActionItemsProps) {
  if (!summary && !actions && !notes) return null;

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ListTodo className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Summary & Actions</h3>
      </div>

      {summary && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Summary</div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {summary}
          </p>
        </div>
      )}

      {actions && actions.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Recommended Actions</div>
          <ul className="space-y-2">
            {actions.map((action, index) => (
              <li
                key={index}
                className="flex items-start gap-3 text-sm text-foreground"
              >
                <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {index + 1}
                </span>
                <span className="pt-0.5">{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {notes && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-muted border border-border">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">{notes}</p>
        </div>
      )}
    </div>
  );
}
