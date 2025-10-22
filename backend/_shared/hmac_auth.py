import hashlib
import hmac
import os
import time
from typing import Dict, Tuple, Optional
import json
import base64

try:
    import boto3  # type: ignore
except Exception:  # boto3 not required for local dev
    boto3 = None


MAX_SKEW_MS = 5 * 60 * 1000  # 5 minutes


def _get_header(headers: Dict[str, str], name: str) -> str:
    if not headers:
        raise ValueError("Missing headers")
    # Case-insensitive lookup
    lower = {k.lower(): v for k, v in headers.items()}
    val = lower.get(name.lower())
    if val is None:
        raise ValueError(f"Missing header: {name}")
    return val


_SECRET_CACHE: Optional[str] = None


def sign(secret: str, timestamp_ms: str, client_id: str, raw_body: str) -> str:
    message = f"{timestamp_ms}.{client_id}.{raw_body}".encode("utf-8")
    mac = hmac.new(secret.encode("utf-8"), message, hashlib.sha256)
    return mac.hexdigest()


def _load_secret() -> str:
    global _SECRET_CACHE
    if _SECRET_CACHE:
        return _SECRET_CACHE

    # Prefer explicit env for local dev
    secret = os.environ.get("HMAC_SECRET")
    if secret:
        _SECRET_CACHE = secret
        return secret

    # Fallback: fetch from SSM if HMAC_PARAM_NAME is provided
    param_name = os.environ.get("HMAC_PARAM_NAME")
    if param_name and boto3:
        ssm = boto3.client("ssm")
        resp = ssm.get_parameter(Name=param_name, WithDecryption=True)
        value = resp.get("Parameter", {}).get("Value")
        if not value:
            raise ValueError("Server misconfigured: empty HMAC in SSM parameter")
        _SECRET_CACHE = value
        return value

    raise ValueError("Server misconfigured: HMAC secret not set (HMAC_SECRET or HMAC_PARAM_NAME)")


def verify_headers(headers: Dict[str, str], raw_body: str) -> Tuple[str, str]:
    signature = _get_header(headers, "X-Signature")
    timestamp = _get_header(headers, "X-Timestamp")
    client = _get_header(headers, "X-Client")

    secret = _load_secret()

    try:
        ts = int(timestamp)
    except Exception:
        raise ValueError("Invalid X-Timestamp")

    now_ms = int(time.time() * 1000)
    if abs(now_ms - ts) > MAX_SKEW_MS:
        raise ValueError("Expired or future timestamp")

    body_for_signing = raw_body or ""
    expected = sign(secret, timestamp, client, body_for_signing)
    if not hmac.compare_digest(expected, signature):
        # Fallback canonical JSON (compact) in case of whitespace differences
        try:
            parsed = json.loads(body_for_signing)
            canonical = json.dumps(parsed, separators=(",", ":"), ensure_ascii=False)
            expected2 = sign(secret, timestamp, client, canonical)
            if not hmac.compare_digest(expected2, signature):
                raise ValueError("Invalid signature")
        except Exception:
            raise ValueError("Invalid signature")

    return client, timestamp


def require_hmac(event: Dict) -> Tuple[str, str]:
    body = event.get("body") or ""
    if event.get("isBase64Encoded") and body:
        try:
            body = base64.b64decode(body).decode("utf-8")
        except Exception:
            pass
    headers = event.get("headers") or {}
    return verify_headers(headers, body)
