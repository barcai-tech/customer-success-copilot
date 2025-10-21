#!/usr/bin/env python3
import argparse
import json
import os
import time

from _shared.hmac_auth import sign

# Import handlers statically to avoid dynamic import patterns flagged by linters/scanners.
from tools.get_customer_usage.handler import handler as get_customer_usage_handler  # noqa: E402
from tools.get_recent_tickets.handler import handler as get_recent_tickets_handler  # noqa: E402
from tools.get_contract_info.handler import handler as get_contract_info_handler  # noqa: E402
from tools.calculate_health.handler import handler as calculate_health_handler  # noqa: E402
from tools.generate_email.handler import handler as generate_email_handler  # noqa: E402
from tools.generate_qbr_outline.handler import handler as generate_qbr_outline_handler  # noqa: E402


TOOLS = {
    "get_customer_usage": get_customer_usage_handler,
    "get_recent_tickets": get_recent_tickets_handler,
    "get_contract_info": get_contract_info_handler,
    "calculate_health": calculate_health_handler,
    "generate_email": generate_email_handler,
    "generate_qbr_outline": generate_qbr_outline_handler,
}


def main():
    parser = argparse.ArgumentParser(description="Invoke a tool handler locally")
    parser.add_argument("tool", choices=TOOLS.keys())
    parser.add_argument("--customerId", required=True)
    parser.add_argument("--params", default="{}", help="JSON string for params")
    parser.add_argument("--client", default="local")
    args = parser.parse_args()

    os.environ.setdefault("HMAC_SECRET", "dev-secret")
    os.environ.setdefault("ALLOWED_ORIGIN", "http://localhost:3000")

    try:
        params = json.loads(args.params)
    except Exception:
        raise SystemExit("--params must be valid JSON, e.g., '{"'"periodDays"'":30}'")

    body = json.dumps({"customerId": args.customerId, "params": params})
    ts = str(int(time.time() * 1000))
    sig = sign(os.environ["HMAC_SECRET"], ts, args.client, body)
    event = {
        "httpMethod": "POST",
        "body": body,
        "headers": {"X-Signature": sig, "X-Timestamp": ts, "X-Client": args.client},
    }

    fn = TOOLS[args.tool]
    resp = fn(event, None)
    print(json.dumps(resp, indent=2))


if __name__ == "__main__":
    main()
