# Agentic AI Workflow Design

This document describes how Customer Success Copilot plans, executes, and safeguards agentic AI workflows, including deterministic and LLM-driven planning, tool orchestration, and controls for reliability and safety.

---

## Overview

Goals

- Deliver concise, actionable outputs (health, actions, email drafts) grounded in tool data.
- Keep planning and synthesis on the server; never expose secrets to the client.
- Enforce deterministic behavior where possible; validate all model outputs.

Planners

- Deterministic planner: task-aware sequence using fixed logic and Zod-validated tool results.
- LLM planner: uses an LLM to choose tools and order under strict rules; results are schema-validated and guarded.

---

## Workflow Steps

1) Intent parsing

- Extracts potential `customerId` and `task` from free text (normalize, match variants). Falls back to UI-selected customer.
- Unauthenticated viewers only access the public dataset; authenticated users access their own via Clerk `userId`.

2) Planning

- Deterministic: select minimal set of tools per task (health, renewal, qbr, email, churn). Each call is timed and error-coded.
- LLM: provide tool registry and strict system rules (tools are the only source of facts; return JSON only; be concise; stop when enough info). The LLM returns a plan hint and sequences calls.

3) Execution

- Server calls tools via `invokeTool()`:
  - Signs body with HMAC (`X-Signature`, `X-Timestamp`, `X-Client`).
  - Sends to API Gateway → Lambda; Lambda verifies and returns envelope.
  - Responses validated with Zod; failures short-circuit or degrade gracefully.

4) Synthesis

- Deterministic summaries and action lists; health is deterministic.
- Optional LLM summarization follows guardrails and schema validation.

5) Streaming UX (SSE)

- `plan`, `tool:start`, `tool:end`, `phase:complete`, `tool:complete`, `patch`, `final` events update the UI.
- Final result includes structured fields: `summary`, `health?`, `actions?`, `emailDraft?`, `usedTools[]`, `notes?`, `decisionLog?`, `planSource`.

---

## Guardrails and Controls

Planning and execution guardrails

- Tools are the sole source of facts; model text cannot invent data.
- Call the minimal number of tools for the task; stop early when sufficient.
- Return a single JSON object; no chain-of-thought. `decisionLog` contains brief, non-sensitive rationales.

Schema enforcement

- Tool responses: envelope + Zod schemas (Usage, Tickets, Contract, Health, Email, QBR).
- Planner result: validated structure (scores, actions, drafts) before rendering.

Security boundaries

- HMAC at the tool boundary; Clerk auth at the app boundary.
- Owner-based row filters for every DB query ensure isolation.

Failure handling

- Per-tool timing and typed errors captured in `usedTools`.
- Partial results are rendered with notes; health computation falls back to neutral defaults when sources are missing.

---

## Deterministic Results

- Health scoring uses explicit weights and thresholds for usage trend, ticket volume, and renewal proximity.
- Zod schemas reject malformed or unexpected shapes from tools and model outputs.
- OpenAI requests occur server-side with timeouts and bounded retries; no client secrets.

---

## Example Flows

Deterministic planner (pseudocode)

```
function runPlanner(customerId, task?): PlannerResult {
  usedTools = []
  params = { ownerUserId: auth().userId ?? "public" }
  if task == 'health':
    health = call('calculate_health')
  elif task == 'email':
    email = call('generate_email'); health = call('calculate_health')
  elif task == 'renewal':
    contract = call('get_contract_info'); usage = call('get_customer_usage'); tickets = call('get_recent_tickets')
  elif task == 'qbr':
    qbr = call('generate_qbr_outline'); usage = call('get_customer_usage')
  elif task == 'churn':
    health = call('calculate_health'); tickets = call('get_recent_tickets'); usage = call('get_customer_usage')
  else:
    usage, tickets, contract, health, email = call(all)
  return synthesize(usage, tickets, contract, health, email, qbr, usedTools)
}
```

LLM planner (high-level)

```
messages = [system(guardrails), user(prompt + optional selectedCustomerId)]
tools = registry(function definitions)
assistant = callLLM(messages, tools)
if assistant proposes tool_calls:
  for each tool_call in bounded sequence:
    result = invokeTool(customerId, params)
    post tool result back to model as tool message
  final = callLLM(updated messages)
  parsed = validate(final JSON against PlannerResult schema)
  stream phases + final to UI
else:
  produce safe heuristic response
```

Sequence (simplified)

```
User → (prompt, optional selectedCustomerId)
Planner → (intent parsing, choose plan)
→ invokeTool() [HMAC] → API Gateway → Lambda → Postgres
→ collect + validate → synthesize → stream SSE → Final JSON
```

---

## Notes and TODOs

- Add per-user rate limiting for LLM planner to bound cost and load.
- Extend `decisionLog` with more transparent but non-sensitive action rationales.
- Expand integration points (CRM, billing, analytics) as additional tools.

