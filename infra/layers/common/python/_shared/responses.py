import json
import os
from typing import Any, Dict


def _cors_headers() -> Dict[str, str]:
    origin = os.environ.get("ALLOWED_ORIGIN", "http://localhost:3000")
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type,X-Signature,X-Timestamp,X-Client",
        "Vary": "Origin",
        "Content-Type": "application/json",
    }


def ok(data):
    return {
        "statusCode": 200,
        "headers": _cors_headers(),
        "body": json.dumps({"ok": True, "data": data, "error": None}),
    }


def error(status_code: int, code: str, message: str):
    return {
        "statusCode": status_code,
        "headers": _cors_headers(),
        "body": json.dumps({"ok": False, "data": None, "error": {"code": code, "message": message}}),
    }


def preflight():
    return {"statusCode": 204, "headers": _cors_headers(), "body": ""}

