VENV_DIR := .venv
# Prefer Python 3.12 (see .python-version); allow override: make PYTHON=python3
PYTHON ?= python3.12
PY := $(VENV_DIR)/bin/python
PIP := $(VENV_DIR)/bin/pip
CID ?= acme-001
PARAMS ?= {}

.PHONY: venv install clean

venv:
	$(PYTHON) -m venv $(VENV_DIR) || python3 -m venv $(VENV_DIR)
	@echo "Run: source $(VENV_DIR)/bin/activate"

install: venv
	$(PIP) install -r requirements.txt || echo "Skipping installs (offline?)"

clean:
	rm -rf $(VENV_DIR)
	find . -name '__pycache__' -type d -prune -exec rm -rf {} +

.PHONY: run smoke

# Run a single tool locally (uses sample_data fallback)
# Usage: make run TOOL=get_customer_usage CID=acme-001 PARAMS='{"periodDays":30}'
run:
	@if [ -z "$(TOOL)" ]; then echo "Set TOOL=<toolname> (e.g., get_customer_usage)"; exit 1; fi
	$(PY) invoke_local.py $(TOOL) --customerId $(CID) --params '$(PARAMS)'

# Exercise all tools locally for a given customerId
smoke:
	$(PY) invoke_local.py get_customer_usage --customerId $(CID) --params '{"periodDays":30}'
	$(PY) invoke_local.py get_recent_tickets --customerId $(CID)
	$(PY) invoke_local.py get_contract_info --customerId $(CID)
	$(PY) invoke_local.py calculate_health --customerId $(CID)
	$(PY) invoke_local.py generate_email --customerId $(CID)
	$(PY) invoke_local.py generate_qbr_outline --customerId $(CID)
