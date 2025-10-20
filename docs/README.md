# 📚 Documentation Index

Welcome to the **Customer Success Copilot** documentation. This folder contains all reference material needed to understand, operate, or contribute to the system.

---

## 🗂️ Document Map

| Document             | Description                                                 |
| -------------------- | ----------------------------------------------------------- |
| **ARCHITECTURE.md**  | System design, infra diagram, planner lifecycle, data flows |
| **PROMPTS.md**       | Agent system prompt, planner logic, tool call rules         |
| **SECURITY.md**      | IAM, HMAC, OWASP alignment, PII policy, rate limits         |
| **API_CONTRACTS.md** | Full tool API definitions + Zod schemas                     |

The root `README.md` covers product context and deployment summary.

---

## 🏁 Contributor Quickstart

### 1) Read these first

- `ARCHITECTURE.md`
- `PROMPTS.md`
- `SECURITY.md`

### 2) Frontend Setup

```sh
cd frontend
cp .env.example .env
pnpm install
pnpm dev
```

### 3) Backend Setup

- Python 3.12
- AWS CLI configured
- Deploy or invoke tool Lambdas individually
- S3 bucket contains JSON data sources
- HMAC secret shared with frontend server actions

---

## ✅ PR Checklist

Before merging, verify:

- Zod schemas match tool contract
- No secrets in client or logs
- Tool errors return partial results gracefully
- Max 5 tool calls per agent request
- CORS + HMAC are enforced
- Session is verified for every tool call

---

## 🔐 Security Expectations

- Server actions only for secrets
- HMAC for every tool call
- Allowlisted CORS
- No raw PII in logs

---

## 🛣️ Roadmap (Future Docs)

Optional expansions later:

- /docs/RAG.md
- /docs/INTEGRATIONS.md
- /docs/WORKFLOWS.md

---

## 👤 Ownership

Maintained by Barcai Technology.
