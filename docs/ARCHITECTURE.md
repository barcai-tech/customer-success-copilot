# 🏗️ System Architecture — Customer Success Copilot

The **Customer Success Copilot** is an agentic AI system that retrieves customer context from backend tools, generates insights through a planner-driven LLM, and returns structured results to Customer Success Managers.

This document explains:

- System topology (COMP Diagram)
- Agent execution lifecycle (SEQ Diagram)
- Backend tool architecture (Lambda)
- Data model and storage layout
- Scoring and decision logic
- Error handling + observability
- Deployment + environment map

---

## 1. 🌍 System Overview

The system follows a **thin frontend + stateless tool backend** design:

- Frontend (Next.js 16) → orchestrates the agent and UI
- Server actions → call LLM + tools
- Tools → AWS Lambda microservices (stateless, JSON I/O)
- Data → S3 (metrics), Neon (auth + history)
- Async (optional) → SQS

This architecture ensures:

- Low cost when idle
- Horizontal scalability
- Zero secrets in the browser
- Easy future expansion (add more tools without refactor)

---

## 2. 🧱 Component Diagram (COMP)

```mermaid
flowchart TD

subgraph Browser
  UI[Next.js Frontend<br/>shadcn • Zustand • Zod]
end

subgraph Vercel
  SA[Server Actions<br/>Auth • LLM • HMAC Sign]
  DB[(Neon DB<br/>Users • Sessions • History)]
end

subgraph AWS
  APIGW[API Gateway]
  L1[Lambda: get_customer_usage]
  L2[Lambda: get_recent_tickets]
  L3[Lambda: get_contract_info]
  L4[Lambda: calculate_health]
  L5[Lambda: generate_email]
  L6[Lambda: generate_qbr_outline]
  S3[(S3 Bucket<br/>usage.json • tickets.json • contract.json)]
  SQS[(SQS Queue<br/>Async Jobs)]
end

UI --> SA
SA --> DB
SA --> APIGW
APIGW --> L1
APIGW --> L2
APIGW --> L3
APIGW --> L4
APIGW --> L5
APIGW --> L6
L1 --> S3
L2 --> S3
L3 --> S3
```

---

## 3. 🔁 Planner Sequence Diagram (SEQ)

This sequence shows a multi-step agent call for:

“Prepare a renewal brief for Acme Corp”

```mermaid
sequenceDiagram
participant User
participant UI as Frontend (Next.js)
participant SA as Server Action (Planner)
participant LLM as LLM (Claude/OpenAI)
participant APIGW as API Gateway
participant T1 as Lambda: get_usage
participant T2 as Lambda: get_tickets
participant T3 as Lambda: get_contract
participant T4 as Lambda: calc_health
participant T5 as Lambda: gen_email

    User->>UI: enters prompt
    UI->>SA: server action request
    SA->>LLM: "Plan next tool"
    LLM-->>SA: Tool plan (call get_usage)

    SA->>APIGW: signed request
    APIGW->>T1: invoke
    T1-->>SA: usage JSON

    SA->>LLM: "Next step?"
    LLM-->>SA: call get_tickets
    SA->>APIGW: signed request
    APIGW->>T2: invoke
    T2-->>SA: tickets JSON

    SA->>LLM: "Next?"
    LLM-->>SA: call get_contract
    SA->>APIGW: signed request
    APIGW->>T3: invoke
    T3-->>SA: contract JSON

    SA->>T4: calculate_health (deterministic)
    T4-->>SA: score JSON

    SA->>LLM: "Generate email"
    LLM->>T5: via SA (LLM action)
    T5-->>SA: email JSON

    SA-->>UI: final structured result
    UI-->>User: summary + email + score
```

---

## 4. 🧮 Health Scoring Logic (Deterministic)

This system never uses the LLM for scoring to avoid hallucination.

| Factor            | Weight | Signal Logic                             |
| ----------------- | ------ | ---------------------------------------- |
| Usage Trend       | 0.45   | Trend “up” = positive, “down” = negative |
| Ticket Load       | 0.35   | High ticket volume = penalty             |
| Renewal Proximity | 0.20   | <60 days = risk bump                     |

Output:

```json
{
  "healthScore": 82,
  "riskLevel": "low",
  "signals": ["usage_up", "few_tickets"]
}
```

---

## 5. 🗄️ Data Model

Neon DB (Drizzle)

| Table         | Purpose            |
| ------------- | ------------------ |
| users         | Auth               |
| sessions      | BetterAuth         |
| conversations | History            |
| messages      | UI transcript      |
| customers     | Directory metadata |

S3 JSON Layout

```
s3://cs-copilot-data/usage/<id>.json
s3://cs-copilot-data/tickets/<id>.json
s3://cs-copilot-data/contract/<id>.json
```

---

## 6. 🚨 Error Handling & Partial Results

| Scenario        | Behavior                             |
| --------------- | ------------------------------------ |
| Tool timeout    | Mark tool error, continue plan       |
| Bad JSON schema | Skip step, warn UI                   |
| Missing data    | Produce result with “gaps explained” |
| Agent failure   | Graceful assistant message           |

---

## 7. 🔎 Observability

| Signal         | Captured                   |
| -------------- | -------------------------- |
| requestId      | Correlates full run        |
| tool.latencyMs | Per tool SLA visibility    |
| riskSignals    | From score engine          |
| errors         | Structured, not raw traces |

Logs live in:

- CloudWatch (backend)
- Optional: DB message context (frontend)

---

## 8. 🏗️ Deployment Map

| Component | Platform             |
| --------- | -------------------- |
| Frontend  | Vercel               |
| API Tools | Lambda + API Gateway |
| Async     | SQS                  |
| DB        | Neon                 |
| Files     | S3                   |

---

## 9. ✅ Summary

This architecture enables:

- Low cost, stateless backend
- Safe and explainable AI behaviors
- Easy future integrations (Jira, Salesforce, Slack)
- Strong alignment with enterprise CS workflows

---

## 🔧 Deploy to AWS (via SAM)

See `infra/README.md` and `infra/sam-template.yaml`.

Summary:

- Create an SSM Parameter for your HMAC secret (e.g., `/copilot/hmac/v1`).
- `cd infra && sam build && sam deploy --guided` and provide:
  - StageName (dev)
  - AllowedOrigin (your frontend URL)
  - HmacSecretParam (SSM name)
  - DataBucket (optional S3 bucket name)
- Use the output `ApiUrl` as `BACKEND_BASE_URL` in the frontend `.env.local`.
