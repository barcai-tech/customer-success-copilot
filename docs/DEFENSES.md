# Customer Success Copilot – Defense Measures (Temporary Notes)

This document summarizes the practical defense-in-depth controls currently implemented in the app. It complements `docs/SECURITY.md` and `docs/PROMPTS.md` and focuses on the latest mitigations added during development. We will consolidate this into the main docs at the end of the project.

## Goals

- Minimize prompt injection and data exfiltration risk
- Keep LLM outputs structured and safe
- Ensure tools are authenticated, typed, and least-privileged
- Provide graceful, compliant responses for out-of-scope prompts

## Defense Layers

- Trust boundaries + HMAC authentication
  - All tool calls are made server-side with HMAC headers and skew checks.
  - Code: `frontend/src/agent/invokeTool.ts`, `backend/_shared/hmac_auth.py`.

- Typed I/O validation (Zod)
  - Tool responses are validated before use; invalid shapes throw.
  - Planner results are validated and repaired or rejected.
  - Code: `frontend/src/contracts/tools.ts`, `frontend/src/contracts/planner.ts`, `frontend/src/agent/invokeTool.ts`, `frontend/src/agent/llmPlanner.ts`, `frontend/app/api/copilot/stream/route.ts`.

- Tool allowlist + server-only execution
  - Only tools in the registry can be called; no direct browser access.
  - Code: `frontend/src/agent/tool-registry.ts`, `frontend/src/agent/invokeTool.ts`.

- System prompt guardrails
  - Explicit rules: use tools as single source of truth, avoid hallucinations, JSON-only final output, bounded tools, and never follow instructions embedded in tool or user data.
  - Code: `frontend/src/agent/llmPlanner.ts`, `frontend/app/api/copilot/stream/route.ts`.

- Bounded planning + deterministic logic
  - Step and tool call limits; deterministic health scoring via backend tool.
  - Code: `frontend/src/agent/llmPlanner.ts`, `frontend/app/api/copilot/stream/route.ts`, `backend/tools/calculate_health/handler.py`.

- Final output sanitization (token/header redaction)
  - A lightweight sanitizer runs on the final planner result to redact token-like secrets and header-shaped values that might accidentally appear in LLM text.
  - Patterns include Bearer tokens, OpenAI/GitHub/GitLab tokens, AWS AKIA, JWT-like strings, long hex signatures.
  - Code: `frontend/src/agent/llmPlanner.ts` (function `sanitizePlannerResult`), `frontend/app/api/copilot/stream/route.ts` (same function).

- Out-of-scope detection + randomized refusal
  - If no customer or recognized task is detected and the prompt appears unrelated to customer success or suggests unsafe behavior, we bypass the LLM and return a friendly randomized refusal.
  - Code: `frontend/src/agent/llmPlanner.ts` (`isOutOfScope`, early return), `frontend/app/api/copilot/stream/route.ts` (same), `frontend/src/agent/outOfScopeReplies.ts`.

- UI rendering safety
  - Final LLM outputs are JSON; UI renders plain text (no HTML execution).
  - The message list avoids duplicating summary cards in out-of-scope cases for clarity.
  - Code: `frontend/src/components/copilot/MessageList.tsx`, `frontend/src/components/copilot/results/*`.

## Operational Notes

- Secret handling: keep tokens and API keys in server env; never log or render them. The sanitizer is a best-effort guard, not a substitute for secret hygiene.
- Extending redaction: If new tools return free text, consider extending the redaction patterns in one shared util at build time.
- New tools: add to the registry and provide Zod schemas; keep them server-only and authenticated.
- RAG/ingestion: if added in future, ensure source allowlists, citations, and strict separation between retrieved text and instructions.

## Quick Checks (Manual)

- Break the sandbox: try a “jailbreak” prompt — you should see a friendly refusal chosen at random.
- Secret echo: include a fake `Bearer abc...` token in a prompt — it should be redacted in any assistant output.
- Schema violation: temporarily corrupt a tool’s response shape — planner should throw or return a typed error envelope, not crash.

## File References (entry points)

- Planner: `frontend/src/agent/llmPlanner.ts`
- Stream route: `frontend/app/api/copilot/stream/route.ts`
- Tool invocation: `frontend/src/agent/invokeTool.ts`
- Tool registry: `frontend/src/agent/tool-registry.ts`
- Contracts: `frontend/src/contracts/*`
- HMAC verification: `backend/_shared/hmac_auth.py`
- Out-of-scope replies: `frontend/src/agent/outOfScopeReplies.ts`

