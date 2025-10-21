#!/usr/bin/env python3
import argparse
import json
import os
import time

from _shared.hmac_auth import sign


TOOLS = {
    "get_customer_usage": "tools.get_customer_usage.handler",
    "get_recent_tickets": "tools.get_recent_tickets.handler",
    "get_contract_info": "tools.get_contract_info.handler",
    "calculate_health": "tools.calculate_health.handler",
    "generate_email": "tools.generate_email.handler",
    "generate_qbr_outline": "tools.generate_qbr_outline.handler",
}


def load_handler(module_path: str):
    mod = __import__(module_path, fromlist=["handler"])
    return getattr(mod, "handler")


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

    handler = load_handler(TOOLS[args.tool])
    resp = handler(event, None)
    print(json.dumps(resp, indent=2))


if __name__ == "__main__":
    main()
