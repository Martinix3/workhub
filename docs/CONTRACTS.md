# Contracts (BFF ⇄ Portal)

## Auth (sesión)
- `GET /api/auth/mode` → `{ "mode": "off|dev|google" }`
- `GET /api/auth/me` → `{ "authenticated": boolean, "user": { "email": string, "name": string, "role": "DIRECTOR|USER" } | null }`
- `POST /api/auth/logout` → `{ "ok": true }`

SSO (Google, cuando `AUTH_MODE=google`):
- `GET /api/auth/google/login` → redirect a Google (OIDC)
- `GET /api/auth/google/callback` → redirect al Portal (`/me`) y set-cookie

Dev (cuando `AUTH_MODE=dev`):
- `GET /api/auth/dev/login` → crea sesión y redirect al Portal

Notas:
- Sesión por cookie (`workhub_session`), el portal llama con `credentials: include`.
- RBAC (MVP):
  - `DIRECTOR`: acceso completo.
  - `USER`: lectura filtrada (solo “yo”); sin acceso a `/api/erp/*` y `/api/flows/*`.

## Health
- `GET /health` → `{ "ok": true }`
- `GET /healthz` → `{ "ok": true }` (alias)

## Ops (director-only)
- `GET /api/ops/status` → `{ ok, metrics, sync, alerts }`
- `GET /api/ops/metrics` → `{ metrics, sync }`
- `GET /api/ops/alerts` → `{ alerts }`

## Headers (debug + idempotencia)
- `x-request-id` (respuesta): id de petición para depurar; los errores pueden incluir `(rid=...)`.
- `x-idempotency-key` (request, opcional): hace que ciertos `POST` sean **idempotentes** (doble click o reintentos no duplican).

Notas (MVP):
- En `POST /api/tasks` (sin `context`), el BFF añade un tag `idem_<hash>` en Leantime para deduplicar de forma persistente.
- En `POST /api/projects`, el BFF añade `WorkHubIdemTag: idem_<hash>` en `details` para deduplicar de forma persistente.
- En `POST /api/tasks/:id/time/log`, el BFF añade `WorkHubIdemTag: idem_<hash>` en la descripción del time entry para evitar doble log.

## Manager cockpit
- `GET /api/me/overview?from=YYYY-MM-DD&to=YYYY-MM-DD`
  - Respuesta: shape estable:
    - `overdue_tasks[]`
    - `blocked_tasks[]`
    - `upcoming_tasks[]`
    - `load_by_person[]`
    - `projects_at_risk[]`
    - `agenda_items[]`

Notas:
- En modo `live`, el BFF intenta leer de Leantime; si Leantime está caído o devuelve formatos distintos, el endpoint debe **degradar a listas vacías**, no 500.

## People
- `GET /api/people?active_only=true`
  - Respuesta: `{ "people": [{ "id": "string", "name": "string" }] }`
- `GET /api/people/:id/overview?from=YYYY-MM-DD&to=YYYY-MM-DD`
  - Respuesta: mismo shape que `GET /api/me/overview` pero filtrado a esa persona.

## Proyectos
- `GET /api/projects?department=ALL|SALES|OPS|MKT&from=YYYY-MM-DD&to=YYYY-MM-DD`
  - Agrega tareas por proyecto (Leantime) y calcula salud/riesgo.
  - Respuesta: `{ "projects": ProjectSummary[] }`

- `GET /api/projects/:id`
  - Devuelve el tablero del proyecto (5 estados canónicos) + miembros del proyecto.
  - Respuesta: `{ "project": { ... }, "members": Person[], "board": Board }`

- `POST /api/projects`
  - Crea un proyecto en Leantime (requiere `LEANTIME_MODE=live`).
  - Header opcional: `x-idempotency-key` (si repites el POST, devuelve el mismo `project_id`).
  - Body:
```json
{ "name": "string", "details": "string|null", "client_id": 1 }
```
  - Respuesta:
```json
{ "project_id": "string", "name": "string", "client_id": 1 }
```

### ProjectSummary
```json
{
  "id": "string",
  "name": "string",
  "departments_involved": ["SALES", "OPS", "MKT"],
  "department_counts": { "SALES": 0, "OPS": 0, "MKT": 0 },
  "health": "GREEN|YELLOW|RED",
  "progress": { "done": 0, "total": 0, "pct": 0 },
  "blocked_count": 0,
  "overdue_count": 0,
  "next_milestone": { "title": "string", "date": "YYYY-MM-DD" },
  "score": 0
}
```

### Person
```json
{ "id": "string", "name": "string" }
```

### Board
```json
{
  "BACKLOG": [Task],
  "NEXT": [Task],
  "DOING": [Task],
  "BLOCKED": [Task],
  "DONE": [Task]
}
```

## Tareas
- `POST /api/tasks`
  - Crea una tarea (y opcionalmente un `WorkLink` en Frappe si hay `context`).
  - Idempotencia (MVP): si hay `erp_gate` + `context`, el BFF usa `origin_doctype/origin_id` (por defecto el propio `context`) para evitar duplicados del mismo “paso ERP”.
  - Header opcional: `x-idempotency-key` (reintentos no duplican).
- `PATCH /api/tasks/:id`
  - Actualiza campos en Leantime.
  - Body (parcial):
```json
{
  "title": "string",
  "description": "string",
  "tags": "string",
  "milestone_id": 123,
  "status": "BACKLOG|NEXT|DOING|BLOCKED|DONE",
  "project_id": 123,
  "assignee": "string|null",
  "due_date": "YYYY-MM-DD|null",
  "priority": "P0|P1|P2",
  "depends_on_task_id": 456
}
```

## Hitos (Leantime)
- `GET /api/projects/:id/milestones`
  - Lista hitos del proyecto (milestones de Leantime).
- `POST /api/projects/:id/milestones`
  - Crea un hito (milestone) en el proyecto.
  - Body:
```json
{
  "title": "string",
  "start_date": "YYYY-MM-DD|null",
  "due_date": "YYYY-MM-DD|null",
  "tags": "string|null"
}
```

## Contexto (Frappe)
- `GET /api/context/search?doctype=...&term=texto&limit=8`
  - Devuelve sugerencias para vincular una tarea a un registro.
  - Respuesta: `{ "results": [{ "doctype": "string", "id": "string", "title": "string", "url": "string" }] }`

- `GET /api/context/:doctype/:id`
  - Devuelve datos mínimos del registro para mostrar en el portal.

## CRM (Frappe)
Endpoints genéricos para operar CRM en Frappe (SSOT).

- `GET /api/crm/doctypes`
  - Respuesta: `{ "doctypes": [{ "doctype": "Customer|Lead|Contact|Opportunity|Campaign", "label": "string" }] }`

- `GET /api/crm/meta?doctype=Customer|Lead|Contact|Opportunity|Campaign`
  - Respuesta: `{ doctype, label, required: Field[], selects: { [fieldname]: string[] }, defaults: object }`

- `GET /api/crm/list?doctype=...&term=texto&limit=30`
  - Filtros opcionales (según doctype):
    - `Customer`: `disabled=0|1`, `customer_type=Company|Individual`
    - `Lead`: `status=...`
    - `Opportunity`: `status=...`, `opportunity_from=Customer|Lead`, `party_name=<id>`
  - Respuesta: `{ "items": [{ "doctype": "string", "id": "string", "title": "string", "url": "string", "data": object }] }`

- `GET /api/crm/get?doctype=...&name=<id>`
  - Respuesta: `{ doctype, id, title, url, data }`

- `POST /api/crm/create` (idempotente con `x-idempotency-key`)
  - Body: `{ "doctype": "string", "data": { ... } }`
  - Respuesta: `{ ok, doctype, id, title, url, data }`

- `POST /api/crm/update` (idempotente con `x-idempotency-key`)
  - Body: `{ "doctype": "string", "name": "string", "data": { ... } }`
  - Respuesta: `{ ok, doctype, id, title, url, data }`

- `POST /api/crm/delete?doctype=...&name=<id>` (director-only)
  - Respuesta: `{ "ok": true }`

## Frappe Explorer (ERP/CRM en Portal)
Endpoints “genéricos” para navegar/editar un subset de DocTypes desde el portal (UX nativa).

Notas:
- **Director-only**.
- **Doctypes permitidos (MVP):** `Customer|Lead|Contact|Opportunity|Campaign|Supplier|Item|BOM`.

- `GET /api/frappe/modules`
  - Respuesta: `{ "modules": [{ "key": "string", "label": "string", "doctypes": [{ "doctype": "string", "label": "string" }] }] }`

- `GET /api/frappe/list?doctype=...&term=texto&limit=40`
  - Respuesta: `{ "items": [{ "doctype": "string", "id": "string", "title": "string", "url": "string", "data": object }] }`

- `GET /api/frappe/get?doctype=...&name=<id>`
  - Respuesta: `{ doctype, id, title, url, data }`

- `GET /api/frappe/search?term=texto&limit=12`
  - Respuesta: `{ "results": [{ "doctype": "string", "id": "string", "title": "string", "url": "string" }] }`

- `GET /api/frappe/meta?doctype=...`
  - Respuesta: `{ "doctype": "string", "label": "string", "fields": [{ "fieldname": "string", "label": "string", "fieldtype": "string", "options": "string", "reqd": true, "read_only": false }] }`

- `POST /api/frappe/create`
  - Body: `{ "doctype": "string", "data": { ... } }`
  - Respuesta: `{ doctype, id, title, url, data }`

- `POST /api/frappe/save`
  - Body: `{ "doctype": "string", "name": "string", "data": { ... } }`
  - Respuesta: `{ doctype, id, title, url, data }`

## WorkLinks (Frappe)
- `GET /api/worklinks?source_doctype=...&source_id=...&limit=20`
  - Lista WorkLinks; para rol `USER` requiere `source_doctype`+`source_id` y filtra por tareas asignadas al usuario.

## Tareas (Leantime)
- `GET /api/tasks/:task_id`
  - Devuelve datos mínimos para abrir una tarea en su proyecto (y mostrarla en UI).

## URLs (public)
- `GET /api/urls`
  - Respuesta: `{ "frappe_base_url": "string", "leantime_base_url": "string" }`

## ERP gate (MVP)
- `WorkLink.erp_gate` define el “paso ERP” que bloquea el DONE del board.
  - Ejemplos (MVP): `VENTAS_PEDIDO`, `VENTAS_ENTREGA`, `VENTAS_FACTURA`, `VENTAS_COBRO`, `PROD_ORDEN`, `PROD_QC`, `COMPRAS_PEDIDO`, etc.
- Regla: si una tarea tiene `WorkLink` con `erp_gate` y `erp_done != 1`, el BFF devuelve `409` al intentar marcar `DONE`.

## ERP + flows (MVP)
Todos estos endpoints aceptan (opcional) `x-idempotency-key` para evitar duplicados por doble click o reintentos.

### Ventas
- `POST /api/erp/ventas/sales-order` → crea `Sales Order` (borrador) + tarea (gate `VENTAS_PEDIDO`)
- `POST /api/flows/ventas/sales-order/:id/delivery-note` → crea `Delivery Note` + tarea (gate `VENTAS_ENTREGA`)
- `POST /api/flows/ventas/delivery-note/:id/sales-invoice` → crea `Sales Invoice` + tarea (gate `VENTAS_FACTURA`)
- `POST /api/flows/ventas/sales-invoice/:id/payment-entry` → crea `Payment Entry` + tarea (gate `VENTAS_COBRO`)

### Compras
- `POST /api/erp/compras/purchase-order` → crea `Purchase Order` (borrador) + tarea (gate `COMPRAS_PEDIDO`)
- `POST /api/flows/compras/purchase-order/:id/purchase-receipt` → crea `Purchase Receipt` + tarea (gate `COMPRAS_RECEPCION`)
- `POST /api/flows/compras/purchase-receipt/:id/stock-entry` → crea `Stock Entry` + tarea (gate `COMPRAS_ENTRADA_STOCK`)
- `POST /api/flows/compras/stock-entry/:id/purchase-invoice` → crea `Purchase Invoice` + tarea (gate `COMPRAS_FACTURA`)

### Producción
- `POST /api/erp/prod/work-order` → crea `Work Order` (borrador) + tarea (gate `PROD_ORDEN`)
- `POST /api/flows/prod/work-order/:id/consumo` → crea `Stock Entry` (consumo) + tarea (gate `PROD_CONSUMO`)
- `POST /api/flows/prod/work-order/:id/batch` → crea `Batch` + tarea (gate `PROD_LOTE`)
- `POST /api/flows/prod/work-order/:id/salida` → crea `Stock Entry` (salida) + tarea (gate `PROD_SALIDA`)
- `POST /api/flows/prod/stock-entry/:id/quality-inspection` → crea `Quality Inspection` + tarea (gate `PROD_QC`)

### Completar paso ERP
- `POST /api/erp/{doctype}/{doc_id}/submit` → hace `submit` (idempotente: si ya está enviado, devuelve `ok`).

## Tiempo
- `POST /api/tasks/:id/time/start` (punch in)
- `POST /api/tasks/:id/time/stop` (punch out)
- `POST /api/tasks/:id/time/log`
  - Body:
```json
{ "date": "YYYY-MM-DD", "hours": 0.5, "kind": "GENERAL_BILLABLE", "description": "string", "time": "start|end|HH:MM|null" }
```

Idempotencia (MVP):
- `time/log`: si envías `x-idempotency-key`, reintentos no duplican horas (dedupe por `WorkHubIdemTag`).
- `time/start` y `time/stop`: si envías `x-idempotency-key`, el BFF puede devolver la misma respuesta (dedupe por cache del BFF).

Los DTOs canónicos viven en el propio OpenAPI de FastAPI (`/docs`) y en el código del BFF.
