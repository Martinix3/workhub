#!/usr/bin/env bash
set -euo pipefail

check() {
  local name="${1}"
  local url="${2}"
  if curl -4 -fsS "${url}" >/dev/null 2>&1; then
    echo "[ok]   ${name} ${url}"
  else
    echo "[fail] ${name} ${url}"
    return 1
  fi
}

echo "[smoke] checking canonical ports…"
check "portal" "http://127.0.0.1:7310/"
check "bff" "http://127.0.0.1:7311/health"
check "frappe" "http://127.0.0.1:7312/"
check "leantime" "http://127.0.0.1:7313/"

echo "[smoke] done."
