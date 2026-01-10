# RUNBOOK.md — WorkHub (Frappe + Leantime) — Arranque local (Mac)

## 0) Paths reales (no cambiarlos)
- Frappe: `/Users/martinjaimesamperiz/santa brisa/frappe-develop`
- Leantime: `/Users/martinjaimesamperiz/santa brisa/leantime-master`
- WorkHub (nuevo): `/Users/martinjaimesamperiz/santa brisa/workhub`

## 1) Puertos (canónicos)
- Portal: 7310
- BFF: 7311
- Frappe: 7312
- Leantime: 7313

---

# Quick start (1 comando)
Desde `/Users/martinjaimesamperiz/santa brisa`:

- Levantar todo: `bash workhub/scripts/up.sh`
- Smoke tests: `bash workhub/scripts/smoke.sh`
- Apagar: `bash workhub/scripts/down.sh`

Si Leantime falla, normalmente es porque Docker Desktop no está abierto.

Tip debug:
- El BFF añade `x-request-id` en todas las respuestas.
- Si el portal muestra un error, suele incluir `(rid=...)`; copia ese `rid` para depurar rápido.
- El portal envía `x-idempotency-key` en acciones críticas (crear/flows/submit/tiempo) para evitar duplicados por doble click o reintentos.
- En tareas con paso ERP, si aparece **“Completar y crear …”**, hace `submit` del documento actual y crea el siguiente paso en un click (sin entrar al ERP).
- Auth:
  - Local recomendado: `AUTH_MODE=dev` + `SESSION_SECRET=...` en `workhub/.env`
  - Prod: `AUTH_MODE=google` + `GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET`

---

# 2) Reglas operativas
1) NO modificar el core de Frappe ni de Leantime.
2) Toda customización en Frappe va en una **app propia**: `workhub_frappe_app`.
3) En Leantime, integrar por API (no schema changes). La relación se hace con:
   - `WorkLinkId` + `Context URL` dentro de la descripción de la tarea.
4) El Portal SOLO habla con el BFF.

---

# 3) “Mapa de archivos” (qué tocar y qué no)

## 3.1 Frappe — permitido / prohibido
### Permitido (solo estos ámbitos)
A) **Crear una app propia** (no tocar `frappe/` core):
- `apps/workhub_frappe_app/` (toda la custom vive aquí)
  - `workhub_frappe_app/hooks.py`
  - `workhub_frappe_app/modules.txt`
  - `workhub_frappe_app/patches.txt`
  - `workhub_frappe_app/workhub_frappe_app/doctype/worklink/*` (DocType `WorkLink`)
  - (opcional) endpoints mínimos dentro de tu app para leer/escribir WorkLink/Event

B) **Config de site/bench** (solo si hace falta para arrancar y puerto):
- `sites/common_site_config.json` (si existe)
- `sites/<site>/site_config.json` (si existe)

### Prohibido
- Cualquier cambio dentro del core Frappe:
  - `/Users/.../frappe-develop/frappe/**`
  - `/Users/.../frappe-develop/frappe/public/**`
  - etc.

## 3.2 Leantime — permitido / prohibido
### Permitido
- Config/arranque (Docker/ENV) para exponer puerto 7313.
- Ningún cambio de código para MVP.

### Prohibido
- Cambiar el core:
  - `/Users/.../leantime-master/app/**` (o similares)
  - migraciones, schema, etc.

---

# 4) Paso A — Crear el repo WorkHub (nuevo)
En:
`/Users/martinjaimesamperiz/santa brisa/workhub`

Debe existir (mínimo):
- `bff/` (FastAPI) escuchando en `7311`
- `portal/` (Vite) escuchando en `7310` (y proxy a `7311`)
- `sync/` (worker sin puerto)
- `.env` con:
  - `FRAPPE_BASE_URL=http://localhost:7312`
  - `LEANTIME_BASE_URL=http://localhost:7313`

---

# 5) Paso B — Arrancar Frappe en 7312

## 5.1 Detectar si `/frappe-develop` es un BENCH o solo el repo
Ejecutar:
- Si existe carpeta `sites/` y `apps/` en `/frappe-develop` → es bench.
- Si NO existen → es solo repo (no bench).

### Caso 1: ES BENCH (recomendado)
1) Ir al bench:
   - `cd "/Users/martinjaimesamperiz/santa brisa/frappe-develop"`
2) Arrancar dev server en puerto 7312:
   - `bench serve --port 7312`
   (bench permite cambiar el puerto con `--port`; el default es 8000).
3) Validar:
   - abrir `http://localhost:7312`

> Nota: si usas `bench start` (multi-proceso), y te pisa puertos, para MVP usa `bench serve --port 7312`.

### Caso 2: NO ES BENCH (solo repo)
Objetivo: crear un bench sin tocar el core del repo y seguir usando Frappe como runtime.
Acción:
1) Crear carpeta bench hermana (no dentro del repo):
   - `mkdir -p "/Users/martinjaimesamperiz/santa brisa/frappe-bench"`
   - Nota (Mac + paths con espacios): `bench/uv` rompe con rutas con espacios. Workaround usado:
     - bench real: `/Users/martinjaimesamperiz/santabrisa/frappe-bench`
     - symlink: `/Users/martinjaimesamperiz/santa brisa/frappe-bench` → (bench real)
     - symlink del repo: `/Users/martinjaimesamperiz/santabrisa-frappe-develop` → `/Users/martinjaimesamperiz/santa brisa/frappe-develop`
2) Inicializar bench (puede clonar frappe). Si quieres forzar el uso del repo local, hacerlo después con symlink.
3) Tras tener bench funcional, arrancar:
   - `bench serve --port 7312`

Tip:
- Para dev cómodo, edita `Procfile` del bench para dejar `web: bench serve --port 7312` y usa `bench start` (levanta redis + workers + socketio).
- `bench start` requiere un process manager en PATH (uno de: `honcho`, `foreman`, `forego`). Recomendado (Mac):
  - `brew install pipx`
  - `pipx install frappe-bench`
  - `pipx install honcho`
  - Asegura `~/.local/bin` en PATH (zsh): `echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc`
- Frappe (develop) requiere **Node >= 24**. Si tu shell usa `nvm` y te mete Node 20, fuerza Node 24 antes de `bench start`:
  - `export PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:$PATH"`
  - `node -v` debe mostrar `v24.x`
- Si `bench start` se cae por `bench watch` (errores al borrar bundles), desactiva el watcher en `Procfile` (MVP no lo necesita) y deja un proceso “idle”:
  - `watch: sh -c 'echo \"[watch] disabled for MVP\"; tail -f /dev/null'`

> Importante: mantener `frappe-develop` intacto. La integración real se hace creando `workhub_frappe_app` dentro del bench.

---

# 6) Paso C — Crear la app de Frappe: `workhub_frappe_app`
(Esto ocurre dentro del entorno bench de Frappe, no dentro de WorkHub.)

1) En el bench:
- `bench new-app workhub_frappe_app`
- `bench --site <tu-site> install-app workhub_frappe_app`

2) Crear DocType `WorkLink` dentro de la app:
- DocType mínimo con campos:
  - `source_doctype` (Data)
  - `source_id` (Data)
  - `leantime_task_id` (Data)
  - `department` (Select: SALES/OPS/MKT)
  - `status` (Select: BACKLOG/NEXT/DOING/BLOCKED/DONE)
  - `priority` (Select: P0/P1/P2)
  - `due_date` (Date)
  - `last_sync_at` (Datetime)
  - `sync_state` (Select: OK/ERROR)
  - `sync_error` (Small Text)

3) Validar manualmente en Frappe UI:
- crear 1 WorkLink de prueba

Nota (MariaDB en Homebrew):
- Si `root` usa `unix_socket` y no acepta password, crea un usuario superadmin para bench:
  - `mariadb -u "$USER" -e "CREATE USER IF NOT EXISTS 'frappe_root'@'localhost' IDENTIFIED BY 'frappe'; GRANT ALL PRIVILEGES ON *.* TO 'frappe_root'@'localhost' WITH GRANT OPTION; FLUSH PRIVILEGES;"`
  - `bench new-site workhub.localhost --force --mariadb-root-username frappe_root --mariadb-root-password frappe --admin-password admin --set-default`

---

# 7) Paso D — Arrancar Leantime en 7313

## 7.1 Detectar Docker compose en `/leantime-master`
Buscar alguno de estos:
- `docker-compose.yml`
- `compose.yml`
- `docker/docker-compose.yml`

## 7.2 Si existe compose (lo habitual)
1) Ajustar puertos:
- Leantime escucha interno en **8080**; mapear host **7313** → container **8080**
Ejemplo:
- `ports: ["7313:8080"]`

2) Arrancar:
- `cd "/Users/martinjaimesamperiz/santa brisa/leantime-master"`
- `docker compose up -d`

3) Validar:
- abrir `http://localhost:7313`

## 7.3 API (para BFF/Sync)
- Endpoint JSON-RPC: `/api/jsonrpc`
- Auth por header: `x-api-key: <API_KEY>`

---

# 8) Paso E — Arrancar WorkHub (portal+bff+sync)
En `/Users/.../workhub`:

1) `.env`:
- `FRAPPE_BASE_URL=http://localhost:7312`
- `LEANTIME_BASE_URL=http://localhost:7313`
- `BFF_PORT=7311`
- `PORTAL_ORIGIN=http://localhost:7310`
 - Para integración real:
   - `FRAPPE_MODE=live` + (`FRAPPE_API_TOKEN` o `FRAPPE_API_KEY`/`FRAPPE_API_SECRET`)
   - `LEANTIME_MODE=live` + `LEANTIME_API_KEY` (Personal Access Token)

2) Arrancar:
- `docker compose up --build`

3) Validar:
- Portal: `http://localhost:7310`
- BFF: `http://localhost:7311/docs`

Nota: aunque en `.env` los base URLs son `localhost`, el `docker-compose.yml` de `workhub/` ya fuerza `host.docker.internal` dentro de los contenedores para que BFF/Sync puedan hablar con Frappe/Leantime en tu Mac.

---

# 8.1) Frappe (token) y ERPNext (bootstrap) — pasos rápidos

## Token API de Frappe (para que el BFF pueda leer/escribir)
1) Generar/rotar token y escribirlo en `workhub/.env`:
- `bash workhub/scripts/frappe-ensure-token.sh workhub.localhost`

Esto deja `FRAPPE_API_TOKEN` en formato `api_key:api_secret` y recrea `bff`+`sync` para que lo lean.

## ERPNext bootstrap (Company + masters)
Si quieres probar flujos ERP (Sales Order, Purchase Order, Work Order, etc.) necesitas que ERPNext tenga Company y datos base.

1) Ejecutar una vez:
- `bash workhub/scripts/erpnext-bootstrap.sh workhub.localhost`

Esto crea (en local) lo mínimo para operar: Company, UOM, Item Groups, price lists, warehouses, etc.

---

# 9) Smoke tests (mínimos)
1) Frappe vivo:
- `GET http://localhost:7312`

2) Leantime vivo:
- `GET http://localhost:7313`

3) BFF vivo:
- `GET http://localhost:7311/health`

4) Contrato manager:
- `GET http://localhost:7311/api/me/overview?from=2025-12-01&to=2026-01-31`

## 9.1) Smoke ERP end-to-end (opcional, sin portal)
Requiere ERPNext bootstrap:
- `bash workhub/scripts/erpnext-bootstrap.sh workhub.localhost`

Flujos “sin ERP” (BFF):
- Ventas: `bash workhub/scripts/ventas-flow-smoke.sh`
- Compras: `bash workhub/scripts/compras-flow-smoke.sh`
- Producción: `bash workhub/scripts/prod-flow-smoke.sh`

## 9.2) Smoke PM (Fase 1, opcional, sin portal)
- `bash workhub/scripts/fase-1-smoke.sh`

---

# 10) Integración “real” (cuando toque)
## 10.1 BFF → Leantime
- Implementar cliente JSON-RPC con `x-api-key` hacia `LEANTIME_BASE_URL/api/jsonrpc`

## 10.2 BFF → Frappe
- Implementar cliente REST a `FRAPPE_BASE_URL` para crear/leer `WorkLink`.
  - Contexto (para crear tarea desde registro): `GET /api/context/search` y `GET /api/context/:doctype/:id` en el BFF.

## 10.3 Sync
- Polling de tareas “cambiadas” (según método API disponible en tu instalación)
- Parsear `WorkLinkId` de la descripción si no hay campo custom en Leantime
- Actualizar `WorkLink` en Frappe
 - Reconcile periódico:
   - `WorkLink` con `leantime_task_id` inexistente → `sync_state=ERROR`
   - tarea sin `WorkLinkId` o con `WorkLinkId` distinto → `sync_state=ERROR`
 - ERP gate (MVP):
   - si `WorkLink.erp_gate` está definido, el worker consulta el documento ERP (`source_doctype/source_id`) y actualiza:
     - `erp_done`, `erp_state`, `erp_last_checked_at`, `erp_error`
   - si `erp_done=1`, el worker empuja la tarea Leantime a `DONE` (best-effort)

---

# 11) Regla clave (anti-complejidad)
Si algo requiere:
- modificar core de Frappe/Leantime, o
- replicar tareas dentro de Frappe,
ENTONCES no es MVP y se pospone.
