# WorkHub frontend candidate — VERIFY AGAINST FIREBASE LIVE

Este árbol puede coincidir con el frontend Vite servido en:
https://santa-brisa-erp.web.app/

Regla actual: la URL live manda. Antes de tocar/deployar, comparar assets y shell visible con producción. La última verificación live mostró Vite assets `/assets/index-BbMJsUvQ.js` y `/assets/index-CSRsFkJF.css`, no la app Next.js.

El repo Next.js `/Users/martinjaimesamperiz/santa brisa work hub/Santa-brisa-ERP` fue descartado por el usuario como frontend equivocado para esta URL.

---

## Contenido anterior conservado como reglas de proyecto

# WorkHub - Reglas para Claude

Este documento extiende `../../skills/guardrails/GLOBAL_RULES.md`

---

## 🎨 PAUTAS DE DISEÑO - OBLIGATORIO

> **⚠️ ES IMPRESCINDIBLE seguir las pautas del Santa Brisa Design System antes de cualquier implementación UI.**

### Referencia Visual Obligatoria

**ANTES de crear o modificar cualquier componente UI, DEBES revisar:**
```
docs/design/santa-brisa-design-system.html
```

Este archivo HTML contiene:
- Paleta de colores oficial (Gold, Turquoise, Success, Error, Warning, Neutrals)
- Tipografía (Playfair Display para headings, System UI para body)
- Componentes de botones (Primary, Secondary, Outline, Success, Danger, Ghost)
- Cards y sus variantes (Default, Hover, Highlight, Info, Success, Error)
- Tablas con headers dorados y filas alternadas
- KPI Cards con bordes de color y iconos
- Badges y estados
- Alerts y banners
- Inputs y formularios
- Drawers y modales

### Reglas de Diseño Estrictas

1. **NO usar estilos neobrutalistas** - No shadow-brutal, no bordes gruesos oscuros
2. **Colores desde design-tokens.ts** - Siempre importar de `@/styles/design-tokens`
3. **Border radius: `rounded-sm` (2px)** - Es el default del sistema
4. **Headers de tabla: `bg-gold-light`** - Fondo dorado claro
5. **Botón primario: `bg-gold`** - Dorado para CTAs principales
6. **Botón secundario: `bg-turquoise`** - Turquesa para acciones secundarias

### Verificación Pre-Implementación

```bash
# Abrir el design system en el navegador para referencia visual:
open docs/design/santa-brisa-design-system.html
```

---

## 📊 DATA SOURCES - OBLIGATORIO

> **⚠️ ES IMPRESCINDIBLE entender las fuentes de datos antes de cualquier implementación que involucre datos.**

### Referencia de Data Sources Obligatoria

**ANTES de crear o modificar cualquier lógica de datos, DEBES revisar:**
```
docs/momentum-data-sources.md
```

### SSOT (Single Source of Truth) por Dominio

| Dominio | SSOT | DocTypes |
|---------|------|----------|
| **Comercial** | Frappe CRM | Organization, Contact, Deal, Email/Notes/Call Logs |
| **Trabajo (Tareas)** | ERPNext | Project, Task + Frappe ToDo/Assignments |
| **Archivos** | Frappe | File (Attachments) linked to Organization/Deal/Task |
| **Sell-in** | ERPNext | Quotation, Sales Order, Invoice, Delivery Note |
| **Sell-out** | Custom | Distributor Sell Out Order |
| **Cuentas/Distribuidores** | Momentum Account | Momentum Account (SSOT para todas las cuentas comerciales) |

### Modelo de Negocio: Sell In vs Sell Out vs Distribuidor

| Concepto | Descripción | Identificador |
|----------|-------------|---------------|
| **Sell In** | Venta directa (particular, online, HORECA) | `sale_type = "Sell In"` |
| **Sell Out** | Venta a través de distribuidor | `sale_type = "Sell Out"` |
| **Distribuidor** | Cuenta que revende productos | `sales_channel = "Distribuidor"` |

⚠️ **IMPORTANTE:** Un Distribuidor NO se identifica por `sale_type = "Sell In"`. Se identifica por `sales_channel = "Distribuidor"`.

**Reglas:**
- Sell In requiere `sell_in_enabled = true` (datos fiscales completos)
- Sell Out requiere `distributor` asignado antes de Won
- Campo `distributor` es Link a `Momentum Account` filtrado por `sales_channel = "Distribuidor"`
- Si `account.sale_type` ya esta definido, NO mostrar selector de Tipo de Venta al crear pedido (se hereda de la cuenta)
- Default cuando no hay sale_type: **"Sell In"** (no "Sell Out")

### DocTypes Principales

- **CRM Organization** - Perfil de cuenta + campos custom (google_place_id, ratings, momentum_account_id, erpnext_customer)
- **CRM Contact** - Personas/contactos
- **CRM Deal** - Pipeline + anchor de actividades
- **CRM Note / Call Log / Email** - Actividades comerciales
- **ERPNext Task** - Tareas con links a crm_organization/crm_deal
- **ERPNext Project** - Solo para iniciativas multi-tarea
- **Distributor Sell Out Order** - Ventas de distribuidores (custom)

### APIs Principales

| Endpoint | Fuente de Datos |
|----------|-----------------|
| `get_org` | CRM Organization + deal summary + actividades recientes |
| `get_org_full_history` | Agregador: CRM (notes, calls, emails) + ERPNext (sell-in) + Sell-out + Files + Tasks |
| `get_user_kpis` | Momentum Activity (points_awarded) |
| `create_interaction` | call→CRM Call Log, note→CRM Note, next action→ERPNext Task |
| `move_account` | Actualiza Deal stage + crea Task según reglas |
| `get_products` | Items con precios y stock (existe en `momentum.py` como proxy a `sales.py`) |
| `get_invoices` | Lista de Sales Invoices con status, montos, fechas |
| `get_invoice_detail` | Detalle completo: items, pagos, impuestos, direccion |
| `get_invoice_kpis` | KPIs mensuales: facturado, cobrado, pendiente, vencido |
| `create_payment_entry` | Crear Payment Entry para una Sales Invoice |
| `submit_order` | Confirmar pedido (Draft -> Pending Delivery) |
| `create_delivery_note` | Crear Delivery Note desde Sales Order |
| `create_sales_invoice` | Crear Sales Invoice desde DN o SO |
| `get_invoice_pdf` | PDF base64 de factura |
| `get_delivery_note_pdf` | PDF base64 de albaran |
| `send_email` | Enviar email via Gmail API (en `gmail.py`) |

### Flujo de Pedido (5 etapas)

```
Draft -> Pending Delivery -> Pending Invoice -> Pending Payment -> Completed
  |            |                    |                   |
  v            v                    v                   v
submitOrder    createDeliveryNote   createSalesInvoice  createPaymentEntry
```

### Frontend Service Bridge (`sales.ts`)

El archivo `web/src/api/services/sales.ts` es el bridge entre React y el backend Frappe.
Transforma campos de snake_case (backend) a camelCase (frontend).

Tipos principales: `Order`, `Invoice`, `InvoiceKPIs`, `InvoiceDetail`, `Product`, `WorkLink`

### Identificadores y Links

- **Primary external id:** `Organization.google_place_id`
- **Legacy id:** `Organization.momentum_account_id`
- **ERP link:** `Organization.erpnext_customer`
- **Tasks link:** `ERPNext Task.crm_organization` / `Task.crm_deal`

### Reglas Estrictas de Datos

1. **NO crear doctypes duplicados** - Usar los SSOT definidos arriba
2. **Tasks SOLO en ERPNext** - No usar CRM "tasks" aunque existan
3. **Timeline unificada** - Usar agregador con TimelineItem (source/ref/ts)
4. **Links customer** - Usar `Organization.erpnext_customer`, NO `linked_customer`
5. **KPIs** - Derivar de `Momentum Activity points`, NO de Weekly Goal doc

---

## 📁 ESTRUCTURA Y CÓDIGO LIMPIO - OBLIGATORIO

> **⚠️ ES IMPRESCINDIBLE mantener el orden de carpetas y eliminar/deprecar código en desuso.**

### Reglas de Estructura de Carpetas

**ANTES de crear nuevos archivos o carpetas, verifica:**
1. ¿Ya existe una carpeta apropiada para este tipo de archivo?
2. ¿Sigue el patrón establecido en el proyecto?
3. ¿El nombre es consistente con las convenciones existentes?

### Estructura Canónica del Proyecto

```
apps/workhub/
├── frappe-app/                    # App Frappe (backend)
│   └── workhub_frappe_app/
│       ├── api/                   # Endpoints API
│       ├── doctype/               # DocTypes
│       ├── hooks.py               # Config Frappe
│       ├── public/                # Assets estáticos
│       ├── templates/             # Jinja2
│       └── www/                   # Páginas web
├── web/                           # Frontend React/Vite
│   └── src/
│       ├── api/                   # Llamadas API + tipos
│       │   └── types/             # TypeScript types
│       ├── components/            # Componentes React
│       │   ├── ui/                # Componentes base (Button, Card, etc.)
│       │   └── [feature]/         # Componentes por feature
│       ├── hooks/                 # Custom hooks
│       ├── pages/                 # Páginas/rutas
│       ├── styles/                # CSS + design tokens (SSOT)
│       └── utils/                 # Utilidades
├── docs/                          # Documentación
│   └── design/                    # Design system
├── scripts/                       # Scripts operacionales
└── tests/                         # Tests E2E
```

### Reglas Estrictas de Organización

1. **NO crear carpetas duplicadas** - Si existe `components/ui/`, no crear `components/common/`
2. **NO mezclar concerns** - Separar API, componentes, hooks, utils
3. **Naming consistente** - kebab-case para archivos, PascalCase para componentes
4. **Index files** - Usar `index.ts` para re-exports públicos
5. **Colocación por feature** - Componentes específicos van en su carpeta de feature

### Gestión de Código en Desuso

#### ⚠️ OBLIGATORIO: Eliminar o Deprecar

**Cuando encuentres código sin usar:**

1. **Si NO tiene dependencias activas → ELIMINAR**
   ```bash
   # Verificar uso antes de eliminar
   grep -r "nombreFuncion" --include="*.ts" --include="*.tsx"
   ```

2. **Si tiene dependencias pero hay versión nueva → DEPRECAR**
   ```typescript
   /**
    * @deprecated Usar `nuevaFuncion` en su lugar. Se eliminará en v2.0
    * @see nuevaFuncion
    */
   export function funcionAntigua() { ... }
   ```

3. **Si es código legacy crítico → DOCUMENTAR plan de migración**
   ```typescript
   // TODO: [MIGRATION] Migrar a nuevo sistema antes de Q2 2026
   // Issue: #123
   ```

### Checklist Pre-Commit

Antes de hacer commit, verificar:

- [ ] ¿Los archivos nuevos están en la carpeta correcta?
- [ ] ¿Se eliminó código muerto/comentado?
- [ ] ¿Se deprecaron funciones reemplazadas?
- [ ] ¿Los imports son desde las rutas correctas (no legacy)?
- [ ] ¿No hay archivos duplicados o con nombres similares?

### Archivos a Vigilar (Propensos a Desorden)

| Tipo | Ubicación Correcta | ❌ NO crear en |
|------|-------------------|----------------|
| Componentes UI base | `web/src/components/ui/` | `components/common/`, `components/shared/` |
| Types de API | `web/src/api/types/` | `types/`, `src/types/` |
| Design tokens | `web/src/styles/design-tokens.ts` | `styles/tokens.ts`, `constants/colors.ts` |
| Hooks genéricos | `web/src/hooks/` | `utils/hooks/`, `components/hooks/` |
| Utils | `web/src/utils/` | `helpers/`, `lib/`, `common/` |

### Comando de Limpieza

```bash
# Buscar archivos potencialmente duplicados o en desuso
find . -name "*.bak" -o -name "*.old" -o -name "*-copy*" -o -name "*_old*"

# Buscar imports no usados (requiere eslint)
npx eslint --rule 'no-unused-vars: error' src/

# Buscar exports no usados
npx ts-prune
```

---

## 🚀 Skills Disponibles (Antigravity Awesome Skills)

**IMPORTANTE:** Antes de comenzar cualquier tarea, revisa si existe una skill relevante en:
```
antigravity-awesome-skills/skills/
```

### Cómo usar las skills

1. **Buscar skill relevante:** Consulta el índice en `antigravity-awesome-skills/skills_index.json`
2. **Leer el SKILL.md:** Cada skill tiene un archivo SKILL.md con instrucciones específicas
3. **Aplicar las mejores prácticas:** Sigue las guías de la skill para obtener mejores resultados

### Skills Recomendadas por Categoría

| Categoría | Skills Relevantes |
|-----------|-------------------|
| **Frontend/React** | `react-patterns`, `react-best-practices`, `react-ui-patterns`, `tailwind-patterns`, `frontend-guidelines` |
| **Backend** | `backend-dev-guidelines`, `api-patterns`, `python-patterns`, `prisma-expert` |
| **Testing** | `testing-patterns`, `tdd-workflow`, `test-driven-development`, `playwright-skill` |
| **Arquitectura** | `software-architecture`, `architecture`, `senior-architect`, `api-documentation-generator` |
| **TypeScript** | `typescript-expert`, `typescript-patterns` |
| **Git/Workflows** | `using-git-worktrees`, `git-conventions` |
| **Debugging** | `systematic-debugging`, `test-fixing` |
| **Documentación** | `writing-plans`, `plan-writing`, `doc-coauthoring` |
| **Seguridad** | `cc-skill-security-review`, `top-web-vulnerabilities` |
| **Performance** | `performance-profiling` |
| **UI/UX** | `ui-ux-pro-max`, `web-design-guidelines`, `canvas-design` |
| **Agentes IA** | `agent-memory-systems`, `autonomous-agent-patterns`, `ai-agents-architect` |

### Ejemplo de Uso

```bash
# Antes de implementar un componente React:
cat antigravity-awesome-skills/skills/react-patterns/SKILL.md

# Antes de escribir tests:
cat antigravity-awesome-skills/skills/testing-patterns/SKILL.md

# Para debugging sistemático:
cat antigravity-awesome-skills/skills/systematic-debugging/SKILL.md
```

### Índice Completo

El archivo `antigravity-awesome-skills/skills_index.json` contiene las **229 skills** disponibles con:
- `id`: Identificador único
- `path`: Ruta a la skill
- `name`: Nombre descriptivo
- `description`: Cuándo usar la skill

## Contexto

WorkHub es una app de Frappe/ERPNext que integra:
- **Leantime** (gestión de proyectos) - SSOT para tareas
- **Frappe/ERPNext** (ERP) - SSOT para documentos de negocio
- **WorkLink** (DocType puente) - Conecta tareas con documentos ERP

## Arquitectura

```
Browser
    |
    v
Frappe (workhub_frappe_app)
    |
    +---> Leantime (PM/Tasks) [Puerto 7313]
    +---> ERPNext (Business docs) [Puerto 7312]
```

## Reglas Específicas

### Servicios Externos
- Frappe/Leantime son servicios **EXTERNOS** (no Docker en monorepo)
- URLs configuradas via `.env` (FRAPPE_BASE_URL, LEANTIME_BASE_URL)
- NO registrar en `infra/services.yaml`

### Desarrollo
- Mantener compatibilidad con `bench` para desarrollo Frappe
- Código Python sigue estilo Frappe (no Clean Architecture)
- El código vive en monorepo, runtime en Frappe bench via symlink

### SSOT (Single Source of Truth)
- **Tareas/estados/fechas/asignación:** Leantime
- **Documentos de negocio + WorkLink:** Frappe

## Estructura

```
apps/workhub/
├── frappe-app/           # Código de la app Frappe
│   └── workhub_frappe_app/
│       ├── hooks.py      # Configuración Frappe
│       ├── doctype/      # DocTypes (WorkLink, etc.)
│       ├── www/          # Páginas web
│       ├── public/       # Assets JS/CSS
│       └── templates/    # Templates Jinja2
├── scripts/              # Scripts operacionales
└── docs/                 # Documentación
```

## Comandos Útiles

```bash
# Desde monorepo (editar código)
cd /Users/martinjaimesamperiz/vibe-monorepo/apps/workhub

# Desde bench (ejecutar/probar)
cd /Users/martinjaimesamperiz/santabrisa/frappe-bench
bench start

# Migraciones
bench --site <site> migrate

# Build assets (Frappe)
bench build --app workhub_frappe_app
```

### Deploy Frontend (Firebase Hosting)

⚠️ **PROHIBIDO: NO existe source frontend. NO hacer `vite build`. NO buscar carpeta `web/`.**
El frontend se edita DIRECTAMENTE en los minificados de `santabrisa-workhub/public/assets/`.

```bash
# Editar minificados directamente en:
# /Users/martinjaimesamperiz/santabrisa-workhub/public/assets/

# Deploy
cd /Users/martinjaimesamperiz/santabrisa-workhub
npx firebase deploy --only hosting --project santa-brisa-erp
```

### Deploy Backend (GCP VM)

```bash
# SSH al servidor
ssh -i ~/.ssh/google_compute_engine martinjaimesamperiz@35.205.146.98

# Ejecutar scripts Python con frappe
sudo -u frappe bash -l -c 'cd /home/frappe/frappe-bench && /home/frappe/frappe-bench/env/bin/python3 /tmp/script.py'

# Reiniciar bench
sudo -u frappe bash -l -c 'cd /home/frappe/frappe-bench && bench restart'
```

**URL produccion**: https://santa-brisa-erp.web.app

## Departamentos

- `SALES` - Ventas
- `OPS` - Operaciones
- `MKT` - Marketing

## Estados de Tareas

`BACKLOG` → `NEXT` → `DOING` → `BLOCKED` → `DONE`

## Prioridades

- `P0` - Crítica
- `P1` - Alta
- `P2` - Normal

## Sistema de Diseño - Santa Brisa Elegante

### ⚠️ IMPORTANTE: Single Source of Truth

**ÚNICA fuente de verdad para tokens de diseño:**
```
web/src/styles/design-tokens.ts  ← PRODUCTION (SSOT)
```

**Archivos que RE-EXPORTAN desde Production (NO modificar directamente):**
- `web/src/api/types/ssot/design-tokens.ts` - Re-exports + mapeos legacy deprecados
- `web/src/api/types/ssot/styles.ts` - Estilos por enum importando colores de Production
- `web/src/components/ui/santa-brisa.tsx` - Componentes UI importando de Production

### Paleta de Colores (Production)

```typescript
// Importar SIEMPRE desde:
import { colors, tw } from '@/styles/design-tokens'

// Colores principales:
colors.gold.DEFAULT     // '#F5CE3E' - Primario, CTAs
colors.turquoise.DEFAULT // '#5BBFBF' - Info, enlaces
colors.success.DEFAULT  // '#4CAF7A' - Éxito
colors.error.DEFAULT    // '#E07A4C' - Error/Coral
colors.warning.DEFAULT  // '#E5A530' - Advertencia
colors.neutral[700]     // '#44403C' - Texto principal
colors.background.page  // '#FFFDF7' - Fondo página (crema)
```

### Tipografía

- **Headings:** Playfair Display (serif elegante)
- **Body:** system-ui (sans-serif)
- **Labels:** 11px uppercase, tracking 0.05em

### Colores DEPRECADOS ⚠️

NO usar en código nuevo (solo compatibilidad):
- `purple`, `purpleLight` → usar `turquoise`
- `blue`, `blueLight` → usar `turquoise`
- `pink`, `pinkLight` → usar `error`
- `cyan`, `cyanLight` → usar `turquoise`

### Archivos Legacy (NO son SSOT)

Estos archivos existen pero NO son fuente de verdad:
- `design/design-system/tokens-v2.css` - CSS variables (referencia visual)
- `design/design-system/tokens.css` - CSS variables anterior
- `frappe-app/.../variables.css` - Variables Frappe legacy
- Componentes con colores hardcodeados (MomentumKanban, etc.)

### Cómo usar

```typescript
// ✅ CORRECTO - Importar desde Production
import { colors, tw, buttonStyles } from '@/styles/design-tokens'

// ✅ CORRECTO - Usar helpers Tailwind
<h1 className={tw.h1}>Título</h1>
<button className={buttonStyles.primary}>Acción</button>

// ❌ INCORRECTO - Hardcodear colores
<div style={{ color: '#F5CE3E' }}>...</div>

// ❌ INCORRECTO - Importar desde SSOT design-tokens
import { COLORS } from '@/api/types/ssot/design-tokens' // Deprecado
```
