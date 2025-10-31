# Customer Success Copilot

## Purpose and Overview

**Customer Success Copilot** is an agentic AI assistant purpose-built for Customer Success Managers (CSMs) and Technical Account Managers (TAMs). It plans multi-step AI-driven workflows that analyze customer health, generate actionable insights, and produce business-ready outputs (renewal briefs, QBR outlines, health scores, churn alerts).

Rather than providing freeform conversational responses, the Copilot:

- Decomposes complex customer analysis tasks into deterministic or LLM-guided planning steps
- Invokes specialized backend tools to gather real-time customer data (usage trends, open tickets, contract details)
- Applies domain-specific logic to compute health scores and business recommendations
- Returns structured, schema-validated results ready for customer engagement

**Key Value Propositions:**

- **Speed:** Multi-tool orchestration in seconds instead of manual analysis
- **Consistency:** Deterministic or guardrailed LLM planning ensures repeatable, audit-able decisions
- **Security:** All secrets server-side; customer data scoped to authenticated users; HMAC-signed backend calls
- **Extensibility:** Modular tool registry supports adding new data sources and analyses

---

## Architecture and Design

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Browser                             │
│                    (Next.js 16, React 19)                       │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Vercel (Frontend)                             │
├─────────────────────────────────────────────────────────────────┤
│ • Clerk Authentication (managed identity provider)             │
│ • Server Actions (planners, LLM calls, database ops)           │
│ • Streaming SSE endpoints (real-time tool execution)           │
│ • Zustand stores (UI state, customer context)                  │
│ • shadcn/UI components (responsive, accessible UI)            │
└──────────┬──────────────────────────────────────────┬───────────┘
           │ HMAC-signed requests                     │ SQL
           │ (time-bound, ±5 minutes)                 │ (Drizzle)
           ▼                                           ▼
    ┌──────────────────┐               ┌──────────────────────┐
    │ AWS API Gateway  │               │ Neon PostgreSQL      │
    │ + Lambda Layer   │               ├──────────────────────┤
    └────┬─────────────┘               │ Multi-tenant tables: │
         │ Routes:                      │ • companies          │
    ┌────┴────────────────────┐        │ • messages           │
    │ 6 Stateless Tools:      │        │ • contracts          │
    ├────────────────────────┤        │ • usage_summaries    │
    │ • calculate_health     │        │ • ticket_summaries   │
    │ • generate_email       │        │ • eval_sessions      │
    │ • generate_qbr_outline │        └──────────────────────┘
    │ • get_contract_info    │
    │ • get_customer_usage   │
    │ • get_recent_tickets   │
    └────────────────────────┘
         (Python 3.12, pg8000)
```

### Key Design Principles

1. **Server-First Architecture**

   - All secrets stored server-side; never exposed to browser
   - Clerk manages identity; no credential storage on our infrastructure
   - OpenAI API calls made only from server (API key never leaves Vercel)

2. **Stateless Tool Layer**

   - Each Lambda tool independently callable
   - No shared state or caching between tools
   - HMAC verification on every request ensures authenticity
   - Timestamp validation (±5 min window) prevents replay attacks

3. **Deterministic Planning with Guardrails**

   - Deterministic planner: task-aware, fixed logic, no LLM
   - LLM planner: model chooses tools under strict system rules (tools are sole truth source)
   - Output validation: Zod schemas enforce structure and type safety
   - Health scoring: deterministic algorithm (no LLM, reproducible results)

4. **Multi-Tenant Isolation**

   - Every row includes `ownerUserId` (Clerk user ID)
   - All queries filter by owner; unauthenticated users see only public data
   - Proper indexes ensure performant isolation enforcement

5. **Envelope-Based API Contract**
   - Standard response format: `{ ok: boolean, data?: T, error?: { code, message } }`
   - Consistent error handling across all tools
   - Strongly typed with Zod for compile-time safety

---

## Features

### Core Capabilities

#### 1. **Health Check**

Calculates customer health score using deterministic algorithm:

- **Input:** Customer ID
- **Data Sources:** Usage trend (30-day), open tickets count, contract renewal date
- **Output:** Health score (0-100), risk level (low/medium/high), signals (trend, ticket burden, renewal urgency)
- **Logic:** Weighted scoring—usage trend (40%), ticket volume (30%), renewal proximity (30%)

#### 2. **Renewal Brief**

Prepares renewal-focused analysis for customer engagement:

- **Input:** Customer ID
- **Data Sources:** Contract details, usage patterns, ticket history, calculated health
- **Output:** Structured brief with ARR, renewal date, health context, recommended next steps
- **Use Case:** CSM preparation before renewal conversation

#### 3. **QBR Preparation**

Generates outline for Quarterly Business Review:

- **Input:** Customer ID
- **Data Sources:** Usage trends, ticket patterns, health signals
- **Output:** QBR outline with sections (achievements, challenges, opportunities, roadmap)
- **Use Case:** CSM template for QBR agenda

#### 4. **Churn Review**

Identifies churn risk factors and mitigation actions:

- **Input:** Customer ID
- **Data Sources:** Usage decline signals, ticket escalations, health score
- **Output:** Risk factors, recommended actions, urgency flags
- **Use Case:** Escalate at-risk accounts to leadership

#### 5. **Email Draft**

Generates ready-to-send renewal outreach email:

- **Input:** Customer ID
- **Data Sources:** Usage trend, open tickets, renewal date
- **Output:** Subject line, email body (templated with customer context)
- **Use Case:** Quick outreach or CSM reference

### User Experience Features

- **Customer Selector:** Search and quick-select from user's customer base
- **Task Quick-Actions:** One-click buttons for Health, Renewal, QBR, Email, Churn
- **Real-Time Streaming Progress:** Watch tool execution with per-tool timing and errors
- **Copy-Ready Output:** Structured results formatted for immediate use (email, brief, etc.)
- **Dark/Light Mode:** Full theme support with consistent design tokens
- **Responsive Design:** Mobile-friendly interface using shadcn/UI components

---

## Technology Stack

### Frontend

- **Framework:** Next.js 16 (App Router), React 19 with RSC (React Server Components)
- **Styling:** Tailwind CSS v4, shadcn/UI components (Radix primitives)
- **State Management:** Zustand (UI state only, no data duplication)
- **Type Safety:** TypeScript strict mode, Zod for runtime validation
- **Database Access:** Drizzle ORM with Neon HTTP driver
- **Authentication:** Clerk (`@clerk/nextjs`) with proxy.ts route protection
- **Build:** Turbopack, pnpm for fast builds and dependency management

### Backend Tools

- **Runtime:** Python 3.12 on AWS Lambda
- **Database Driver:** pg8000 (pure Python PostgreSQL driver)
- **Authentication:** HMAC-SHA256 request signing with timestamp validation
- **Response Format:** Standard envelope (ok, data, error) with Pydantic validation

### Data & Infrastructure

- **Database:** Neon PostgreSQL (managed, serverless)
  - Supports multi-tenant isolation with `ownerUserId` on all tables
  - Automated backups, point-in-time recovery, geo-redundancy
- **Hosting:** Vercel (frontend), AWS API Gateway + Lambda (tools)
- **API Orchestration:** AWS SAM for infrastructure as code
- **LLM Provider:** OpenAI Chat Completions API (configurable model via env)

### DevOps & Deployment

- **Version Control:** Git with GitHub
- **Infrastructure as Code:** AWS SAM template (sam-template.yaml)
- **Secrets Management:** AWS SSM Parameter Store (Lambda), Vercel env vars (frontend)
- **Monitoring:** CloudWatch (Lambda logs), Vercel Analytics

---

## Setup and Usage

### Prerequisites

- Node.js 18+ (for frontend)
- Python 3.12 (for backend local dev)
- pnpm (or npm)
- AWS CLI + SAM CLI (for deployment)
- Neon PostgreSQL account
- Clerk account
- OpenAI API account

### Frontend Setup (Local Development)

1. **Environment Configuration**

Create `frontend/.env.local`:

```bash
# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database
DATABASE_URL=postgresql://user:password@db.neon.tech/copilot?sslmode=require

# Backend API
BACKEND_BASE_URL=http://localhost:8787           # Local dev
# OR: https://<api-id>.execute-api.ap-southeast-1.amazonaws.com/prod  # Production

# HMAC Signing (must match backend secret)
HMAC_SECRET=dev-secret-key
HMAC_CLIENT_ID=copilot-frontend

# LLM (server-side only)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o  # Optional; defaults to gpt-4o

# Optional Observability
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=...
```

2. **Install Dependencies and Run**

```bash
cd frontend
pnpm install
pnpm dev
```

Frontend runs on `http://localhost:3000`

3. **Database Migrations**

```bash
pnpm db:generate    # Generate migration from schema changes
pnpm db:migrate     # Apply migrations to Neon
pnpm db:seed        # Optional: seed demo data
```

### Backend Setup (Local Development)

1. **Environment Configuration**

Create `backend/.env`:

```bash
export HMAC_SECRET=dev-secret-key
export ALLOWED_ORIGIN=http://localhost:3000
export DATABASE_URL=postgresql://user:password@db.neon.tech/copilot?sslmode=require
```

**Note:** Do NOT include `channel_binding=require` in DATABASE_URL for local development (pg8000 limitation).

2. **Install Dependencies**

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

3. **Run Local Dev Server**

```bash
export HMAC_SECRET=dev-secret
python dev_server.py --port 8787
```

Backend tools available at `http://localhost:8787`

### Backend Deployment (AWS)

#### Prerequisites

- AWS CLI configured with appropriate credentials
- SAM CLI installed
- AWS SSM parameters set up:
  ```
  /copilot/hmac/v1              (SecureString: HMAC secret)
  /copilot/database/url          (SecureString: DATABASE_URL)
  /copilot/prod/hmac/v1          (SecureString: prod HMAC)
  /copilot/prod/database/url      (SecureString: prod DATABASE_URL)
  ```

#### Deploy to Dev

```bash
cd infra
sam build --template-file sam-template.yaml --config-env default --region ap-southeast-1 --profile cs-copilot
sam deploy --config-env default --region ap-southeast-1 --profile cs-copilot
```

#### Deploy to Production

```bash
cd infra
sam build --template-file sam-template.yaml --config-env prod --region ap-southeast-1 --profile cs-copilot
sam deploy --config-env prod --region ap-southeast-1 --profile cs-copilot
```

**Important:** The stage name (`/dev` or `/prod`) is appended to the API Gateway URL. Set `BACKEND_BASE_URL` in frontend env accordingly.

### Frontend Deployment (Vercel)

1. **Connect Repository**

   - Link your GitHub repo to Vercel
   - Select `frontend/` as the root directory

2. **Environment Variables** (Project Settings → Environment Variables)

   Set for both **Production** and **Preview** environments:

   - `BACKEND_BASE_URL` — Your production API Gateway URL
   - `HMAC_SECRET` — Must match `/copilot/prod/hmac/v1`
   - `DATABASE_URL` — Neon connection string
   - `OPENAI_API_KEY` — Your API key
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk key
   - `CLERK_SECRET_KEY` — Clerk secret

3. **Deploy**
   - Click "Deploy" in Vercel dashboard
   - Or use Vercel CLI: `vercel deploy --prod`

**Note:** Use different environment variable scopes for Production vs Preview.

### Database Setup (Neon)

1. **Create Project** in Neon dashboard
2. **Get Connection String** with `sslmode=require`
3. **Run Migrations:**
   ```bash
   cd frontend
   pnpm db:migrate
   ```
4. **Seed Demo Data** (optional):
   ```bash
   pnpm db:seed
   ```

---

## Key Implementation Details

### Authentication & Authorization

- **Clerk Integration:**

  - `proxy.ts` protects routes; public routes (landing, `/api/copilot/stream`) allowlisted
  - `auth()` server function reads authenticated `userId`
  - Multi-tenancy enforced: all queries filter by `ownerUserId`

- **Public Access:**
  - Unauthenticated users can access `/api/copilot/stream` but only see data with `ownerUserId = "public"`
  - Authenticated users see only their own data

### Tool Invocation (HMAC Signing)

Every tool call is signed with HMAC-SHA256:

```
Header: X-Signature = HMAC-SHA256(secret, timestamp.clientId.body)
Header: X-Timestamp = milliseconds since epoch
Header: X-Client = copilot-frontend

Verification: timestamp must be within ±5 minutes
Comparison: constant-time (prevents timing attacks)
```

Backend tools verify signature before processing; invalid signatures rejected with 401.

### Zod Schemas & Type Safety

All input/output boundaries validated:

- Tool responses validated with Zod schemas (Usage, Tickets, Contract, Health, Email, QBR)
- Server Actions validate input before processing
- Planner result schema enforces structure before rendering

### Health Score Calculation

**Deterministic algorithm (no LLM, reproducible):**

```
usageScore = 100 (up) | 50 (flat) | 0 (down)
ticketScore = 100 (0 open) | 80 (≤2) | 50 (≤5) | 20 (>5)
renewalScore = 100 (>180 days) | 70 (60-180 days) | 30 (<60 days)

healthScore = (usageScore × 0.4) + (ticketScore × 0.3) + (renewalScore × 0.3)
riskLevel = high (score<50) | medium (50-74) | low (≥75)
signals = [trend, ticket burden, renewal urgency based on thresholds]
```

---

## Project Structure

```
frontend/                       Next.js App Router application
  app/
    layout.tsx                 Root layout with Clerk + Analytics
    page.tsx                   Landing page
    actions.ts                 Core server actions (planner, customer ops)
    api/
      copilot/stream/          Streaming copilot endpoint (SSE)
      eval/stream/             Evaluation streaming (admin-only)
  src/
    agent/                     Agentic planning & execution
      planner.ts               Deterministic planner
      llmPlanner.ts            LLM-driven planner
      executor.ts              Tool execution orchestrator
      invokeTool.ts            HMAC signing & tool calls
      synthesizer.ts           Result aggregation & response generation
      tool-registry.ts         Tool definitions & capabilities
      types.ts                 Type definitions for workflows
    components/                React components
      copilot/                 Copilot UI (message list, controls)
      dashboard/               Customer management
      ui/                      shadcn/UI base components
    contracts/                 Zod schemas
      tools.ts                 Tool request/response envelopes
      user.ts                  User/auth types
      eval.ts                  Evaluation workflow types
    db/
      schema.ts                Drizzle ORM schema (companies, messages, contracts, etc.)
      client.ts                Drizzle client initialization
    lib/
      backend.ts               HMAC signing & fetch wrapper
      validation.ts            Input validation helpers
      authz.ts                 Authorization checks (eval access, etc.)
      logger.ts                Server-side logging
    llm/
      provider.ts              OpenAI API wrapper
    store/                     Zustand state stores
      copilot-store.ts         Copilot UI state
      customer-store.ts        Customer context
      eval-store.ts            Evaluation session state
  public/                      Static assets
  proxy.ts                     Clerk route protection
  env.example                  Environment variables template

backend/                       Python Lambda tools
  tools/
    calculate_health/          Health score computation
    generate_email/            Email draft generation
    generate_qbr_outline/      QBR outline generation
    get_contract_info/         Contract data retrieval
    get_customer_usage/        Usage analytics
    get_recent_tickets/        Support ticket data
  _shared/
    hmac_auth.py               HMAC verification & signing
    db.py                      PostgreSQL connection
    models.py                  Pydantic request/response models
    responses.py               Envelope response builders
    utils.py                   Helper utilities
  dev_server.py                Local development server

infra/                         AWS Infrastructure as Code
  sam-template.yaml            AWS SAM template (API Gateway, Lambda, roles)
  samconfig.toml               SAM configuration (dev/prod stages)
  layers/
    common/                    Lambda layer with shared dependencies

docs/                          Documentation & notebooks
  M3_UGL_1.ipynb               Usage examples & demos
  _preview/                    Reference materials

.github/
  workflows/                   CI/CD pipelines (optional)
```

---

## Development Workflow

### Local Development

1. **Start Backend:**

   ```bash
   cd backend && python dev_server.py --port 8787
   ```

2. **Start Frontend:**

   ```bash
   cd frontend && pnpm dev
   ```

3. **Access Application:**
   - Open http://localhost:3000
   - Sign in with Clerk
   - Select a customer and run a planner action

### Adding New Tools

1. Create new handler in `backend/tools/<tool-name>/handler.py`
2. Define request/response schema in Pydantic
3. Register in `tool-registry.ts` with Zod schema
4. Call from planner using `invokeTool<ResultType>()`

### Database Changes

1. Modify schema in `frontend/src/db/schema.ts`
2. Generate migration: `pnpm db:generate`
3. Apply migration: `pnpm db:migrate`

### Deployment

- **Frontend:** Push to `main` branch; Vercel auto-deploys
- **Backend:** Deploy via SAM from `infra/` directory

---

## Support and Documentation

- **Security & Compliance:** See `SECURITY_AND_COMPLIANCE.md`
- **Agentic AI Design:** See `AGENTIC_AI_WORKFLOW_DESIGN.md`

---

## Future Improvements

- **Custom Task Templates:** User-defined workflows beyond preset tasks
- **Slack/CRM Integrations:** Send insights directly to Slack, sync with CRM
- **Additional Data Sources:** Billing analytics, product usage, support tickets from third-party APIs
- **Advanced Rate Limiting:** Per-user quotas and API throttling for heavy workloads
- **Evaluation Framework:** Systematic testing of planner decisions and LLM outputs

---

## License

MIT. See `LICENSE`.
