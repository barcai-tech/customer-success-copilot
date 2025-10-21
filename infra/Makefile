PROFILE ?= cs-copilot
STACK   ?= cs-copilot-backend
TEMPLATE?= sam-template.yaml
REGION  ?= ap-southeast-1

.PHONY: build buildc deploy sync-sample help

help:
	@echo "Targets:"
	@echo "  make build           # sam build (clean)"
	@echo "  make buildc          # sam build using container"
	@echo "  make deploy          # sam deploy with saved params (samconfig.toml)"
	@echo "  make sync-sample     # copy backend/sample_data to S3 (requires DATA_BUCKET=...)"
	@echo "Vars: PROFILE=$(PROFILE) STACK=$(STACK) REGION=$(REGION) TEMPLATE=$(TEMPLATE)"

build:
	rm -rf .aws-sam/build
	sam build -t $(TEMPLATE) --region $(REGION)

buildc:
	rm -rf .aws-sam/build
	sam build -t $(TEMPLATE) --use-container --region $(REGION)

deploy:
	sam deploy -t $(TEMPLATE) --stack-name $(STACK) --capabilities CAPABILITY_IAM --profile $(PROFILE) --region $(REGION)

sync-sample:
	@if [ -z "$(DATA_BUCKET)" ]; then echo "Set DATA_BUCKET=<your-s3-bucket>"; exit 1; fi
	aws s3 cp ../backend/sample_data/usage s3://$(DATA_BUCKET)/usage/ --recursive --profile $(PROFILE) --region $(REGION)
	aws s3 cp ../backend/sample_data/tickets s3://$(DATA_BUCKET)/tickets/ --recursive --profile $(PROFILE) --region $(REGION)
	aws s3 cp ../backend/sample_data/contract s3://$(DATA_BUCKET)/contract/ --recursive --profile $(PROFILE) --region $(REGION)
