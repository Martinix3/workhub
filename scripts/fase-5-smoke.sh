#!/usr/bin/env bash
set -euo pipefail

echo "[fase-5] smoke básico…"
bash "$(dirname "${BASH_SOURCE[0]}")/smoke.sh"

echo "[fase-5] idempotencia (projects/tasks)…"
bash "$(dirname "${BASH_SOURCE[0]}")/idempotency-smoke.sh"

echo "[fase-5] idempotencia (time/log)…"
bash "$(dirname "${BASH_SOURCE[0]}")/time-idempotency-smoke.sh"

echo "[fase-5] fase 1 (PM)…"
bash "$(dirname "${BASH_SOURCE[0]}")/fase-1-smoke.sh"

echo "[fase-5] fase D (ERP)…"
bash "$(dirname "${BASH_SOURCE[0]}")/fase-d-smoke.sh"

echo "[fase-5] ok"

