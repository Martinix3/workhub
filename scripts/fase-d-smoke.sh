#!/usr/bin/env bash
set -euo pipefail

echo "[fase-d] smoke básico…"
bash "$(dirname "${BASH_SOURCE[0]}")/smoke.sh"

site="${FRAPPE_SITE:-workhub.localhost}"
echo "[fase-d] asegurando seed ERP/stock (site=${site})…"
bash "$(dirname "${BASH_SOURCE[0]}")/erpnext-bootstrap.sh" "${site}" >/dev/null

echo "[fase-d] ventas…"
bash "$(dirname "${BASH_SOURCE[0]}")/ventas-flow-smoke.sh"

echo "[fase-d] compras…"
bash "$(dirname "${BASH_SOURCE[0]}")/compras-flow-smoke.sh"

echo "[fase-d] producción…"
bash "$(dirname "${BASH_SOURCE[0]}")/prod-flow-smoke.sh"

echo "[fase-d] ok"
