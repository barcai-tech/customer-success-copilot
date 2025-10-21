import hashlib
import hmac
import os
import time
from typing import Dict, Tuple, Optional

try:
    import boto3  # type: ignore
except Exception:
    boto3 = None

MAX_SKEW_MS = 5 * 60 * 1000
_SECRET_CACHE: Optional[str] = None


def _get_header(headers: Dict[str, str], name: str) -> str:
    if not headers:
        raise ValueError("Missing headers")
    lower = {k.lower(): v for k, v in headers.items()}
    val = lower.get(name.lower())
    if val is None:
        raise ValueError(f"Missing header: {name}")
    return val


def sign(secret: str, timestamp_ms: str, client_id: str, raw_body: str) -> str:
    message = f"{timestamp_ms}.{client_id}.{raw_body}".encode("utf-8")
    mac = hmac.new(secret.encode("utf-8"), message, hashlib.sha256)
    return mac.hexdigest()


def _load_secret() -> str:
    global _SECRET_CACHE
    if _SECRET_CACHE:
        return _SECRET_CACHE
    secret = os.environ.get("HMAC_SECRET")
    if secret:
        _SECRET_CACHE = secret
        return secret
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
    expected = sign(secret, timestamp, client, raw_body or "")
    if not hmac.compare_digest(expected, signature):
        raise ValueError("Invalid signature")
    return client, timestamp


def require_hmac(event: Dict) -> Tuple[str, str]:
    body = event.get("body") or ""
    headers = event.get("headers") or {}
    return verify_headers(headers, body)

