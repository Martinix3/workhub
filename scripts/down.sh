#!/usr/bin/env bash
set -euo pipefail

WORKHUB_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARENT_ROOT="$(cd "${WORKHUB_ROOT}/.." && pwd)"
PIDS_DIR="${WORKHUB_ROOT}/.pids"

stop_pidfile() {
  local name="${1}"
  local pidfile="${2}"
  if [[ ! -f "${pidfile}" ]]; then
    echo "[${name}] not running (no pidfile)"
    return 0
  fi
  local pid
  pid="$(cat "${pidfile}" 2>/dev/null || true)"
  rm -f "${pidfile}"
  if [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1; then
    echo "[${name}] stopping (pid ${pid})…"
    kill "${pid}" >/dev/null 2>&1 || true
  else
    echo "[${name}] not running"
  fi
}

echo "[workhub] stopping…"

if docker info >/dev/null 2>&1; then
  echo "[workhub] docker compose down…"
  (
    cd "${WORKHUB_ROOT}"
    docker compose down || true
  )

  echo "[leantime] docker compose down…"
  if [[ -f "${PARENT_ROOT}/leantime-master/.docker/docker-compose.yml" ]]; then
    (
      cd "${PARENT_ROOT}/leantime-master/.docker"
      docker compose down || true
    )
  elif [[ -d "${PARENT_ROOT}/leantime-master/.dev" ]]; then
    (
      cd "${PARENT_ROOT}/leantime-master/.dev"
      docker compose down || true
    )
  else
    echo "[leantime] skipped: missing leantime-master"
  fi
else
  echo "[docker] skipped: daemon not running"
fi

stop_pidfile "frappe-bench" "${PIDS_DIR}/frappe-bench.pid"

echo "[workhub] done."
