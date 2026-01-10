# Milestone 1: Foundation

> **Provide alongside:** `product-overview.md`
> **Prerequisites:** None

---

## About These Instructions

**What you're receiving:**
- Finished UI designs (React components with full styling)
- Data model definitions (TypeScript types and sample data)
- UI/UX specifications (user flows, requirements, screenshots)
- Design system tokens (colors, typography, spacing)
- Test-writing instructions for each section (for TDD approach)

**What you need to build:**
- Backend API endpoints and database schema
- Authentication and authorization
- Data fetching and state management
- Business logic and validation
- Integration of the provided UI components with real data

**Important guidelines:**
- **DO NOT** redesign or restyle the provided components - use them as-is
- **DO** wire up the callback props to your routing and API calls
- **DO** replace sample data with real data from your backend
- **DO** implement proper error handling and loading states
- **DO** implement empty states when no records exist (first-time users, after deletions)
- **DO** use test-driven development - write tests first using `tests.md` instructions
- The components are props-based and ready to integrate - focus on the backend and data layer

---

## Goal

Set up the foundational elements: design tokens, data model types, routing structure, and application shell.

## What to Implement

### 1. Design Tokens

Configure your styling system with these tokens:

- See `product-plan/design-system/tokens.css` for CSS custom properties
- See `product-plan/design-system/tailwind-colors.md` for Tailwind configuration
- See `product-plan/design-system/fonts.md` for Google Fonts setup

**Color Palette (Santa Brisa):**
- Primary: amber (golden, warm)
- Secondary: orange (accent)
- Neutral: stone (backgrounds, text)
- Accent: cyan (links, interactive)

**Neobrutalismo Editorial Style:**
- Border: 2px solid for active elements
- Shadow: 4px 4px 0 #000 on hover
- Border-radius: 0px (maximum 2px)
- Transitions: 80ms ease-out

### 2. Data Model Types

Create TypeScript interfaces for your core entities:

- See `product-plan/data-model/types.ts` for interface definitions
- See `product-plan/data-model/README.md` for entity relationships

**Key Entities:**
- Customer, Lead, Opportunity
- Sales Order, Delivery Note, Sales Invoice
- Item, Warehouse, Stock Entry
- BOM, Work Order
- Distributor SELL OUT

### 3. Routing Structure

Create placeholder routes for each section:

```
/                           -> Executive Dashboard (Command Center)
/ventas                     -> SELL IN Dashboard
/ventas/pipeline            -> Pipeline (Kanban)
/ventas/clientes            -> Customer List
/ventas/pedidos             -> Sales Orders
/ventas/analytics           -> Sales Analytics
/distribuidores             -> Distributor Network Dashboard
/distribuidores/portal      -> Distributor Portal
/produccion                 -> Production Dashboard
/produccion/ordenes         -> Production Orders
/produccion/formulaciones   -> BOM / Formulations
/produccion/lotes           -> Lot Management
/calidad                    -> Quality Dashboard
/calidad/inspecciones       -> Inspections
/calidad/ncs                -> Non-Conformances
/calidad/haccp              -> HACCP Monitor
/calidad/documentos         -> Document Library
/marketing                  -> Marketing Dashboard
/marketing/campanas         -> Campaigns
/marketing/social           -> Social Media
/marketing/analytics        -> Marketing Analytics
/finanzas                   -> Financial Overview
/finanzas/cobros            -> Accounts Receivable
/finanzas/pagos             -> Accounts Payable
/admin                      -> Admin Settings
/reportes                   -> Reports Hub
```

### 4. Application Shell

Copy the shell components from `product-plan/shell/components/` to your project:

- `AppShell.tsx` - Main layout wrapper
- `MainNav.tsx` - Navigation component
- `UserMenu.tsx` - User menu with avatar

**Wire Up Navigation:**

The sidebar should include these sections:

- **Ejecutivo** - Dashboard, Alertas
- **Ventas** - Dashboard, Pipeline, Clientes, Pedidos, Analytics
- **Marketing** - Dashboard, Campanas, Social Media, Analytics
- **Operaciones** - Dashboard, Inventario, Recepciones, Logistica
- **Produccion** - Dashboard, Planta, Ordenes, Formulaciones
- **Calidad** - Dashboard, Lotes, APPCC, Documentos
- **Distribuidores** - Dashboard, Portal
- **Finanzas** - Dashboard, Cobros, Pagos
- **Admin** - Dashboard, Settings, Users

**Shell Design:**
- Sidebar: 240px fixed, fondo oscuro (#1e293b)
- Content: Fluid width, fondo claro (#fafaf8)
- Active item: Dorado #f5ce3e background

**User Menu:**

The user menu expects:
- User name
- Avatar URL (optional, uses initials if not)
- Role badge
- Logout callback

## Files to Reference

- `product-plan/design-system/` - Design tokens
- `product-plan/data-model/` - Type definitions
- `product-plan/shell/README.md` - Shell design intent
- `product-plan/shell/components/` - Shell React components
- `product-plan/shell/screenshot.png` - Shell visual reference (if available)

## Done When

- [ ] Design tokens are configured (colors, fonts, spacing)
- [ ] Data model types are defined
- [ ] Routes exist for all sections (can be placeholder pages)
- [ ] Shell renders with navigation
- [ ] Navigation links to correct routes
- [ ] User menu shows user info
- [ ] Responsive on mobile (sidebar collapses)
- [ ] Command Palette (Cmd+K) structure ready (optional for foundation)
