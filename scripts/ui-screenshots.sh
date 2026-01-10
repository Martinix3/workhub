#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${ROOT}/.screenshots/$(date +%Y%m%d-%H%M%S)"
mkdir -p "${OUT_DIR}"

PORTAL_BASE="${PORTAL_BASE:-http://127.0.0.1:7310}"
BFF_BASE="${BFF_BASE:-http://127.0.0.1:7311}"
PROJECT_ID="${PROJECT_ID:-}"

echo "[ui] portal: ${PORTAL_BASE}"
echo "[ui] out: ${OUT_DIR}"

if ! curl -fsS "${PORTAL_BASE}/me" >/dev/null 2>&1; then
  echo "[ui] ERROR: portal not reachable at ${PORTAL_BASE}"
  echo "[ui] Tip: run \`bash workhub/scripts/up.sh\`"
  exit 1
fi

PW="npx -y playwright@1.50.1"

if ! ${PW} --version >/dev/null 2>&1; then
  echo "[ui] ERROR: could not run Playwright via npx"
  exit 1
fi

echo "[ui] ensuring browsers…"
${PW} install chromium >/dev/null

echo "[ui] capturing…"
${PW} screenshot --full-page --wait-for-selector ".page" --wait-for-timeout 1200 "${PORTAL_BASE}/me" "${OUT_DIR}/me.png"
${PW} screenshot --full-page --wait-for-selector ".page" --wait-for-timeout 1200 "${PORTAL_BASE}/people" "${OUT_DIR}/people.png"
${PW} screenshot --full-page --wait-for-selector ".page" --wait-for-timeout 1200 "${PORTAL_BASE}/projects" "${OUT_DIR}/projects.png"
${PW} screenshot --full-page --wait-for-selector ".moduleShell" --wait-for-timeout 1200 "${PORTAL_BASE}/erp" "${OUT_DIR}/erp.png"

if [ -z "${PROJECT_ID}" ]; then
  if curl -fsS "${BFF_BASE}/api/projects?department=ALL" >/dev/null 2>&1; then
    TMP_JSON="$(mktemp)"
    curl -fsS "${BFF_BASE}/api/projects?department=ALL" >"${TMP_JSON}" || true
    PROJECT_ID="$(TMP_JSON="${TMP_JSON}" python3 - <<'PY'
import json,os,sys
path=os.environ.get("TMP_JSON","")
try:
  with open(path,"r",encoding="utf-8") as f:
    data=json.load(f)
  projects=data.get("projects") or []
  if projects:
    sys.stdout.write(str(projects[0].get("id") or ""))
except Exception:
  pass
PY
)"
    rm -f "${TMP_JSON}" || true
  fi
fi

if [ -n "${PROJECT_ID}" ]; then
  echo "[ui] project: ${PROJECT_ID}"
  ${PW} screenshot --full-page --wait-for-selector ".page" --wait-for-timeout 1200 "${PORTAL_BASE}/projects/${PROJECT_ID}" "${OUT_DIR}/project-${PROJECT_ID}.png"
  ${PW} screenshot --full-page --wait-for-selector ".modal" --wait-for-timeout 1200 "${PORTAL_BASE}/projects/${PROJECT_ID}?task=first" "${OUT_DIR}/project-${PROJECT_ID}-modal.png"
else
  echo "[ui] project: skipped (no PROJECT_ID)"
fi

echo "[ui] done"
echo "[ui] ${OUT_DIR}/me.png"
echo "[ui] ${OUT_DIR}/people.png"
echo "[ui] ${OUT_DIR}/projects.png"
echo "[ui] ${OUT_DIR}/erp.png"
