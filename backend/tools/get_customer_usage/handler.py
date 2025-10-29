import json
from _shared.hmac_auth import require_hmac
from _shared.models import parse_envelope
from _shared.responses import ok, error, preflight
from _shared.db import get_usage


def _handle(event):
    try:
        if event.get("httpMethod") == "OPTIONS":
            return preflight()

        # HMAC verify
        require_hmac(event)

        customer_id, params = parse_envelope(event.get("body") or "")
        owner = (params or {}).get("ownerUserId") or "public"

        try:
            payload = get_usage(owner, customer_id)
        except Exception as e:
            try:
                payload = get_usage(owner, customer_id)
            except Exception:
                payload = {"trend": "flat", "avgDailyUsers": 0, "sparkline": [], "missingData": True}
        print(json.dumps({"type":"TOOL_LOG","tool":"get_customer_usage","owner":owner,"customerId":customer_id,"missing":bool(payload.get("missingData"))}))
        return ok(payload)

    except FileNotFoundError:
        print(json.dumps({"type":"TOOL_LOG","tool":"get_customer_usage","error":"MISSING_DATA"}))
        return ok({"trend": "flat", "avgDailyUsers": 0, "sparkline": [], "missingData": True})
    except ValueError as ve:
        msg = str(ve)
        code = "INVALID_INPUT" if "INVALID_" in msg else "UNAUTHORIZED"
        print(json.dumps({"type":"TOOL_LOG","tool":"get_customer_usage","error":code}))
        return error(400 if code == "INVALID_INPUT" else 401, code, msg)
    except Exception as e:
        print(json.dumps({"type":"TOOL_LOG","tool":"get_customer_usage","error":"EXCEPTION","ex":type(e).__name__}))
        return error(500, "TOOL_FAILURE", f"{type(e).__name__}")


def handler(event, context):
    return _handle(event)


if __name__ == "__main__":  # simple local sanity
    from _shared.hmac_auth import sign
    import os, time

    os.environ.setdefault("HMAC_SECRET", "dev-secret")
    body = json.dumps({"customerId": "acme-001", "params": {"periodDays": 30}})
    ts = str(int(time.time() * 1000))
    sig = sign(os.environ["HMAC_SECRET"], ts, "local", body)
    event = {"body": body, "headers": {"X-Signature": sig, "X-Timestamp": ts, "X-Client": "local"}}
    print(handler(event, None))
