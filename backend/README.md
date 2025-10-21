# Backend — Customer Success Copilot Tools

Python 3.12 AWS Lambda microservices implementing all tools described in docs/API_CONTRACTS.md. Each tool:

- Accepts the standard JSON envelope: `{ customerId, params }`
- Requires HMAC-signed requests via headers: `X-Signature`, `X-Timestamp`, `X-Client`
- Returns a standard JSON envelope: `{ ok, data|null, error|null }`

This skeleton supports local invocation with sample data and production S3 reads when configured.

---

## Tools (MVP)

- get_customer_usage
- get_recent_tickets
- get_contract_info
- calculate_health
- generate_email
- generate_qbr_outline

---

## Directory Layout

```
backend/
  _shared/           # Common utilities (HMAC, responses, models, s3)
  tools/
    get_customer_usage/handler.py
    get_recent_tickets/handler.py
    get_contract_info/handler.py
    calculate_health/handler.py
    generate_email/handler.py
    generate_qbr_outline/handler.py
  sample_data/
    usage/acme-001.json
    tickets/acme-001.json
    contract/acme-001.json
  invoke_local.py     # Local runner for any tool
  requirements.txt
```

---

## Environment

Required (dev/prod):

- `HMAC_SECRET` — shared secret for HMAC verification
- `ALLOWED_ORIGIN` — CORS allowlist origin (e.g., https://cs-copilot.barcai-tech.com)

Optional (for S3 mode):

- `DATA_BUCKET` — S3 bucket name containing JSON data

Headers required on every request:

- `X-Signature`: hex HMAC-SHA256 of `${timestamp}.${clientId}.${rawBody}`
- `X-Timestamp`: unix epoch milliseconds
- `X-Client`: client identifier (e.g., `copilot-frontend`)

Requests older than 5 minutes are rejected.

---

## Local Development

Python version:

- Pinned to Python 3.12 (see `.python-version`). Use `pyenv` or your system’s 3.12 to create the venv.

Install deps:

```sh
cd backend
# Option A: Makefile helpers (prefers python3.12, falls back to python3)
make venv            # or: make PYTHON=$(which python3.12) venv
source .venv/bin/activate
make install   # will skip silently if offline

# Option B: Manual
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

Set env (dev defaults are fine for local):

```sh
# Option A: Use .env file
cp .env.example .env
set -a && source .env && set +a   # export all vars from .env in bash/zsh

# Option B: Export manually
export HMAC_SECRET=dev-secret
export ALLOWED_ORIGIN=http://localhost:3000
# Optional S3:
# export DATA_BUCKET=cs-copilot-data
```

Invoke any tool locally (runs handler with a simulated API Gateway event):

```sh
python invoke_local.py get_customer_usage --customerId acme-001 --params '{"periodDays":30}'
python invoke_local.py get_recent_tickets --customerId acme-001
python invoke_local.py get_contract_info --customerId acme-001
python invoke_local.py calculate_health --customerId acme-001
python invoke_local.py generate_email --customerId acme-001
python invoke_local.py generate_qbr_outline --customerId acme-001
```

Quick smoke test for all tools:

```sh
cd backend
source .venv/bin/activate
make smoke CID=acme-001
```

By default, tools read from `sample_data/` when `DATA_BUCKET` is not set or S3 access fails.

Offline note: If your environment blocks network installs, you can still run local invocations using the standard library only (sample data, HMAC, envelope). S3 access will be disabled and tools will fall back to `sample_data/`.

---

## Response Contract

Success:

```json
{ "ok": true, "data": { /* tool payload */ }, "error": null }
```

Error:

```json
{ "ok": false, "data": null, "error": { "code": "TIMEOUT|INVALID_INPUT|TOOL_FAILURE|MISSING_DATA|UNAUTHORIZED", "message": "..." } }
```

---

## Notes

- Handlers include strict HMAC verification and minimal envelope validation.
- `calculate_health` is deterministic and uses usage/tickets/contract data sources.
- `generate_email`/`generate_qbr_outline` are template-based in dev; swap in an LLM call later.
