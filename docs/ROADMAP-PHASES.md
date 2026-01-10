# Plan.md — WorkHub (ERP + PM) — Hoja de ruta y control

Este archivo evita que el plan se “pierda” entre conversaciones. Es la referencia viva del proyecto.

## Principios no negociables
- **Portal (7310) solo habla con el BFF (7311)**. Nunca al ERP/Leantime desde el navegador.
- **SSOT tareas = Leantime** (estado, asignación, tiempos, comentarios).
- **SSOT negocio = Frappe/ERPNext** (ERP/CRM/stock/producción/calidad) + tabla puente `WorkLink`.
- **No tocar core** de Frappe/ERPNext ni Leantime (solo `workhub/` + app propia `workhub_frappe_app`).
- **UX TDAH-friendly** obligatoria: ver `workhub/docs/UX-TDAH.md`.

## Puertos canónicos
- Portal: `http://localhost:7310`
- BFF: `http://localhost:7311`
- Frappe/ERPNext: `http://localhost:7312`
- Leantime: `http://localhost:7313`

## Modelo canónico (MVP)
- Departamentos: `SALES | OPS | MKT`
- Estados (máx 5): `BACKLOG → NEXT → DOING → BLOCKED → DONE`
- Prioridades (máx 3): `P0 | P1 | P2`

---

# Roadmap (fases)

## Fase 0 — Base reproducible (dev local)
**Objetivo:** levantar Portal + BFF + Frappe + Leantime con scripts, sin tocar cores.

**DoD**
- [x] Smoke: Portal 7310
- [x] Smoke: BFF 7311 (`/health` y/o `/healthz`)
- [x] Smoke: Frappe 7312
- [x] Smoke: Leantime 7313
- [x] `.env` único para URLs/keys

**Comandos**
- `bash workhub/scripts/up.sh`
- `bash workhub/scripts/smoke.sh`

## Fase 1 — PM “sin restricciones” (Leantime completo desde Portal)
**Objetivo:** poder usar Leantime “en serio” sin entrar a Leantime.

**Incluye (mínimo)**
- Proyectos: crear, listar, abrir detalle
- Tablero: 5 estados, mover tareas (ideal drag&drop), filtros
- Tareas: crear/editar (título, estado, responsable, prioridad, due)
- Time tracking: iniciar/detener/registrar
- Dependencias (lectura real) + bloqueo automático
  - una tarea dependiente se muestra en “Bloqueadas”
  - el BFF bloquea marcar “Hecha” si la dependencia no está “Hecha” (HTTP 409)
- Subtareas (si el modelo lo permite) o alternativa equivalente sin romper SSOT
- Comentarios/actividad mínima (sin chat aparte)
- Hitos (milestones) (por definir)

**KPIs**
- Tiempo para crear una tarea: < 20s
- Cambio de estado + asignación: < 10s
- 0 desbordes/ruido en tablero (TDAH)

**Estado actual**
- [x] Cerrada (PM usable “sin entrar a Leantime”)
  - [x] Tablero 5 estados + mover tareas (drag&drop con asa)
  - [x] Editar tarea (título, estado, responsable, prioridad, vencimiento)
  - [x] Time tracking (iniciar/detener/registrar)
  - [x] Dependencias reales (lectura + bloqueo automático)
  - [x] Subtareas / checklist (en description, bloques WorkHub)
  - [x] Comentarios / actividad mínima (en description, “Actividad”)
  - [x] Hitos (milestones) (Leantime milestones + asignación desde Portal)

**Smoke (sin portal)**
- `bash workhub/scripts/fase-1-smoke.sh`

## Fase 2 — Integración Frappe mínima (Contexto + WorkLink)
**Objetivo:** “tarea con contexto” (negocio) sin duplicar tareas en Frappe.

**DoD**
- [x] `POST /api/tasks` puede crear WorkLink + tarea Leantime con:
  - `WorkLinkId: <id>`
  - `Context: <url>`
- [x] Portal permite seleccionar contexto (search) y crear tarea

## Fase 3 — Sync (Leantime → Frappe) + reconcile
**Objetivo:** rollups confiables y sin duplicados.

**DoD**
- [x] Worker polling 1–5 min actualiza WorkLink (status/assignee/due/time)
- [x] Reconcile básico (WorkLink sin tarea / tarea sin WorkLinkId)

**Estado actual**
- [~] OK MVP (falta endurecimiento/retries/observabilidad)

## Fase 4 — Agenda unificada (tareas + eventos)
**Objetivo:** una sola agenda en Portal (Panel y Equipo).

**DoD**
- [x] Eventos manuales en Frappe (crear/listar) accesibles desde Portal vía BFF
  - [x] DocType `CalendarEvent` (en `workhub_frappe_app`)
  - [x] BFF: `GET /api/events` + `POST /api/events`
  - [x] Portal: “Evento rápido” en Panel (`/me`) y Equipo (`/people`)
- [x] Agenda unificada: TASK + EVENT (y opcional MILESTONE)
  - [x] `GET /api/me/overview` y `GET /api/people/:id/overview` incluyen `EVENT`
  - [x] Portal: Agenda muestra `TASK/EVENT` en `/me` y `/people`

## Fase 5 — Endurecimiento MVP (anti-roturas)
**Objetivo:** que no se rompa con uso real.

**DoD**
- [x] Idempotencia total (reintentos no duplican)
  - [x] `WorkLink` incluye `origin_doctype/origin_id` para deduplicar pasos ERP por “origen + gate”
  - [x] `WorkLink` incluye `idempotency_key` para deduplicar creación “con contexto” (doble click / reintentos)
  - [x] BFF deduplica flujos ERP (si existe WorkLink por origen+gate, devuelve el existente)
  - [x] Portal envía `x-idempotency-key` en acciones ERP/flows (doble click / reintentos)
  - [x] Asegurar migración aplicada: `bash workhub/scripts/frappe-migrate.sh workhub.localhost`
- [x] Retries con backoff (BFF/Sync)
  - [x] Reintentos automáticos en lecturas (GET/list) hacia Leantime/Frappe (3 intentos, backoff simple)
  - [x] Reintentos seguros en escrituras (crear/submit/log-time) (dedupe por tags/markers + backoff)
- [x] Logs con correlation id
  - [x] Respuesta incluye `x-request-id`
  - [x] Errores incluyen `(rid=...)` en el mensaje para depurar rápido
- [x] Tests mínimos (contratos BFF + 5–10 integraciones)
  - [x] Smoke base: `bash workhub/scripts/smoke.sh`
  - [x] Smoke idempotencia: `bash workhub/scripts/idempotency-smoke.sh`
  - [x] Smoke idempotencia time/log: `bash workhub/scripts/time-idempotency-smoke.sh`
  - [x] Smoke Fase 1: `bash workhub/scripts/fase-1-smoke.sh`
  - [x] Smoke Fase D: `bash workhub/scripts/fase-d-smoke.sh`
  - [x] Runner Fase 5: `bash workhub/scripts/fase-5-smoke.sh`

## Fase 6 — Seguridad / RBAC / SSO
**Objetivo:** acceso controlado sin fricción.

**DoD**
- [x] Login/SSO Google (BFF) + sesiones seguras (`/api/auth/google/*`)
- [x] Roles: Dirección vs Usuario (`DIRECTOR|USER`)
- [x] Visibilidad por proyecto/persona (RBAC MVP)
  - `USER` solo ve “yo” en `/me` y `/people`, y solo proyectos donde tiene tareas
  - `USER` no puede ejecutar `/api/erp/*` ni `/api/flows/*`
- [x] Rate limit + headers + CORS correcto

**Notas de configuración**
- Local recomendado: `AUTH_MODE=dev` + `SESSION_SECRET=...`
- Prod: `AUTH_MODE=google` + `GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET`

## Fase 7 — Operación
**Objetivo:** diagnosticar y recuperar.

**DoD**
- [x] Métricas (latencia, errores, ciclo sync)
  - BFF: `/api/ops/metrics` + `/api/ops/status`
  - Sync: heartbeat `sync_status.json` en `OPS_STATE_DIR`
- [x] Alertas (sync caído, error rate)
  - BFF: `/api/ops/alerts` (director-only) + script `bash workhub/scripts/ops.sh`
- [x] Backups + restore probado
  - Backup: `bash workhub/scripts/backup-local.sh`
  - Restore verificado (Leantime, no destructivo): `bash workhub/scripts/backup-verify-leantime.sh`
- [x] Runbooks de incidentes
  - `workhub/docs/RUNBOOK-INCIDENTS.md`

## Fase 8 — CRM completo (Portal)
**Objetivo:** operar CRM sin entrar al ERP (SSOT en Frappe).

**Incluye**
- Cuentas: `Customer`
- Leads: `Lead`
- Contactos: `Contact`
- Oportunidades: `Opportunity`
- Campañas: `Campaign`

**DoD**
- [~] Portal: **ERP / CRM** en `/erp` (módulos tipo ERPNext)
  - [x] Navegación por módulos + listado + detalle (Customer/Lead/Contact/Opportunity/Campaign/Supplier/Item/BOM)
  - [x] Crear/editar (formulario mínimo con divulgación progresiva)
- [x] Sidecar Frappe (WorkHub app): **CRM Lite** para operar sin ruido dentro de Frappe
  - Page: `/app/workhub-crm` (botones grandes + “mis cosas”)
  - Sidebar: `WorkHub CRM` (módulo independiente estilo ERPNext)
- [x] BFF: endpoints genéricos Frappe (director-only)
  - `GET /api/frappe/modules`
  - `GET /api/frappe/list?doctype=...`
  - `GET /api/frappe/get?doctype=...&name=...`
  - `GET /api/frappe/search?term=...`
  - `GET /api/frappe/meta?doctype=...`
  - `POST /api/frappe/create`
  - `POST /api/frappe/save`
- [ ] (Siguiente) Crear tarea con contexto desde registro CRM (WorkLink + Leantime task)
  - [~] Crear tarea de seguimiento desde el detalle CRM (Ventas) + ver tareas vinculadas

## Fase 8+ — ERP completo (backoffice) con UX diaria en Portal
**Objetivo:** que el usuario no tenga que entrar al ERP para operar el día a día.

**DoD**
- [ ] Módulos ERP (ventas/compras/stock/producción/calidad) accesibles desde Portal (vía BFF)
- [ ] Tareas reflejan estado ERP (“hecho” solo si el ERP está OK)

---

# ERP Gate y flujos (subfases)

## Fase A — Conectores base (ya)
- [x] Portal → BFF → Leantime/Frappe
- [x] WorkLink operativo
- [x] Sync básico operativo

## Fase B — “ERP Gate” (ya)
**Regla:** una tarea puede tener `erp_gate` y no puede marcarse como DONE hasta que el paso ERP esté completado.
- [x] Gate en WorkLink
- [x] Bloqueo de DONE en BFF (409)
- [x] Sync evalúa estado ERP y actualiza `erp_done`

## Fase C — Flujos MVP (siguiente)
Implementar reglas exactas por doctype/estado para:
  - [~] **Ventas:** `Sales Order → Delivery Note → Sales Invoice → Payment Entry`
  - API:
    - `POST /api/erp/ventas/sales-order` (crea pedido + tarea + WorkLink, gate `VENTAS_PEDIDO`)
    - `POST /api/flows/ventas/sales-order/:id/delivery-note` (crea entrega + tarea + WorkLink, gate `VENTAS_ENTREGA`)
    - `POST /api/flows/ventas/delivery-note/:id/sales-invoice` (crea factura + tarea + WorkLink, gate `VENTAS_FACTURA`)
    - `POST /api/flows/ventas/sales-invoice/:id/payment-entry` (crea cobro + tarea + WorkLink, gate `VENTAS_COBRO`)
    - `POST /api/erp/:doctype/:id/submit` (completa paso ERP; además marca `erp_done` y empuja la tarea a DONE sin esperar al sync)
  - Portal:
    - Modal de tarea: botones “Crear entrega / Crear factura / Registrar cobro” (según el contexto) + “Completar paso ERP”
  - Reglas extra (TDAH-friendly / anti-errores):
    - [x] Cada “siguiente paso” crea una tarea con dependencia hacia el paso anterior (bloqueo automático hasta que el anterior esté `Hecho`).
- [~] **Producción/Stock:** `Work Order → Stock Entry (consumo) → Batch → Quality Inspection → Stock Entry (salida)`
  - API:
    - `POST /api/erp/prod/work-order` (crea Work Order + tarea + WorkLink, gate `PROD_ORDEN`)
    - `POST /api/flows/prod/work-order/:id/consumo` (crea Stock Entry + tarea + WorkLink, gate `PROD_CONSUMO`)
    - `POST /api/flows/prod/work-order/:id/batch` (crea Batch + tarea + WorkLink, gate `PROD_LOTE`)
    - `POST /api/flows/prod/stock-entry/:id/quality-inspection` (crea Quality Inspection + tarea + WorkLink, gate `PROD_QC`)
    - `POST /api/flows/prod/work-order/:id/salida` (crea Stock Entry (salida) + tarea + WorkLink, gate `PROD_SALIDA`; por defecto en borrador si `submit=false`)
  - Portal:
    - Proyecto: modal “Nueva producción (ERP)”
    - Modal de tarea (Work Order): “Crear consumo / Crear lote / Preparar salida”
    - Modal de tarea (Stock Entry, `PROD_SALIDA`): “Crear QC” antes de “Completar paso ERP”
  - Reglas extra:
    - [x] Consumo/Lote/Salida/QC se crean con dependencia hacia el paso anterior (best-effort según contexto disponible).
- [~] **Compras:** `Purchase Order → Purchase Receipt → Stock Entry (entrada) → Purchase Invoice`
  - API:
    - `POST /api/erp/compras/purchase-order` (crea pedido compra + tarea + WorkLink, gate `COMPRAS_PEDIDO`)
    - `POST /api/flows/compras/purchase-order/:id/purchase-receipt` (crea recepción + tarea + WorkLink, gate `COMPRAS_RECEPCION`)
    - `POST /api/flows/compras/purchase-receipt/:id/stock-entry` (crea Stock Entry + tarea + WorkLink, gate `COMPRAS_ENTRADA_STOCK`)
    - `POST /api/flows/compras/stock-entry/:id/purchase-invoice` (crea factura proveedor + tarea + WorkLink, gate `COMPRAS_FACTURA`)
  - Portal:
    - Proyecto: modal “Nueva compra (ERP)”
    - Modal de tarea: botones “Crear recepción / Crear entrada stock / Crear factura proveedor” (según el contexto) + “Completar paso ERP”
  - Reglas extra:
    - [x] Cada “siguiente paso” crea una tarea con dependencia hacia el paso anterior (bloqueo automático).

## Fase D — UX operativa (cerrada)
**Objetivo:** hacer el paso ERP desde el Portal (crear/confirmar docs ERP vía BFF), no solo enlazar.
- [x] Acciones guiadas por gate (crear siguiente doc / completar / validar)
  - [x] Proyecto → tablero → modal de tarea: “Completar paso ERP” + “Crear entrega / Crear factura / Registrar cobro”
  - [x] Proyecto → “Nuevo pedido (ERP)” (modal): crea `Sales Order` + tarea (gate `VENTAS_PEDIDO`) sin entrar al ERP
  - [x] Búsqueda asistida en modales ERP (Frappe link search): `Customer`, `Supplier`, `Item`, `BOM`
    - [x] Lookup con menos fricción: búsqueda al teclear (debounce) + `Enter`/`Esc`
  - [x] Acciones combinadas (1 click): “Completar y crear entrega / factura / cobro”, “Completar y crear recepción / entrada stock / factura proveedor”, “Completar y crear consumo”
- [x] Mensajes claros (qué falta para “completar”)
   - [x] Bloqueo por dependencia: acciones ERP deshabilitadas si la tarea está bloqueada por otra
   - [x] Estado ERP legible en UI (borrador/enviado/activo) + último error visible
- [x] Validación “sin ERP” (Ventas end-to-end)
  - Script: `bash workhub/scripts/ventas-flow-smoke.sh` (crea SO→DN→SI→PE y verifica tareas en DONE)
  - Validación UX portal (manual): seguir checklist en `workhub/docs/RUNBOOK-LOCAL.md`
- [x] Validación “sin ERP” (Compras end-to-end)
  - Script: `bash workhub/scripts/compras-flow-smoke.sh` (crea PO→PR→Stock Entry→Purchase Invoice y verifica tareas en DONE)
- [x] Validación “sin ERP” (Producción end-to-end)
  - Script: `bash workhub/scripts/prod-flow-smoke.sh` (crea WO→consumo→lote→salida→QC y verifica tareas en DONE)

---

# Problemas actuales (lo que bloquea valor)
- ERP en Portal está en modo **mínimo** (gate + submit): si un `submit` falla por campos obligatorios, se resuelve con “Abrir en ERP (opcional)” y reintentar desde Portal.

---

# Próximas decisiones (para no bloquear)
1) Agenda: ¿cerramos **Fase 4** (eventos también en vista “Equipo”) o se pospone post‑MVP?
2) ¿Saltamos a **Fase 6** (seguridad / sesiones / roles) o iteramos UX?
