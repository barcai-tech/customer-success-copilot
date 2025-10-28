import json
from _shared.hmac_auth import require_hmac
from _shared.models import parse_envelope
from _shared.responses import ok, error, preflight
from _shared.db import get_usage, get_tickets


def _sections(trend: str, open_tickets: int) -> list:
    base = [
        "Adoption overview",
        "Support summary",
        "Roadmap alignment",
    ]
    if trend == "up":
        base.insert(1, "Highlights and value achieved")
    elif trend == "down":
        base.insert(1, "Adoption recovery plan")
    if open_tickets > 0:
        base.append("Open issues and resolution timeline")
    return base


def _handle(event):
    try:
        if event.get("httpMethod") == "OPTIONS":
            return preflight()

        require_hmac(event)
        customer_id, params = parse_envelope(event.get("body") or "")
        owner = (params or {}).get("ownerUserId") or "public"

        try:
            usage = get_usage(owner, customer_id)
            tickets = get_tickets(owner, customer_id)
        except Exception:
            # Retry once on transient errors
            try:
                usage = get_usage(owner, customer_id)
                tickets = get_tickets(owner, customer_id)
            except Exception:
                # Return safe defaults if data is missing
                usage = {"trend": "flat", "missingData": True}
                tickets = {"openTickets": 0, "missingData": True}

        trend = usage.get("trend", "flat")
        open_tickets = int(tickets.get("openTickets", 0))

        payload = {"sections": _sections(trend, open_tickets)}
        return ok(payload)

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
    import os
    import time

    os.environ.setdefault("HMAC_SECRET", "dev-secret")
    body = json.dumps({"customerId": "acme-001", "params": {}})
    ts = str(int(time.time() * 1000))
    sig = sign(os.environ["HMAC_SECRET"], ts, "local", body)
    event = {"body": body, "headers": {"X-Signature": sig, "X-Timestamp": ts, "X-Client": "local"}}
    print(handler(event, None))

