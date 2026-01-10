#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! curl -4 -fsS "http://127.0.0.1:7311/health" >/dev/null 2>&1; then
  echo "[idem] ERROR: BFF no responde en http://127.0.0.1:7311/health"
  exit 1
fi

tmp1="$(mktemp)"
tmp2="$(mktemp)"
tmp3="$(mktemp)"
tmp4="$(mktemp)"
trap 'rm -f "${tmp1}" "${tmp2}" "${tmp3}" "${tmp4}"' EXIT

ts="$(date +%s)"

echo "[idem] /api/tasks (doble POST con misma x-idempotency-key)…"
key_tasks="idem-tasks-${ts}-${RANDOM}"
payload_tasks="$(cat <<JSON
{"title":"[idem] tarea ${ts}","priority":"P2","department":"OPS"}
JSON
)"

curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_tasks}" \
  -d "${payload_tasks}" \
  "http://127.0.0.1:7311/api/tasks" >"${tmp1}"

curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_tasks}" \
  -d "${payload_tasks}" \
  "http://127.0.0.1:7311/api/tasks" >"${tmp2}"

python3 - <<'PY' "${tmp1}" "${tmp2}"
import json,sys
p1=json.load(open(sys.argv[1]))
p2=json.load(open(sys.argv[2]))
if p1.get("task_id") != p2.get("task_id"):
  raise SystemExit(f"idempotency falló en /api/tasks: {p1} vs {p2}")
print(f"[ok]  /api/tasks task_id={p1.get('task_id')}")
PY

echo "[idem] /api/projects (doble POST con misma x-idempotency-key)…"
key_projects="idem-projects-${ts}-${RANDOM}"
payload_projects="$(cat <<JSON
{"name":"[idem] proyecto ${ts}","details":"prueba idempotencia"}
JSON
)"

curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_projects}" \
  -d "${payload_projects}" \
  "http://127.0.0.1:7311/api/projects" >"${tmp3}"

curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_projects}" \
  -d "${payload_projects}" \
  "http://127.0.0.1:7311/api/projects" >"${tmp4}"

python3 - <<'PY' "${tmp3}" "${tmp4}"
import json,sys
p1=json.load(open(sys.argv[1]))
p2=json.load(open(sys.argv[2]))
if p1.get("project_id") != p2.get("project_id"):
  raise SystemExit(f"idempotency falló en /api/projects: {p1} vs {p2}")
print(f"[ok]  /api/projects project_id={p1.get('project_id')}")
PY

echo "[idem] ok."

