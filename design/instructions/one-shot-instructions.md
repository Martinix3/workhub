# WorkHub - Complete Implementation Instructions

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

## Test-Driven Development

Each section includes a `tests.md` file with detailed test-writing instructions. These are **framework-agnostic** - adapt them to your testing setup (Jest, Vitest, Playwright, Cypress, RSpec, Minitest, PHPUnit, etc.).

**For each section:**
1. Read `product-plan/sections/[section-id]/tests.md`
2. Write failing tests for key user flows (success and failure paths)
3. Implement the feature to make tests pass
4. Refactor while keeping tests green

---

## Product Overview

WorkHub es el centro de operaciones digital de Santa Brisa que unifica ventas (SELL IN), distribuidores (SELL OUT), produccion, operaciones, finanzas y calidad en una interfaz TDAH-friendly.

**Sections to Build:**
1. SELL IN Operations
2. Distributor Network
3. Production & Quality
4. Marketing & Growth
5. Command Center

---

# Milestone 1: Foundation

## Goal

Set up the foundational elements: design tokens, data model types, routing structure, and application shell.

## What to Implement

### 1. Design Tokens

Configure your styling system with these tokens:

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

**Typography:**
- Heading: Playfair Display (serif)
- Body: Inter (sans-serif)
- Mono: JetBrains Mono (datos, KPIs)

### 2. Data Model Types

Create TypeScript interfaces for core entities:
- Customer, Lead, Opportunity
- Sales Order, Delivery Note, Sales Invoice
- Item, Warehouse, Stock Entry
- BOM, Work Order
- Distributor SELL OUT

### 3. Routing Structure

```
/                           -> Executive Dashboard
/ventas                     -> SELL IN Dashboard
/ventas/pipeline            -> Pipeline (Kanban)
/ventas/clientes            -> Customer List
/ventas/pedidos             -> Sales Orders
/distribuidores             -> Distributor Dashboard
/distribuidores/portal      -> Distributor Portal
/produccion                 -> Production Dashboard
/produccion/ordenes         -> Production Orders
/produccion/lotes           -> Lot Management
/calidad                    -> Quality Dashboard
/calidad/haccp              -> HACCP Monitor
/calidad/documentos         -> Document Library
/marketing                  -> Marketing Dashboard
/marketing/campanas         -> Campaigns
/finanzas                   -> Financial Overview
/reportes                   -> Reports Hub
```

### 4. Application Shell

Copy shell components from `product-plan/shell/components/`:
- `AppShell.tsx` - Main layout wrapper
- `MainNav.tsx` - Navigation component
- `UserMenu.tsx` - User menu with avatar

**Shell Design:**
- Sidebar: 240px fixed, fondo oscuro (#1e293b)
- Content: Fluid width, fondo claro (#fafaf8)
- Active item: Dorado #f5ce3e background

## Done When

- [ ] Design tokens configured
- [ ] Data model types defined
- [ ] Routes created for all sections
- [ ] Shell renders with navigation
- [ ] Responsive on mobile

---

# Milestone 2: SELL IN Operations

## Goal

Implement sales module - pipeline, customers, orders.

## Key Components

- `SellInDashboard.tsx` - KPIs and activity feed
- `Pipeline.tsx` - Kanban board for opportunities
- `CustomerList.tsx` - Customer management
- `OrderList.tsx` - Sales orders

## Key User Flows

1. **Crear Pedido:** Select customer -> Add items -> Validate stock -> Confirm
2. **Mover Oportunidad:** Drag card -> Confirm stage change -> Card animates
3. **Filtrar Pedidos:** Type in search -> List updates in real-time

## Done When

- [ ] Dashboard shows KPIs with real data
- [ ] Pipeline Kanban with drag & drop works
- [ ] Customer list with filters works
- [ ] Orders list shows status and progress

---

# Milestone 3: Distributor Network

## Goal

Implement distributor management and SELL OUT tracking.

## Key Components

- `DistributorDashboard.tsx` - Admin network view
- `DistributorPortal.tsx` - Self-service portal

## Key User Flows

1. **Admin View Metrics:** See network KPIs -> Select distributor -> View details
2. **Distributor Upload SELL OUT:** Select tab -> Fill form or upload CSV -> Confirm
3. **Distributor View Inventory:** See products -> Check calculated stock (SELL IN - SELL OUT)

## Done When

- [ ] Admin dashboard shows network KPIs
- [ ] Portal tabs work (Orders, SELL OUT, Inventory, Analytics)
- [ ] CSV upload processes correctly
- [ ] Inventory calculates automatically

---

# Milestone 4: Production & Quality

## Goal

Implement manufacturing and quality control.

## Key Components

- `ProductionDashboard.tsx` - OEE and line status
- `QualityDashboard.tsx` - Inspections and NCs
- `LotManagement.tsx` - Traceability
- `HACCPMonitor.tsx` - Critical control points
- `DocumentLibrary.tsx` - Document management

## Key User Flows

1. **Create Production Order:** Select product -> Set quantity -> Assign lot
2. **HACCP Monitoring:** Record reading -> Validate limits -> Alert if out of range
3. **Document Upload:** Upload file -> Set type/category -> Assign approvers

## Done When

- [ ] Production dashboard shows OEE
- [ ] Lot traceability works
- [ ] HACCP monitor shows CCPs with alerts
- [ ] Document library with version control works

---

# Milestone 5: Marketing & Growth

## Goal

Implement marketing campaigns and social media management.

## Key Components

- `MarketingDashboard.tsx` - KPIs and campaigns

## Key User Flows

1. **Create Campaign:** Define objective -> Set budget -> Select channels -> Activate
2. **Schedule Post:** Select platforms -> Write content -> Set date/time -> Confirm
3. **Review ROI:** View metrics -> Compare vs objective -> Adjust or pause

## Done When

- [ ] Dashboard shows marketing KPIs
- [ ] Campaigns list with budget progress works
- [ ] Social media feed shows posts
- [ ] Analytics charts render correctly

---

# Milestone 6: Command Center

## Goal

Implement executive dashboard and financial overview.

## Key Components

- `ExecutiveDashboard.tsx` - Area summaries with alerts

## Key User Flows

1. **Daily Review:** See traffic lights -> Identify alerts -> Navigate to source
2. **Generate Report:** Select type -> Define period -> Export PDF/Excel
3. **Review Finances:** See income/expenses -> Check receivables -> View projections

## Done When

- [ ] Executive dashboard shows all areas with status indicators
- [ ] Traffic light system works (green/yellow/red)
- [ ] Priority alerts display with actions
- [ ] Financial summary with receivables/payables works
- [ ] Reports hub with generate/schedule works

---

## Files to Reference

- `product-plan/product-overview.md` - Product summary
- `product-plan/design-system/` - Design tokens
- `product-plan/data-model/` - Type definitions
- `product-plan/shell/` - Application shell
- `product-plan/sections/[section-id]/` - Section components and specs
