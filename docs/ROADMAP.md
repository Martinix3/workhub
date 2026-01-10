# Roadmap — WorkHub (Frappe + Leantime) con legado `Santa-brisa-ERP`

## Contexto
Hay dos piezas:

- **`Santa-brisa-ERP` (legacy)**: Next.js + Firestore + ShadCN/Tailwind. Tiene módulos completos (Ventas/Marketing/Producción/Calidad/Almacén) y un “personal dashboard” orientado a productividad.
- **`workhub/` (nuevo)**: Portal + BFF + Sync. **Leantime = SoW (tareas)**, **Frappe = SoR (negocio + WorkLink)**. Portal **solo** habla con BFF.

La estrategia recomendada es **migración incremental “manager-first”**:
1) mantener el **layout bento** y UX rápida del portal,
2) estabilizar contratos + sync (sin 500s),
3) ir sustituyendo capacidades del ERP antiguo por “fuentes canónicas” (Frappe/Leantime),
4) dejar `Santa-brisa-ERP` como referencia/read-only hasta que haya paridad suficiente.

---

## Principios (no negociables)
- SSOT tareas = **Leantime** (status/assignee/due/time).
- SSOT negocio = **Frappe** (cuentas/campañas/ops/eventos manuales).
- En Frappe **no se duplican tareas**: solo `WorkLink` + rollups.
- El navegador **nunca** llama a Frappe/Leantime; solo al **BFF**.
- Puertos canónicos: Portal `7310`, BFF `7311`, Frappe `7312`, Leantime `7313`.

---

## KPIs globales (medición continua)
**Fiabilidad**
- `BFF /api/*` error rate < **1%** (p95 semanal).
- `sync lag` (cambio en Leantime → rollup en WorkLink) < **5 min** (p95).
- Duplicados `WorkLink` por contexto = **0**.

**UX**
- “Time-to-understand” del manager en `/me` < **60s** (prueba manual: overdue/blocked/agenda/risk visibles).
- p95 carga inicial portal < **2s** en local/staging.

**Adopción**
- % tareas de trabajo creadas vía WorkHub (tag `workhub`) ≥ **80%** en 2–4 semanas.
- Overdue ratio del equipo baja semana a semana (tendencia).

**Operación**
- Runbook “setup local” ejecutable sin interpretación (nuevas máquinas).
- Backups verificados (restore test) al menos 1 vez/mes.

---

## Fases (con KPIs + checklist de salida)

### Fase 0 — Base reproducible (dev local)
**Objetivo:** levantar todo en 15–30 min.

**Entregables**
- Scripts de arranque/parada y smoke tests.
- Portal+BFF+Sync levantan sin tocar cores.

**KPIs**
- Smoke: 4/4 servicios accesibles (Portal/BFF/Frappe/Leantime).
- 0 pasos manuales “raros” fuera del RUNBOOK.

**Checklist (DoD)**
- [ ] `bash workhub/scripts/up.sh` levanta.
- [ ] `bash workhub/scripts/smoke.sh` pasa.
- [ ] Puertos canónicos sin colisiones.

---

### Fase 1 — “Dashboard personal” (shell bento) estable
**Objetivo:** misma UI para todos; cambia solo el **scope** (Team vs Me).

**Entregables**
- Shell consistente (hero + jump bar + cards + sidebar).
- Capturas automatizadas para review UX.

**KPIs**
- p95 carga portal < 2s (local).
- 0 regresiones visuales sin detectar (screenshots).

**Checklist**
- [ ] `/me`, `/people`, `/projects` comparten estilo.
- [ ] `bash workhub/scripts/ui-screenshots.sh` genera capturas.
- [ ] UX “bento” clara (sin ruido).

---

### Fase 2 — Integración Leantime “read + quick create”
**Objetivo:** que el portal sea útil incluso sin Frappe (solo tareas).

**Entregables**
- `GET /api/me/overview` en modo live trae tareas (MVP por tag `workhub`).
- `POST /api/tasks` crea tarea en Leantime (due_date fiable).
- `GET /api/people` lista usuarios (para People view).

**KPIs**
- `/api/me/overview` nunca devuelve 500: si Leantime falla → listas vacías.
- Creación de tarea < 2s (local).

**Checklist**
- [ ] Crear tarea desde `/me` aparece en “Next 7 days / Agenda”.
- [ ] `LEANTIME_API_KEY` no se expone al navegador.
- [ ] Si Leantime se reinicia, el portal no se rompe (degrada).

---

### Fase 3 — Projects + People “de verdad”
**Objetivo:** completar las 3 pantallas del MVP con datos live.

**Entregables**
- `GET /api/projects` (departamentos + health scoring + quick actions).
- `GET /api/people/:id` o `GET /api/people/:id/overview` (scope “Me” real).

**KPIs**
- `/people` muestra carga por persona (doing/blocked/overdue) consistente con Leantime.
- “Projects at risk” estable (no cambia por errores de parsing).

**Checklist**
- [ ] `/people` permite seleccionar y ver su agenda real.
- [ ] `/projects` lista proyectos por depto (SALES/OPS/MKT).
- [ ] No hay N+1 “lento” (p95 < 500ms en local).

---

### Fase 4 — Frappe `WorkLink` operativo (contexto → tarea)
**Objetivo:** empezar el “pegamento” negocio↔tareas sin duplicar.

**Entregables**
- App propia en bench: `workhub_frappe_app` + DocType `WorkLink`.
- Endpoint BFF `POST /api/tasks` con `context`:
  1) crea `WorkLink` en Frappe
  2) crea tarea en Leantime con `WorkLinkId:` + `Context:` en la descripción

**KPIs**
- Duplicados de `WorkLink` por `(source_doctype, source_id)` = 0.
- `WorkLink.sync_state=ERROR` < 1% de nuevas creaciones.

**Checklist**
- [ ] “Create task from context” crea WorkLink + tarea enlazada.
- [ ] `WorkLink.leantime_task_id` queda poblado (o se recupera por sync).
- [ ] Tarea contiene `WorkLinkId:` y `Context:` (regla obligatoria).

---

### Fase 5 — Sync worker (rollups + reconcile)
**Objetivo:** cerrar el loop (Leantime manda en estado/due/assignee).

**Entregables**
- Polling 1–5 min: tareas con `WorkLinkId` → actualiza `WorkLink`.
- Reconcile diario: inconsistencias marcadas con error.

**KPIs**
- sync lag p95 < 5 min.
- reconcile deja el sistema en “estado conocido” sin intervención manual.

**Checklist**
- [ ] Cambiar estado en Leantime actualiza `WorkLink` (<5 min).
- [ ] `WorkLink` sin tarea → `sync_state=ERROR` con diagnóstico.
- [ ] Tarea con WorkLinkId inexistente → registrada para revisión.

---

### Fase 6 — Auth + RBAC (Google) + hardening
**Objetivo:** uso real por el equipo, sin exponer secretos.

**Entregables**
- Login Google en BFF (OAuth) y sesión httpOnly.
- RBAC mínimo:
  - Manager: ve todo (Team).
  - Usuario: ve su scope (Me) + proyectos donde es miembro.

**KPIs**
- 0 tokens en localStorage/sessionStorage.
- 0 endpoints sin auth (excepto `/healthz`).

**Checklist**
- [ ] Usuario sin rol no ve datos.
- [ ] CORS cerrado al portal.
- [ ] Rate limiting básico en BFF.

---

### Fase 7 — Staging/Producción (operación)
**Objetivo:** desplegar sin deuda operativa.

**Entregables**
- staging idéntico a prod (compose/vars).
- backups + restore probado.
- logs con correlation id (BFF + sync).

**KPIs**
- Disponibilidad > 99% (ventana 30 días, interno).
- MTTR < 30 min para incidencias típicas (sync caído, Leantime reinicio).

**Checklist**
- [ ] Smoke tests post-deploy automatizados.
- [ ] Backups diarios y restore verificado.
- [ ] Runbooks: rotate keys, restore, incidentes.

---

## Cómo aprovechamos `Santa-brisa-ERP` sin “casarnos” con su backend
**Reutilizable ya**
- Patrón de layout (Sidebar + Header + “cards + widgets”).
- Catálogo de módulos y KPIs por área (README + docs SSOT V2/V2+).
- Heurísticas de “riesgo/alertas” (sirven como base conceptual).

**Inventario UI (legacy) útil como referencia**
- Header y búsqueda “⌘K”: `Santa-brisa-ERP/src/components/layout/DynamicHeader.tsx`
- Estilos glass/bento (clases): `Santa-brisa-ERP/src/styles/components.css` (`sb-card-glass-*`, `widget-curved`)
- “WorkHub” antiguo (ideas de tareas/proyectos): `Santa-brisa-ERP/src/app/(app)/work/WorkHubClient.tsx`
- Widgets reutilizables (patrones): `Santa-brisa-ERP/src/components/widgets/*` (`WidgetFrame`, `KpiWidget`, `TasksWidget`, etc.)

**Cómo lo adaptamos por fases (sin arrastrar el backend legacy)**
1) **Fase 1 (UI shell)**: copiamos *patrones*, no lógica:
   - hero con saludo + “saltar con ⌘K”
   - tarjetas KPI + paneles (bento)
2) **Fase 2–3 (datos live)**: se conectan los mismos componentes al BFF:
   - `/me` = “equipo” (manager)
   - `/equipo` = “por persona” (mismo layout, scope distinto)
   - `/proyectos` = scoring + mix por deptos
3) **Fase 4–5 (WorkLink+sync)**: el frontend apenas cambia; se enriquece el “contexto” en tareas.
4) **Fase 6 (auth+RBAC+widgets avanzados)**: aquí sí tiene sentido traer más ideas del legacy (notificaciones, paneles configurables).

**No reutilizable (directo)**
- Firestore como SSOT (en WorkHub lo sustituimos por Frappe+Leantime).
- Lógica de tareas con estados no-canónicos (hay que mapear a 5 estados).

**Fase de retirada del legado (cuando haya paridad)**
- Congelar `Santa-brisa-ERP` en modo read-only.
- Exportar entidades “negocio” (Accounts/Campaigns/Ops/Events) a Frappe.
- El equipo opera en WorkHub; ERP queda solo como histórico hasta apagarlo.
