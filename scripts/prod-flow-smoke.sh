#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BFF_BASE_URL:-http://127.0.0.1:7311}"

ts="$(date +%s)"
run_id="${RUN_ID:-prod-e2e-${ts}-${RANDOM}}"

term_item="${TERM_ITEM:-SB-TEST}"
term_bom="${TERM_BOM:-SB-TEST}"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT

require() {
  command -v "$1" >/dev/null 2>&1 || { echo "[prod-e2e] ERROR: missing command: $1" >&2; exit 1; }
}

require curl
require python3

if ! curl -4 -fsS "${BASE_URL}/health" >/dev/null 2>&1; then
  echo "[prod-e2e] ERROR: BFF no responde en ${BASE_URL}/health"
  exit 1
fi

lookup_first_id() {
  local doctype="$1"
  local term="$2"
  local out_file="$3"

  local doctype_q term_q
  doctype_q="$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))' "${doctype}")"
  term_q="$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))' "${term}")"

  curl -4 -fsS "${BASE_URL}/api/context/search?doctype=${doctype_q}&term=${term_q}&limit=8" >"${out_file}"

  python3 - <<'PY' "${out_file}" "${doctype}"
import json,sys
path=sys.argv[1]
dt=sys.argv[2]
data=json.load(open(path))
items=data.get("results") or []
if not items:
  raise SystemExit("")
first=items[0] if isinstance(items[0], dict) else {}
doc_id=str(first.get("id") or "").strip()
if not doc_id:
  raise SystemExit("")
print(doc_id)
PY
}

production_item="${PRODUCTION_ITEM:-}"
bom_no="${BOM_NO:-}"

if [[ -z "${production_item}" ]]; then
  production_item="$(lookup_first_id "Item" "${term_item}" "${tmp_dir}/item.json" || true)"
fi
if [[ -z "${bom_no}" ]]; then
  bom_no="$(lookup_first_id "BOM" "${term_bom}" "${tmp_dir}/bom.json" || true)"
fi

if [[ -z "${production_item}" ]] || [[ -z "${bom_no}" ]]; then
  echo "[prod-e2e] ERROR: no pude encontrar Item/BOM vía /api/context/search."
  echo "[prod-e2e] - Item: '${production_item}' (term='${term_item}')"
  echo "[prod-e2e] - BOM:  '${bom_no}' (term='${term_bom}')"
  echo "[prod-e2e] Sugerencia: ejecuta: bash workhub/scripts/erpnext-bootstrap.sh workhub.localhost"
  echo "[prod-e2e] O define PRODUCTION_ITEM y BOM_NO explícitos."
  exit 1
fi

echo "[prod-e2e] run_id=${run_id}"
echo "[prod-e2e] production_item=${production_item}"
echo "[prod-e2e] bom_no=${bom_no}"

echo "[prod-e2e] creando proyecto…"
key_project="idem-${run_id}-project"
curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_project}" \
  -d "{\"name\":\"[e2e] Producción ${run_id}\",\"details\":\"Smoke Producción end-to-end (WorkHub)\"}" \
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
echo "[prod-e2e] project_id=${project_id}"

echo "[prod-e2e] creando Work Order…"
key_wo="idem-${run_id}-work-order"
curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_wo}" \
  -d "{\"production_item\":\"${production_item}\",\"bom_no\":\"${bom_no}\",\"qty\":1,\"submit\":false,\"project_id\":${project_id},\"assignee\":null,\"priority\":\"P2\",\"due_date\":null}" \
  "${BASE_URL}/api/erp/prod/work-order" >"${tmp_dir}/wo.json"

wo_id="$(python3 - <<'PY' "${tmp_dir}/wo.json"
import json,sys
d=json.load(open(sys.argv[1]))
erp=d.get("erp") or {}
wo=str((erp.get("id") if isinstance(erp, dict) else "") or "").strip()
if not wo:
  raise SystemExit("missing work order id")
print(wo)
PY
)"
wo_task_id="$(python3 - <<'PY' "${tmp_dir}/wo.json"
import json,sys
d=json.load(open(sys.argv[1]))
tid=str(d.get("task_id") or "").strip()
print(tid)
PY
)"
echo "[prod-e2e] Work Order=${wo_id} task_id=${wo_task_id:-—}"

echo "[prod-e2e] submit Work Order…"
key_submit_wo="idem-${run_id}-submit-wo"
curl -4 -fsS -H 'content-type: application/json' -H "x-idempotency-key: ${key_submit_wo}" -d '{}' \
  "${BASE_URL}/api/erp/Work%20Order/${wo_id}/submit" >"${tmp_dir}/submit-wo.json"

echo "[prod-e2e] crear Stock Entry (consumo)…"
key_cons="idem-${run_id}-consumo"
curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_cons}" \
  -d "{\"project_id\":${project_id},\"assignee\":null,\"priority\":\"P2\",\"due_date\":null,\"submit\":false}" \
  "${BASE_URL}/api/flows/prod/work-order/${wo_id}/consumo" >"${tmp_dir}/consumo.json"

cons_id="$(python3 - <<'PY' "${tmp_dir}/consumo.json"
import json,sys
d=json.load(open(sys.argv[1]))
erp=d.get("erp") or {}
se=str((erp.get("id") if isinstance(erp, dict) else "") or "").strip()
if not se:
  raise SystemExit("missing consumo stock entry id")
print(se)
PY
)"
cons_task_id="$(python3 - <<'PY' "${tmp_dir}/consumo.json"
import json,sys
d=json.load(open(sys.argv[1]))
tid=str(d.get("task_id") or "").strip()
print(tid)
PY
)"
echo "[prod-e2e] Consumo Stock Entry=${cons_id} task_id=${cons_task_id:-—}"

echo "[prod-e2e] submit Stock Entry (consumo)…"
key_submit_cons="idem-${run_id}-submit-consumo"
curl -4 -fsS -H 'content-type: application/json' -H "x-idempotency-key: ${key_submit_cons}" -d '{}' \
  "${BASE_URL}/api/erp/Stock%20Entry/${cons_id}/submit" >"${tmp_dir}/submit-consumo.json"

echo "[prod-e2e] crear Batch…"
key_batch="idem-${run_id}-batch"
curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_batch}" \
  -d "{\"batch_id\":null,\"project_id\":${project_id},\"assignee\":null,\"priority\":\"P2\",\"due_date\":null}" \
  "${BASE_URL}/api/flows/prod/work-order/${wo_id}/batch" >"${tmp_dir}/batch.json"

batch_id="$(python3 - <<'PY' "${tmp_dir}/batch.json"
import json,sys
d=json.load(open(sys.argv[1]))
erp=d.get("erp") or {}
bn=str((erp.get("id") if isinstance(erp, dict) else "") or "").strip()
if not bn:
  raise SystemExit("missing batch id")
print(bn)
PY
)"
batch_task_id="$(python3 - <<'PY' "${tmp_dir}/batch.json"
import json,sys
d=json.load(open(sys.argv[1]))
tid=str(d.get("task_id") or "").strip()
print(tid)
PY
)"
echo "[prod-e2e] Batch=${batch_id} task_id=${batch_task_id:-—}"

echo "[prod-e2e] crear Stock Entry (salida)…"
key_out="idem-${run_id}-salida"
curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_out}" \
  -d "{\"project_id\":${project_id},\"assignee\":null,\"priority\":\"P2\",\"due_date\":null,\"submit\":false}" \
  "${BASE_URL}/api/flows/prod/work-order/${wo_id}/salida" >"${tmp_dir}/salida.json"

out_id="$(python3 - <<'PY' "${tmp_dir}/salida.json"
import json,sys
d=json.load(open(sys.argv[1]))
erp=d.get("erp") or {}
se=str((erp.get("id") if isinstance(erp, dict) else "") or "").strip()
if not se:
  raise SystemExit("missing salida stock entry id")
print(se)
PY
)"
out_task_id="$(python3 - <<'PY' "${tmp_dir}/salida.json"
import json,sys
d=json.load(open(sys.argv[1]))
tid=str(d.get("task_id") or "").strip()
print(tid)
PY
)"
echo "[prod-e2e] Salida Stock Entry=${out_id} task_id=${out_task_id:-—}"

echo "[prod-e2e] submit Stock Entry (salida)…"
key_submit_out="idem-${run_id}-submit-salida"
curl -4 -fsS -H 'content-type: application/json' -H "x-idempotency-key: ${key_submit_out}" -d '{}' \
  "${BASE_URL}/api/erp/Stock%20Entry/${out_id}/submit" >"${tmp_dir}/submit-salida.json"

echo "[prod-e2e] crear Quality Inspection…"
key_qc="idem-${run_id}-qc"
curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_qc}" \
  -d "{\"batch_id\":\"${batch_id}\",\"sample_size\":1,\"project_id\":${project_id},\"assignee\":null,\"priority\":\"P2\",\"due_date\":null,\"submit\":true}" \
  "${BASE_URL}/api/flows/prod/stock-entry/${out_id}/quality-inspection" >"${tmp_dir}/qc.json"

qc_id="$(python3 - <<'PY' "${tmp_dir}/qc.json"
import json,sys
d=json.load(open(sys.argv[1]))
erp=d.get("erp") or {}
qi=str((erp.get("id") if isinstance(erp, dict) else "") or "").strip()
if not qi:
  raise SystemExit("missing quality inspection id")
print(qi)
PY
)"
qc_task_id="$(python3 - <<'PY' "${tmp_dir}/qc.json"
import json,sys
d=json.load(open(sys.argv[1]))
tid=str(d.get("task_id") or "").strip()
print(tid)
PY
)"
echo "[prod-e2e] Quality Inspection=${qc_id} task_id=${qc_task_id:-—}"

echo "[prod-e2e] verificando que las tareas estén en DONE…"
curl -4 -fsS "${BASE_URL}/api/projects/${project_id}" >"${tmp_dir}/project-detail.json"

python3 - <<'PY' "${tmp_dir}/project-detail.json" "${wo_task_id}" "${cons_task_id}" "${batch_task_id}" "${out_task_id}" "${qc_task_id}"
import json,sys
path=sys.argv[1]
want=[x for x in sys.argv[2:] if x and x.strip()]
d=json.load(open(path))
board=d.get("board") or {}
done=board.get("DONE") or []
done_ids=set()
for t in done:
  if isinstance(t, dict):
    done_ids.add(str(t.get("id") or "").strip())
missing=[tid for tid in want if tid not in done_ids]
if missing:
  raise SystemExit(f"[prod-e2e] ERROR: tareas no están en DONE todavía: {missing}")
print(f"[prod-e2e] ok: {len(want)} tareas en DONE")
PY

echo "[prod-e2e] ok"

