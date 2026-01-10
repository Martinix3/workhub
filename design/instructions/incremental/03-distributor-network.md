# Milestone 3: Distributor Network

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

Implement the Distributor Network feature - gestion de distribuidores y seguimiento de SELL OUT.

## Overview

Modulo de gestion de distribuidores con dos vistas principales: un dashboard administrativo para Santa Brisa (metricas agregadas de todos los distribuidores) y un portal de autoservicio para que cada distribuidor consulte sus pedidos, reporte ventas y vea su inventario calculado.

**Key Functionality:**
- Dashboard administrativo con KPIs de la red de distribuidores
- Lista de distribuidores con alertas de inactividad
- Portal de distribuidores: Mis Pedidos, Subir SELL OUT, Mi Inventario, Analytics
- Calculo automatico de inventario (SELL IN - SELL OUT)
- Importacion de SELL OUT via CSV

## Recommended Approach: Test-Driven Development

See `product-plan/sections/distributor-network/tests.md` for detailed test-writing instructions.

**TDD Workflow:**
1. Read `tests.md` and write failing tests for the key user flows
2. Implement the feature to make tests pass
3. Refactor while keeping tests green

## What to Implement

### Components

Copy the section components from `product-plan/sections/distributor-network/components/`:

- `DistributorDashboard.tsx` - Admin view with network KPIs
- `DistributorPortal.tsx` - Self-service portal with tabs

### Data Layer

The components expect these data shapes:

```typescript
interface NetworkKPI {
  value: number
  previousValue: number
  change: number
  label: string
}

interface Distributor {
  id: string
  name: string
  zone: string
  status: 'active' | 'warning' | 'inactive'
  sellInTotal: number
  sellOutTotal: number
  rotation: number
  daysWithoutReport: number
  alerts: string[]
}

interface MyOrder {
  id: string
  deliveryNumber: string
  orderDate: string
  status: 'pending' | 'in_transit' | 'delivered'
  total: number
  invoiceStatus: 'pending' | 'invoiced' | 'paid'
}

interface InventoryItem {
  itemCode: string
  itemName: string
  sellIn: number
  sellOut: number
  stockActual: number  // Calculated: sellIn - sellOut
  rotation: number
  status: 'normal' | 'low' | 'slow' | 'stagnant'
}
```

### Callbacks

Wire up these user actions:

| Callback | Description |
|----------|-------------|
| `onViewDistributor` | Navigate to distributor detail (admin) |
| `onSendAlert` | Send notification to distributor |
| `onViewOrder` | Navigate to order detail |
| `onSubmitSellOut` | Submit SELL OUT record |
| `onUploadCSV` | Process CSV file upload |
| `onExportInventory` | Export inventory to Excel |

### Empty States

- **No distributors:** Show "Registra tu primer distribuidor"
- **No orders (portal):** Show "Aun no tienes pedidos de Santa Brisa"
- **No SELL OUT records:** Show "Comienza a reportar tus ventas"
- **Empty inventory:** Show "Tu inventario se calculara automaticamente"

## Files to Reference

- `product-plan/sections/distributor-network/README.md` - Feature overview
- `product-plan/sections/distributor-network/tests.md` - Test-writing instructions
- `product-plan/sections/distributor-network/components/` - React components
- `product-plan/sections/distributor-network/types.ts` - TypeScript interfaces
- `product-plan/sections/distributor-network/sample-data.json` - Test data

## Expected User Flows

### Flow 1: Ver Metricas de Distribuidor (Admin)

1. Admin accesses Distributor Dashboard
2. Admin sees network-wide KPIs
3. Admin selects a distributor from the list
4. Admin sees detailed metrics for that distributor
5. **Outcome:** Can export data or send alert

### Flow 2: Subir SELL OUT (Distribuidor)

1. Distributor accesses their Portal
2. Distributor selects "Subir SELL OUT" tab
3. Option A: Fill manual form (product, quantity, customer)
4. Option B: Drag & drop CSV file
5. System validates data and shows preview
6. Distributor confirms
7. **Outcome:** SELL OUT record created, inventory updates automatically

### Flow 3: Consultar Mi Inventario (Distribuidor)

1. Distributor accesses "Mi Inventario" tab
2. Sees list of products with calculated stock
3. Each product shows: SELL IN, SELL OUT, Stock Actual, Rotation
4. Visual indicators for low stock or stagnant inventory
5. **Outcome:** Can filter by category or search

## Done When

- [ ] Tests written for key user flows
- [ ] All tests pass
- [ ] Admin dashboard shows network KPIs
- [ ] Distributor list with status and alerts works
- [ ] Portal tabs (Orders, SELL OUT, Inventory, Analytics) work
- [ ] CSV upload processes correctly
- [ ] Inventory calculates automatically (SELL IN - SELL OUT)
- [ ] Empty states display properly
- [ ] Responsive on mobile
