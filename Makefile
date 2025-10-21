# Repo-level Makefile helpers

SNYK ?= snyk
SEVERITY ?= medium
EXCLUDES ?= infra/.aws-sam,frontend/node_modules,frontend/.next,frontend/out,backend/.venv
CODE_PATH ?= .
ORG ?=
SNYK_ARGS ?=

.PHONY: help snyk-code snyk-oss snyk-oss-backend snyk-oss-frontend snyk-iac

help:
	@echo "Targets:"
	@echo "  make snyk-code          # Snyk Code scan with excludes"
	@echo "  make snyk-oss           # Snyk Open Source (backend + frontend)"
	@echo "  make snyk-oss-backend   # Backend requirements.txt scan"
	@echo "  make snyk-oss-frontend  # Frontend package.json scan"
	@echo "  make snyk-iac           # Snyk IaC on SAM template"
	@echo "Vars: SNYK='$(SNYK)' SEVERITY=$(SEVERITY) EXCLUDES=$(EXCLUDES)"

# Snyk Code (static analysis). Respects .dcignore; add explicit excludes too.
snyk-code:
	$(SNYK) code test $(CODE_PATH) --severity-threshold=$(SEVERITY) --exclude="$(EXCLUDES)" $(if $(ORG),--org $(ORG),) $(SNYK_ARGS) || true

# Snyk Open Source: backend (pip) + frontend (npm). Use --skip-unresolved to avoid local install.
snyk-oss: snyk-oss-backend snyk-oss-frontend

snyk-oss-backend:
	$(SNYK) test --file=backend/requirements.txt --package-manager=pip --skip-unresolved $(if $(ORG),--org $(ORG),) $(SNYK_ARGS) || true

snyk-oss-frontend:
	$(SNYK) test --file=frontend/package.json --package-manager=npm --skip-unresolved $(if $(ORG),--org $(ORG),) $(SNYK_ARGS) || true

# Snyk IaC: scan the SAM template
snyk-iac:
	$(SNYK) iac test infra/sam-template.yaml $(if $(ORG),--org $(ORG),) $(SNYK_ARGS) || true
