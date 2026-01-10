# Test Instructions: Distributor Network

These test-writing instructions are **framework-agnostic**. Adapt them to your testing setup.

## Overview

Test the distributor management module: admin dashboard, distributor portal, SELL OUT reporting, and inventory tracking.

---

## User Flow Tests

### Flow 1: Admin Ver Metricas de Red

**Scenario:** Admin views network-wide distributor metrics

**Steps:**
1. Admin navigates to `/distribuidores`
2. Admin sees network KPIs

**Expected Results:**
- [ ] Shows "SELL IN Total" with currency format
- [ ] Shows "SELL OUT Reportado"
- [ ] Shows "Rotacion Promedio" as percentage
- [ ] Shows "Distribuidores Activos" count
- [ ] Distributor list shows all distributors with status

### Flow 2: Distribuidor Subir SELL OUT Manual

**Scenario:** Distributor reports sales via form

**Steps:**
1. Distributor navigates to portal
2. Selects "Subir SELL OUT" tab
3. Fills product, quantity, customer
4. Clicks "Agregar"
5. Clicks "Confirmar"

**Expected Results:**
- [ ] Form validates required fields
- [ ] Product autocomplete shows available products
- [ ] Preview shows items before confirm
- [ ] `onSubmitSellOut` called with items
- [ ] Success message shown
- [ ] Form resets after success

#### Failure Path: Invalid Data

**Steps:**
1. Submit with negative quantity

**Expected Results:**
- [ ] Validation error shown
- [ ] Form not submitted

### Flow 3: Distribuidor Subir CSV

**Scenario:** Distributor uploads CSV file

**Steps:**
1. Distributor drags CSV to upload area
2. System parses and shows preview
3. Distributor confirms

**Expected Results:**
- [ ] Shows file name and row count
- [ ] Preview shows parsed data
- [ ] Invalid rows highlighted with errors
- [ ] `onUploadCSV` called with file
- [ ] Success message after processing

### Flow 4: Ver Mi Inventario

**Scenario:** Distributor checks calculated stock

**Steps:**
1. Distributor selects "Mi Inventario" tab
2. Views product list

**Expected Results:**
- [ ] Each product shows SELL IN, SELL OUT, Stock Actual
- [ ] Stock Actual = SELL IN - SELL OUT
- [ ] Rotation percentage shown
- [ ] Status indicator (normal/low/slow/stagnant)
- [ ] Can filter by product

---

## Empty State Tests

### No Orders (Portal)

**Setup:**
- `orders` array is empty

**Expected Results:**
- [ ] Shows "Aun no tienes pedidos de Santa Brisa"
- [ ] No broken layout

### No SELL OUT Records

**Setup:**
- `sellOutRecords` array is empty

**Expected Results:**
- [ ] Shows "Comienza a reportar tus ventas"
- [ ] Form is visible and functional

### Empty Inventory

**Setup:**
- `inventory` array is empty

**Expected Results:**
- [ ] Shows "Tu inventario se calculara automaticamente"
- [ ] Explains that inventory appears after SELL IN and SELL OUT

### No Distributors (Admin)

**Setup:**
- `distributors` array is empty

**Expected Results:**
- [ ] Shows "Registra tu primer distribuidor"
- [ ] No network KPIs displayed (or zeros)

---

## Component Interaction Tests

### DistributorDashboard

**Renders correctly:**
- [ ] Shows 4 network KPI cards
- [ ] Shows distributor table with columns
- [ ] Alert badges on distributors with issues

**User interactions:**
- [ ] Clicking distributor row calls `onViewDistributor`
- [ ] Alert button calls `onSendAlert`

### DistributorPortal

**Renders correctly:**
- [ ] Shows 4 tabs: Mis Pedidos, Subir SELL OUT, Mi Inventario, Analytics
- [ ] Active tab is highlighted
- [ ] Content changes when switching tabs

### Inventory Status Colors

- [ ] `normal` status: green background
- [ ] `low` status: amber/orange background
- [ ] `slow` status: yellow background
- [ ] `stagnant` status: red background

---

## Edge Cases

- [ ] Handles distributor with 0 SELL OUT (shows 0% rotation)
- [ ] CSV with 1000+ rows processes correctly
- [ ] Very long product names truncate properly
- [ ] Handles dates in different formats

---

## Sample Test Data

```typescript
const mockNetworkKPIs = {
  totalSellIn: { value: 2450000, change: 12.4, label: "SELL IN Total" },
  totalSellOut: { value: 1890000, change: 9.9, label: "SELL OUT Reportado" },
  avgRotation: { value: 77, change: -2.5, label: "Rotacion Promedio" },
  activeDistributors: { value: 12, change: 9.1, label: "Distribuidores Activos" }
}

const mockDistributor = {
  id: "dist-001",
  name: "Distribuciones Noreste SA",
  zone: "Norte",
  status: "active",
  sellInTotal: 892000,
  sellOutTotal: 756000,
  rotation: 85,
  daysWithoutReport: 1,
  alerts: []
}

const mockInventoryItem = {
  itemCode: "SAL-001",
  itemName: "Salsa Chipotle 500ml",
  sellIn: 1200,
  sellOut: 980,
  stockActual: 220,  // 1200 - 980
  rotation: 82,
  status: "normal"
}

// Empty states
const emptyDistributors: Distributor[] = []
const emptyOrders: MyOrder[] = []
const emptyInventory: InventoryItem[] = []
```
