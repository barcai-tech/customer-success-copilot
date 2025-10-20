# 📡 API Contracts (JSON + Zod)

This document defines the **complete API contract** for all backend tools invoked by the Customer Success Copilot.

Each tool:

- Accepts a **strict JSON request**
- Returns a **strict JSON response**
- Must conform to the envelope format below
- Is validated in the frontend via **Zod**
- Is verified backend-side via **HMAC + timestamp check**

The contracts below are **binding** — LLMs, frontend, and backend must all follow them exactly.

---

## 1. 📨 Standard Envelope (Required for Every Tool)

### ✅ Request Envelope (JSON)

```json
{
  "customerId": "acme-001",
  "params": {
    "periodDays": 30
  }
}
```

| Field      | Type   | Required | Description                   |
| ---------- | ------ | -------- | ----------------------------- |
| customerId | string | ✅       | Unique identifier of customer |
| params     | object | ✅       | Tool-specific inputs          |

✅ Response Envelope (JSON)

```json
{
  "ok": true,
  "data": { "usageTrend": "up" },
  "error": null
}
```

| Field | Type           | Description            |
| ----- | -------------- | ---------------------- |
| ok    | boolean        | True if tool succeeded |
| data  | object \| null | Tool payload           |
| error | object \| null | Error block            |

`If error != null, data MUST be null.`

---

## 2. ❌ Error Format (JSON)

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "TIMEOUT",
    "message": "Tool did not respond in time"
  }
}
```

| Error         | Code Meaning            |
| ------------- | ----------------------- |
| INVALID_INPUT | Zod validation failed   |
| TIMEOUT       | Tool exceeded runtime   |
| TOOL_FAILURE  | Exception inside Lambda |
| MISSING_DATA  | S3 entry missing        |

The LLM must gracefully handle errors and continue planning.

---

## 3. ✅ Tool List (MVP Set)

| Tool                 | Purpose                     |
| -------------------- | --------------------------- |
| get_customer_usage   | Fetch usage metrics from S3 |
| get_recent_tickets   | Fetch support cases from S3 |
| get_contract_info    | Fetch renewal + ARR info    |
| calculate_health     | Deterministic scoring       |
| generate_email       | LLM-written email draft     |
| generate_qbr_outline | LLM-written QBR bullets     |

---

## 4. 🧰 Tool Contracts (JSON + Zod)

### 4.1 get_customer_usage

Request JSON:

```json
{
  "customerId": "acme-001",
  "params": { "periodDays": 30 }
}
```

Response JSON:

```json
{
  "ok": true,
  "data": {
    "trend": "up",
    "avgDailyUsers": 82,
    "sparkline": [77, 81, 85, 89]
  },
  "error": null
}
```

Zod schema:

```ts
export const GetUsageResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    trend: z.enum(["up", "down", "flat"]),
    avgDailyUsers: z.number(),
    sparkline: z.array(z.number()),
  }),
  error: z.null(),
});
```

### 4.2 get_recent_tickets

Response JSON:

```json
{
  "ok": true,
  "data": {
    "openTickets": 2,
    "recentTickets": [
      { "id": "T-901", "severity": "low" },
      { "id": "T-902", "severity": "medium" }
    ]
  },
  "error": null
}
```

### 4.3 get_contract_info

Response JSON:

```json
{
  "ok": true,
  "data": {
    "renewalDate": "2026-02-01",
    "arr": 250000
  },
  "error": null
}
```

### 4.4 calculate_health

Response JSON:

```json
{
  "ok": true,
  "data": {
    "score": 82,
    "riskLevel": "low",
    "signals": ["usage_up", "few_tickets"]
  },
  "error": null
}
```

### 4.5 generate_email

Response JSON:

```json
{
  "ok": true,
  "data": {
    "subject": "Renewal Alignment with Acme Corp",
    "body": "Hi team, ..."
  },
  "error": null
}
```

### 4.6 generate_qbr_outline

Response JSON:

```json
{
  "ok": true,
  "data": {
    "sections": ["Adoption overview", "Support summary", "Roadmap alignment"]
  },
  "error": null
}
```

---

## 5. 🕓 Async Tool Contract (SQS Variant — Optional)

If a tool becomes long-running, it must follow this pattern:

| Phase                      | Endpoint                         |
| -------------------------- | -------------------------------- |
| 1. POST /tool/start        | returns jobId                    |
| 2. GET /tool/status/:jobId | returns progress or final result |

Example response:

```json
{ "jobId": "J123-884", "status": "running" }
```

---

## 6. 📌 Contract Guarantees

| Guarantee             | Meaning                   |
| --------------------- | ------------------------- |
| Stable shape          | Never break UI or LLM     |
| Strict typing         | Zod + typed JSON          |
| Deterministic scoring | No LLM variation          |
| Partial-safe          | Errors don’t break result |

---

## ✅ Summary

You now have full end-to-end contracts for:

- Tool requests
- Tool responses
- Errors
- Zod schemas
- Async variant

This is enough for the LLM, Lambda backend, and Next.js frontend to all interoperate safely and predictably.
