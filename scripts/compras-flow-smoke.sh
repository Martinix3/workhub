#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BFF_BASE_URL:-http://127.0.0.1:7311}"

ts="$(date +%s)"
run_id="${RUN_ID:-compras-e2e-${ts}-${RANDOM}}"

term_supplier="${TERM_SUPPLIER:-SB}"
term_item="${TERM_ITEM:-SB}"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT

require() {
  command -v "$1" >/dev/null 2>&1 || { echo "[compras-e2e] ERROR: missing command: $1" >&2; exit 1; }
}

require curl
require python3

if ! curl -4 -fsS "${BASE_URL}/health" >/dev/null 2>&1; then
  echo "[compras-e2e] ERROR: BFF no responde en ${BASE_URL}/health"
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

supplier="${SUPPLIER_ID:-}"
item="${ITEM_CODE:-}"

if [[ -z "${supplier}" ]]; then
  supplier="$(lookup_first_id "Supplier" "${term_supplier}" "${tmp_dir}/supplier.json" || true)"
fi
if [[ -z "${item}" ]]; then
  item="$(lookup_first_id "Item" "${term_item}" "${tmp_dir}/item.json" || true)"
fi

if [[ -z "${supplier}" ]] || [[ -z "${item}" ]]; then
  echo "[compras-e2e] ERROR: no pude encontrar Supplier/Item vía /api/context/search."
  echo "[compras-e2e] - Supplier: '${supplier}' (term='${term_supplier}')"
  echo "[compras-e2e] - Item:     '${item}' (term='${term_item}')"
  echo "[compras-e2e] Sugerencia: ejecuta: bash workhub/scripts/erpnext-bootstrap.sh workhub.localhost"
  echo "[compras-e2e] O define SUPPLIER_ID e ITEM_CODE explícitos."
  exit 1
fi

echo "[compras-e2e] run_id=${run_id}"
echo "[compras-e2e] supplier=${supplier}"
echo "[compras-e2e] item=${item}"

echo "[compras-e2e] creando proyecto…"
key_project="idem-${run_id}-project"
curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_project}" \
  -d "{\"name\":\"[e2e] Compras ${run_id}\",\"details\":\"Smoke Compras end-to-end (WorkHub)\"}" \
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

echo "[compras-e2e] project_id=${project_id}"

echo "[compras-e2e] creando Purchase Order…"
key_po="idem-${run_id}-purchase-order"
curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_po}" \
  -d "{\"supplier\":\"${supplier}\",\"items\":[{\"item_code\":\"${item}\",\"qty\":1,\"rate\":1}],\"submit\":false,\"project_id\":${project_id},\"assignee\":null,\"priority\":\"P2\",\"due_date\":null}" \
  "${BASE_URL}/api/erp/compras/purchase-order" >"${tmp_dir}/po.json"

po_id="$(python3 - <<'PY' "${tmp_dir}/po.json"
import json,sys
d=json.load(open(sys.argv[1]))
erp=d.get("erp") or {}
po=str((erp.get("id") if isinstance(erp, dict) else "") or "").strip()
if not po:
  raise SystemExit("missing purchase order id")
print(po)
PY
)"
po_task_id="$(python3 - <<'PY' "${tmp_dir}/po.json"
import json,sys
d=json.load(open(sys.argv[1]))
tid=str(d.get("task_id") or "").strip()
print(tid)
PY
)"
echo "[compras-e2e] Purchase Order=${po_id} task_id=${po_task_id:-—}"

echo "[compras-e2e] submit Purchase Order…"
key_submit_po="idem-${run_id}-submit-po"
curl -4 -fsS -H 'content-type: application/json' -H "x-idempotency-key: ${key_submit_po}" -d '{}' \
  "${BASE_URL}/api/erp/Purchase%20Order/${po_id}/submit" >"${tmp_dir}/submit-po.json"

echo "[compras-e2e] crear Purchase Receipt…"
key_pr="idem-${run_id}-purchase-receipt"
curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_pr}" \
  -d "{\"project_id\":${project_id},\"assignee\":null,\"priority\":\"P2\",\"due_date\":null,\"submit\":false}" \
  "${BASE_URL}/api/flows/compras/purchase-order/${po_id}/purchase-receipt" >"${tmp_dir}/pr.json"

pr_id="$(python3 - <<'PY' "${tmp_dir}/pr.json"
import json,sys
d=json.load(open(sys.argv[1]))
erp=d.get("erp") or {}
pr=str((erp.get("id") if isinstance(erp, dict) else "") or "").strip()
if not pr:
  raise SystemExit("missing purchase receipt id")
print(pr)
PY
)"
pr_task_id="$(python3 - <<'PY' "${tmp_dir}/pr.json"
import json,sys
d=json.load(open(sys.argv[1]))
tid=str(d.get("task_id") or "").strip()
print(tid)
PY
)"
echo "[compras-e2e] Purchase Receipt=${pr_id} task_id=${pr_task_id:-—}"

echo "[compras-e2e] submit Purchase Receipt…"
key_submit_pr="idem-${run_id}-submit-pr"
curl -4 -fsS -H 'content-type: application/json' -H "x-idempotency-key: ${key_submit_pr}" -d '{}' \
  "${BASE_URL}/api/erp/Purchase%20Receipt/${pr_id}/submit" >"${tmp_dir}/submit-pr.json"

echo "[compras-e2e] crear Stock Entry (entrada)…"
key_se="idem-${run_id}-stock-entry"
curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_se}" \
  -d "{\"project_id\":${project_id},\"assignee\":null,\"priority\":\"P2\",\"due_date\":null,\"submit\":false}" \
  "${BASE_URL}/api/flows/compras/purchase-receipt/${pr_id}/stock-entry" >"${tmp_dir}/se.json"

se_id="$(python3 - <<'PY' "${tmp_dir}/se.json"
import json,sys
d=json.load(open(sys.argv[1]))
erp=d.get("erp") or {}
se=str((erp.get("id") if isinstance(erp, dict) else "") or "").strip()
if not se:
  raise SystemExit("missing stock entry id")
print(se)
PY
)"
se_task_id="$(python3 - <<'PY' "${tmp_dir}/se.json"
import json,sys
d=json.load(open(sys.argv[1]))
tid=str(d.get("task_id") or "").strip()
print(tid)
PY
)"
echo "[compras-e2e] Stock Entry=${se_id} task_id=${se_task_id:-—}"

echo "[compras-e2e] submit Stock Entry…"
key_submit_se="idem-${run_id}-submit-se"
curl -4 -fsS -H 'content-type: application/json' -H "x-idempotency-key: ${key_submit_se}" -d '{}' \
  "${BASE_URL}/api/erp/Stock%20Entry/${se_id}/submit" >"${tmp_dir}/submit-se.json"

echo "[compras-e2e] crear Purchase Invoice…"
key_pi="idem-${run_id}-purchase-invoice"
curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_pi}" \
  -d "{\"project_id\":${project_id},\"assignee\":null,\"priority\":\"P2\",\"due_date\":null,\"submit\":false}" \
  "${BASE_URL}/api/flows/compras/stock-entry/${se_id}/purchase-invoice" >"${tmp_dir}/pi.json"

pi_id="$(python3 - <<'PY' "${tmp_dir}/pi.json"
import json,sys
d=json.load(open(sys.argv[1]))
erp=d.get("erp") or {}
pi=str((erp.get("id") if isinstance(erp, dict) else "") or "").strip()
if not pi:
  raise SystemExit("missing purchase invoice id")
print(pi)
PY
)"
pi_task_id="$(python3 - <<'PY' "${tmp_dir}/pi.json"
import json,sys
d=json.load(open(sys.argv[1]))
tid=str(d.get("task_id") or "").strip()
print(tid)
PY
)"
echo "[compras-e2e] Purchase Invoice=${pi_id} task_id=${pi_task_id:-—}"

echo "[compras-e2e] submit Purchase Invoice…"
key_submit_pi="idem-${run_id}-submit-pi"
curl -4 -fsS -H 'content-type: application/json' -H "x-idempotency-key: ${key_submit_pi}" -d '{}' \
  "${BASE_URL}/api/erp/Purchase%20Invoice/${pi_id}/submit" >"${tmp_dir}/submit-pi.json"

echo "[compras-e2e] verificando que las tareas estén en DONE…"
curl -4 -fsS "${BASE_URL}/api/projects/${project_id}" >"${tmp_dir}/project-detail.json"

python3 - <<'PY' "${tmp_dir}/project-detail.json" "${po_task_id}" "${pr_task_id}" "${se_task_id}" "${pi_task_id}"
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
  raise SystemExit(f"[compras-e2e] ERROR: tareas no están en DONE todavía: {missing}")
print(f"[compras-e2e] ok: {len(want)} tareas en DONE")
PY

echo "[compras-e2e] ok"

