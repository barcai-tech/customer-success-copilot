"use client";

import { useActionState } from "react";
import type { PlannerActionState } from "@/app/actions";
import { runPlannerAction } from "@/app/actions";

export default function PlannerForm() {
  const [state, formAction, pending] = useActionState<PlannerActionState, FormData>(runPlannerAction, undefined);

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Customer ID</label>
          <input name="customerId" placeholder="acme-001" className="border px-3 py-2 rounded w-full" />
        </div>
        <button className="bg-black text-white px-4 py-2 rounded" disabled={pending}>
          {pending ? "Running…" : "Run Planner"}
        </button>
      </form>

      {state?.ok && (
        <Results result={state.result} />
      )}

      {state && !state.ok && (
        <div className="text-red-600 text-sm">{state.error}</div>
      )}
    </div>
  );
}

function Results({ result }: { result: NonNullable<PlannerActionState> extends { ok: true; result: infer R } ? R : never }) {
  return (
    <div className="space-y-4">
      {result.summary && <p><span className="font-medium">Summary:</span> {result.summary}</p>}
      {result.health && (
        <div className="text-sm">
          <div className="font-medium">Health</div>
          <div>Score: {result.health.score} ({result.health.riskLevel})</div>
          <div>Signals: {result.health.signals.join(", ")}</div>
        </div>
      )}
      {result.emailDraft && (
        <EmailDraft subject={result.emailDraft.subject} body={result.emailDraft.body} />
      )}
      <div className="text-sm">
        <div className="font-medium">Used Tools</div>
        <ul className="list-disc pl-5">
          {result.usedTools.map((t, i) => (
            <li key={i}>{t.name} {typeof t.tookMs === 'number' ? `(${t.tookMs} ms)` : t.error ? `— error: ${t.error}` : ''}</li>
          ))}
        </ul>
      </div>
      {result.notes && <div className="text-xs text-gray-600">{result.notes}</div>}
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
