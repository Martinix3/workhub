# WorkHub — Codex notes

## Canonical ports
- Portal: `7310`
- BFF: `7311`
- Frappe: `7312`
- Leantime: `7313`

## Hard rules
- No tocar el core de `frappe-develop/` ni `leantime-master/`.
- El navegador (Portal) solo llama al BFF.
- SSOT tareas = Leantime; SSOT negocio = Frappe; en Frappe solo `WorkLink` (+ rollups).

## What exists here
- `bff/`: FastAPI (mocks por defecto).
- `portal/`: React/Vite (3 rutas).
- `sync/`: worker (stub) para polling/rollups.

