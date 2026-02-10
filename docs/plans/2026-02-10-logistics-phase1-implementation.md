# Logistics Module — Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the "Operaciones" section to the app with Dashboard + Entregas pages, replacing the legacy Jinja2 templates with modern React components that follow the Santa Brisa design system.

**Architecture:** Create a new backend API file (`api/logistics.py`) with Frappe endpoints, a frontend API service (`logistics.ts`) with hooks, and 2 React pages (Dashboard + Entregas) with SidePanel detail views. Follow the exact patterns from the sales module: lazy-loaded pages, `frappe.call` wrapper, `UseDataState<T>` hooks, SidePanel + collapsible Sections.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, lucide-react icons, Frappe/ERPNext Python API

**Working directory:** `/Users/martinjaimesamperiz/.claude-worktrees/workhub/eager-dewdney`

**Key reference files:**
- `web/src/App.tsx` (245 lines) — routes and navigation
- `web/src/pages/SellInDashboardPage.tsx` (59 lines) — dashboard page pattern
- `web/src/pages/OrderListPage.tsx` (141 lines) — list page pattern
- `web/src/api/services/sales.ts` (744 lines) — API service pattern
- `web/src/api/hooks/useSalesData.ts` (394 lines) — hooks pattern
- `web/src/components/sections/sell-in-operations/OrderDetailPanel/index.tsx` — SidePanel detail pattern
- `frappe-app/workhub_frappe_app/www/workhub_operaciones*.py` — legacy data to replicate

---

## Task 1: Create Backend API (`api/logistics.py`)

**Files:**
- Create: `frappe-app/workhub_frappe_app/api/logistics.py`

**Step 1: Create the logistics API file**

```python
"""
Logistics API — Operations Module
==================================
Backend endpoints for the Operations section: Dashboard KPIs, Delivery Notes, Inventory.
Follows the same patterns as sales.py.
"""

import frappe
from frappe import _


# =============================================================================
# DASHBOARD
# =============================================================================

@frappe.whitelist()
def get_operations_kpis():
    """Get KPIs for the Operations dashboard."""
    # Pending deliveries (Delivery Notes not completed)
    pending_deliveries = frappe.db.count(
        "Delivery Note",
        filters={"docstatus": 1, "status": ["not in", ["Completed", "Cancelled"]]}
    )

    # Receipts this month
    from frappe.utils import getdate, get_first_day
    today = getdate()
    first_day = get_first_day(today)
    receipts_this_month = frappe.db.count(
        "Purchase Receipt",
        filters={"docstatus": 1, "posting_date": [">=", first_day]}
    )

    # Previous month for comparison
    from frappe.utils import add_months
    prev_first = get_first_day(add_months(today, -1))
    prev_last = add_months(first_day, 0)  # first day of current month
    receipts_prev_month = frappe.db.count(
        "Purchase Receipt",
        filters={"docstatus": 1, "posting_date": ["between", [prev_first, prev_last]]}
    )

    # Inventory value
    inventory_value = frappe.db.sql("""
        SELECT COALESCE(SUM(bin.actual_qty * item.valuation_rate), 0) as total_value
        FROM `tabBin` bin
        JOIN `tabItem` item ON item.name = bin.item_code
        WHERE item.disabled = 0 AND item.is_stock_item = 1 AND bin.actual_qty > 0
    """, as_dict=True)[0].get("total_value", 0)

    # Low stock alerts
    low_stock_count = frappe.db.sql("""
        SELECT COUNT(DISTINCT bin.item_code) as cnt
        FROM `tabBin` bin
        JOIN `tabItem` item ON item.name = bin.item_code
        WHERE item.disabled = 0
          AND item.is_stock_item = 1
          AND bin.actual_qty > 0
          AND bin.actual_qty < COALESCE(item.safety_stock, 10)
    """, as_dict=True)[0].get("cnt", 0)

    return {
        "pendingDeliveries": {
            "value": pending_deliveries,
            "previousValue": 0,
            "change": 0,
            "label": "Entregas pendientes"
        },
        "receiptsThisMonth": {
            "value": receipts_this_month,
            "previousValue": receipts_prev_month,
            "change": (
                ((receipts_this_month - receipts_prev_month) / max(receipts_prev_month, 1)) * 100
            ),
            "label": "Recepciones este mes"
        },
        "inventoryValue": {
            "value": float(inventory_value),
            "previousValue": 0,
            "change": 0,
            "label": "Valor inventario"
        },
        "lowStockAlerts": {
            "value": low_stock_count,
            "previousValue": 0,
            "change": 0,
            "label": "Alertas de stock"
        }
    }


@frappe.whitelist()
def get_recent_operations(limit=10):
    """Get recent operations activity for the dashboard feed."""
    activities = []

    # Recent Delivery Notes
    delivery_notes = frappe.get_list(
        "Delivery Note",
        filters={"docstatus": ["!=", 2]},
        fields=["name", "customer_name", "posting_date", "status", "grand_total"],
        order_by="posting_date desc, creation desc",
        limit=5
    )
    for dn in delivery_notes:
        activities.append({
            "id": dn.name,
            "type": "delivery",
            "description": f"Albaran {dn.name} - {dn.customer_name}",
            "status": dn.status,
            "amount": float(dn.grand_total or 0),
            "timestamp": str(dn.posting_date),
        })

    # Recent Purchase Receipts
    receipts = frappe.get_list(
        "Purchase Receipt",
        filters={"docstatus": ["!=", 2]},
        fields=["name", "supplier_name", "posting_date", "status", "grand_total"],
        order_by="posting_date desc, creation desc",
        limit=5
    )
    for pr in receipts:
        activities.append({
            "id": pr.name,
            "type": "receipt",
            "description": f"Recepcion {pr.name} - {pr.supplier_name}",
            "status": pr.status,
            "amount": float(pr.grand_total or 0),
            "timestamp": str(pr.posting_date),
        })

    # Sort by timestamp desc
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    return activities[:int(limit)]


# =============================================================================
# ENTREGAS (Delivery Notes)
# =============================================================================

@frappe.whitelist()
def get_delivery_notes(filters=None):
    """Get list of delivery notes with optional filters."""
    if isinstance(filters, str):
        import json
        filters = json.loads(filters)

    db_filters = {"docstatus": ["!=", 2]}

    if filters:
        if filters.get("status"):
            db_filters["status"] = filters["status"]
        if filters.get("customer"):
            db_filters["customer_name"] = ["like", f"%{filters['customer']}%"]
        if filters.get("search"):
            search = filters["search"]
            # Search by name, customer, or linked sales order
            return frappe.db.sql("""
                SELECT
                    dn.name as id,
                    dn.name as deliveryNumber,
                    dn.customer as customerId,
                    dn.customer_name as customerName,
                    dn.posting_date as date,
                    dn.status,
                    dn.grand_total as total,
                    dn.currency,
                    dn.transporter_name as transporterName,
                    dn.lr_no as trackingNumber,
                    dn.docstatus
                FROM `tabDelivery Note` dn
                WHERE dn.docstatus != 2
                  AND (dn.name LIKE %(search)s
                       OR dn.customer_name LIKE %(search)s)
                ORDER BY dn.posting_date DESC
                LIMIT 50
            """, {"search": f"%{search}%"}, as_dict=True)

    delivery_notes = frappe.get_list(
        "Delivery Note",
        filters=db_filters,
        fields=[
            "name", "customer", "customer_name",
            "posting_date", "status", "grand_total",
            "currency", "transporter_name", "lr_no", "docstatus"
        ],
        order_by="posting_date desc",
        limit=50
    )

    return [
        {
            "id": dn.name,
            "deliveryNumber": dn.name,
            "customerId": dn.customer,
            "customerName": dn.customer_name,
            "date": str(dn.posting_date),
            "status": dn.status,
            "total": float(dn.grand_total or 0),
            "currency": dn.currency or "EUR",
            "transporterName": dn.transporter_name or "",
            "trackingNumber": dn.lr_no or "",
            "docstatus": dn.docstatus
        }
        for dn in delivery_notes
    ]


@frappe.whitelist()
def get_delivery_detail(delivery_note_id):
    """Get full detail of a delivery note including items, batches, and linked sales order."""
    if not delivery_note_id:
        frappe.throw(_("Delivery Note ID is required"))

    dn = frappe.get_doc("Delivery Note", delivery_note_id)
    frappe.has_permission("Delivery Note", "read", doc=dn, throw=True)

    # Get items with batch info
    items = []
    for item in dn.items:
        items.append({
            "itemCode": item.item_code,
            "itemName": item.item_name,
            "qty": float(item.qty),
            "rate": float(item.rate),
            "amount": float(item.amount),
            "batchNo": item.batch_no or "",
            "salesOrder": item.against_sales_order or "",
            "uom": item.uom or item.stock_uom or "",
        })

    # Get batch details for items that have batches
    batch_details = {}
    batch_nos = [i["batchNo"] for i in items if i["batchNo"]]
    for batch_no in set(batch_nos):
        batch = frappe.db.get_value(
            "Batch", batch_no,
            ["name", "expiry_date", "manufacturing_date", "supplier"],
            as_dict=True
        )
        if batch:
            batch_details[batch_no] = {
                "batchId": batch.name,
                "expiryDate": str(batch.expiry_date) if batch.expiry_date else "",
                "manufacturingDate": str(batch.manufacturing_date) if batch.manufacturing_date else "",
                "supplier": batch.supplier or ""
            }

    # Enrich items with batch details
    for item in items:
        if item["batchNo"] and item["batchNo"] in batch_details:
            item["batch"] = batch_details[item["batchNo"]]

    # Customer fiscal data
    customer_tax_id = frappe.db.get_value("Customer", dn.customer, "tax_id") or ""
    customer_address = dn.address_display or ""
    if not customer_address and dn.shipping_address_name:
        customer_address = frappe.db.get_value(
            "Address", dn.shipping_address_name, "address_display"
        ) or ""

    # Linked sales orders
    linked_orders = list(set(
        item.against_sales_order for item in dn.items
        if item.against_sales_order
    ))

    # Linked invoices
    linked_invoices = []
    inv_names = frappe.get_all(
        "Sales Invoice Item",
        filters={"delivery_note": dn.name, "docstatus": ["!=", 2]},
        fields=["distinct parent as name"],
        pluck="name"
    )
    for inv_name in inv_names:
        inv = frappe.db.get_value(
            "Sales Invoice", inv_name,
            ["name", "posting_date", "status", "grand_total"],
            as_dict=True
        )
        if inv:
            linked_invoices.append({
                "id": inv.name,
                "date": str(inv.posting_date),
                "status": inv.status,
                "total": float(inv.grand_total or 0)
            })

    return {
        "id": dn.name,
        "deliveryNumber": dn.name,
        "customerId": dn.customer,
        "customerName": dn.customer_name,
        "customerTaxId": customer_tax_id,
        "customerAddress": customer_address,
        "date": str(dn.posting_date),
        "status": dn.status,
        "docstatus": dn.docstatus,
        "total": float(dn.grand_total or 0),
        "subtotal": float(dn.net_total or 0),
        "tax": float(dn.total_taxes_and_charges or 0),
        "currency": dn.currency or "EUR",
        "transporterName": dn.transporter_name or "",
        "transportMethod": dn.lr_no or "",
        "driverName": dn.driver_name or "",
        "vehicleNo": dn.vehicle_no or "",
        "items": items,
        "linkedOrders": linked_orders,
        "linkedInvoices": linked_invoices,
    }
```

**Step 2: Register the API in hooks.py (if needed)**

Check if `frappe-app/workhub_frappe_app/hooks.py` requires explicit whitelisting. In most Frappe apps, `@frappe.whitelist()` is enough. Verify by searching for `api_whitelist` or `override_whitelisted_methods` in hooks.py.

**Step 3: Commit**

```bash
git add frappe-app/workhub_frappe_app/api/logistics.py
git commit -m "feat: add logistics backend API with dashboard KPIs and delivery notes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Create Frontend Types (`types.ts`)

**Files:**
- Create: `web/src/components/sections/operations/types.ts`

**Step 1: Create the types file**

```typescript
// =============================================================================
// Data Types — Operations Module
// =============================================================================

export interface KPI {
  value: number
  previousValue: number
  change: number
  label: string
}

export interface OperationsKPIs {
  pendingDeliveries: KPI
  receiptsThisMonth: KPI
  inventoryValue: KPI
  lowStockAlerts: KPI
}

export type OperationsActivityType = 'delivery' | 'receipt' | 'stock_alert'

export interface OperationsActivity {
  id: string
  type: OperationsActivityType
  description: string
  status: string
  amount: number
  timestamp: string
}

// Delivery Notes
export type DeliveryStatus = 'Draft' | 'To Bill' | 'Completed' | 'Cancelled' | 'Return Issued'

export interface DeliveryNote {
  id: string
  deliveryNumber: string
  customerId: string
  customerName: string
  date: string
  status: string
  total: number
  currency: string
  transporterName: string
  trackingNumber: string
  docstatus: number
}

export interface BatchInfo {
  batchId: string
  expiryDate: string
  manufacturingDate: string
  supplier: string
}

export interface DeliveryItem {
  itemCode: string
  itemName: string
  qty: number
  rate: number
  amount: number
  batchNo: string
  salesOrder: string
  uom: string
  batch?: BatchInfo
}

export interface LinkedInvoice {
  id: string
  date: string
  status: string
  total: number
}

export interface DeliveryDetail {
  id: string
  deliveryNumber: string
  customerId: string
  customerName: string
  customerTaxId: string
  customerAddress: string
  date: string
  status: string
  docstatus: number
  total: number
  subtotal: number
  tax: number
  currency: string
  transporterName: string
  transportMethod: string
  driverName: string
  vehicleNo: string
  items: DeliveryItem[]
  linkedOrders: string[]
  linkedInvoices: LinkedInvoice[]
}

// Filters
export interface DeliveryFilters {
  status?: string
  customer?: string
  search?: string
}
```

**Step 2: Commit**

```bash
git add web/src/components/sections/operations/types.ts
git commit -m "feat: add operations module TypeScript types

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Create Frontend API Service (`logistics.ts`)

**Files:**
- Create: `web/src/api/services/logistics.ts`

**Step 1: Create the API service**

```typescript
/**
 * Logistics API Service
 * =====================
 * Frontend wrapper for the logistics backend API.
 * Follows the same pattern as sales.ts.
 */

import { frappe } from '../frappe-client'
import type {
  OperationsKPIs,
  OperationsActivity,
  DeliveryNote,
  DeliveryDetail,
  DeliveryFilters,
} from '../../components/sections/operations/types'

export const logisticsApi = {
  // ==========================================================================
  // Dashboard
  // ==========================================================================

  async getOperationsKPIs(): Promise<OperationsKPIs> {
    const data = await frappe.call<OperationsKPIs>(
      'workhub_frappe_app.api.logistics.get_operations_kpis'
    )
    return data
  },

  async getRecentOperations(limit = 10): Promise<OperationsActivity[]> {
    const data = await frappe.call<OperationsActivity[]>(
      'workhub_frappe_app.api.logistics.get_recent_operations',
      { limit }
    )
    return data
  },

  // ==========================================================================
  // Delivery Notes
  // ==========================================================================

  async getDeliveryNotes(filters?: DeliveryFilters): Promise<DeliveryNote[]> {
    const data = await frappe.call<DeliveryNote[]>(
      'workhub_frappe_app.api.logistics.get_delivery_notes',
      { filters: filters ? JSON.stringify(filters) : undefined }
    )
    return data
  },

  async getDeliveryDetail(deliveryNoteId: string): Promise<DeliveryDetail> {
    const data = await frappe.call<DeliveryDetail>(
      'workhub_frappe_app.api.logistics.get_delivery_detail',
      { delivery_note_id: deliveryNoteId }
    )
    return data
  },

  async getDeliveryNotePDF(deliveryNoteId: string): Promise<{ base64: string }> {
    // Reuse the existing sales endpoint for delivery note PDFs
    const data = await frappe.call<{ base64: string }>(
      'workhub_frappe_app.api.sales.get_delivery_note_pdf',
      { delivery_note_id: deliveryNoteId }
    )
    return data
  },
}

export default logisticsApi
```

**Step 2: Commit**

```bash
git add web/src/api/services/logistics.ts
git commit -m "feat: add logistics API service for dashboard and delivery notes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Create React Hooks (`useLogisticsData.ts`)

**Files:**
- Create: `web/src/api/hooks/useLogisticsData.ts`

**Step 1: Create the hooks file**

```typescript
/**
 * React hooks for Logistics data
 * ===============================
 * Follows the same UseDataState<T> pattern as useSalesData.ts.
 */

import { useState, useEffect, useCallback } from 'react'
import logisticsApi from '../services/logistics'
import type {
  OperationsKPIs,
  OperationsActivity,
  DeliveryNote,
  DeliveryDetail,
  DeliveryFilters,
} from '../../components/sections/operations/types'

interface UseDataState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

// ==========================================================================
// Dashboard Hooks
// ==========================================================================

export function useOperationsKPIs(): UseDataState<OperationsKPIs> {
  const [data, setData] = useState<OperationsKPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const kpis = await logisticsApi.getOperationsKPIs()
      setData(kpis)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch operations KPIs'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useRecentOperations(limit = 10): UseDataState<OperationsActivity[]> {
  const [data, setData] = useState<OperationsActivity[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const activities = await logisticsApi.getRecentOperations(limit)
      setData(activities)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch operations activity'))
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useOperationsDashboard() {
  const kpis = useOperationsKPIs()
  const activity = useRecentOperations()

  return {
    kpis: kpis.data,
    recentActivity: activity.data,
    loading: kpis.loading || activity.loading,
    error: kpis.error || activity.error,
    refetch: async () => {
      await Promise.all([kpis.refetch(), activity.refetch()])
    }
  }
}

// ==========================================================================
// Delivery Notes Hooks
// ==========================================================================

export function useDeliveryNotes(filters?: DeliveryFilters): UseDataState<DeliveryNote[]> {
  const [data, setData] = useState<DeliveryNote[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const notes = await logisticsApi.getDeliveryNotes(filters)
      setData(notes)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch delivery notes'))
    } finally {
      setLoading(false)
    }
  }, [filters?.status, filters?.customer, filters?.search])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useDeliveryDetail(deliveryNoteId: string | null): UseDataState<DeliveryDetail> {
  const [data, setData] = useState<DeliveryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    if (!deliveryNoteId) {
      setData(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const detail = await logisticsApi.getDeliveryDetail(deliveryNoteId)
      setData(detail)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch delivery detail'))
    } finally {
      setLoading(false)
    }
  }, [deliveryNoteId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}
```

**Step 2: Commit**

```bash
git add web/src/api/hooks/useLogisticsData.ts
git commit -m "feat: add logistics React hooks (dashboard + delivery notes)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Create DeliveryDetailPanel

**Files:**
- Create: `web/src/components/sections/operations/DeliveryDetailPanel/index.tsx`

**Step 1: Create the panel component**

This follows the exact same pattern as `OrderDetailPanel/index.tsx` — SidePanel with collapsible Sections.

```tsx
/**
 * DeliveryDetailPanel
 * ===================
 * SidePanel showing full detail of a delivery note.
 * Pattern: same as OrderDetailPanel from sell-in-operations.
 */

import { useState, useEffect } from 'react'
import {
  X, Loader2, Calendar, User, Truck, Package,
  FileText, ChevronDown, ChevronUp, Download, Link, Receipt,
  CheckCircle, Clock
} from 'lucide-react'
import { SidePanel } from '../../../ui/SidePanel'
import { CustomerInfo } from '../../sell-in-operations/OrderDetailPanel/CustomerInfo'
import { useDeliveryDetail } from '../../../../api/hooks/useLogisticsData'
import type { DeliveryDetail } from '../types'

// Status configuration
const statusConfig: Record<string, { label: string; color: string }> = {
  Draft: { label: 'Borrador', color: 'bg-stone-200 text-stone-700' },
  'To Bill': { label: 'Pendiente Factura', color: 'bg-amber-100 text-amber-700' },
  Completed: { label: 'Completado', color: 'bg-green-100 text-green-700' },
  Cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
  'Return Issued': { label: 'Devolucion', color: 'bg-orange-100 text-orange-700' },
}

// Collapsible Section (reuse pattern)
function Section({
  title,
  icon,
  badge,
  children,
  defaultOpen = true
}: {
  title: string
  icon: React.ReactNode
  badge?: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div className="border-2 border-stone-900 dark:border-stone-100">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-amber-500">{icon}</span>
          <span className="font-medium text-stone-900 dark:text-stone-100 uppercase text-sm tracking-wider">
            {title}
          </span>
          {badge && (
            <span className="px-2 py-0.5 text-xs bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400">
              {badge}
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {isOpen && (
        <div className="p-4 space-y-4 border-t-2 border-stone-900 dark:border-stone-100">
          {children}
        </div>
      )}
    </div>
  )
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })

interface DeliveryDetailPanelProps {
  deliveryNoteId: string | null
  isOpen: boolean
  onClose: () => void
  onDownloadPDF?: (deliveryNoteId: string) => void
}

export function DeliveryDetailPanel({
  deliveryNoteId,
  isOpen,
  onClose,
  onDownloadPDF,
}: DeliveryDetailPanelProps) {
  const { data: delivery, loading, error } = useDeliveryDetail(isOpen ? deliveryNoteId : null)

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={delivery ? `Albaran ${delivery.deliveryNumber}` : 'Cargando...'}
      width="lg"
    >
      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-amber-500 mx-auto mb-3" />
            <p className="text-sm text-stone-500">Cargando albaran...</p>
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && delivery && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-4 border-b-2 border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-mono text-lg font-bold text-stone-900 dark:text-stone-100">
                  {delivery.deliveryNumber}
                </h2>
                <div className="flex items-center gap-2 text-sm text-stone-500 mt-0.5">
                  <Calendar size={14} />
                  <span>{formatDate(delivery.date)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onDownloadPDF && (
                  <button
                    onClick={() => onDownloadPDF(delivery.id)}
                    className="p-2 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                    title="Descargar PDF"
                  >
                    <Download size={16} className="text-stone-500" />
                  </button>
                )}
                <span className={`
                  px-3 py-1.5 text-xs uppercase tracking-wider font-semibold
                  border-2 border-stone-900 dark:border-stone-100
                  ${statusConfig[delivery.status]?.color || statusConfig.Draft.color}
                `}>
                  {statusConfig[delivery.status]?.label || delivery.status}
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Customer */}
            <Section title="Cliente" icon={<User size={20} />}>
              <CustomerInfo
                customerName={delivery.customerName}
                customerId={delivery.customerId}
                customerTaxId={delivery.customerTaxId}
                customerAddress={delivery.customerAddress}
              />
            </Section>

            {/* Transport */}
            {(delivery.transporterName || delivery.driverName || delivery.vehicleNo) && (
              <Section title="Transporte" icon={<Truck size={20} />}>
                <div className="space-y-2 text-sm">
                  {delivery.transporterName && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Transportista:</span>
                      <span className="font-medium text-stone-900 dark:text-stone-100">{delivery.transporterName}</span>
                    </div>
                  )}
                  {delivery.driverName && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Conductor:</span>
                      <span className="font-medium text-stone-900 dark:text-stone-100">{delivery.driverName}</span>
                    </div>
                  )}
                  {delivery.vehicleNo && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Vehiculo:</span>
                      <span className="font-mono text-stone-900 dark:text-stone-100">{delivery.vehicleNo}</span>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Linked Orders */}
            {delivery.linkedOrders.length > 0 && (
              <Section title="Pedidos origen" icon={<Link size={20} />} badge={`${delivery.linkedOrders.length}`}>
                <div className="space-y-2">
                  {delivery.linkedOrders.map((orderId) => (
                    <div key={orderId} className="flex items-center gap-2 p-2 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700">
                      <FileText size={14} className="text-amber-500" />
                      <span className="font-mono text-sm text-stone-900 dark:text-stone-100">{orderId}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Items */}
            <Section title="Productos" icon={<Package size={20} />} badge={`${delivery.items.length} items`}>
              <div className="border-2 border-stone-300 dark:border-stone-600 overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-stone-100 dark:bg-stone-800 border-b border-stone-300 dark:border-stone-600">
                  <div className="col-span-1 text-xs font-medium uppercase tracking-wider text-stone-500">Qty</div>
                  <div className="col-span-5 text-xs font-medium uppercase tracking-wider text-stone-500">Producto</div>
                  <div className="col-span-3 text-xs font-medium uppercase tracking-wider text-stone-500">Lote</div>
                  <div className="col-span-3 text-xs font-medium uppercase tracking-wider text-stone-500 text-right">Total</div>
                </div>
                {/* Items */}
                <div className="divide-y divide-stone-200 dark:divide-stone-700">
                  {delivery.items.map((item, index) => (
                    <div key={`${item.itemCode}-${index}`} className="grid grid-cols-12 gap-2 px-3 py-3 items-center">
                      <div className="col-span-1">
                        <span className="font-mono text-sm font-medium text-stone-900 dark:text-stone-100">{item.qty}</span>
                      </div>
                      <div className="col-span-5">
                        <p className="text-sm text-stone-900 dark:text-stone-100">{item.itemName}</p>
                        <p className="text-xs text-stone-400 font-mono">{item.itemCode}</p>
                      </div>
                      <div className="col-span-3">
                        {item.batchNo ? (
                          <div>
                            <p className="text-xs font-mono text-stone-600 dark:text-stone-400">{item.batchNo}</p>
                            {item.batch?.expiryDate && (
                              <p className="text-[10px] text-stone-400">
                                Cad: {formatDate(item.batch.expiryDate)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-stone-300">-</span>
                        )}
                      </div>
                      <div className="col-span-3 text-right">
                        <span className="font-mono text-sm font-medium text-stone-900 dark:text-stone-100">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            {/* Totals */}
            <Section title="Resumen" icon={<Receipt size={20} />}>
              <div className="space-y-2 bg-stone-50 dark:bg-stone-800/50 p-4 border-2 border-stone-200 dark:border-stone-700">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Subtotal:</span>
                  <span className="font-mono text-stone-700 dark:text-stone-300">{formatCurrency(delivery.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">IVA (21%):</span>
                  <span className="font-mono text-stone-700 dark:text-stone-300">{formatCurrency(delivery.tax)}</span>
                </div>
                <div className="border-t-2 border-stone-300 dark:border-stone-600 my-2" />
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">TOTAL:</span>
                  <span className="font-mono text-xl font-bold text-stone-900 dark:text-stone-100">{formatCurrency(delivery.total)}</span>
                </div>
              </div>
            </Section>

            {/* Linked Invoices */}
            {delivery.linkedInvoices.length > 0 && (
              <Section title="Facturas" icon={<FileText size={20} />} badge={`${delivery.linkedInvoices.length}`} defaultOpen={false}>
                <div className="space-y-2">
                  {delivery.linkedInvoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700">
                      <div className="flex items-center gap-2">
                        {inv.status === 'Paid' ? (
                          <CheckCircle size={14} className="text-green-500" />
                        ) : (
                          <Clock size={14} className="text-amber-500" />
                        )}
                        <span className="font-mono text-sm">{inv.id}</span>
                      </div>
                      <span className="font-mono text-sm font-medium">{formatCurrency(inv.total)}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && !delivery && deliveryNoteId && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-stone-500">{error ? error.message : 'No se pudo cargar el albaran'}</p>
            <button onClick={onClose} className="mt-4 text-sm text-amber-600 hover:underline">Cerrar</button>
          </div>
        </div>
      )}
    </SidePanel>
  )
}
```

**Step 2: Commit**

```bash
git add web/src/components/sections/operations/DeliveryDetailPanel/index.tsx
git commit -m "feat: add DeliveryDetailPanel with customer info, items, batches, transport, and invoices

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Create Dashboard Page

**Files:**
- Create: `web/src/pages/operations/OperationsDashboardPage.tsx`

**Step 1: Create the dashboard page**

```tsx
/**
 * Operations Dashboard Page
 * =========================
 * Main entry point for the Operations section.
 * Shows KPIs + activity feed + quick actions.
 */

import { useNavigate } from 'react-router-dom'
import {
  Truck, Package, AlertTriangle, TrendingUp, TrendingDown, Minus,
  ArrowRight, BarChart3, CheckCircle, Clock
} from 'lucide-react'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { useOperationsDashboard } from '../../api/hooks/useLogisticsData'
import type { KPI, OperationsActivity } from '../../components/sections/operations/types'

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M EUR`
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k EUR`
  return `${value} EUR`
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })

// KPI Card (reuse pattern from SellInDashboard)
function KPICard({ kpi, icon }: { kpi: KPI; icon: React.ReactNode }) {
  const isPositive = kpi.change > 0
  const isNegative = kpi.change < 0

  return (
    <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 p-5 shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#f5f5f4]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-amber-500">{icon}</span>
        {kpi.change !== 0 && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-stone-400'
          }`}>
            {isPositive ? <TrendingUp size={12} /> : isNegative ? <TrendingDown size={12} /> : <Minus size={12} />}
            <span>{isPositive && '+'}{kpi.change.toFixed(0)}%</span>
          </div>
        )}
      </div>
      <div className="font-mono text-3xl font-bold text-stone-900 dark:text-stone-100 mb-1">
        {typeof kpi.value === 'number' && kpi.label.includes('inventario')
          ? formatCurrency(kpi.value)
          : kpi.value}
      </div>
      <div className="w-12 h-0.5 bg-stone-900 dark:bg-stone-100 mb-2" />
      <div className="text-xs text-stone-500 uppercase tracking-wider">{kpi.label}</div>
    </div>
  )
}

// Activity Feed Item
function ActivityItem({ activity }: { activity: OperationsActivity }) {
  const icon = activity.type === 'delivery'
    ? <Truck size={14} className="text-cyan-500" />
    : activity.type === 'receipt'
    ? <Package size={14} className="text-amber-500" />
    : <AlertTriangle size={14} className="text-red-500" />

  return (
    <div className="flex items-start gap-3 py-3 border-b border-stone-200 dark:border-stone-700 last:border-0">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-900 dark:text-stone-100 truncate">{activity.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-stone-400">{formatDate(activity.timestamp)}</span>
          {activity.amount > 0 && (
            <span className="text-xs font-mono text-stone-500">
              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(activity.amount)}
            </span>
          )}
        </div>
      </div>
      <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium ${
        activity.status === 'Completed' ? 'bg-green-100 text-green-700'
        : activity.status === 'Draft' ? 'bg-stone-200 text-stone-600'
        : 'bg-amber-100 text-amber-700'
      }`}>
        {activity.status}
      </span>
    </div>
  )
}

export function OperationsDashboardPage() {
  const navigate = useNavigate()
  const { kpis, recentActivity, loading, error, refetch } = useOperationsDashboard()

  if (loading) return <LoadingState message="Cargando operaciones..." />
  if (error || !kpis) return <ErrorState title="Error al cargar operaciones" message="No se pudo cargar la informacion." error={error} onRetry={refetch} />

  const kpiIcons = [
    <Truck size={20} />,
    <Package size={20} />,
    <BarChart3 size={20} />,
    <AlertTriangle size={20} />,
  ]

  const kpiKeys = ['pendingDeliveries', 'receiptsThisMonth', 'inventoryValue', 'lowStockAlerts'] as const

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-mono text-2xl font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
          Operaciones
        </h1>
        <p className="text-sm text-stone-500 mt-1">Dashboard de entregas, recepciones e inventario</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiKeys.map((key, i) => (
          <KPICard key={key} kpi={kpis[key]} icon={kpiIcons[i]} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 border-2 border-stone-900 dark:border-stone-100 bg-white dark:bg-stone-900">
          <div className="px-4 py-3 bg-stone-50 dark:bg-stone-800 border-b-2 border-stone-900 dark:border-stone-100">
            <h2 className="font-medium text-stone-900 dark:text-stone-100 uppercase text-sm tracking-wider">
              Actividad Reciente
            </h2>
          </div>
          <div className="px-4 py-2">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))
            ) : (
              <p className="text-sm text-stone-400 py-8 text-center">Sin actividad reciente</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          {[
            { label: 'Entregas', desc: 'Ver albaranes y entregas', href: '/operaciones/entregas', icon: <Truck size={20} /> },
            { label: 'Recepciones', desc: 'Recepciones de proveedor', href: '/operaciones/recepciones', icon: <Package size={20} /> },
            { label: 'Inventario', desc: 'Control de stock y lotes', href: '/operaciones/inventario', icon: <BarChart3 size={20} /> },
          ].map((action) => (
            <button
              key={action.href}
              onClick={() => navigate(action.href)}
              className="w-full flex items-center gap-4 p-4 bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#f5f5f4] hover:shadow-[2px_2px_0_#1c1917] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-75 text-left"
            >
              <span className="text-amber-500">{action.icon}</span>
              <div className="flex-1">
                <p className="font-medium text-stone-900 dark:text-stone-100 uppercase text-sm tracking-wider">{action.label}</p>
                <p className="text-xs text-stone-500">{action.desc}</p>
              </div>
              <ArrowRight size={16} className="text-stone-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add web/src/pages/operations/OperationsDashboardPage.tsx
git commit -m "feat: add Operations Dashboard page with KPIs, activity feed, and quick actions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Create Delivery List Page

**Files:**
- Create: `web/src/pages/operations/DeliveryListPage.tsx`

**Step 1: Create the page**

```tsx
/**
 * Delivery List Page
 * ==================
 * List of delivery notes with filters and SidePanel detail.
 * Pattern: same as OrderListPage + SalesFlowPage.
 */

import { useState, useMemo } from 'react'
import {
  Search, Truck, Package, User, FileText, RefreshCw, Download,
  CheckCircle, Clock, AlertCircle
} from 'lucide-react'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { DeliveryDetailPanel } from '../../components/sections/operations/DeliveryDetailPanel'
import { useDeliveryNotes } from '../../api/hooks/useLogisticsData'
import logisticsApi from '../../api/services/logistics'
import type { DeliveryNote, DeliveryFilters } from '../../components/sections/operations/types'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  Draft: { label: 'Borrador', color: 'bg-stone-200 text-stone-700', icon: <FileText size={12} /> },
  'To Bill': { label: 'Pte. Factura', color: 'bg-amber-100 text-amber-700', icon: <Clock size={12} /> },
  Completed: { label: 'Completado', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={12} /> },
  Cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: <AlertCircle size={12} /> },
}

const filterTabs = [
  { id: 'all', label: 'Todos' },
  { id: 'Draft', label: 'Borrador' },
  { id: 'To Bill', label: 'Pte. Factura' },
  { id: 'Completed', label: 'Completado' },
]

export function DeliveryListPage() {
  const [filters, setFilters] = useState<DeliveryFilters>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const { data: deliveries, loading, error, refetch } = useDeliveryNotes(filters)

  // Filter by tab
  const filteredDeliveries = useMemo(() => {
    if (!deliveries) return []
    let result = deliveries
    if (activeTab !== 'all') {
      result = result.filter(d => d.status === activeTab)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(d =>
        d.deliveryNumber.toLowerCase().includes(q) ||
        d.customerName.toLowerCase().includes(q)
      )
    }
    return result
  }, [deliveries, activeTab, searchQuery])

  // Tab counts
  const tabCounts = useMemo(() => {
    if (!deliveries) return {}
    return deliveries.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [deliveries])

  const handleRowClick = (id: string) => {
    setSelectedId(id)
    setIsPanelOpen(true)
  }

  const handleDownloadPDF = async (deliveryNoteId: string) => {
    try {
      const result = await logisticsApi.getDeliveryNotePDF(deliveryNoteId)
      if (result.base64) {
        const link = document.createElement('a')
        link.href = `data:application/pdf;base64,${result.base64}`
        link.download = `${deliveryNoteId}.pdf`
        link.click()
      }
    } catch (err) {
      alert('Error al descargar PDF')
    }
  }

  if (loading) return <LoadingState message="Cargando entregas..." />
  if (error) return <ErrorState title="Error al cargar entregas" message="No se pudieron cargar los albaranes." error={error} onRetry={refetch} />

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-mono text-2xl font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
            Entregas
          </h1>
          <p className="text-sm text-stone-500 mt-1">Albaranes y notas de entrega</p>
        </div>
        <button
          onClick={refetch}
          className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          title="Actualizar"
        >
          <RefreshCw size={18} className="text-stone-500" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Tab pills */}
        <div className="flex gap-1 bg-stone-100 dark:bg-stone-800 p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {tab.label}
              {tab.id !== 'all' && tabCounts[tab.id] ? (
                <span className="ml-1 text-[10px]">({tabCounts[tab.id]})</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar por albaran o cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:border-amber-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border-2 border-stone-900 dark:border-stone-100 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-stone-100 dark:bg-stone-800 border-b-2 border-stone-900 dark:border-stone-100">
          <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-stone-500">Albaran</div>
          <div className="col-span-3 text-xs font-medium uppercase tracking-wider text-stone-500">Cliente</div>
          <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-stone-500">Fecha</div>
          <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-stone-500">Estado</div>
          <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-stone-500">Transporte</div>
          <div className="col-span-1 text-xs font-medium uppercase tracking-wider text-stone-500 text-right">Total</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-stone-200 dark:divide-stone-700">
          {filteredDeliveries.length > 0 ? (
            filteredDeliveries.map((dn) => {
              const status = statusConfig[dn.status] || statusConfig.Draft
              return (
                <button
                  key={dn.id}
                  onClick={() => handleRowClick(dn.id)}
                  className="w-full grid grid-cols-12 gap-2 px-4 py-3 items-center text-left hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                >
                  <div className="col-span-2">
                    <span className="font-mono text-sm font-medium text-stone-900 dark:text-stone-100">{dn.deliveryNumber}</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-sm text-stone-900 dark:text-stone-100 truncate block">{dn.customerName}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-stone-500">{formatDate(dn.date)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium ${status.color}`}>
                      {status.icon} {status.label}
                    </span>
                  </div>
                  <div className="col-span-2">
                    {dn.transporterName ? (
                      <div className="flex items-center gap-1">
                        <Truck size={12} className="text-stone-400" />
                        <span className="text-xs text-stone-500 truncate">{dn.transporterName}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-stone-300">-</span>
                    )}
                  </div>
                  <div className="col-span-1 text-right">
                    <span className="font-mono text-sm font-medium text-stone-900 dark:text-stone-100">{formatCurrency(dn.total)}</span>
                  </div>
                </button>
              )
            })
          ) : (
            <div className="px-4 py-12 text-center">
              <Truck size={32} className="mx-auto text-stone-300 dark:text-stone-600 mb-3" />
              <p className="text-sm text-stone-500">No hay albaranes{activeTab !== 'all' ? ` con estado "${filterTabs.find(t => t.id === activeTab)?.label}"` : ''}</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      <DeliveryDetailPanel
        deliveryNoteId={selectedId}
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false)
          setSelectedId(null)
        }}
        onDownloadPDF={handleDownloadPDF}
      />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add web/src/pages/operations/DeliveryListPage.tsx
git commit -m "feat: add DeliveryListPage with filters, table, and SidePanel detail

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Add Routes and Navigation to App.tsx

**Files:**
- Modify: `web/src/App.tsx`

**Step 1: Read the current App.tsx to find exact insertion points**

Read the full file to understand where to add:
- Icon import (around line 43-51)
- Lazy imports (around line 11-31)
- Navigation section (around line 53-112)
- Routes (around line 146-205)

**Step 2: Add Truck icon to imports**

Add `Truck` to the lucide-react import line.

**Step 3: Add lazy page imports**

After the existing lazy imports, add:

```typescript
const OperationsDashboardPage = lazy(() =>
  import('./pages/operations/OperationsDashboardPage').then(m => ({ default: m.OperationsDashboardPage }))
)
const DeliveryListPage = lazy(() =>
  import('./pages/operations/DeliveryListPage').then(m => ({ default: m.DeliveryListPage }))
)
```

**Step 4: Add navigation section**

After the "Distribuidores" section and before "Produccion", add:

```typescript
{
  label: 'OPERACIONES',
  icon: <Truck size={18} />,
  items: [
    { label: 'Dashboard', href: '/operaciones' },
    { label: 'Entregas', href: '/operaciones/entregas' },
    { label: 'Recepciones', href: '/operaciones/recepciones' },
    { label: 'Inventario', href: '/operaciones/inventario' },
  ]
},
```

**Step 5: Add routes**

After the Distribuidores routes and before Produccion routes, add:

```tsx
{/* OPERACIONES */}
<Route path="/operaciones" element={<OperationsDashboardPage />} />
<Route path="/operaciones/entregas" element={<DeliveryListPage />} />
```

Note: Recepciones and Inventario routes will be added in Phase 2 and 3. For now add placeholder routes:

```tsx
<Route path="/operaciones/recepciones" element={<div className="p-8 text-center text-stone-500">Recepciones - Proximamente (Phase 2)</div>} />
<Route path="/operaciones/inventario" element={<div className="p-8 text-center text-stone-500">Inventario - Proximamente (Phase 3)</div>} />
```

**Step 6: Verify build**

```bash
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
cd /Users/martinjaimesamperiz/.claude-worktrees/workhub/eager-dewdney/web && npx tsc --noEmit 2>&1 | head -30
```

Fix any TypeScript errors.

**Step 7: Commit**

```bash
git add web/src/App.tsx
git commit -m "feat: add Operaciones section to navigation and routes (Dashboard + Entregas)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Build, Verify, and Copy to Main Repo

**Step 1: Full build**

```bash
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
cd /Users/martinjaimesamperiz/vibe-monorepo/apps/workhub/web && npm run build 2>&1
```

If build fails, fix errors and re-run.

**Step 2: Copy changes to main repo**

```bash
rsync -av --exclude='node_modules' --exclude='.git' --exclude='dist' \
  /Users/martinjaimesamperiz/.claude-worktrees/workhub/eager-dewdney/web/src/ \
  /Users/martinjaimesamperiz/vibe-monorepo/apps/workhub/web/src/

rsync -av --exclude='node_modules' --exclude='.git' \
  /Users/martinjaimesamperiz/.claude-worktrees/workhub/eager-dewdney/frappe-app/ \
  /Users/martinjaimesamperiz/vibe-monorepo/apps/workhub/frappe-app/
```

**Step 3: Build from main repo**

```bash
cd /Users/martinjaimesamperiz/vibe-monorepo/apps/workhub/web && npm run build 2>&1
```

**Step 4: Commit in worktree**

```bash
git add -A && git commit -m "build: verify Phase 1 logistics builds successfully

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Backend API (KPIs + delivery notes) | `api/logistics.py` (NEW) |
| 2 | TypeScript types | `components/sections/operations/types.ts` (NEW) |
| 3 | Frontend API service | `api/services/logistics.ts` (NEW) |
| 4 | React hooks | `api/hooks/useLogisticsData.ts` (NEW) |
| 5 | DeliveryDetailPanel | `components/sections/operations/DeliveryDetailPanel/index.tsx` (NEW) |
| 6 | Dashboard page | `pages/operations/OperationsDashboardPage.tsx` (NEW) |
| 7 | Delivery list page | `pages/operations/DeliveryListPage.tsx` (NEW) |
| 8 | Routes + navigation | `App.tsx` (MODIFIED) |
| 9 | Build + verify | Copy to main repo |
