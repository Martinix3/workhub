#!/usr/bin/env bash
set -euo pipefail

WORKHUB_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARENT_ROOT="$(cd "${WORKHUB_ROOT}/.." && pwd)"
SITE="${1:-workhub.localhost}"

if [[ ! -d "${PARENT_ROOT}/frappe-bench" ]]; then
  echo "[frappe] ERROR: missing ${PARENT_ROOT}/frappe-bench"
  exit 1
fi

echo "[frappe] site: ${SITE}"
echo "[frappe] ensure CRM Lite (Page + Workspace Sidebar)…"

(
  cd "${PARENT_ROOT}/frappe-bench"
  bench --site "${SITE}" execute workhub_frappe_app.workhub_frappe_app.utils.crm_lite.ensure_crm_lite >/dev/null
)

echo "[frappe] ok"

