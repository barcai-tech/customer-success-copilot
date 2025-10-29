import json
import uuid
from typing import Any


def new_request_id() -> str:
    return f"req-{uuid.uuid4()}"


def pretty(obj: Any) -> str:
    return json.dumps(obj, indent=2, ensure_ascii=False)

