# Local dev (WorkHub only)

1) Crear env:
- `cp .env.example .env`
  - Si vas a usar integración real:
    - `FRAPPE_MODE=live` + (`FRAPPE_API_TOKEN` o `FRAPPE_API_KEY`/`FRAPPE_API_SECRET`)
    - `LEANTIME_MODE=live` + `LEANTIME_API_KEY` (Personal Access Token)
  - Auth recomendado (local):
    - `AUTH_MODE=dev`
    - `SESSION_SECRET=...` (cualquier string larga)

2) Generar token de Frappe (recomendado):
- `bash workhub/scripts/frappe-ensure-token.sh workhub.localhost`
  - deja `FRAPPE_API_TOKEN` en formato `api_key:api_secret` y recrea `bff`+`sync`.

3) (Opcional) Bootstrap ERPNext (Company + masters):
- `bash workhub/scripts/erpnext-bootstrap.sh workhub.localhost`

4) (Opcional) CRM Lite dentro de Frappe (sidecar):
- `bash workhub/scripts/crm-lite-bootstrap.sh workhub.localhost`
  - Crea/asegura una página simple: `CRM Lite` (`/app/workhub-crm`)
  - Crea/asegura un sidebar tipo “módulo”: `WorkHub CRM`

5) (Opcional) Probar Frappe desde el BFF:
- Buscar contexto: `GET http://localhost:7311/api/context/search?doctype=Account&term=test`
- Ver WorkLinks: `GET http://localhost:7311/api/worklinks?limit=5`

6) Sync (Leantime → Frappe):
- En `FRAPPE_MODE=live` y `LEANTIME_MODE=live`, el contenedor `sync`:
  - busca tareas con `WorkLinkId:` en la descripción
  - actualiza el DocType `WorkLink` (status/priority/due_date/last_sync_at)
  - ejecuta reconcile cada `RECONCILE_INTERVAL_SECONDS`

7) Migraciones Frappe (cuando cambie un DocType de `workhub_frappe_app`):
- `bash workhub/scripts/frappe-migrate.sh workhub.localhost`
  - Necesario para aplicar nuevos campos como `origin_doctype/origin_id` e `idempotency_key` (idempotencia), y DocTypes como `CalendarEvent`.

8) Levantar (portal + bff + sync):
- `docker compose up --build`

9) URLs:
- Portal: `http://localhost:7310`
- BFF docs: `http://localhost:7311/docs`
- Frappe (Desk): `http://localhost:7312/app`
  - CRM Lite: `http://localhost:7312/app/workhub-crm`

10) Smoke tests:
- `bash workhub/scripts/smoke.sh`
- Ops:
  - Estado/alertas: `bash workhub/scripts/ops.sh`
- (Opcional) idempotencia (evita duplicados por doble click / reintentos):
  - `bash workhub/scripts/idempotency-smoke.sh`
  - `bash workhub/scripts/time-idempotency-smoke.sh`
- Runner (todo Fase 5): `bash workhub/scripts/fase-5-smoke.sh`

10) Backups (local):
- Backup rápido: `bash workhub/scripts/backup-local.sh`
- Verificar restore (solo Leantime, no destructivo): `bash workhub/scripts/backup-verify-leantime.sh`

---

# Notas de uso (MVP)

## Debug rápido (correlation id)
- Cada respuesta del BFF incluye un header `x-request-id`.
- Si algo falla en el portal, el mensaje de error incluye `(rid=...)`.
- Cuando me pegues un error, pega también ese `rid` para ir directo al punto.

## Idempotencia (anti-duplicados)
- El portal envía `x-idempotency-key` automáticamente en:
  - crear proyectos y tareas
  - acciones de tiempo (`Iniciar`, `Detener`, `Registrar`)
  - acciones ERP/flows (“Crear entrega”, “Crear factura”, “Crear QC”, etc.)
  - `Completar paso ERP`
- Si haces doble click o reintentas una petición, el BFF intenta devolver el mismo resultado sin crear duplicados.

## Dependencias (Leantime)
- En un proyecto, abre una tarea → panel `Dependencias` → pon el `ID` de otra tarea y pulsa `Guardar`.
- Comportamiento:
  - Si la dependencia NO está `Hecha`, la tarea queda `Bloqueada` automáticamente (se muestra en la columna `Bloqueadas`).
  - No podrás marcar la tarea como `Hecha` hasta que la dependencia esté `Hecha` (el BFF devuelve `409` con un mensaje claro).
- Para deshacer: `Quitar dependencia`.

## Subtareas + actividad (WorkHub)
- En una tarea, usa:
  - `Checklist`: subtareas rápidas (check/uncheck).
  - `Actividad`: notas cortas con timestamp (sin chat aparte).
- Implementación MVP: se guardan dentro del `description` de la tarea (Leantime) en bloques `WORKHUB_*` (no rompe SSOT).

## Agenda unificada (tareas + eventos)
- `/me`: panel con `Agenda` + “Evento rápido” (evento manual en ERP, aparece en agenda).
- `/people`: vista por persona con `Agenda (próximos 7 días)` que mezcla `TASK/EVENT` + “Evento rápido (equipo)”.

## Flujos ERP (MVP) — sin entrar al ERP
Idea: cada acción crea el **siguiente documento ERP** y además crea una **tarea** en Leantime (vía BFF) con `ERP gate` y, normalmente, con **dependencia** hacia el paso anterior.

Notas:
- Requisito: tener ERPNext bootstrap (Company + datos base). El script `bash workhub/scripts/erpnext-bootstrap.sh workhub.localhost` también crea datos mínimos para pruebas:
  - `Customer`: `SB Test Customer`
  - `Supplier`: `SB Test Supplier`
  - `Item`: `SB-TEST-ITEM`
  - `Raw item`: `SB-RAW-001`
  - `BOM`: crea una BOM activa para `SB-TEST-ITEM` (para poder crear Work Order sin entrar al ERP)
  - Stock inicial (para poder `submit` de `Delivery Note` sin entrar al ERP)
- En los modales “Nuevo pedido / Nueva compra / Nueva producción” tienes búsqueda asistida (Frappe link search) para `Customer`, `Supplier`, `Item`, `BOM` (buscar al teclear o con `Enter`; `Esc` cierra sugerencias).

- Ventas (desde una tarea con contexto):
  - `Sales Order` → `Crear entrega` (Delivery Note)
  - `Delivery Note` → `Crear factura` (Sales Invoice)
  - `Sales Invoice` → `Registrar cobro` (Payment Entry)
- Compras:
  - `Purchase Order` → `Crear recepción` (Purchase Receipt)
  - `Purchase Receipt` → `Crear entrada stock` (Stock Entry)
  - `Stock Entry` → `Crear factura proveedor` (Purchase Invoice)
- Producción:
  - `Work Order` → `Crear consumo` (Stock Entry consumo)
  - `Work Order` → `Crear lote` (Batch)
  - `Work Order` → `Preparar salida` (Stock Entry salida)
  - `Stock Entry (salida)` → `Crear QC` (Quality Inspection)

Comportamiento:
- El nuevo paso aparece como tarea en el tablero del proyecto.
- Si tiene dependencia, queda en `Bloqueadas` hasta que completes el paso anterior.
- Por defecto, los documentos se crean como **borrador** y se completan desde el portal con `Completar paso ERP`.
- Atajo (recomendado): si ves el botón **“Completar y crear …”**, hace `submit` del documento actual y crea el siguiente paso en un solo click (sin entrar al ERP).

Checklist de validación “sin ERP” (Ventas, end-to-end):
1) `Portal → /projects → abrir un proyecto`.
2) `Nuevo pedido (ERP)` → buscar `Customer` y `Item` → `Crear pedido`.
3) Se abre la tarea creada (Sales Order) → `Completar paso ERP` (o `Completar y crear entrega`).
4) En la tarea de `Delivery Note` → `Completar paso ERP` → `Crear factura` (o `Completar y crear factura`).
5) En la tarea de `Sales Invoice` → `Completar paso ERP` → `Registrar cobro` (o `Completar y crear cobro`).
6) En la tarea de `Payment Entry` → `Completar paso ERP` → la tarea debe poder pasar a `Hecha`.

Si algún `Completar paso ERP` falla por campos obligatorios de tu ERP, revisa el “Último error ERP” en la tarea y usa `Abrir en ERP (opcional)` para completar lo mínimo y vuelve al portal.

Smoke automático (sin portal): `bash workhub/scripts/ventas-flow-smoke.sh`

Smoke automático (sin portal, Compras): `bash workhub/scripts/compras-flow-smoke.sh`

Smoke automático (sin portal, Producción): `bash workhub/scripts/prod-flow-smoke.sh`

Smoke automático (todo Fase D): `bash workhub/scripts/fase-d-smoke.sh`

Smoke automático (PM, Fase 1): `bash workhub/scripts/fase-1-smoke.sh`
