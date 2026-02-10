# Logistics Module Modernization — Design Document

**Date:** 2026-02-10
**Status:** Approved
**Goal:** Replace legacy Jinja2+Bootstrap logistics pages with modern React+TypeScript+Tailwind module integrated into the WorkHub SPA, with batch/lot traceability.

---

## Context

The logistics module is 100% legacy: server-rendered Jinja2 templates with Bootstrap 4, while the rest of the app (sales, CRM, production) uses React + TypeScript + Tailwind with the Santa Brisa Neobrutalism design system.

Current state:
- ~531 lines of legacy code across 6 files (3 Python controllers + 3 HTML templates)
- No React pages, no API service, no routes in App.tsx
- Opens Frappe forms in new tabs (violates TDAH UX principles)
- Uses generic $ currency instead of EUR
- Zero integration with the modern sales flow

## Navigation

New sidebar section "Operaciones" with 4 entries:

```
Operaciones
├── Dashboard         /operaciones
├── Entregas          /operaciones/entregas
├── Recepciones       /operaciones/recepciones
└── Inventario        /operaciones/inventario
```

## Pages

### 1. Dashboard (`/operaciones`)

3 zones:

**Zone 1 — KPIs (top row):** 4 cards with month-over-month comparison:
- Entregas pendientes (Delivery Notes with status != Completed)
- Recepciones esta semana (Purchase Receipts in period)
- Valor de inventario (Bin.actual_qty * Item.valuation_rate)
- Alertas de stock (Items with qty < reorder_level)

**Zone 2 — Activity feed (center):** Last 10 operations events using lucide-react SVG icons:
- `<Truck>` Albaran DN-00123 entregado a Cliente X
- `<Package>` Recepcion PR-00045 de Proveedor Y (3 lotes)
- `<AlertTriangle>` Stock bajo: Mezcal Joven 750ml (15 uds, minimo 20)

**Zone 3 — Quick actions:** 3 buttons:
- "Nueva Entrega" -> /operaciones/entregas with wizard
- "Nueva Recepcion" -> /operaciones/recepciones with wizard
- "Ver Inventario" -> /operaciones/inventario

### 2. Entregas (`/operaciones/entregas`)

**Filters:** Status pills (Todos | Borrador | En transito | Entregado | Facturado) + search bar.

**Table columns:** N Albaran | Cliente | Pedido origen | Fecha | Estado | Transporte | Total | Accion

Transport icons (lucide-react SVG):
- `<Truck>` transporte propio
- `<Package>` agencia
- `<User>` recogida cliente

**SidePanel — DeliveryDetailPanel:**
```
Header: N albaran + estado + fecha
Section "Cliente": CustomerInfo component (reuse from sales)
Section "Pedido origen": Link to SO + mini summary
Section "Items": Product table with batch/lot number + expiry date
Section "Transporte": Method + driver + vehicle
Section "Documentos": Mini timeline (Albaran -> Factura) + PDF download
Section "Totales": Subtotal + IVA 21% + Total
Footer: Actions per status (Confirmar / Marcar Entregado)
```

**Connection with sales:** Delivery notes created from `/ventas/flujo` (via DocumentTimeline) appear here automatically. Same data source: `Delivery Note` DocType in ERPNext.

### 3. Recepciones (`/operaciones/recepciones`)

**Filters:** Status pills (Todos | Borrador | Pendiente factura | Completado) + search by receipt number, supplier, or batch number.

**Table columns:** N Recepcion | Proveedor | Fecha | Items | Estado | Total | % Facturado (progress bar)

**SidePanel — ReceiptDetailPanel:**
```
Header: N recepcion + estado + fecha
Section "Proveedor": Name + NIF + address
Section "Items recibidos": Expandable table
  Per item:
    Product + qty + price
    Batches (expand):
      Batch ID: LOT-2026-001
      Manufacturing date: 01/01/2026
      Expiry date: 01/07/2026
      Quantity: 50 uds
Section "Totales": Subtotal + IVA + Total
Section "Facturacion": % billed + link to purchase invoice
Footer: "Confirmar recepcion" / "Crear factura de compra"
```

**CreateReceiptWizard (3 steps):**
1. Select supplier (search/select)
2. Add items (product + qty + price + batch number + expiry date)
3. Confirm (summary + save)

Batches auto-created in ERPNext if they don't exist.

### 4. Inventario (`/operaciones/inventario`)

**KPIs (top row):** 4 cards:
- Valor total stock
- Productos bajo minimo
- Lotes proximos a caducar (expiry_date < today + 30 days)
- Movimientos hoy

**Table columns:** Producto | Stock actual | Minimo | Estado (alert/ok icon) | Lotes activos | Prox. caducidad | Valor

**Filters:** Search by name/code, warehouse dropdown, toggle "Solo bajo minimo".

**SidePanel — InventoryDetailPanel:**
```
Header: Product + total stock + status
Section "Stock por almacen": Table (Warehouse | Qty | Reserved | Available)
Section "Lotes activos" (expanded, FIFO order):
  Per batch:
    Batch ID
    Stock qty
    Manufacturing date
    Expiry date (red badge if < 30 days)
    Supplier
Section "Movimientos recientes" (collapsed):
  Last 10 Stock Ledger Entries (Type | Date | Qty | Reference)
Section "Configuracion":
  Reorder level | Lead time | Default warehouse
```

**Expiry alerts:** Batches expiring within 30 days show warning badge. Expired batches marked red. FIFO order always (oldest first).

## Backend API

### New file: `api/logistics.py`

Following `sales.py` patterns:

```
Dashboard:
  get_operations_kpis() -> OperationsKPIs

Entregas:
  get_delivery_notes(filters) -> DeliveryNote[]
  get_delivery_detail(delivery_note_id) -> DeliveryDetail
  get_delivery_note_pdf(delivery_note_id) -> {base64}

Recepciones:
  get_purchase_receipts(filters) -> PurchaseReceipt[]
  get_receipt_detail(receipt_id) -> ReceiptDetail (with batches)
  create_purchase_receipt(data) -> CreateResponse

Inventario:
  get_inventory(filters) -> InventoryItem[]
  get_inventory_detail(item_code) -> InventoryDetail (stock by warehouse + batches FIFO + movements)
  get_expiring_batches(days=30) -> ExpiringBatch[]
```

### Batch traceability data model

ERPNext already has `Batch` DocType with: batch_id, item, expiry_date, manufacturing_date, supplier.
`Purchase Receipt Item` has `batch_no` field linking each line to its batch.
`get_receipt_detail` returns items with nested batches array.

## Frontend Architecture

### New files

```
web/src/
├── pages/operations/
│   ├── OperationsDashboardPage.tsx
│   ├── DeliveryListPage.tsx
│   ├── ReceiptListPage.tsx
│   └── InventoryPage.tsx
├── components/sections/operations/
│   ├── types.ts
│   ├── DeliveryDetailPanel/
│   │   └── index.tsx
│   ├── ReceiptDetailPanel/
│   │   └── index.tsx
│   ├── InventoryDetailPanel/
│   │   └── index.tsx
│   ├── BatchList.tsx          (shared: batch table for receipts + inventory)
│   ├── ExpiryBadge.tsx        (shared: red/yellow/green badge by expiry)
│   ├── OperationsActivityFeed.tsx
│   └── CreateReceiptWizard/
│       └── index.tsx
├── api/
│   ├── services/logistics.ts
│   └── hooks/useLogisticsData.ts
```

### Reused components

- `SidePanel` (from ui/)
- `Section` (collapsible, from OrderDetailPanel pattern)
- `CustomerInfo` (from OrderDetailPanel/)
- `LoadingState` / `ErrorState` (from ui/)
- KPICard pattern (from SalesDashboardPage)

## Design System

All components follow Santa Brisa Neobrutalism:
- Colors: Amber primary (#E5A530), Stone neutrals, Green success (#4CAF7A), Orange warning (#E07A4C)
- Typography: Playfair Display (headings), Inter (body), JetBrains Mono (code/IDs)
- Borders: 2px solid stone-900, hard shadows
- Currency: EUR with es-ES locale
- IVA: 21%
- Dark mode: full support
- All icons: lucide-react SVG (no emojis)

## Implementation Phases

| Phase | Scope | Dependencies |
|-------|-------|-------------|
| Phase 1 | Routes + Dashboard + Entregas (list + panel + sales connection) | Unified sales flow (done) |
| Phase 2 | Recepciones + batch traceability + CreateReceiptWizard | Phase 1 |
| Phase 3 | Inventario + expiry alerts + FIFO + stock movements | Phase 2 |
