#!/usr/bin/env bash
set -euo pipefail

WORKHUB_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARENT_ROOT="$(cd "${WORKHUB_ROOT}/.." && pwd)"
SITE="${1:-workhub.localhost}"

if [[ ! -d "${PARENT_ROOT}/frappe-bench" ]]; then
  echo "[erpnext] ERROR: missing ${PARENT_ROOT}/frappe-bench"
  exit 1
fi

echo "[erpnext] site: ${SITE}"
echo "[erpnext] bootstrap (fixtures+company+defaults+seed_mvp)…"

(
  cd "${PARENT_ROOT}/frappe-bench"
  bench --site "${SITE}" execute workhub_frappe_app.workhub_frappe_app.utils.erpnext_bootstrap.ensure_erpnext_bootstrap >/dev/null
)

echo "[erpnext] ok"
