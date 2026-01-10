# Test Instructions: SELL IN Operations

These test-writing instructions are **framework-agnostic**. Adapt them to your testing setup (Jest, Vitest, Playwright, Cypress, React Testing Library, etc.).

## Overview

Test the sales module: dashboard KPIs, opportunity pipeline, customer management, and order tracking.

---

## User Flow Tests

### Flow 1: Ver Dashboard de Ventas

**Scenario:** User views the sales dashboard

#### Success Path

**Setup:**
- User is authenticated
- Sample KPI data loaded

**Steps:**
1. User navigates to `/ventas`
2. User sees dashboard with 4 KPI cards

**Expected Results:**
- [ ] Shows "Ventas del Mes" KPI with formatted currency
- [ ] Shows "Pedidos Activos" KPI with count
- [ ] Shows "Clientes Nuevos" KPI
- [ ] Shows "Ticket Promedio" KPI
- [ ] Each KPI shows change percentage (green for positive, red for negative)
- [ ] Activity feed shows recent events

### Flow 2: Mover Oportunidad en Pipeline

**Scenario:** User drags opportunity to new stage

#### Success Path

**Setup:**
- Pipeline has opportunities in different stages
- User has permission to edit opportunities

**Steps:**
1. User navigates to `/ventas/pipeline`
2. User sees Kanban board with columns
3. User drags opportunity card from "Nuevo" to "Contactado"
4. System shows confirmation (if applicable)
5. User confirms

**Expected Results:**
- [ ] Card moves to new column with animation
- [ ] `onMoveOpportunity` called with opportunity ID and new stage
- [ ] Card stays in new position after move

#### Failure Path: No Permission

**Setup:**
- User does not have edit permission

**Expected Results:**
- [ ] Drag is prevented or shows error
- [ ] Card returns to original position

### Flow 3: Crear Cliente Nuevo

**Scenario:** User creates a new customer

#### Success Path

**Steps:**
1. User navigates to `/ventas/clientes`
2. User clicks "Nuevo Cliente" button
3. User fills form (nombre, tipo, zona, contacto)
4. User clicks "Guardar"

**Expected Results:**
- [ ] `onCreateCustomer` callback is called
- [ ] New customer appears in list after creation
- [ ] Success message shown

#### Failure Path: Validation Error

**Setup:**
- User submits with empty required fields

**Expected Results:**
- [ ] Form shows validation errors
- [ ] Required fields highlighted
- [ ] Form not submitted until valid

### Flow 4: Filtrar Pedidos

**Scenario:** User filters orders list

**Steps:**
1. User navigates to `/ventas/pedidos`
2. User types in search box "SAL-ORD"
3. User selects status filter "En Transito"

**Expected Results:**
- [ ] List updates to show matching orders
- [ ] `onFilterChange` called with filter criteria
- [ ] Filter chips show active filters
- [ ] Can clear filters

---

## Empty State Tests

### No Opportunities

**Scenario:** Pipeline has no opportunities

**Setup:**
- `opportunities` array is empty

**Expected Results:**
- [ ] Shows empty state message "Crea tu primera oportunidad"
- [ ] Shows CTA button to create opportunity
- [ ] Clicking CTA calls `onCreateOpportunity`

### No Customers

**Scenario:** Customer list is empty

**Setup:**
- `customers` array is empty

**Expected Results:**
- [ ] Shows "Registra tu primer cliente"
- [ ] Shows "Nuevo Cliente" button
- [ ] No broken layouts

### No Orders

**Scenario:** Orders list is empty

**Setup:**
- `orders` array is empty

**Expected Results:**
- [ ] Shows "Aun no hay pedidos"
- [ ] Shows "Nuevo Pedido" button

---

## Component Interaction Tests

### KPICard

**Renders correctly:**
- [ ] Shows large number (48px font)
- [ ] Shows label below number
- [ ] Shows change percentage with correct color
- [ ] Border and shadow follow neobrutal style

**User interactions:**
- [ ] Clicking card calls `onKpiClick` with KPI key
- [ ] Hover shows translate(2px, 2px) effect

### Pipeline Kanban

**Renders correctly:**
- [ ] Shows 6 columns (Nuevo, Contactado, Propuesta, Negociacion, Ganado, Perdido)
- [ ] Cards show customer name, value, days in stage
- [ ] Urgent cards (>7 days) have orange border

**User interactions:**
- [ ] Drag and drop moves cards between columns
- [ ] Clicking card calls `onViewOpportunity`

### CustomerList Table

**Renders correctly:**
- [ ] Shows columns: Nombre, Tipo, Zona, Estado, Pedidos, Ingresos
- [ ] Type shows badge (Directo vs Distribuidor)
- [ ] Status shows colored badge (Activo/Inactivo/Prospecto)

**User interactions:**
- [ ] Clicking row calls `onViewCustomer`
- [ ] Hover shows action buttons
- [ ] Filter dropdowns work

---

## Edge Cases

- [ ] Handles very long customer names with truncation
- [ ] Works with 0 orders (first-time user)
- [ ] Works with 100+ orders (pagination)
- [ ] Currency formatting handles different values (0, 1000, 1000000)
- [ ] Date formatting is consistent

---

## Accessibility Checks

- [ ] All buttons are keyboard accessible
- [ ] Tables have proper headers
- [ ] KPI cards can be focused with keyboard
- [ ] Color is not the only indicator of status

---

## Sample Test Data

```typescript
const mockKPIs = {
  salesThisMonth: { value: 847000, previousValue: 752000, change: 12.6, label: "Ventas del Mes" },
  activeOrders: { value: 156, previousValue: 161, change: -3.1, label: "Pedidos Activos" },
  newCustomers: { value: 89, previousValue: 89, change: 0, label: "Clientes Nuevos" },
  avgOrderValue: { value: 5430, previousValue: 4890, change: 11.0, label: "Ticket Promedio" }
}

const mockOpportunity = {
  id: "opp-001",
  title: "Expansion Zona Norte",
  customerName: "Distribuciones Noreste SA",
  value: 125000,
  stage: "negotiation",
  daysInStage: 3,
  assignee: "Carlos Mendez"
}

const mockCustomer = {
  id: "cust-001",
  name: "Cadena SuperMax",
  type: "direct",
  zone: "Centro",
  status: "active",
  totalOrders: 128,
  totalRevenue: 2340000
}

// Empty state data
const emptyOpportunities: Opportunity[] = []
const emptyCustomers: Customer[] = []
const emptyOrders: SalesOrder[] = []
```
