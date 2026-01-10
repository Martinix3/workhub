# WorkHub - Reglas para Claude

Este documento extiende `../../skills/guardrails/GLOBAL_RULES.md`

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

# Build assets
bench build --app workhub_frappe_app
```

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
