# Customer Success Copilot

Customer Success Copilot is an agentic assistant that helps Customer Success Managers and Technical Account Managers plan and execute day‑to‑day work — preparing QBRs, mitigating churn risk, planning renewals, suggesting upsell/cross‑sell motions, and summarizing customer metrics.

Unlike a simple chat UI, the Copilot plans multi‑step workflows and calls backend tools (AWS Lambda) to fetch data and create assets, then returns a structured result you can act on (summary, health, actions, email draft, QBR outline).

This project is intentionally designed to demonstrate:
- **Agentic AI planning** (multi-step tool calls, not just prompting)
- **Secure serverless backend architecture** (stateless Lambdas + S3 + API Gateway)
- **Modern Next.js application design** (Next.js 16 beta, shadcn/ui, Zod, Zustand, Drizzle)
- **Production-aligned security patterns** (HMAC-signed tool calls, strict CORS, least-privilege IAM)
- **LLM flexibility** (Claude or OpenAI selectable at runtime)

---

## 🌟 What It Does

| Category | Features |
|-----------|----------|
| **AI/Agent** | Multi‑step planning with tool calling and partial‑safe results |
| **Insights** | Usage summary, ticket analysis, health, churn signals, renewal risk |
| **Assets** | Follow‑up email, renewal prep email, QBR outline |
| **Data** | S3 for customer metrics, Neon for auth/session/history |
| **Security** | HMAC signing, BetterAuth, CORS, Zod validation, PII controls |
| **Frontend** | shadcn/ui, TanStack table, Zustand, server actions |

---

## 🔧 Architecture Summary

| Layer | Technology | Notes |
|---------|------------|-------|
| **Frontend** | Next.js 16 beta, Zod, Zustand, Drizzle, shadcn/ui | Thin client, no secrets |
| **Auth** | BetterAuth | Session-backed, Drizzle adapter |
| **Backend Tools** | AWS Lambda (Python 3.12) | One tool per micro-action |
| **Data** | S3 JSON + Neon | Lambdas stay stateless |
| **Async** | AWS SQS | For long-running work |
| **LLM** | Claude/OpenAI (user selectable) | via server actions |

---

## 🌍 Deployment Targets

| Component | Destination |
|-----------|------------|
| Frontend | Vercel |
| Backend | AWS API Gateway + Lambda + SQS |
| Data | Neon + S3 |
| Domain | `https://cs-copilot.barcai-tech.com` |

---

## 📌 Key Documents

| Document | Location | Purpose |
|----------|-----------|---------|
| Architecture | `docs/ARCHITECTURE.md` | Infra, diagrams, execution flow |
| Prompts | `docs/PROMPTS.md` | AI brain + planner rules |
| Security | `docs/SECURITY.md` | IAM, OWASP, HMAC, compliance |
| API Contracts | `docs/API_CONTRACTS.md` | JSON + Zod schemas |
| Docs Index | `docs/README.md` | Navigation + contributor onboarding |

---

## ✅ Demo Goals (Acceptance)

A user can:
1) Choose a customer (e.g., `acme-001`) and a task template (QBR, Renewal Brief, Churn‑risk Check)
2) Run the Copilot and see:
   - Planned steps and called tools (provenance + timings)
   - Structured result: summary, health, actions, email/QBR outline
3) Copy email/QBR content and next steps

---

## 🚀 Runbook (Dev Quickstart)

```sh
# Frontend
cd frontend
cp .env.example .env
pnpm install
pnpm dev

# Backend (deploy tools or invoke locally)
cd backend
# see backend README for deploy instructions
```

Tip: You can verify the deployed backend without the frontend using the Node smoke test:

```sh
cd infra
make smoke-node API_URL=<api-url-with-stage> \
  HMAC_SECRET=<same-secret-as-SSM> CUSTOMER_ID=acme-001
```

---

## 📜 License & Ownership

Owned by **Barcai Technology**.  
For portfolio/demo use. Replace model and API keys with your own.

---

## 🎨 UI/UX Guidelines (Demo)

To keep the Copilot consistent with the Barcai portfolio site, we adopt the same Tailwind v4 color tokens and rounded radii from the site’s `globals.css`:

- Primary: `#2f6ee6`
- Background/Foreground: light background `#ffffff`, dark foreground `#1e293b`
- Sidebar (dark): `#1e293b` with accent `#5a9bff`
- Radius: `~0.55rem` (medium rounding), subtle elevation shadows

Conventions:
- Dark mode supported via `.dark` class
- Use shadcn/ui + Radix primitives, lucide icons
- Keep result sections scannable: Summary, Health, Actions, Email/QBR, Used Tools

This is a demo app; we prioritize clarity and speed over exhaustive production hardening.
