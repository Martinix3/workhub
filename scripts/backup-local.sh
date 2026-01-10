#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARENT_ROOT="$(cd "${ROOT}/.." && pwd)"
OUT_DIR="${ROOT}/.backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "${OUT_DIR}"

echo "[backup] out: ${OUT_DIR}"

if docker info >/dev/null 2>&1; then
  echo "[backup] docker logs (workhub)…"
  mkdir -p "${OUT_DIR}/logs"
  (cd "${ROOT}" && docker compose logs --no-color >"${OUT_DIR}/logs/workhub.log" || true)
  (cd "${PARENT_ROOT}/leantime-master/.docker" && docker compose logs --no-color >"${OUT_DIR}/logs/leantime.log" || true)
fi

echo "[backup] sync status…"
mkdir -p "${OUT_DIR}/ops"
if docker info >/dev/null 2>&1; then
  (cd "${ROOT}" && docker compose exec -T bff sh -lc 'cat /ops_state/sync_status.json 2>/dev/null || true' >"${OUT_DIR}/ops/sync_status.json" || true)
fi

env_get() {
  local file="${1}"
  local key="${2}"
  [[ -f "${file}" ]] || { echo ""; return 0; }
  local value
  value="$(
    awk -v k="${key}" '
      /^[[:space:]]*#/ { next }
      /^[[:space:]]*$/ { next }
      {
        line=$0
        idx=index(line, "=")
        if (idx == 0) next
        kk=substr(line, 1, idx-1)
        vv=substr(line, idx+1)
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", kk)
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", vv)
        if (kk == k) { print vv; exit }
      }
    ' "${file}"
  )"
  if [[ "${value}" == \"*\" && "${value}" == *\" ]]; then
    value="${value:1:${#value}-2}"
  fi
  printf "%s" "${value}"
}

echo "[backup] leantime mysql dump…"
LE_ENV="${PARENT_ROOT}/leantime-master/.docker/workhub.env"
MYSQL_ROOT_PASSWORD="$(env_get "${LE_ENV}" MYSQL_ROOT_PASSWORD)"
MYSQL_DATABASE="$(env_get "${LE_ENV}" MYSQL_DATABASE)"
MYSQL_CONTAINER="mysql_leantime"

if docker info >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "^${MYSQL_CONTAINER}$"; then
  mkdir -p "${OUT_DIR}/leantime"
  docker exec -i "${MYSQL_CONTAINER}" sh -lc \
    "mysqldump -u root -p\"${MYSQL_ROOT_PASSWORD}\" --single-transaction --routines --events \"${MYSQL_DATABASE}\"" \
    >"${OUT_DIR}/leantime/leantime.sql"
  gzip -f "${OUT_DIR}/leantime/leantime.sql"
  echo "[backup] leantime ok: ${OUT_DIR}/leantime/leantime.sql.gz"
else
  echo "[backup] leantime skipped: container ${MYSQL_CONTAINER} not running"
fi

echo "[backup] frappe backup…"
BENCH_DIR="${PARENT_ROOT}/frappe-bench"
SITE="${FRAPPE_SITE:-workhub.localhost}"
if [[ -d "${BENCH_DIR}" ]]; then
  # bench writes into sites/<site>/private/backups
  bash -lc "cd \"${BENCH_DIR}\" && bench --site \"${SITE}\" backup --with-files" || true
  SRC_DIR="${BENCH_DIR}/sites/${SITE}/private/backups"
  if [[ -d "${SRC_DIR}" ]]; then
    mkdir -p "${OUT_DIR}/frappe"
    ls -1t "${SRC_DIR}" | head -n 6 | while read -r f; do
      [[ -n "${f}" ]] || continue
      cp -f "${SRC_DIR}/${f}" "${OUT_DIR}/frappe/${f}" || true
    done
    echo "[backup] frappe copied: ${OUT_DIR}/frappe/"
  else
    echo "[backup] frappe skipped: no backups dir ${SRC_DIR}"
  fi
else
  echo "[backup] frappe skipped: missing ${BENCH_DIR}"
fi

echo "[backup] done"
echo "[backup] ${OUT_DIR}"
