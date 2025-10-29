#!/usr/bin/env bash
set -euo pipefail

API_URL=${1:-}
HMAC_SECRET=${2:-}
CUSTOMER_ID=${3:-}
CLIENT_ID=${4:-copilot-frontend}

if [[ -z "$API_URL" || -z "$HMAC_SECRET" || -z "$CUSTOMER_ID" ]]; then
  echo "Usage: $0 <API_URL> <HMAC_SECRET> <CUSTOMER_ID> [CLIENT_ID]" >&2
  exit 1
fi

ts() {
  python - <<'PY'
import time
print(int(time.time()*1000))
PY
}

sig() {
  local t="$1"; local cid="$2"; local body="$3"; local secret="$4"
  # Read body via stdin to avoid shell/Python quoting issues with JSON
  printf "%s" "$body" | SECRET="$secret" TS="$t" CID="$cid" python - <<'PY'
import hmac, hashlib, os, sys
secret = os.environ["SECRET"]
ts = os.environ["TS"]
cid = os.environ["CID"]
body = sys.stdin.read()
msg = f"{ts}.{cid}.{body}".encode("utf-8")
print(hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest())
PY
}

call_tool() {
  local endpoint="$1"; shift
  local body="$1"; shift
  local t="$(ts)"
  local s="$(sig "$t" "$CLIENT_ID" "$body" "$HMAC_SECRET")"
  echo "\n=== POST ${endpoint} ==="
  curl -sS -w "\nHTTP %{http_code}\n" -X POST \
    -H "Content-Type: application/json" \
    -H "X-Timestamp: ${t}" \
    -H "X-Client: ${CLIENT_ID}" \
    -H "X-Signature: ${s}" \
    -d "$body" \
    "${API_URL%/}/${endpoint#*/}"
}

BODY_USG=$(printf '{"customerId":"%s","params":{"periodDays":30}}' "$CUSTOMER_ID")
BODY_MIN=$(printf '{"customerId":"%s","params":{}}' "$CUSTOMER_ID")

call_tool get_customer_usage   "$BODY_USG"
call_tool get_recent_tickets   "$BODY_MIN"
call_tool get_contract_info    "$BODY_MIN"
call_tool calculate_health     "$BODY_MIN"
call_tool generate_email       "$BODY_MIN"
call_tool generate_qbr_outline "$BODY_MIN"
