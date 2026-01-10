#!/usr/bin/env bash
set -euo pipefail

WORKHUB_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARENT_ROOT="$(cd "${WORKHUB_ROOT}/.." && pwd)"
SITE="${1:-workhub.localhost}"

if [[ ! -d "${PARENT_ROOT}/frappe-bench" ]]; then
  echo "[frappe] ERROR: missing ${PARENT_ROOT}/frappe-bench"
  exit 1
fi

echo "[frappe] bench: ${PARENT_ROOT}/frappe-bench"
echo "[frappe] site:  ${SITE}"
echo "[frappe] migrando…"

(
  cd "${PARENT_ROOT}/frappe-bench"
  bench --site "${SITE}" migrate
  bench --site "${SITE}" clear-cache
)

echo "[frappe] ok"

