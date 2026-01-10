#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BFF_BASE_URL:-http://127.0.0.1:7311}"

ts="$(date +%s)"
run_id="${RUN_ID:-ventas-e2e-${ts}-${RANDOM}}"

term_customer="${TERM_CUSTOMER:-SB}"
term_item="${TERM_ITEM:-SB-RAW-001}"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT

require() {
  command -v "$1" >/dev/null 2>&1 || { echo "[ventas-e2e] ERROR: missing command: $1" >&2; exit 1; }
}

require curl
require python3

if ! curl -4 -fsS "${BASE_URL}/health" >/dev/null 2>&1; then
  echo "[ventas-e2e] ERROR: BFF no responde en ${BASE_URL}/health"
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

customer="${CUSTOMER_ID:-}"
item="${ITEM_CODE:-}"

if [[ -z "${customer}" ]]; then
  customer="$(lookup_first_id "Customer" "${term_customer}" "${tmp_dir}/customer.json" || true)"
fi
if [[ -z "${item}" ]]; then
  item="$(lookup_first_id "Item" "${term_item}" "${tmp_dir}/item.json" || true)"
fi

if [[ -z "${customer}" ]] || [[ -z "${item}" ]]; then
  echo "[ventas-e2e] ERROR: no pude encontrar Customer/Item vía /api/context/search."
  echo "[ventas-e2e] - Customer: '${customer}' (term='${term_customer}')"
  echo "[ventas-e2e] - Item:     '${item}' (term='${term_item}')"
  echo "[ventas-e2e] Sugerencia: ejecuta: bash workhub/scripts/erpnext-bootstrap.sh workhub.localhost"
  echo "[ventas-e2e] O define CUSTOMER_ID e ITEM_CODE explícitos."
  exit 1
fi

echo "[ventas-e2e] run_id=${run_id}"
echo "[ventas-e2e] customer=${customer}"
echo "[ventas-e2e] item=${item}"

echo "[ventas-e2e] creando proyecto…"
key_project="idem-${run_id}-project"
curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_project}" \
  -d "{\"name\":\"[e2e] Ventas ${run_id}\",\"details\":\"Smoke Ventas end-to-end (WorkHub)\"}" \
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

echo "[ventas-e2e] project_id=${project_id}"

echo "[ventas-e2e] creando Sales Order…"
key_so="idem-${run_id}-sales-order"
curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_so}" \
  -d "{\"customer\":\"${customer}\",\"items\":[{\"item_code\":\"${item}\",\"qty\":1,\"rate\":1}],\"submit\":false,\"project_id\":${project_id},\"assignee\":null,\"priority\":\"P2\",\"due_date\":null}" \
  "${BASE_URL}/api/erp/ventas/sales-order" >"${tmp_dir}/so.json"

so_id="$(python3 - <<'PY' "${tmp_dir}/so.json"
import json,sys
d=json.load(open(sys.argv[1]))
erp=d.get("erp") or {}
so=str((erp.get("id") if isinstance(erp, dict) else "") or "").strip()
if not so:
  raise SystemExit("missing sales order id")
print(so)
PY
)"
so_task_id="$(python3 - <<'PY' "${tmp_dir}/so.json"
import json,sys
d=json.load(open(sys.argv[1]))
tid=str(d.get("task_id") or "").strip()
print(tid)
PY
)"
echo "[ventas-e2e] Sales Order=${so_id} task_id=${so_task_id:-—}"

echo "[ventas-e2e] submit Sales Order…"
key_submit_so="idem-${run_id}-submit-so"
curl -4 -fsS -H 'content-type: application/json' -H "x-idempotency-key: ${key_submit_so}" -d '{}' \
  "${BASE_URL}/api/erp/Sales%20Order/${so_id}/submit" >"${tmp_dir}/submit-so.json"

echo "[ventas-e2e] crear Delivery Note…"
key_dn="idem-${run_id}-delivery-note"
curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_dn}" \
  -d "{\"project_id\":${project_id},\"assignee\":null,\"priority\":\"P2\",\"due_date\":null,\"submit\":false}" \
  "${BASE_URL}/api/flows/ventas/sales-order/${so_id}/delivery-note" >"${tmp_dir}/dn.json"

dn_id="$(python3 - <<'PY' "${tmp_dir}/dn.json"
import json,sys
d=json.load(open(sys.argv[1]))
erp=d.get("erp") or {}
dn=str((erp.get("id") if isinstance(erp, dict) else "") or "").strip()
if not dn:
  raise SystemExit("missing delivery note id")
print(dn)
PY
)"
dn_task_id="$(python3 - <<'PY' "${tmp_dir}/dn.json"
import json,sys
d=json.load(open(sys.argv[1]))
tid=str(d.get("task_id") or "").strip()
print(tid)
PY
)"
echo "[ventas-e2e] Delivery Note=${dn_id} task_id=${dn_task_id:-—}"

echo "[ventas-e2e] submit Delivery Note…"
key_submit_dn="idem-${run_id}-submit-dn"
curl -4 -fsS -H 'content-type: application/json' -H "x-idempotency-key: ${key_submit_dn}" -d '{}' \
  "${BASE_URL}/api/erp/Delivery%20Note/${dn_id}/submit" >"${tmp_dir}/submit-dn.json"

echo "[ventas-e2e] crear Sales Invoice…"
key_si="idem-${run_id}-sales-invoice"
curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_si}" \
  -d "{\"project_id\":${project_id},\"assignee\":null,\"priority\":\"P2\",\"due_date\":null,\"submit\":false}" \
  "${BASE_URL}/api/flows/ventas/delivery-note/${dn_id}/sales-invoice" >"${tmp_dir}/si.json"

si_id="$(python3 - <<'PY' "${tmp_dir}/si.json"
import json,sys
d=json.load(open(sys.argv[1]))
erp=d.get("erp") or {}
si=str((erp.get("id") if isinstance(erp, dict) else "") or "").strip()
if not si:
  raise SystemExit("missing sales invoice id")
print(si)
PY
)"
si_task_id="$(python3 - <<'PY' "${tmp_dir}/si.json"
import json,sys
d=json.load(open(sys.argv[1]))
tid=str(d.get("task_id") or "").strip()
print(tid)
PY
)"
echo "[ventas-e2e] Sales Invoice=${si_id} task_id=${si_task_id:-—}"

echo "[ventas-e2e] submit Sales Invoice…"
key_submit_si="idem-${run_id}-submit-si"
curl -4 -fsS -H 'content-type: application/json' -H "x-idempotency-key: ${key_submit_si}" -d '{}' \
  "${BASE_URL}/api/erp/Sales%20Invoice/${si_id}/submit" >"${tmp_dir}/submit-si.json"

echo "[ventas-e2e] crear Payment Entry…"
key_pe="idem-${run_id}-payment-entry"
curl -4 -fsS \
  -H 'content-type: application/json' \
  -H "x-idempotency-key: ${key_pe}" \
  -d "{\"project_id\":${project_id},\"assignee\":null,\"priority\":\"P2\",\"due_date\":null,\"submit\":false}" \
  "${BASE_URL}/api/flows/ventas/sales-invoice/${si_id}/payment-entry" >"${tmp_dir}/pe.json"

pe_id="$(python3 - <<'PY' "${tmp_dir}/pe.json"
import json,sys
d=json.load(open(sys.argv[1]))
erp=d.get("erp") or {}
pe=str((erp.get("id") if isinstance(erp, dict) else "") or "").strip()
if not pe:
  raise SystemExit("missing payment entry id")
print(pe)
PY
)"
pe_task_id="$(python3 - <<'PY' "${tmp_dir}/pe.json"
import json,sys
d=json.load(open(sys.argv[1]))
tid=str(d.get("task_id") or "").strip()
print(tid)
PY
)"
echo "[ventas-e2e] Payment Entry=${pe_id} task_id=${pe_task_id:-—}"

echo "[ventas-e2e] submit Payment Entry…"
key_submit_pe="idem-${run_id}-submit-pe"
curl -4 -fsS -H 'content-type: application/json' -H "x-idempotency-key: ${key_submit_pe}" -d '{}' \
  "${BASE_URL}/api/erp/Payment%20Entry/${pe_id}/submit" >"${tmp_dir}/submit-pe.json"

echo "[ventas-e2e] verificando que las tareas estén en DONE…"
curl -4 -fsS "${BASE_URL}/api/projects/${project_id}" >"${tmp_dir}/project-detail.json"

python3 - <<'PY' "${tmp_dir}/project-detail.json" "${so_task_id}" "${dn_task_id}" "${si_task_id}" "${pe_task_id}"
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
  raise SystemExit(f"[ventas-e2e] ERROR: tareas no están en DONE todavía: {missing}")
print(f"[ventas-e2e] ok: {len(want)} tareas en DONE")
PY

echo "[ventas-e2e] ok"
