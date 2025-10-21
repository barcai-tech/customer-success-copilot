import json
from datetime import datetime, timezone

from _shared.hmac_auth import require_hmac
from _shared.models import parse_envelope
from _shared.responses import ok, error, preflight
from _shared.s3util import get_json_with_fallback


def _compose_subject(customer_id: str) -> str:
    return f"Renewal Alignment with {customer_id.replace('-', ' ').title()}"


def _compose_body(customer_id: str, trend: str, open_tickets: int, renewal_date: str) -> str:
    rd = renewal_date.replace("Z", "+00:00") if isinstance(renewal_date, str) else renewal_date
    dt = datetime.fromisoformat(rd)
    when = dt.strftime("%b %d, %Y")
    trend_txt = {
        "up": "Your adoption trend looks strong in the past period.",
        "down": "We noticed a dip in recent adoption; let’s review together.",
        "flat": "Adoption has been steady; we’ll review opportunities to increase value.",
    }.get(trend, "Adoption looks steady.")

    tickets_txt = (
        "No open support tickets right now."
        if open_tickets == 0
        else (f"{open_tickets} open support ticket(s) at the moment.")
    )

    return (
        f"Hi team,\n\n"
        f"Ahead of your renewal on {when}, I wanted to share a quick status and align on next steps.\n\n"
        f"- {trend_txt}\n"
        f"- {tickets_txt}\n\n"
        f"Proposed next steps:\n"
        f"1) Confirm priority outcomes for the next quarter\n"
        f"2) Schedule a renewal prep call\n"
        f"3) Review enablement resources to support broader adoption\n\n"
        f"Would early next week work for a 30-minute call?\n\n"
        f"Best,\nCustomer Success Copilot"
    )


def _handle(event):
    try:
        if event.get("httpMethod") == "OPTIONS":
            return preflight()

        require_hmac(event)
        customer_id, _params = parse_envelope(event.get("body") or "")

        usage = get_json_with_fallback(f"usage/{customer_id}.json")
        tickets = get_json_with_fallback(f"tickets/{customer_id}.json")
        contract = get_json_with_fallback(f"contract/{customer_id}.json")

        trend = usage.get("trend", "flat")
        open_tickets = int(tickets.get("openTickets", 0))
        renewal_date = contract.get("renewalDate")
        if not renewal_date:
            raise FileNotFoundError("Missing renewalDate")

        payload = {
            "subject": _compose_subject(customer_id),
            "body": _compose_body(customer_id, trend, open_tickets, renewal_date),
        }
        return ok(payload)

    except FileNotFoundError:
        return error(404, "MISSING_DATA", "Missing data for email composition")
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
