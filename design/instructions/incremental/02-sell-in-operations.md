# Milestone 2: SELL IN Operations

> **Provide alongside:** `product-overview.md`
> **Prerequisites:** Milestone 1 (Foundation) complete

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
- **DO** implement empty states when no records exist
- **DO** use test-driven development - write tests first using `tests.md` instructions

---

## Goal

Implement the SELL IN Operations feature - ventas directas de Santa Brisa a clientes y distribuidores.

## Overview

Modulo de ventas directas que cubre todo el ciclo desde la captacion de oportunidades hasta el seguimiento de pedidos. Los comerciales usan este modulo para gestionar su pipeline, registrar pedidos y consultar el estado de entregas.

**Key Functionality:**
- Dashboard con KPIs de ventas (mes actual, pedidos activos, ticket promedio)
- Pipeline Kanban de oportunidades comerciales
- Gestion de clientes directos y distribuidores
- Lista de pedidos con estado de entrega y facturacion
- Analytics de tendencias de ventas

## Recommended Approach: Test-Driven Development

Before implementing this section, **write tests first** based on the test specifications provided.

See `product-plan/sections/sell-in-operations/tests.md` for detailed test-writing instructions including:
- Key user flows to test (success and failure paths)
- Specific UI elements, button labels, and interactions to verify
- Expected behaviors and assertions

**TDD Workflow:**
1. Read `tests.md` and write failing tests for the key user flows
2. Implement the feature to make tests pass
3. Refactor while keeping tests green

## What to Implement

### Components

Copy the section components from `product-plan/sections/sell-in-operations/components/`:

- `SellInDashboard.tsx` - Main dashboard with KPIs and activity feed
- `Pipeline.tsx` - Kanban board for opportunities
- `CustomerList.tsx` - Customer management table
- `OrderList.tsx` - Sales orders table
- `KPICard.tsx` - Reusable KPI card component
- `MiniBarChart.tsx` - Sparkline charts
- `ActivityFeed.tsx` - Recent activity timeline

### Data Layer

The components expect these data shapes:

```typescript
interface KPI {
  value: number
  previousValue: number
  change: number
  label: string
}

interface Opportunity {
  id: string
  title: string
  customerName: string
  value: number
  stage: 'new' | 'contacted' | 'proposal' | 'negotiation' | 'won' | 'lost'
  daysInStage: number
  assignee: string
}

interface Customer {
  id: string
  name: string
  type: 'direct' | 'distributor'
  zone: string
  status: 'active' | 'inactive' | 'prospect'
  totalOrders: number
  totalRevenue: number
}

interface SalesOrder {
  id: string
  orderNumber: string
  customerName: string
  orderDate: string
  status: 'draft' | 'confirmed' | 'in_transit' | 'delivered' | 'invoiced' | 'paid'
  total: number
  deliveryProgress: number
}
```

### Callbacks

Wire up these user actions:

| Callback | Description |
|----------|-------------|
| `onKpiClick` | Navigate to detailed view for that KPI |
| `onCreateOrder` | Open new order form |
| `onMoveOpportunity` | Update opportunity stage (drag & drop) |
| `onViewOpportunity` | Navigate to opportunity detail |
| `onViewCustomer` | Navigate to customer detail |
| `onCreateCustomer` | Open new customer form |
| `onViewOrder` | Navigate to order detail |
| `onFilterChange` | Update list filters |

### Empty States

Implement empty state UI for when no records exist yet:

- **No opportunities:** Show "Crea tu primera oportunidad" with CTA button
- **No customers:** Show "Registra tu primer cliente" with CTA
- **No orders:** Show "Aun no hay pedidos" with create button

## Files to Reference

- `product-plan/sections/sell-in-operations/README.md` - Feature overview
- `product-plan/sections/sell-in-operations/tests.md` - Test-writing instructions
- `product-plan/sections/sell-in-operations/components/` - React components
- `product-plan/sections/sell-in-operations/types.ts` - TypeScript interfaces
- `product-plan/sections/sell-in-operations/sample-data.json` - Test data
- `product-plan/sections/sell-in-operations/screenshot.png` - Visual reference

## Expected User Flows

### Flow 1: Crear Pedido

1. User clicks "Nuevo Pedido" button on dashboard
2. User selects existing customer or creates new
3. User adds items with quantity and price
4. System validates stock availability
5. User confirms order
6. **Outcome:** Sales Order created, redirects to order detail

### Flow 2: Mover Oportunidad en Pipeline

1. User drags opportunity card to new stage column
2. System shows confirmation modal with optional notes
3. User confirms
4. **Outcome:** Opportunity stage updated, card moves with animation

### Flow 3: Filtrar y Buscar Pedidos

1. User types in search bar or selects filters
2. List updates in real-time
3. User can save filter as custom view
4. **Outcome:** Filtered results shown

## Done When

- [ ] Tests written for key user flows (success and failure paths)
- [ ] All tests pass
- [ ] Dashboard shows KPIs with real data
- [ ] Pipeline Kanban shows opportunities, drag & drop works
- [ ] Customer list with filters and search works
- [ ] Orders list shows status and progress
- [ ] Empty states display properly when no records exist
- [ ] All callbacks wired to navigation and API
- [ ] Responsive on mobile
