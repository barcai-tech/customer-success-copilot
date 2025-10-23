# Backend DB Migration — Troubleshooting Notes (Lambda + Neon)

This doc captures the issues we hit while moving tools off S3 to a Neon Postgres database, plus the fixes that ultimately worked. It’s intended as a field log for future reference and faster onboarding.

## Context
- Runtime: AWS Lambda Python 3.12
- Infra: SAM (template `infra/sam-template.yaml`), Makefile wrappers in `infra/Makefile`
- DB: Neon Postgres, connection string in `DATABASE_URL`
- Backend tools: `backend/tools/*`
- Shared helpers: `backend/_shared/*`

## Symptoms We Saw
- API 502 from API Gateway for DB-backed tools; non-DB tools returned 200.
- CloudWatch logs showed ImportModuleError variants:
  - `No module named 'psycopg'`
  - `no pq wrapper available` (psycopg v3 looking for `psycopg_c`/`psycopg_binary`/libpq)
  - `No module named 'psycopg2'` / `No module named 'psycopg2._psycopg'`
  - Later, after switching drivers: `No module named 'pg8000'`
- 500 with `{ error: { code: "TOOL_FAILURE", message: "TypeError" } }` after swapping drivers (caused by context-manager usage with pg8000).

## Root Causes
1) Lambda packaging pulled macOS wheels instead of Amazon Linux wheels (psycopg/psycopg2), causing ImportModuleError at runtime.
2) SAM `--use-container` build could not see Docker on the dev machine, so container builds failed.
3) After switching to pg8000 (pure Python), the module wasn’t present in the function bundle because it wasn’t included in the layer yet.
4) pg8000’s DB-API connection doesn’t support `with get_conn() as conn` context manager usage, causing a TypeError on execute.
5) Parameter handling: `DatabaseUrl` defaulted to empty in `samconfig.toml` and silently overwrote the real value on deploy unless overridden.
6) In some environments, `channel_binding=require` in the Neon URL can trip drivers on Lambda. `sslmode=require` is sufficient.

## Fixes That Worked

### A. Template/env wiring
- Added a `DatabaseUrl` parameter and wired it into all functions via Globals in `infra/sam-template.yaml`.
- Updated `infra/Makefile` to forward `PARAMETER_OVERRIDES` to `sam deploy`.
- Options to set it:
  - One-off: `make deploy ... PARAMETER_OVERRIDES="DatabaseUrl='postgresql://…/neondb?sslmode=require'"`
  - Persistent: set `DatabaseUrl` in `infra/samconfig.toml` or remove it from `parameter_overrides` so the previous value is retained.

### B. Driver packaging strategy (no container required)
- Moved to a pure-Python driver: `pg8000`.
- Vendored pg8000 into the shared Lambda layer so it’s always available:
  - `python3 -m pip install -t infra/layers/common/python pg8000==1.30.5`
  - Build + deploy to publish a new layer version and attach to all functions.
- Alternative (didn’t need after pg8000): build with container `sam build --use-container` once Docker/SAM integration works.

### C. DB helper changes
- `backend/_shared/db.py`
  - Switched from psycopg/psycopg2 to pg8000 and manual connect/close.
  - Implemented `_fetch_one(...)` helper that opens/closes cursor/connection reliably (no context-manager assumptions).
  - Honored `sslmode=require` via SSL context; stripped any `channel_binding=require` (not needed on Lambda).

### D. Validation + diagnostics
- Node smoke script updated to include `ownerUserId`:
  - `infra/scripts/smoke_node.mjs`
  - Usage: `make smoke-node API_URL=… HMAC_SECRET=… CUSTOMER_ID=acme-001 OWNER_USER_ID=public`
- Curl signer remains available: `infra/scripts/signed_curl.sh`
- Logs: `sam logs -n GetCustomerUsage --stack-name cs-copilot-backend --profile <profile> --region <region> --tail`

## Final Working State
- All DB tools return 200:
  - get_customer_usage, get_recent_tickets, get_contract_info, calculate_health
- Non-DB tools (generate_email, generate_qbr_outline) continue to return 200.
- Layer: `cs-copilot-common` contains pg8000. Functions reference the latest layer version.
- `DATABASE_URL` set at stack level (via parameter) with `sslmode=require`.

## Known Good Commands (copy/paste)

- Vendor pg8000 into layer (pure Python, cross-platform):
  - `python3 -m pip install -t infra/layers/common/python pg8000==1.30.5`

- Build + deploy (using your Neon URL):
  - `cd infra`
  - `make build TEMPLATE=sam-template.yaml`
  - `make deploy PROFILE=cs-copilot REGION=ap-southeast-1 TEMPLATE=sam-template.yaml \
       PARAMETER_OVERRIDES="DatabaseUrl='postgresql://USER:PASSWORD@HOST/neondb?sslmode=require'"`

- Smoke test (includes ownerUserId):
  - `make smoke-node API_URL=https://<api-id>.execute-api.ap-southeast-1.amazonaws.com/dev \
       HMAC_SECRET=<secret> CUSTOMER_ID=acme-001 OWNER_USER_ID=public`

- Tail logs for one function:
  - `sam logs -n GetCustomerUsage --stack-name cs-copilot-backend --profile cs-copilot --region ap-southeast-1 --tail`

## Clerk + Seeding (Frontend) — Side Notes
- Dev session cookies may not resolve in API routes with Next 16 + Turbopack;
  - `/api/companies/list` auto-seeds on first fetch when `auth().userId` is present.
  - `/api/db/seed-user` (dev-only fallback) accepts `?owner=<userId>` for manual seeding.
  - Debug endpoints: `/api/debug/auth`, page `/debug` with a “Seed demo data” button.

## Quick Checklist (when things break)
1) Check CloudWatch logs for the exact error class.
2) Confirm `DATABASE_URL` is non-empty on the Lambda and uses `sslmode=require` (no `channel_binding=require`).
3) Ensure the driver is packaged:
   - Layer contains `pg8000` under `/opt/python/pg8000`.
   - Function references the latest layer version.
4) If using psycopg again, build with `--use-container` or vendor proper manylinux wheels.
5) Re-run smoke tests with `OWNER_USER_ID` param and verify HTTP 200 + JSON.

## Appendix — Changes in Repo
- `infra/sam-template.yaml`: added `DatabaseUrl` parameter + wired to Globals env.
- `infra/Makefile`: `deploy` passes `PARAMETER_OVERRIDES`.
- `backend/_shared/db.py`: switched to pg8000 + explicit conn/close helper.
- `backend/requirements.txt`: pg8000 pinned; psycopg removed.
- `infra/scripts/smoke_node.mjs`: includes `ownerUserId` in payload.
- `infra/layers/common/python/`: contains vendored `pg8000`.
