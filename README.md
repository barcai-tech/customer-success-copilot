# Customer Success Copilot

**Customer Success Copilot** is a friendly, agentic AI assistant for Customer Success Managers (CSMs). It executes multi-step workflows (not just chat) by calling backend “tools” (AWS Lambda microservices), analyzing customer metrics, producing structured insights (like health scores and renewal risks), and preparing actionable assets (like renewal emails or QBR outlines).

This project is intentionally designed to demonstrate:
- **Agentic AI planning** (multi-step tool calls, not just prompting)
- **Secure serverless backend architecture** (stateless Lambdas + S3 + API Gateway)
- **Modern Next.js application design** (Next.js 16 beta, shadcn/ui, Zod, Zustand, Drizzle)
- **Production-aligned security patterns** (HMAC-signed tool calls, strict CORS, least-privilege IAM)
- **LLM flexibility** (Claude or OpenAI selectable at runtime)

---

## 🌟 Features

| Category | Features |
|-----------|----------|
| **AI/Agent** | Multi-step planning, tool calling, partial result handling |
| **Insights** | Usage summary, ticket analysis, health score, renewal risk |
| **Assets** | Follow-up email draft, renewal draft, QBR outline |
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

## ✅ Acceptance Criteria

A user can:
1. Log in
2. Select an LLM model
3. Ask: _“Prepare a renewal brief for Acme Corp.”_
4. See the agent:
   - plan steps
   - call 3–5 tools
   - produce a structured briefing + email draft
   - display tool provenance and timings

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

---

## 📜 License & Ownership

Owned by **Barcai Technology**.  
For portfolio/demo use. Replace model and API keys with your own.
