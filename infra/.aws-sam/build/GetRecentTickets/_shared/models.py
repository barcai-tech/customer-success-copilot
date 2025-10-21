import json
from typing import Any, Dict, Tuple


def parse_envelope(raw_body: str) -> Tuple[str, Dict[str, Any]]:
    try:
        body = json.loads(raw_body or "{}")
    except Exception:
        raise ValueError("INVALID_JSON")
    if not isinstance(body, dict):
        raise ValueError("INVALID_INPUT")
    customer_id = body.get("customerId")
    params = body.get("params", {})
    if not isinstance(customer_id, str) or not customer_id:
        raise ValueError("INVALID_INPUT: customerId")
    if not isinstance(params, dict):
        raise ValueError("INVALID_INPUT: params")
    return customer_id, params

