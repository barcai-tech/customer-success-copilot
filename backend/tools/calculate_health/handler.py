import json
from datetime import datetime, timezone

from _shared.hmac_auth import require_hmac
from _shared.models import parse_envelope
from _shared.responses import ok, error, preflight
from _shared.db import get_usage, get_tickets, get_contract


def _score_from_usage(trend: str) -> int:
    if trend == "up":
        return 100
    if trend == "down":
        return 0
    return 50


def _score_from_tickets(open_tickets: int) -> int:
    if open_tickets <= 0:
        return 100
    if open_tickets <= 2:
        return 80
    if open_tickets <= 5:
        return 50
    return 20


def _score_from_renewal(days_until: int) -> int:
    if days_until > 180:
        return 100
    if days_until >= 60:
        return 70
    return 30


def _risk_level(score: int) -> str:
    if score >= 75:
        return "low"
    if score >= 50:
        return "medium"
    return "high"


def _handle(event):
    try:
        if event.get("httpMethod") == "OPTIONS":
            return preflight()

        require_hmac(event)
        customer_id, params = parse_envelope(event.get("body") or "")
        owner = (params or {}).get("ownerUserId") or "public"

        usage = get_usage(owner, customer_id)
        tickets = get_tickets(owner, customer_id)
        contract = get_contract(owner, customer_id)

        trend = usage.get("trend", "flat")
        open_tickets = int(tickets.get("openTickets", 0))
        renewal_date = contract.get("renewalDate")
        if not renewal_date:
            raise FileNotFoundError("Missing renewalDate")

        # Parse ISO8601, tolerate trailing 'Z'
        rd = renewal_date.replace("Z", "+00:00") if isinstance(renewal_date, str) else renewal_date
        dt = datetime.fromisoformat(rd)
        now = datetime.now(timezone.utc)
        days_until = max(0, (dt - now).days)

        usage_component = _score_from_usage(trend) * 0.45
        ticket_component = _score_from_tickets(open_tickets) * 0.35
        renewal_component = _score_from_renewal(days_until) * 0.20
        score = int(round(usage_component + ticket_component + renewal_component))

        signals = []
        signals.append("usage_up" if trend == "up" else ("usage_down" if trend == "down" else "usage_flat"))
        if open_tickets == 0:
            signals.append("no_tickets")
        elif open_tickets <= 2:
            signals.append("few_tickets")
        else:
            signals.append("many_tickets")
        if days_until < 60:
            signals.append("renewal_near")
        elif days_until > 180:
            signals.append("renewal_far")

        payload = {"score": score, "riskLevel": _risk_level(score), "signals": signals}
        return ok(payload)

    except FileNotFoundError:
        return error(404, "MISSING_DATA", "Missing data for scoring")
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
