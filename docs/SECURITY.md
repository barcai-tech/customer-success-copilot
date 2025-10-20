# 🔐 Security & Compliance Specification

This document defines the security, privacy, and compliance controls for the **Customer Success Copilot**. It ensures that the system is safe, auditable, least-privileged, and aligned with modern SaaS security expectations — especially for systems that process customer data.

The approach balances three goals:

| Goal                     | Description                                                       |
| ------------------------ | ----------------------------------------------------------------- |
| **Safety**               | Avoid data leaks, misuse, or hallucinated output posing as “fact” |
| **Security**             | Enforce least privilege, protect secrets, validate all inputs     |
| **Compliance Awareness** | Treat customer data respectfully with clear boundaries            |

---

## 1. 📌 Security Principles

| Principle             | Application in System                            |
| --------------------- | ------------------------------------------------ |
| **Zero Trust**        | Frontend never trusted with secrets              |
| **Least Privilege**   | Each Lambda has its own minimal IAM role         |
| **Stateless Backend** | No long-lived memory, no shared state            |
| **Defense in Depth**  | HMAC, CORS, auth, IAM, validation, logging       |
| **Secure by Default** | Deny-all CORS, deny-all IAM, explicit allowlists |
| **Explainability**    | Deterministic scoring; hallucination minimized   |

---

## 2. 🔐 Authentication & Authorization

| Layer                 | Mechanism                           |
| --------------------- | ----------------------------------- |
| **Frontend Auth**     | BetterAuth (session + Drizzle)      |
| **Backend Auth**      | HMAC-signed requests                |
| **User-Level Access** | Session-verified server actions     |
| **Tool Access**       | Never callable directly via browser |

Rules:

1. Browser → Server Action requires valid session
2. Server Action → Tool requires HMAC header
3. Tools reject unsigned or expired requests

---

## 3. 🧾 HMAC Signing (Tool Authenticity)

All Lambda calls must include:

| Header        | Example                  |
| ------------- | ------------------------ |
| `X-Signature` | HMAC-SHA256 payload hash |
| `X-Timestamp` | Unix ms                  |
| `X-Client`    | `copilot-frontend`       |

Verification rules:

- Reject requests older than **5 minutes**
- Compare signature using **constant-time comparison**
- Inputs validated before execution

---

## 4. 🧰 CORS Policy

| Rule            | Value                                     |
| --------------- | ----------------------------------------- |
| Allowed Origins | `https://cs-copilot.barcai-tech.com` only |
| Allowed Methods | `POST` only                               |
| Credentials     | disabled                                  |
| Wildcards       | NEVER allowed                             |

Note: Browser never hits Lambda directly — CORS is a _fallback defense_, not the primary line of protection.

---

## 5. 🧹 Input Validation (Zod + Backend Checks)

| Layer    | Validator                   |
| -------- | --------------------------- |
| Frontend | Zod schemas                 |
| Backend  | Minimal envelope validation |

If validation fails → `400` with safe error body:

```json
{ "error": "INVALID_INPUT" }
```

---

## 6. 🧍‍♂️ PII Handling Policy

PII is allowed in this demo (names, company names, renewal dates), but must follow these rules:

| Rule                              | Requirement                                             |
| --------------------------------- | ------------------------------------------------------- |
| No PII in logs                    | Logs store IDs, not names                               |
| No PII in prompt behind user back | Copilot must not “reveal hidden data”                   |
| PII stored only in Neon           | JSON in S3 must be customer-metadata only (not secrets) |
| No sharing between tenants        | (future multi-tenant path)                              |

---

## 7. 🕸️ OWASP Alignment

| OWASP Top 10                 | Mitigation in System                   |
| ---------------------------- | -------------------------------------- |
| A01: Broken Access Control   | Session auth + HMAC + IAM              |
| A02: Cryptographic Failures  | HTTPS + HMAC                           |
| A03: Injection               | No SQL from user input, Zod validation |
| A05: Auth Failures           | BetterAuth controls                    |
| A07: IDOR                    | Customer lookups by customerId + auth  |
| A08: Software/Data Integrity | Locked deps + checksum                 |
| A09: Security Logging        | CloudWatch + correlation IDs           |
| A10: SSRF                    | Lambdas do not call arbitrary URLs     |

---

## 8. 🛡️ IAM Policy Model

Each Lambda gets a minimal policy, example:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::cs-copilot-data/*"
    }
  ]
}
```

No wildcard s3:\*
No cross-function role sharing

---

## 9. 🧯 Error Handling & Redaction

| Rule                  | Implementation                       |
| --------------------- | ------------------------------------ |
| No stack traces to UI | User gets a friendly message         |
| Logs use IDs, not PII | e.g., customerId: acme001            |
| Errors are typed      | TIMEOUT, INVALID_INPUT, TOOL_FAILURE |

---

## 10. 📜 Threat Model

| Threat                | Mitigation                          |
| --------------------- | ----------------------------------- |
| Replay attacks        | Timestamp expiry on signed requests |
| Tool spoofing         | HMAC identity verification          |
| Session theft         | HttpOnly + secure cookies           |
| Prompt injection      | Agent rules + deterministic scoring |
| Over-permissive infra | IAM least privilege                 |

---

## 11. 📍 Secrets Management

| Secret         | Location                       |
| -------------- | ------------------------------ |
| HMAC key       | Vercel server env + Lambda env |
| LLM keys       | Vercel server env              |
| DB URL         | Vercel + Lambda env            |
| Stored in Git? | ❌ Never                       |

---

## ✅ Summary

The system is secure because it:

- Separates trust boundaries clearly
- Signs every tool call
- Uses Zod + IAM + CORS + session auth
- Logs safely without exposing PII
- Avoids hallucination in critical logic
