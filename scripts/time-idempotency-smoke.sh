#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BFF_BASE_URL:-http://127.0.0.1:7311}"

if ! curl -4 -fsS "${BASE_URL}/health" >/dev/null 2>&1; then
  echo "[time-idem] ERROR: BFF no responde en ${BASE_URL}/health"
  exit 1
fi

ts="$(date +%s)"
run_id="${RUN_ID:-time-idem-${ts}-${RANDOM}}"
day="$(date +%F)"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT

echo "[time-idem] run_id=${run_id}"

echo "[time-idem] creando proyecto…"
key_project="idem-${run_id}-project"
curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_project}" \
  -d "{\"name\":\"[smoke] Time idem ${run_id}\",\"details\":\"Smoke idempotencia time/log\"}" \
  "${BASE_URL}/api/projects" >"${tmp_dir}/project.json"

project_id="$(python3 - <<'PY' "${tmp_dir}/project.json"
import json,sys
d=json.load(open(sys.argv[1]))
pid=str(d.get("project_id") or "").strip()
if not pid:
  raise SystemExit("missing project_id")
print(pid)
PY
)"
echo "[time-idem] project_id=${project_id}"

echo "[time-idem] creando tarea…"
key_task="idem-${run_id}-task"
curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_task}" \
  -d "{\"title\":\"[smoke] Tarea time ${run_id}\",\"description\":\"\",\"project_id\":${project_id},\"assignee\":null,\"priority\":\"P2\",\"due_date\":null,\"department\":\"OPS\"}" \
  "${BASE_URL}/api/tasks" >"${tmp_dir}/task.json"

task_id="$(python3 - <<'PY' "${tmp_dir}/task.json"
import json,sys
d=json.load(open(sys.argv[1]))
tid=str(d.get("task_id") or "").strip()
if not tid:
  raise SystemExit("missing task_id")
print(tid)
PY
)"
echo "[time-idem] task_id=${task_id}"

echo "[time-idem] /api/tasks/:id/time/log (doble POST con misma x-idempotency-key)…"
key_time="idem-${run_id}-time-${RANDOM}"
payload_time="$(cat <<JSON
{"date":"${day}","hours":0.25,"kind":"GENERAL_BILLABLE","description":"[smoke] time idem ${run_id}"}
JSON
)"

curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_time}" \
  -d "${payload_time}" \
  "${BASE_URL}/api/tasks/${task_id}/time/log" >"${tmp_dir}/t1.json"

curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_time}" \
  -d "${payload_time}" \
  "${BASE_URL}/api/tasks/${task_id}/time/log" >"${tmp_dir}/t2.json"

python3 - <<'PY' "${tmp_dir}/t1.json" "${tmp_dir}/t2.json"
import json,sys
p1=json.load(open(sys.argv[1]))
p2=json.load(open(sys.argv[2]))
if not p1.get("ok"):
  raise SystemExit(f"[time-idem] ERROR: primera llamada no ok: {p1}")
if not p2.get("ok"):
  raise SystemExit(f"[time-idem] ERROR: segunda llamada no ok: {p2}")
if not (p2.get("deduped") is True or p1.get("deduped") is True):
  raise SystemExit(f"[time-idem] ERROR: no veo dedupe en time/log: {p1} vs {p2}")
print("[time-idem] ok")
PY

echo "[time-idem] ok"

