import json
from _shared.hmac_auth import require_hmac
from _shared.models import parse_envelope
from _shared.responses import ok, error, preflight
from _shared.db import get_contract


def _handle(event):
    try:
        if event.get("httpMethod") == "OPTIONS":
            return preflight()

        require_hmac(event)
        customer_id, params = parse_envelope(event.get("body") or "")
        owner = (params or {}).get("ownerUserId") or "public"
        payload = get_contract(owner, customer_id)
        return ok(payload)

    except FileNotFoundError:
        return error(404, "MISSING_DATA", "Contract data not found")
    except ValueError as ve:
        msg = str(ve)
        code = "INVALID_INPUT" if "INVALID_" in msg else "UNAUTHORIZED"
        return error(400 if code == "INVALID_INPUT" else 401, code, msg)
    except Exception as e:
        return error(500, "TOOL_FAILURE", f"{type(e).__name__}")


def handler(event, context):
    return _handle(event)


if __name__ == "__main__":
    from _shared.hmac_auth import sign
    import os, time

    os.environ.setdefault("HMAC_SECRET", "dev-secret")
    body = json.dumps({"customerId": "acme-001", "params": {}})
    ts = str(int(time.time() * 1000))
    sig = sign(os.environ["HMAC_SECRET"], ts, "local", body)
    event = {"body": body, "headers": {"X-Signature": sig, "X-Timestamp": ts, "X-Client": "local"}}
    print(handler(event, None))
