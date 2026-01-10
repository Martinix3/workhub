#!/usr/bin/env bash
set -euo pipefail

WORKHUB_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARENT_ROOT="$(cd "${WORKHUB_ROOT}/.." && pwd)"
PIDS_DIR="${WORKHUB_ROOT}/.pids"
mkdir -p "${PIDS_DIR}"

free_port() {
  local port="${1}"
  # Never kill Docker Desktop's port forwarder (`com.docke`) – it may break the daemon.
  local lines=""
  lines="$(lsof -nP -iTCP:"${port}" -sTCP:LISTEN 2>/dev/null | tail -n +2 || true)"
  if [[ -z "${lines}" ]]; then
    return 0
  fi

  local kill_pids=()
  while IFS= read -r line; do
    [[ -z "${line}" ]] && continue
    local cmd pid
    cmd="$(awk '{print $1}' <<<"${line}")"
    pid="$(awk '{print $2}' <<<"${line}")"
    [[ -z "${pid}" ]] && continue
    # Only kill local dev servers (node/python); leave docker port forwarders alone.
    if [[ "${cmd}" == "com.docke"* ]] || [[ "${cmd}" == "Docker"* ]]; then
      continue
    fi
    if [[ "${cmd}" == "node" ]] || [[ "${cmd}" == "python" ]] || [[ "${cmd}" == "python3" ]]; then
      kill_pids+=("${pid}")
    fi
  done <<<"${lines}"

  if [[ ${#kill_pids[@]} -gt 0 ]]; then
    echo "[ports] freeing ${port} (kill: ${kill_pids[*]})"
    kill "${kill_pids[@]}" >/dev/null 2>&1 || true
    sleep 0.2
  fi
}

env_get() {
  local key="${1}"
  python3 - <<'PY' "${WORKHUB_ROOT}/.env" "${key}"
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
key = sys.argv[2]
if not path.exists():
    print("")
    raise SystemExit(0)

for line in path.read_text(errors="replace").splitlines():
    if not line.strip() or line.lstrip().startswith("#"):
        continue
    m = re.match(r"^\s*([^=]+?)\s*=\s*(.*)\s*$", line)
    if not m:
        continue
    k, v = m.group(1).strip(), m.group(2).strip()
    if k != key:
        continue
    # strip simple quotes
    if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
        v = v[1:-1]
    print(v)
    raise SystemExit(0)

print("")
PY
}

is_running_pid() {
  local pid="${1}"
  [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1
}

start_bg() {
  local name="${1}"
  local log="${2}"
  local pidfile="${3}"
  shift 3

  if [[ -f "${pidfile}" ]]; then
    local old_pid
    old_pid="$(cat "${pidfile}" 2>/dev/null || true)"
    if [[ -n "${old_pid}" ]] && is_running_pid "${old_pid}"; then
      echo "[${name}] already running (pid ${old_pid})"
      return 0
    fi
    rm -f "${pidfile}"
  fi

  echo "[${name}] starting… (logs: ${log})"
  nohup "$@" >"${log}" 2>&1 &
  local pid=$!
  echo "${pid}" >"${pidfile}"
  sleep 0.2
  if ! is_running_pid "${pid}"; then
    echo "[${name}] ERROR: exited immediately (check ${log})"
    tail -n 30 "${log}" || true
    return 1
  fi
}

echo "[workhub] root: ${WORKHUB_ROOT}"

# Avoid confusion: if something else is already listening on canonical ports, kill it.
free_port 7310
free_port 7311

FRAPPE_MODE="$(env_get FRAPPE_MODE)"
LEANTIME_MODE="$(env_get LEANTIME_MODE)"
FRAPPE_API_TOKEN="$(env_get FRAPPE_API_TOKEN)"
LEANTIME_API_KEY="$(env_get LEANTIME_API_KEY)"
LEANTIME_OWNER_KEY="$(env_get LEANTIME_OWNER_KEY)"

if [[ "${FRAPPE_MODE}" == "live" ]] && [[ -z "${FRAPPE_API_TOKEN}" ]]; then
  echo "[workhub] ERROR: FRAPPE_MODE=live but FRAPPE_API_TOKEN is empty in workhub/.env"
  exit 1
fi
if [[ "${LEANTIME_MODE}" == "live" ]] && [[ -z "${LEANTIME_API_KEY}" ]] && [[ -z "${LEANTIME_OWNER_KEY}" ]]; then
  echo "[workhub] ERROR: LEANTIME_MODE=live but LEANTIME_API_KEY/LEANTIME_OWNER_KEY is empty in workhub/.env"
  exit 1
fi

echo "[frappe] starting (7312)…"
if [[ -d "${PARENT_ROOT}/frappe-bench" ]]; then
  start_bg \
    "frappe" \
    "${PARENT_ROOT}/frappe-bench/logs/workhub-bench.log" \
    "${PIDS_DIR}/frappe-bench.pid" \
    bash -lc "cd \"${PARENT_ROOT}/frappe-bench\" && bench serve --port 7312 --noreload"
else
  echo "[frappe] skipped: missing ${PARENT_ROOT}/frappe-bench"
fi

echo "[leantime] starting (7313)…"
if ! docker info >/dev/null 2>&1; then
  echo "[leantime] skipped: Docker daemon not running (open Docker Desktop)"
else
  # Prefer the official Docker image (fast, no composer build) if available.
  if [[ -f "${PARENT_ROOT}/leantime-master/.docker/docker-compose.yml" ]]; then
    # If an older dev container is occupying the canonical port, stop it.
    if docker ps --format '{{.Names}}' | grep -q '^leantime-dev$'; then
      echo "[leantime] stopping legacy leantime-dev (to free 7313)…"
      docker stop leantime-dev >/dev/null 2>&1 || true
    fi
    (
      cd "${PARENT_ROOT}/leantime-master/.docker"
      docker compose up -d
    )
  elif [[ -d "${PARENT_ROOT}/leantime-master/.dev" ]]; then
    (
      cd "${PARENT_ROOT}/leantime-master/.dev"
      docker compose up -d
    )
  else
    echo "[leantime] skipped: missing ${PARENT_ROOT}/leantime-master/.docker and .dev"
  fi
fi

echo "[workhub] starting (portal+bff+sync)…"
if ! docker info >/dev/null 2>&1; then
  echo "[workhub] ERROR: Docker daemon not running (open Docker Desktop)"
  exit 1
fi
(
  cd "${WORKHUB_ROOT}"
  docker compose up -d --build --force-recreate
)

echo
echo "[workhub] URLs"
echo "- Portal:   http://localhost:7310/me"
echo "- BFF:      http://localhost:7311/health"
echo "- Frappe:   http://localhost:7312"
echo "- Leantime: http://localhost:7313"
