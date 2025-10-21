import json
import os
from typing import Any, Dict

try:
    import boto3  # type: ignore
    from botocore.exceptions import ClientError  # type: ignore
except Exception:  # boto3 may not be available locally
    boto3 = None
    ClientError = Exception


def _read_local_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_json(bucket: str, key: str) -> Dict[str, Any]:
    if not boto3:
        raise RuntimeError("boto3 unavailable")
    s3 = boto3.client("s3")
    obj = s3.get_object(Bucket=bucket, Key=key)
    data = obj["Body"].read()
    return json.loads(data)


def get_json_with_fallback(key: str) -> Dict[str, Any]:
    """
    Try S3 first if DATA_BUCKET is set, otherwise fall back to sample_data.
    key is like: "usage/acme-001.json"
    """
    bucket = os.environ.get("DATA_BUCKET")
    if bucket:
        try:
            return get_json(bucket, key)
        except Exception:
            # fall back to local if S3 unavailable or object missing
            pass
    base = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sample_data")
    path = os.path.join(base, key)
    return _read_local_json(path)

