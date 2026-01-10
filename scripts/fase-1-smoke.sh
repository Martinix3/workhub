#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BFF_BASE_URL:-http://127.0.0.1:7311}"

ts="$(date +%s)"
run_id="${RUN_ID:-fase-1-${ts}-${RANDOM}}"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT

require() {
  command -v "$1" >/dev/null 2>&1 || { echo "[fase-1] ERROR: missing command: $1" >&2; exit 1; }
}

require curl
require python3

if ! curl -4 -fsS "${BASE_URL}/health" >/dev/null 2>&1; then
  echo "[fase-1] ERROR: BFF no responde en ${BASE_URL}/health"
  exit 1
fi

echo "[fase-1] run_id=${run_id}"

echo "[fase-1] creando proyecto…"
key_project="idem-${run_id}-project"
curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_project}" \
  -d "{\"name\":\"[smoke] Fase 1 ${run_id}\",\"details\":\"Smoke Fase 1 (PM)\"}" \
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
echo "[fase-1] project_id=${project_id}"

echo "[fase-1] creando hito…"
curl -4 -fsS \
  -H 'content-type: application/json' \
  -d "{\"title\":\"[smoke] Hito ${run_id}\",\"due_date\":null}" \
  "${BASE_URL}/api/projects/${project_id}/milestones" >"${tmp_dir}/milestone.json"

milestone_id="$(python3 - <<'PY' "${tmp_dir}/milestone.json"
import json,sys
d=json.load(open(sys.argv[1]))
mid=str(d.get("milestone_id") or "").strip()
if not mid:
  raise SystemExit("missing milestone_id")
print(mid)
PY
)"
echo "[fase-1] milestone_id=${milestone_id}"

echo "[fase-1] creando tarea…"
key_task="idem-${run_id}-task"
curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_task}" \
  -d "{\"title\":\"[smoke] Tarea ${run_id}\",\"description\":\"\",\"project_id\":${project_id},\"assignee\":null,\"priority\":\"P2\",\"due_date\":null,\"department\":\"OPS\"}" \
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
echo "[fase-1] task_id=${task_id}"

echo "[fase-1] patch título…"
curl -4 -fsS \
  -X PATCH \
  -H 'content-type: application/json' \
  -d "{\"title\":\"[smoke] Tarea (editada) ${run_id}\"}" \
  "${BASE_URL}/api/tasks/${task_id}" >"${tmp_dir}/patch-title.json"

echo "[fase-1] patch descripción (checklist + nota)…"
cat >"${tmp_dir}/desc.txt" <<'EOF'
<!-- WORKHUB_CHECKLIST_START -->
- [ ] Primera subtarea
- [x] Subtarea hecha
<!-- WORKHUB_CHECKLIST_END -->

<!-- WORKHUB_NOTES_START -->
- 2025-01-01T00:00:00Z · Nota de prueba
<!-- WORKHUB_NOTES_END -->
EOF

curl -4 -fsS \
  -X PATCH \
  -H 'content-type: application/json' \
  -d "{\"description\":$(python3 -c 'import json,sys; print(json.dumps(open(sys.argv[1]).read()))' "${tmp_dir}/desc.txt")}" \
  "${BASE_URL}/api/tasks/${task_id}" >"${tmp_dir}/patch-desc.json"

echo "[fase-1] asignando hito a la tarea…"
curl -4 -fsS \
  -X PATCH \
  -H 'content-type: application/json' \
  -d "{\"milestone_id\":${milestone_id}}" \
  "${BASE_URL}/api/tasks/${task_id}" >"${tmp_dir}/patch-ms.json"

echo "[fase-1] verificando…"
curl -4 -fsS "${BASE_URL}/api/projects/${project_id}" >"${tmp_dir}/project-detail.json"

python3 - <<'PY' "${tmp_dir}/project-detail.json" "${task_id}" "${milestone_id}"
import json,sys
d=json.load(open(sys.argv[1]))
tid=sys.argv[2]
mid=sys.argv[3]
board=d.get("board") or {}
all=[]
for k,v in board.items():
  if isinstance(v,list):
    all.extend([t for t in v if isinstance(t,dict)])
task=next((t for t in all if str(t.get("id"))==str(tid)), None)
if not task:
  raise SystemExit(f"[fase-1] ERROR: no encuentro la tarea {tid} en el board")
if str(task.get("title") or "") == "":
  raise SystemExit("[fase-1] ERROR: título vacío")
if str(task.get("milestone_id") or "") != str(mid):
  raise SystemExit(f"[fase-1] ERROR: milestone_id esperado {mid} pero vino {task.get('milestone_id')!r}")
desc=str(task.get("description") or "")
if "WORKHUB_CHECKLIST_START" not in desc or "WORKHUB_NOTES_START" not in desc:
  raise SystemExit("[fase-1] ERROR: no encuentro bloques WorkHub en description")
print("[fase-1] ok")
PY

echo "[fase-1] ok"
