PROFILE ?= cs-copilot
STACK   ?= cs-copilot-backend
TEMPLATE?= sam-template.yaml
REGION  ?= ap-southeast-1

.PHONY: build buildc deploy sync-sample help clean-sam smoke-curl smoke-node
 .PHONY: layer-pydeps layer-pydeps-docker

help:
	@echo "Targets:"
	@echo "  make build           # sam build (clean)"
	@echo "  make buildc          # sam build using container"
	@echo "  make deploy          # sam deploy with saved params (samconfig.toml)"
	@echo "  make layer-pydeps    # install pure-Python deps into Lambda layer (local pip)"
	@echo "  make layer-pydeps-docker # install deps into layer using SAM python build image"
	@echo "  make sync-sample     # copy backend/sample_data to S3 (requires DATA_BUCKET=...)"
	@echo "Vars: PROFILE=$(PROFILE) STACK=$(STACK) REGION=$(REGION) TEMPLATE=$(TEMPLATE)"

# Force-clean SAM artifacts if they get stuck on macOS
clean-sam:
	chmod -R u+w .aws-sam 2>/dev/null || true
	find .aws-sam -mindepth 1 -exec rm -rf {} + 2>/dev/null || true
	rm -rf .aws-sam || true

build:
	rm -rf .aws-sam/build
	sam build -t $(TEMPLATE) --region $(REGION)

buildc:
	rm -rf .aws-sam/build
	sam build -t $(TEMPLATE) --use-container --region $(REGION)

deploy:
ifeq ($(strip $(PARAMETER_OVERRIDES)),)
	sam deploy -t $(TEMPLATE) --stack-name $(STACK) --capabilities CAPABILITY_IAM --profile $(PROFILE) --region $(REGION) --no-fail-on-empty-changeset
else
	sam deploy -t $(TEMPLATE) --stack-name $(STACK) --capabilities CAPABILITY_IAM --profile $(PROFILE) --region $(REGION) --no-fail-on-empty-changeset --parameter-overrides $(PARAMETER_OVERRIDES)
endif

sync-sample:
	@if [ -z "$(DATA_BUCKET)" ]; then echo "Set DATA_BUCKET=<your-s3-bucket>"; exit 1; fi
	aws s3 cp ../backend/sample_data/usage s3://$(DATA_BUCKET)/usage/ --recursive --profile $(PROFILE) --region $(REGION)
	aws s3 cp ../backend/sample_data/tickets s3://$(DATA_BUCKET)/tickets/ --recursive --profile $(PROFILE) --region $(REGION)
	aws s3 cp ../backend/sample_data/contract s3://$(DATA_BUCKET)/contract/ --recursive --profile $(PROFILE) --region $(REGION)

# Signed curl smoke test against deployed API.
# Usage:
#   make smoke-curl API_URL=https://xxxx.execute-api.ap-southeast-1.amazonaws.com/dev \
#                   HMAC_SECRET=... CUSTOMER_ID=acme-001 [CLIENT_ID=copilot-frontend]
smoke-curl:
	@if [ -z "$(API_URL)" ]; then echo "Set API_URL to your API Gateway base (e.g., https://.../dev)"; exit 1; fi
	@if [ -z "$(HMAC_SECRET)" ]; then echo "Set HMAC_SECRET to your shared secret"; exit 1; fi
	@if [ -z "$(CUSTOMER_ID)" ]; then echo "Set CUSTOMER_ID to e.g., acme-001"; exit 1; fi
	bash scripts/signed_curl.sh "$(API_URL)" "$(HMAC_SECRET)" "$(CUSTOMER_ID)" "$(CLIENT_ID)"

# Node-based smoke test (mirrors frontend signer exactly)
smoke-node:
	@if [ -z "$(API_URL)" ]; then echo "Set API_URL to your API Gateway base (e.g., https://.../dev)"; exit 1; fi
	@if [ -z "$(HMAC_SECRET)" ]; then echo "Set HMAC_SECRET to your shared secret"; exit 1; fi
	@if [ -z "$(CUSTOMER_ID)" ]; then echo "Set CUSTOMER_ID to e.g., acme-001"; exit 1; fi
	API_URL="$(API_URL)" HMAC_SECRET="$(HMAC_SECRET)" CUSTOMER_ID="$(CUSTOMER_ID)" CLIENT_ID="$(CLIENT_ID)" node scripts/smoke_node.mjs

# -----------------------------------------------------------------------------
# Lambda Layer dependency helpers
# -----------------------------------------------------------------------------

layer-pydeps:
	@echo "Installing pg8000 into Lambda common layer (local pip)…"
	mkdir -p layers/common/python
	python3 -m pip install -t layers/common/python pg8000==1.30.5
	@echo "Done. Rebuild and deploy to publish a new layer version."

layer-pydeps-docker:
	@echo "Installing pg8000 into Lambda common layer using SAM Python 3.12 build image…"
	mkdir -p layers/common/python
	docker run --rm -v "$$PWD/layers/common/python:/opt" public.ecr.aws/sam/build-python3.12:latest sh -c "pip install --no-cache-dir -t /opt pg8000==1.30.5"
	@echo "Done. Rebuild and deploy to publish a new layer version."
