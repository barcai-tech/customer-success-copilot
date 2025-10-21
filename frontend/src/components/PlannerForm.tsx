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
        <div className="text-sm">
          <div className="font-medium">Email Draft</div>
          <div className="italic">{result.emailDraft.subject}</div>
          <pre className="whitespace-pre-wrap text-xs mt-1 p-2 bg-gray-50 border rounded">{result.emailDraft.body}</pre>
        </div>
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

