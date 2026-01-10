#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARENT_ROOT="$(cd "${ROOT}/.." && pwd)"
OUT_DIR="${ROOT}/.backups/verify-$(date +%Y%m%d-%H%M%S)"
mkdir -p "${OUT_DIR}"

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

LE_ENV="${PARENT_ROOT}/leantime-master/.docker/workhub.env"
MYSQL_ROOT_PASSWORD="$(env_get "${LE_ENV}" MYSQL_ROOT_PASSWORD)"
MYSQL_DATABASE="$(env_get "${LE_ENV}" MYSQL_DATABASE)"
MYSQL_CONTAINER="mysql_leantime"
TEST_DB="workhub_restore_test_$(date +%s)"

echo "[verify] out: ${OUT_DIR}"
echo "[verify] mysql: ${MYSQL_CONTAINER} db=${MYSQL_DATABASE}"

if ! docker info >/dev/null 2>&1; then
  echo "[verify] ERROR: Docker daemon not running"
  exit 1
fi
if ! docker ps --format '{{.Names}}' | grep -q "^${MYSQL_CONTAINER}$"; then
  echo "[verify] ERROR: container ${MYSQL_CONTAINER} not running"
  exit 1
fi

mkdir -p "${OUT_DIR}/leantime"
echo "[verify] dump…"
docker exec -i "${MYSQL_CONTAINER}" sh -lc \
  "mysqldump -u root -p\"${MYSQL_ROOT_PASSWORD}\" --single-transaction --routines --events \"${MYSQL_DATABASE}\"" \
  >"${OUT_DIR}/leantime/leantime.sql"

echo "[verify] restore into temp db: ${TEST_DB}…"
docker exec -i "${MYSQL_CONTAINER}" sh -lc "mysql -u root -p\"${MYSQL_ROOT_PASSWORD}\" -e \"CREATE DATABASE ${TEST_DB};\""
docker exec -i "${MYSQL_CONTAINER}" sh -lc "mysql -u root -p\"${MYSQL_ROOT_PASSWORD}\" \"${TEST_DB}\"" <"${OUT_DIR}/leantime/leantime.sql"

echo "[verify] sanity check…"
TABLES="$(docker exec -i "${MYSQL_CONTAINER}" sh -lc "mysql -u root -p\"${MYSQL_ROOT_PASSWORD}\" -N -e \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${TEST_DB}';\"")"
echo "[verify] tables_in_restored_db=${TABLES}"
if [[ "${TABLES}" -lt 10 ]]; then
  echo "[verify] ERROR: restored db looks empty"
  exit 1
fi

echo "[verify] cleanup…"
docker exec -i "${MYSQL_CONTAINER}" sh -lc "mysql -u root -p\"${MYSQL_ROOT_PASSWORD}\" -e \"DROP DATABASE ${TEST_DB};\""

echo "[verify] ok"
echo "[verify] ${OUT_DIR}"
