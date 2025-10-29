"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { PlannerActionState } from "@/app/actions";
import type { PlannerResult } from "@/src/agent/planner";
import { runPlannerAction } from "@/app/actions";
import { plannerFormSchema, type PlannerFormData } from "@/src/lib/validation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";

const CUSTOMER_OPTIONS = [
  { value: "acme-001", label: "Acme Corp (acme-001)" },
  { value: "globex-001", label: "Globex Corp (globex-001)" },
  { value: "initech-001", label: "Initech (initech-001)" },
];

const TASK_OPTIONS = [
  { value: "renewal", label: "Renewal brief" },
  { value: "qbr", label: "QBR prep" },
  { value: "churn", label: "Churn review" },
  { value: "eval", label: "Evaluation" },
];

export default function PlannerForm() {
  const [state, formAction, pending] = useActionState<
    PlannerActionState,
    FormData
  >(runPlannerAction, undefined);

  const form = useForm<PlannerFormData>({
    resolver: zodResolver(plannerFormSchema),
    defaultValues: {
      customerId: "acme-001",
      task: "renewal" as const,
      message: "",
    },
  });

  const handleSubmit = async (data: PlannerFormData) => {
    const formData = new FormData();
    formData.append("customerId", data.customerId);
    formData.append("task", data.task);
    formData.append("message", data.message);
    await formAction(formData);
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4 border rounded-lg p-4 bg-card"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {CUSTOMER_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="task"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a task" />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instructions (optional)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., Focus on customer health"
                    maxLength={2000}
                    disabled={pending}
                  />
                </FormControl>
                <FormMessage />
                <div className="text-xs text-muted-foreground">
                  {field.value?.length || 0}/2000 characters
                </div>
              </FormItem>
            )}
          />

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Running…" : "Run Copilot"}
          </Button>
        </form>
      </Form>

      {state?.ok && <Results result={state.result} />}

      {state && !state.ok && (
        <div className="text-red-600 text-sm">{state.error}</div>
      )}
    </div>
  );
}

function Results({ result }: { result: PlannerResult }) {
  // Check if we have any meaningful data
  const hasData =
    result.summary ||
    result.health ||
    result.emailDraft ||
    result.actions ||
    (result.usedTools && result.usedTools.length > 0);

  return (
    <div className="space-y-4">
      {!hasData && (
        <div className="text-sm text-muted-foreground p-3 border rounded-lg bg-muted/50">
          No results generated. Plan source: {result.planSource}
          {result.planHint && ` • ${result.planHint}`}
        </div>
      )}

      {result.summary && (
        <p>
          <span className="font-medium">Summary:</span> {result.summary}
        </p>
      )}
      {result.health && (
        <div className="text-sm border rounded-lg p-3 bg-card">
          <div className="font-medium mb-1">Health</div>
          <div>
            Score: {result.health.score} ({result.health.riskLevel})
          </div>
          <div>Signals: {result.health.signals.join(", ")}</div>
        </div>
      )}
      {result.emailDraft && (
        <EmailDraft
          subject={result.emailDraft.subject}
          body={result.emailDraft.body}
        />
      )}
      {result.actions && result.actions.length > 0 && (
        <div className="text-sm border rounded-lg p-3 bg-card">
          <div className="font-medium mb-1">Recommended Actions</div>
          <ul className="list-disc list-inside space-y-1">
            {result.actions.map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ul>
        </div>
      )}
      {result.usedTools && result.usedTools.length > 0 && (
        <div className="text-sm border rounded-lg p-3 bg-card">
          <div className="font-medium mb-1">Used Tools</div>
          <ul className="flex flex-wrap gap-2">
            {result.usedTools.map((t, i) => (
              <li
                key={i}
                className={`text-xs px-2 py-1 rounded border ${
                  t.error
                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900"
                    : "bg-muted text-foreground/80"
                }`}
              >
                {t.name}
                {typeof t.tookMs === "number" ? ` • ${t.tookMs} ms` : ""}
                {t.error ? ` • ${t.error}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      {result.notes && (
        <div className="text-xs text-gray-600">{result.notes}</div>
      )}
    </div>
  );
}

function EmailDraft({ subject, body }: { subject: string; body: string }) {
  return (
    <div className="text-sm">
      <div className="flex items-center gap-3">
        <div className="font-medium">Email Draft</div>
        <CopyButton text={`${subject}\n\n${body}`} label="Copy All" />
        <CopyButton text={body} label="Copy Body" />
      </div>
      <div className="italic mt-1">{subject}</div>
      <pre className="whitespace-pre-wrap text-[13px] leading-5 mt-2 p-3 rounded border bg-white text-black dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700">
        {body}
      </pre>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // no-op
        }
      }}
      className="text-xs px-2 py-1 border rounded hover:bg-gray-50 dark:hover:bg-neutral-800"
    >
      {label}
    </button>
  );
}
