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

Backend uses Postgres via `pg8000`. For local dev, keep `DATABASE_URL` in your `.env` files; do not include `channel_binding=require` (pg8000 does not support it).

2b) Backend tools (AWS deploy)

We deploy six Python Lambdas behind API Gateway with AWS SAM. Secrets are read at runtime from SSM Parameter Store; no dynamic secure references are baked into the template.

Prepare SSM parameters (SecureString):

- HMAC secret: `/copilot/hmac/v1` (dev) and `/copilot/prod/hmac/v1` (prod)
- Database URL: `/copilot/database/url` (dev) and `/copilot/prod/database/url` (prod)

Notes

- The Database URL should include `sslmode=require` and must not include `channel_binding=require`.
- The frontend `HMAC_SECRET` value must exactly match the HMAC parameter the Lambdas read.

Deploy commands (from `infra/`):

Dev stage

```
sam build --template-file sam-template.yaml --config-env default --region ap-southeast-1 --profile cs-copilot
sam deploy --config-env default --region ap-southeast-1 --profile cs-copilot
```

Prod stage

```
sam build --template-file sam-template.yaml --config-env prod --region ap-southeast-1 --profile cs-copilot
sam deploy --config-env prod --region ap-southeast-1 --profile cs-copilot

Optional monitoring

- You can enable basic CloudWatch monitoring via parameters. By default it is off.
- To enable in a given config env, set in `infra/samconfig.toml`:

```
EnableMonitoring="true" LogRetentionDays="14" AlarmErrorsThreshold="1" AlarmEvaluationPeriods="1" AlarmPeriodSeconds="300" AlarmTopicArn="arn:aws:sns:..."
```
- This creates log groups with retention and simple “Lambda Errors” alarms per function. Remove or set `EnableMonitoring="false"` to turn it off later.
```

The stage name controls the base path of the API URL (`/dev`, `/prod`). You can also configure a custom API Gateway domain and base path mapping if you want to remove the stage path segment.

3) Database

- Provide the Neon `DATABASE_URL` to the frontend environment and to SSM for the backend (`/copilot/.../database/url`).
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

---

## Vercel Deployment

The frontend is a Next.js app designed for Vercel. Analytics and Speed Insights are integrated and enabled automatically in production builds.

Steps

1) Create a Vercel project and import `frontend/` as the root.
2) Set Production and Preview environment variables in Vercel (Project Settings → Environment Variables):

- `BACKEND_BASE_URL` — e.g., `https://<api-id>.execute-api.ap-southeast-1.amazonaws.com/prod` or your custom domain
- `HMAC_SECRET` — must match `/copilot/prod/hmac/v1`
- `DATABASE_URL` — Neon connection string with `sslmode=require` (no `channel_binding=require`)
- `OPENAI_API_KEY` and optional `OPENAI_MODEL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- Optional tuning: `ENABLE_TOOL_RETRY`, `TOOL_RETRY_CODES`, `TOOL_RETRY_DELAY_MS`

3) Deploy via Vercel UI or CLI (`vercel` from the repo root and select `frontend/`).

Analytics & Speed Insights

- Packages: `@vercel/analytics`, `@vercel/speed-insights` (already in `package.json`).
- Components are added in `frontend/app/layout.tsx`; they only collect data in Vercel Production/Preview.

Notes

- Keep different env sets for Preview vs Production (Vercel supports scoped variables).
- Ensure CORS/AllowedOrigin for the backend includes your Vercel domain if you call tools from the browser (the app uses server actions, so it normally does not).
