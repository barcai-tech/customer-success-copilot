import json
import os
from typing import Any, Dict

try:
    import boto3  # type: ignore
except Exception:
    boto3 = None


def get_json(bucket: str, key: str) -> Dict[str, Any]:
    if not boto3:
        raise RuntimeError("boto3 unavailable")
    s3 = boto3.client("s3")
    obj = s3.get_object(Bucket=bucket, Key=key)
    data = obj["Body"].read()
    return json.loads(data)

