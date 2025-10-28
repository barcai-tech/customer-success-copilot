"use client";

import { useActionState } from "react";
import type { PlannerActionState } from "@/app/actions";
import type { PlannerResult } from "@/src/agent/planner";
import { runPlannerAction } from "@/app/actions";

export default function PlannerForm() {
  const [state, formAction, pending] = useActionState<
    PlannerActionState,
    FormData
  >(runPlannerAction, undefined);

  return (
    <div className="space-y-6">
      <form
        action={formAction}
        className="space-y-3 border rounded-lg p-4 bg-card"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Customer</label>
            <div className="flex gap-2">
              <input
                name="customerId"
                defaultValue="acme-001"
                className="border px-3 py-2 rounded w-full"
              />
              <select
                className="border rounded px-2"
                defaultValue="acme-001"
                onChange={(e) => {
                  const el = document.querySelector(
                    'input[name="customerId"]'
                  ) as HTMLInputElement;
                  if (el) el.value = e.target.value;
                }}
              >
                <option value="acme-001">acme-001</option>
                <option value="globex-001">globex-001</option>
                <option value="initech-001">initech-001</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Task</label>
            <select
              className="border rounded px-2 w-full"
              defaultValue="renewal"
            >
              <option value="renewal">Renewal brief</option>
              <option value="qbr">QBR prep</option>
              <option value="churn">Churn review</option>
            </select>
          </div>
        </div>
        <button
          className="bg-primary text-primary-foreground px-4 py-2 rounded"
          disabled={pending}
        >
          {pending ? "Running…" : "Run Copilot"}
        </button>
      </form>

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
