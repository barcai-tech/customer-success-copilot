# Infra — AWS SAM Deployment

This folder contains an AWS SAM template to deploy all backend tools as Lambda functions behind API Gateway with HMAC verification and optional S3 access.

---

## Prerequisites

- AWS account/credentials configured (default profile or set `AWS_PROFILE`)
- AWS SAM CLI installed (`sam --version`)
- Python 3.12 available for SAM build
- SSM Parameter Store entry containing your HMAC secret, e.g. `/copilot/hmac/v1`
- (Optional) S3 bucket with data JSON files if not using local sample_data

---

## Parameters

- `StageName` — API stage (e.g., `dev`)
- `AllowedOrigin` — CORS allowlist origin (e.g., `https://cs-copilot.barcai-tech.com` or `http://localhost:3000` for dev)
- `HmacParamName` — SSM Parameter name for HMAC secret (e.g., `/copilot/hmac/v1`). Store as SecureString. Lambdas fetch it at runtime.
- `DataBucket` — Optional S3 bucket name for JSON data. Leave blank to disable S3 policy.

---

## Deploy (first time)

```sh
cd infra
sam build
sam deploy --guided \
  --stack-name cs-copilot-backend \
  --capabilities CAPABILITY_IAM
```

When prompted, provide:

- `StageName`: dev
- `AllowedOrigin`: http://localhost:3000 (or your frontend domain)
- `HmacParamName`: /copilot/hmac/v1
- `DataBucket`: <your-bucket-or-empty>

SAM writes these to `samconfig.toml` for future runs.

---

## Update

```sh
sam build && sam deploy
```

---

## Outputs

- `ApiUrl` — Base URL for API Gateway. Use this as `BACKEND_BASE_URL` in the frontend.

---

## Notes

- Each function sets CORS headers itself; the API also enables CORS for OPTIONS.
- If `DataBucket` is empty, functions will use local `sample_data` fallback — not available in Lambda. Set `DataBucket` for real data.
- Lambdas fetch HMAC from SSM via `HMAC_PARAM_NAME`. Ensure the execution role has `ssm:GetParameter` permission for that parameter. If the parameter uses a customer-managed KMS key, grant decrypt permissions as needed.

---

## Makefile Shortcuts

From `infra/` you can use:

```sh
# Build and deploy with defaults in Makefile
make build              # or: make buildc (container build)
make deploy PROFILE=cs-copilot REGION=ap-southeast-1

# Sync sample data to S3
make sync-sample PROFILE=cs-copilot REGION=ap-southeast-1 DATA_BUCKET=barcai-cs-success-copilot
```

Variables:

- `PROFILE` — AWS CLI profile (default `cs-copilot`)
- `STACK` — Stack name (default `cs-copilot-backend`)
- `REGION` — Region (default `ap-southeast-1`)
- `TEMPLATE` — SAM template (default `sam-template.yaml`)
- `DATA_BUCKET` — Required for `sync-sample`
