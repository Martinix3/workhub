# WorkHub - Arquitectura y Estructura

## Resumen General

WorkHub es una **plataforma de integración ERP + Gestión de Proyectos (PM)** que conecta tres sistemas externos (Frappe/ERPNext, Leantime, y Frappe CRM) a través de una capa central Backend-for-Frontend (BFF).

**Principio arquitectónico clave:** El Portal (frontend) solo comunica con el BFF; el BFF actúa como punto único de integración.

```
Browser (Portal)
     |
     v (HTTP REST via /api/*)
   BFF (FastAPI)
     |
     +---> Leantime (PM/Tasks) [Puerto 7313]
     +---> Frappe/ERPNext (ERP/CRM/Business) [Puerto 7312]
     +---> Sync Worker (polling & rollups) [background]
```

### Puertos Canónicos

| Servicio | Puerto |
|----------|--------|
| Portal   | 7310   |
| BFF      | 7311   |
| Frappe   | 7312   |
| Leantime | 7313   |

---

## Decisiones de Modelo (MVP)

- El **departamento vive en la TAREA** (`SALES|OPS|MKT`) y se infiere por `tags` en Leantime (ej: `workhub,OPS`).
- Un **proyecto puede ser transversal** (tareas de varios departamentos); en `/projects` se muestra el mix por departamento.
- "Persona implicada en un proyecto" = **tiene tareas** en ese proyecto (sin depender de "membresía" de proyecto).

### SSOT (Single Source of Truth)

- **Tareas/estados/fechas/asignación/tiempos:** Leantime
- **Contexto de negocio + eventos manuales + WorkLink:** Frappe

### Acceso

- En uso normal, **nadie entra a Frappe ni a Leantime**: el **Portal** es la única UI del día a día.
- Frappe/Leantime son servicios internos (datos) a los que solo accede el BFF/Sync; en producción se deben **restringir** (red privada / firewall / sin exposición pública).

---

## Frontend (Portal)

**Ubicación:** `/workhub/portal/`
**Framework:** React 19.2 + TypeScript + React Router 7 + Vite

### Estructura de Archivos

```
portal/
├── src/
│   ├── main.tsx          # Entry point - React root con BrowserRouter
│   ├── App.tsx           # Enrutamiento principal y guards de autenticación
│   ├── api.ts            # Cliente HTTP (apiGet, apiPost, apiPatch)
│   ├── index.css         # Sistema de diseño (variables CSS)
│   ├── App.css           # Estilos de componentes (480+ clases CSS)
│   ├── pages/            # Páginas/rutas de la aplicación
│   │   ├── MePage.tsx       # Dashboard del usuario (/me)
│   │   ├── ProjectsPage.tsx # Listado de proyectos (/projects)
│   │   ├── ProjectPage.tsx  # Detalle de proyecto (/projects/:id)
│   │   ├── PeoplePage.tsx   # Equipo y carga de trabajo (/people)
│   │   ├── ErpPage.tsx      # Módulo ERP/CRM (/erp, /crm)
│   │   └── LoginPage.tsx    # Autenticación (/login)
│   └── ui/               # Componentes reutilizables
│       ├── AppLayout.tsx    # Layout principal con sidebar
│       ├── Avatar.tsx       # Badges de usuario
│       ├── DashboardHero.tsx# Hero de bienvenida
│       ├── Panel.tsx        # Contenedores de panel
│       └── FrappeLookup.tsx # Búsqueda de documentos Frappe
├── package.json
├── vite.config.ts        # Proxy dev server -> BFF
└── playwright.config.ts  # Testing E2E
```

### Páginas y Rutas

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/me` | MePage | Dashboard personal: tareas atrasadas, bloqueadas, próximas, carga del equipo |
| `/projects` | ProjectsPage | Listado de proyectos con filtro por departamento (SALES, OPS, MKT) |
| `/projects/:id` | ProjectPage | Vista detallada de proyecto con tareas/tablero |
| `/people` | PeoplePage | Vista del equipo y su carga de trabajo |
| `/erp` | ErpPage | Explorador de módulos ERP/CRM (iframe a Frappe) |
| `/crm` | ErpPage | Redirección a ERP con módulo CRM |
| `/login` | LoginPage | Página de autenticación |

### UI (Principio)

- Hay un único "dashboard personal" (misma estructura visual).
- Cambia solo el **scope de datos**:
  - **Manager**: vista **Team** (overview global del equipo).
  - **Persona (Sales/Ops/Mkt)**: vista **Me** (sus tareas + su agenda).

### Sistema de Diseño

Variables CSS principales en `index.css`:

```css
--accent: #f7d15f;     /* Amarillo - highlights principales */
--border, --border2    /* Divisores sutiles */
--muted, --muted2      /* Texto secundario */
--danger               /* Estado de error/peligro */
--warn                 /* Estado de advertencia */
--ok                   /* Estado correcto */
```

- **Responsive:** Breakpoint móvil a 900px (sidebar se vuelve sticky top)
- **Componentes:** Layouts grid, cards, listas, tableros, modales
- **Accesibilidad:** Icons con aria-hidden, estados de focus, HTML semántico

### Dependencias Principales

- `react`, `react-dom` - Framework UI
- `react-router-dom` - Enrutamiento cliente
- `vite` - Build tool
- `playwright` - Testing E2E
- `typescript`, `eslint` - Calidad de código

---

## Backend-for-Frontend (BFF)

**Ubicación:** `/workhub/bff/app/`
**Framework:** FastAPI (Python) sobre Uvicorn

### Estructura de Archivos

```
bff/app/
├── main.py           # Router principal (4400+ líneas, 50+ endpoints)
├── models.py         # Clases Pydantic (DTOs)
├── settings.py       # Configuración de entorno
├── auth.py           # Autenticación y autorización
├── ops.py            # Métricas operacionales
├── __main__.py       # Entry point Uvicorn
└── clients/          # Clientes de integración
    ├── frappe.py     # Cliente HTTP para Frappe REST API
    └── leantime.py   # Cliente JSON-RPC para Leantime
```

### Middleware Pipeline

```python
@app.middleware("http")
async def _request_id_middleware(request, call_next):
    # 1. Asigna request ID
    # 2. Verifica rate limit
    # 3. Verifica auth para /api/* (excepto /api/auth/*)
    # 4. Verifica rol DIRECTOR para /api/ops/*, /api/erp/*, /api/flows/*
    # 5. Registra métricas
```

### Categorías de Endpoints

#### Health & Auth
- `GET /health` - Health check
- `GET /api/auth/me` - Info del usuario actual
- `GET /api/auth/mode` - Modo de auth (off|dev|google)
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/google/login` - Redirect OAuth
- `GET /api/auth/google/callback` - Callback OAuth
- `GET /api/auth/dev/login` - Auto-login desarrollo

#### Dashboard
- `GET /api/people` - Lista de miembros del equipo con conteos
- `GET /api/me/overview` - Dashboard del usuario actual
- `GET /api/people/{person_id}/overview` - Dashboard de persona específica

#### Proyectos
- `GET /api/projects` - Listar proyectos (filtro por departamento)
- `GET /api/projects/{project_id}` - Detalle de proyecto
- `POST /api/projects` - Crear proyecto

#### Tareas
- `POST /api/tasks` - Crear tarea (crea en Leantime + WorkLink)
- `PATCH /api/tasks/{task_id}` - Actualizar estado, asignado, prioridad
- `GET /api/tasks/{task_id}` - Obtener detalle de tarea
- `POST /api/tasks/{task_id}/time/start` - Iniciar time tracking
- `POST /api/tasks/{task_id}/time/stop` - Detener time tracking
- `POST /api/tasks/{task_id}/time/log` - Log manual de tiempo

#### Milestones
- `GET /api/projects/{project_id}/milestones`
- `POST /api/projects/{project_id}/milestones`

#### WorkLinks & Contexto
- `GET /api/worklinks` - Enlaces de contexto de negocio
- `GET /api/context/search` - Buscar documentos de negocio
- `GET /api/context/{doctype}/{doc_id}` - Obtener contexto específico

#### Frappe/ERP
- `GET /api/frappe/modules` - Listar módulos
- `GET /api/frappe/list` - Listar documentos por doctype
- `GET /api/frappe/get` - Obtener documento específico
- `GET /api/frappe/search` - Buscar documentos
- `GET /api/frappe/meta` - Obtener metadata de doctype
- `POST /api/frappe/create` - Crear documento
- `POST /api/frappe/save` - Actualizar documento

#### CRM
- `GET /api/crm/doctypes` - Doctypes de CRM
- `GET /api/crm/meta` - Metadata CRM
- `GET /api/crm/list` - Listar documentos CRM
- `GET /api/crm/get` - Obtener documento CRM
- `POST /api/crm/create` - Crear registro CRM
- `POST /api/crm/update` - Actualizar registro CRM
- `POST /api/crm/delete` - Eliminar registro CRM

#### ERP Flows (solo DIRECTOR)
- **Ventas:** Sales Order -> Delivery Note -> Sales Invoice -> Payment Entry
- **Compras:** Purchase Order -> Purchase Receipt -> Stock Entry -> Purchase Invoice
- **Producción:** Work Order -> Consumo/Salida/Batch/Quality Inspection

#### Ops & Events
- `GET /api/ops/status` - Estado operacional
- `GET /api/ops/metrics` - Métricas de rendimiento
- `GET /api/ops/alerts` - Alertas del sistema
- `GET /api/events` - Listar eventos calendario
- `POST /api/events` - Crear evento

### Configuración (settings.py)

| Variable | Descripción |
|----------|-------------|
| `AUTH_MODE` | Estrategia de auth (off\|dev\|google) |
| `FRAPPE_MODE` | Backend Frappe (mock\|live) |
| `LEANTIME_MODE` | Backend Leantime (mock\|live) |
| `FRAPPE_BASE_URL` | URL del servicio Frappe |
| `LEANTIME_BASE_URL` | URL del servicio Leantime |
| `FRAPPE_API_TOKEN` | Token de API Frappe |
| `LEANTIME_API_KEY` | API Key de Leantime |
| `RATE_LIMIT_RPM` | Límite de requests por minuto |

### Clientes de Integración

#### LeantimeClient (`clients/leantime.py`)
- Cliente JSON-RPC para Leantime
- Métodos: `users_get_all()`, `projects_get_all()`, `tasks_get()`, `tasks_add()`, `tasks_edit()`
- Reintentos con backoff exponencial (3 intentos)
- Auth: x-api-key + Bearer token

#### FrappeClient (`clients/frappe.py`)
- Cliente HTTP para Frappe REST API
- Auth: token (key:secret) o basado en sesión
- Métodos: `create_worklink()`, `get_resource()`, `list_resource()`, `get_meta()`, `create_doc()`, `update_doc()`, `search_docs()`
- Reintentos (3 intentos para operaciones idempotentes)

---

## Modelo de Datos

### Entidad Principal: Task (SSOT en Leantime)

```
TaskDTO
├── id: string
├── title: string
├── status: BACKLOG | NEXT | DOING | BLOCKED | DONE
├── priority: P0 | P1 | P2
├── department: SALES | OPS | MKT
├── assignee: string (person_id)
├── due_date: date
├── project: string (project_id)
└── Relaciones:
    ├── WorkLink -> Contexto de negocio (documentos Frappe)
    └── depends_on -> Otras tareas (dependencias/bloqueos)
```

### Project

```
Project
├── name: string
├── health: GREEN | YELLOW | RED
├── progress: { done, total, pct }
├── blocked_count: int
├── overdue_count: int
├── next_milestone: date
└── score: float
```

### WorkLink (Doctype custom en Frappe)

```
WorkLink
├── Enlaza Task <-> Documento de Negocio
│   (Customer, Lead, Sales Order, etc.)
├── Sincroniza estado, asignado, fecha entre sistemas
└── Estado de sync
```

### Roles de Usuario

| Rol | Permisos |
|-----|----------|
| DIRECTOR | Acceso completo: ERP flows, ops, todas las APIs |
| USER | Acceso a tareas propias, proyectos, dashboard |

---

## Flujo de Conexión

### Ejemplo: Crear una Tarea

```
1. Portal (React) -> POST /api/tasks {title, department, assignee, context}

2. BFF Middleware:
   - Extraer usuario de sesión
   - Verificar autorización
   - Verificar rate limit

3. BFF Endpoint Handler:
   - Crear tarea en Leantime (LeantimeClient)
   - Crear WorkLink en Frappe si hay contexto
   - Vincular IDs (leantime_task_id, worklink_id)
   - Retornar TaskDTO

4. Portal -> Actualizar estado local -> Re-render UI
```

### Ejemplo: Ver Dashboard (/me)

```
1. Portal -> GET /api/me/overview

2. BFF:
   - Obtener usuario de sesión
   - Consultar Leantime: tareas del usuario (atrasadas, bloqueadas, próximas)
   - Agregar carga del equipo (conteos por persona)
   - Consultar proyectos en riesgo (por estado de salud)
   - Obtener agenda (tareas + milestones + eventos)

3. Retornar MeOverviewResponse

4. Portal -> Renderizar hero, paneles, listas
```

---

## Configuración y Despliegue

### Archivos de Configuración

- `.env` (raíz del proyecto) - Variables de entorno BFF/Portal
- `docker-compose.yml` - Orquesta Portal (Node 20), BFF (FastAPI), Sync worker

### Comandos de Desarrollo

```bash
# Con Docker
docker-compose up

# Local (sin Docker)
cd portal && npm install && npm run dev
cd bff && pip install -r requirements.txt && python -m app
```

---

## Principios de Diseño

1. **Single Source of Truth (SSOT):**
   - Tareas -> Leantime
   - Documentos de negocio -> Frappe
   - Puente -> WorkLink (doctype custom)

2. **Simplicidad del Portal:** Sin llamadas directas a ERP/PM; todo a través del BFF

3. **Autenticación Stateless:** Basada en sesión, con auto-login en modo desarrollo

4. **Páginas Modulares:** Cada página (Me, Projects, People, ERP) es autocontenida

5. **UX TDAH-Friendly:** Diseño minimalista, carga cognitiva limitada, CTAs claros

6. **Idempotencia:** Operaciones críticas usan claves de idempotencia

7. **Rate Limiting & Métricas:** Observabilidad integrada para monitoreo de ops

---

## Resumen de Tecnologías

| Capa | Tecnología | Propósito |
|------|------------|-----------|
| Frontend | React 19 + TS + React Router 7 + Vite | Interfaz de usuario (Portal) |
| API Gateway | FastAPI + Uvicorn | BFF: routing, auth, middleware |
| PM Backend | Leantime (externo) | SSOT de gestión de tareas |
| ERP Backend | Frappe/ERPNext (externo) | SSOT de documentos de negocio |
| Sync | Python worker | Polling y rollups |
| Auth | Google OAuth + Session middleware | Autenticación de usuarios |
| Métricas | OpsMetrics in-memory | Monitoreo de rendimiento |
