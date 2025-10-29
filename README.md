# Customer Success Copilot

Customer Success Copilot is an agentic AI assistant for Customer Success Managers (CSMs) and Technical Account Managers (TAMs). It plans multi-step workflows, calls specialized backend tools, and returns structured, actionable results rather than freeform chat.

- Agentic planning with deterministic guardrails
- Structured outputs with strict schemas (Zod)
- Stateless tool layer (AWS Lambda) with HMAC verification
- Managed authentication via Clerk (no user data on our infra)
- Multi-tenant data isolation using Clerk userId
- Neon PostgreSQL for usage, tickets, and contract data

---

## Architecture & Design

```
┌──────────────────┐
│  User Browser    │  Next.js 16 (React 19)
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Vercel (Server Actions + Clerk)      │
├──────────────────────────────────────┤
│ • Clerk auth (managed identity)      │
│ • Agentic planners (server-side)     │
│ • OpenAI calls (server-only)         │
└────────┬─────────────────────────────┘
         │ HMAC-signed requests
         ▼
┌──────────────────────────────────────┐
│ AWS API Gateway + Lambda tools       │
├──────────────────────────────────────┤
│ • Tool handlers (Python 3.12)        │
│ • HMAC verify + envelope schema      │
│ • Postgres via pg8000                │
└────────┬─────────────────────────────┘
         │ TLS
         ▼
┌──────────────────────────────────────┐
│ Neon PostgreSQL                      │
├──────────────────────────────────────┤
│ • Multi-tenant rows (ownerUserId)    │
│ • usage_summaries, ticket_summaries  │
│ • contracts, messages, eval_*        │
└──────────────────────────────────────┘
```

Key design choices

- Thin client, all secrets server-side (Next.js server actions)
- Clerk authentication; we do not store user credentials
- Lambda tools are stateless and independently deployable
- All tool calls are HMAC-signed and time-bound (±5 min)
- Zod validates inputs/outputs at every boundary
- Health scoring is deterministic (no LLM)

---

## Features

- Health Check: usage → tickets → contract → score → signals
- Renewal Brief: usage → tickets → contract → score → email
- QBR Preparation: usage → tickets → contract → score → outline
- Churn Review: usage → tickets → health → actions
- Email Draft: usage → health → email

UI/UX

- Customer selector and task quick-actions (Health, Renewal, QBR, Email, Churn)
- Streaming progress with per-tool timings and error provenance
- Copy-ready outputs (summary, actions, email draft)
- Dark/light mode, consistent design tokens

---

## Technology Stack

- Frontend: Next.js 16 (App Router), React 19, Tailwind v4, shadcn/Radix, Zustand, Zod, Drizzle ORM (Neon HTTP)
- Auth: Clerk (`@clerk/nextjs`) with middleware-protected routes and server-side `auth()`
- Backend tools: Python 3.12 AWS Lambda (HMAC, pg8000 driver, envelope responses)
- Data: Neon PostgreSQL (usage_summaries, ticket_summaries, contracts, messages, eval_*)
- LLM: OpenAI Chat Completions (server-only; configurable model via env)

---

## Setup & Usage

1) Frontend

Copy and fill `frontend/.env.local` from `frontend/.env.local.example`:

- `BACKEND_BASE_URL` — API Gateway base URL (or local dev server)
- `HMAC_SECRET` and `HMAC_CLIENT_ID` — shared secret and client id
- `DATABASE_URL` — Neon Postgres URL (sslmode=require)
- `OPENAI_API_KEY` (server-only), optional `OPENAI_MODEL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`

Install and run:

```
cd frontend
pnpm install
pnpm dev
```

Note: middleware allows `/api/copilot/stream` publicly, but responses are scoped: unauthenticated users operate on `ownerUserId = "public"`; signed-in users are scoped to their own data via Clerk.

2) Backend tools (local dev)

```
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export HMAC_SECRET=dev-secret
export ALLOWED_ORIGIN=http://localhost:3000
python dev_server.py --port 8787
```

Then set `BACKEND_BASE_URL=http://127.0.0.1:8787` in the frontend `.env.local`.

3) Database

- Provide the Neon `DATABASE_URL` in both frontend and backend environments
- Apply Drizzle migrations from the frontend:

```
cd frontend
pnpm db:generate && pnpm db:migrate
```

Quick endpoints

- `GET /api/db/health` — verifies DB connection and schema presence
- `POST /api/db/seed-global` — seeds demo customers as `ownerUserId=public`

---

## Project Structure

```
frontend/                      Next.js app (server actions, SSE endpoints)
  app/
  src/
    agent/                     planners, tool registry, LLM wrapper
    contracts/                 Zod schemas for tools and planner
    db/                        Drizzle client and schema
backend/                      Python Lambda tools (HMAC + Postgres)
infra/                        AWS SAM for API Gateway + Lambda
README.md                     This file
SECURITY_AND_COMPLIANCE.md    Security & governance practices
AGENTIC_AI_WORKFLOW_DESIGN.md Agentic AI design and workflows
LICENSE
```

---

## Key Concepts

- Deterministic Planner (`frontend/src/agent/planner.ts`): task-aware tool orchestration; no LLM.
- LLM Planner (`frontend/src/agent/llmPlanner.ts`): tool decisions by LLM; validated outputs; guarded by rules.
- HMAC Tool Calls (`frontend/src/agent/invokeTool.ts` + `backend/_shared/hmac_auth.py`): authenticity and replay protection.
- Multi-tenancy (`frontend/src/db/schema.ts`): all rows keyed by `ownerUserId` (Clerk user id).
- Contracts & Validation (`frontend/src/contracts/*.ts`): Zod schemas enforce shape and safety.

---

## Future Improvements

- Custom task templates and scheduling
- Slack/CRM integrations
- Additional tool sources (billing, product analytics)
- Model gating and rate limiting for heavy workloads

---

## Support & Documentation

- `SECURITY_AND_COMPLIANCE.md` — Security, compliance, governance
- `AGENTIC_AI_WORKFLOW_DESIGN.md` — Agent design, steps, guardrails

---

## License

MIT. See `LICENSE`.

