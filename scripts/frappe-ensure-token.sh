#!/usr/bin/env bash
set -euo pipefail

WORKHUB_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARENT_ROOT="$(cd "${WORKHUB_ROOT}/.." && pwd)"
SITE="${1:-workhub.localhost}"

if [[ ! -d "${PARENT_ROOT}/frappe-bench" ]]; then
  echo "[frappe] ERROR: missing ${PARENT_ROOT}/frappe-bench"
  exit 1
fi

ENV_PATH="${WORKHUB_ROOT}/.env"

echo "[frappe] site: ${SITE}"
echo "[frappe] actualizando FRAPPE_API_TOKEN en ${ENV_PATH}…"

(
  cd "${PARENT_ROOT}/frappe-bench"
  bench --site "${SITE}" execute workhub_frappe_app.workhub_frappe_app.utils.integration.ensure_frappe_api_token --kwargs "{\"env_path\": \"${ENV_PATH}\", \"user\": \"Administrator\"}" >/dev/null
)

echo "[frappe] ok (token actualizado)."
echo "[workhub] recreando contenedores (bff+sync) para recargar .env…"

if docker info >/dev/null 2>&1; then
  (
    cd "${WORKHUB_ROOT}"
    docker compose up -d --force-recreate --no-deps bff sync >/dev/null
  )
  echo "[workhub] ok"
else
  echo "[workhub] aviso: Docker no está corriendo; reinicia el stack cuando puedas."
fi
