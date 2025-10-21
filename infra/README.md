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
- `HmacSecretParam` — SSM parameter name for the HMAC secret (e.g., `/copilot/hmac/v1`)
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
- `HmacSecretParam`: /copilot/hmac/v1
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
- HMAC secret is provided from SSM Parameter Store and must match the frontend server action signer.

