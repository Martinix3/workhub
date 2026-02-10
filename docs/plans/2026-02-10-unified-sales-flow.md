# Unified Sales Flow — Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge the OrderDetailPanel and InvoiceDetailDrawer into one unified panel with a document timeline, customer fiscal data, PDF downloads, and payment history — so the full order lifecycle is visible and actionable from a single side panel.

**Architecture:** The current SalesFlowPage has two separate panel components: `OrderDetailPanel` (a SidePanel that shows order details with editable items) and `InvoiceDetailDrawer` (a UnifiedDrawer that shows invoice details with PDF downloads and payment history). We'll merge them into one `OrderDetailPanel` that adapts its UI based on the order's progress through the flow: Pedido → Albarán → Factura → Cobro. The backend `get_order_detail` endpoint needs enrichment to return linked documents (delivery notes, invoices, payments) so we don't need separate API calls.

**Tech Stack:** React/TypeScript, Tailwind CSS, Frappe/ERPNext Python API

**Current key files:**
- `web/src/components/sections/sell-in-operations/OrderDetailPanel/index.tsx` (626 lines, the panel to enhance)
- `web/src/components/sections/sell-in-operations/OrderDetailPanel/types.ts` (28 lines, types)
- `web/src/pages/sales/SalesFlowPage.tsx` (~1222 lines, the parent page)
- `web/src/pages/sales/components/InvoiceDetailDrawer.tsx` (341 lines, to be absorbed)
- `web/src/api/services/sales.ts` (~742 lines, API service)
- `web/src/api/hooks/useSalesData.ts` (~394 lines, hooks)
- `frappe-app/workhub_frappe_app/api/sales.py` (~3249 lines, backend API)

---

## Task 1: Enrich `get_order_detail` Backend API

**Why:** The current `get_order_detail` only returns order + items. We need it to also return linked documents (delivery notes, invoices, payments) and customer fiscal data so the panel can show the full lifecycle without extra API calls.

**Files:**
- Modify: `frappe-app/workhub_frappe_app/api/sales.py` (the `get_order_detail` function)

**Step 1: Find and read `get_order_detail` in sales.py**

Search for `def get_order_detail` in `sales.py` and read the full function to understand what it currently returns.

**Step 2: Add linked documents to the response**

After the existing return data is built, add these new fields before returning:

```python
# === NEW: Linked documents for unified panel ===

# 1. Customer fiscal data
customer_tax_id = frappe.db.get_value("Customer", order.customer, "tax_id") or ""
customer_address = order.address_display or ""
if not customer_address and order.customer_address:
    customer_address = frappe.db.get_value("Address", order.customer_address, "address_display") or ""
if not customer_address:
    addr_name = frappe.db.get_value(
        "Dynamic Link",
        {"link_doctype": "Customer", "link_name": order.customer, "parenttype": "Address"},
        "parent"
    )
    if addr_name:
        customer_address = frappe.db.get_value("Address", addr_name, "address_display") or ""

# 2. Linked Delivery Notes
delivery_notes = frappe.get_all(
    "Delivery Note Item",
    filters={"against_sales_order": order.name, "docstatus": ["!=", 2]},
    fields=["distinct parent as name"],
    pluck="name"
)
linked_delivery_notes = []
for dn_name in delivery_notes:
    dn = frappe.db.get_value(
        "Delivery Note", dn_name,
        ["name", "posting_date", "docstatus", "status"],
        as_dict=True
    )
    if dn:
        linked_delivery_notes.append({
            "id": dn.name,
            "date": str(dn.posting_date),
            "status": dn.status,
            "docstatus": dn.docstatus
        })

# 3. Linked Sales Invoices
invoices = frappe.get_all(
    "Sales Invoice Item",
    filters={"sales_order": order.name, "docstatus": ["!=", 2]},
    fields=["distinct parent as name"],
    pluck="name"
)
linked_invoices = []
for inv_name in invoices:
    inv = frappe.db.get_value(
        "Sales Invoice", inv_name,
        ["name", "posting_date", "status", "outstanding_amount", "grand_total", "paid_amount"],
        as_dict=True
    )
    if inv:
        linked_invoices.append({
            "id": inv.name,
            "date": str(inv.posting_date),
            "status": inv.status,
            "total": float(inv.grand_total or 0),
            "outstanding": float(inv.outstanding_amount or 0),
            "paid": float(inv.paid_amount or 0)
        })

# 4. Linked Payments (via Payment Entry references)
linked_payments = []
for inv_data in linked_invoices:
    pe_refs = frappe.get_all(
        "Payment Entry Reference",
        filters={"reference_doctype": "Sales Invoice", "reference_name": inv_data["id"], "docstatus": 1},
        fields=["parent"]
    )
    for pe_ref in pe_refs:
        pe = frappe.db.get_value(
            "Payment Entry", pe_ref.parent,
            ["name", "posting_date", "paid_amount", "mode_of_payment", "docstatus"],
            as_dict=True
        )
        if pe and pe.docstatus == 1:
            linked_payments.append({
                "id": pe.name,
                "date": str(pe.posting_date),
                "amount": float(pe.paid_amount or 0),
                "method": pe.mode_of_payment or "Desconocido",
                "invoiceId": inv_data["id"]
            })

# Add to the response dict (the existing return dict):
# response["customerTaxId"] = customer_tax_id
# response["customerAddress"] = customer_address
# response["linkedDocuments"] = {
#     "deliveryNotes": linked_delivery_notes,
#     "invoices": linked_invoices,
#     "payments": linked_payments
# }
```

Note: The exact integration depends on how the existing function builds its response dict. Read the function first, then add these fields to whatever dict is returned.

**Step 3: Verify with a manual test**

If bench is running, test via:
```bash
bench --site santabrisa.localhost execute workhub_frappe_app.api.sales.get_order_detail --kwargs '{"order_id": "SO-00001"}'
```

Or verify it doesn't error. If bench is not running, skip this step.

**Step 4: Commit**

```bash
git add frappe-app/workhub_frappe_app/api/sales.py
git commit -m "feat: enrich get_order_detail with linked documents, fiscal data, and payments"
```

---

## Task 2: Update Frontend Types and API Service

**Why:** The frontend needs to know about the new fields returned by `get_order_detail`.

**Files:**
- Modify: `web/src/components/sections/sell-in-operations/OrderDetailPanel/types.ts`
- Modify: `web/src/api/services/sales.ts` (if needed for type alignment)

**Step 1: Add linked document types to OrderDetailPanel/types.ts**

Replace the full file with:

```typescript
import type { SalesOrder } from '../types'

export type SalesType = 'sell_in' | 'sell_out'

// Linked document types for the unified panel
export interface LinkedDeliveryNote {
  id: string
  date: string
  status: string
  docstatus: number
}

export interface LinkedInvoice {
  id: string
  date: string
  status: string
  total: number
  outstanding: number
  paid: number
}

export interface LinkedPayment {
  id: string
  date: string
  amount: number
  method: string
  invoiceId: string
}

export interface LinkedDocuments {
  deliveryNotes: LinkedDeliveryNote[]
  invoices: LinkedInvoice[]
  payments: LinkedPayment[]
}

export interface OrderDetail extends SalesOrder {
  salesType: SalesType
  assignedDistributor?: {
    id: string
    name: string
  }
  // New fields for unified panel
  customerTaxId?: string
  customerAddress?: string
  linkedDocuments?: LinkedDocuments
}

export interface WorkLink {
  id: string
  taskId: string
  taskTitle: string
  taskStatus: string
  documentType: string
  documentId: string
}

export interface OrderDetailPanelProps {
  orderId: string | null
  isOpen: boolean
  onClose: () => void
  onSave?: (order: OrderDetail) => void
  onCancelOrder?: (orderId: string) => void
  onWorkflowComplete?: () => void
  onDownloadPDF?: (invoiceId: string) => void
  onDownloadDeliveryNotePDF?: (deliveryNoteId: string) => void
  onRegisterPayment?: (invoiceId: string) => void
}
```

**Step 2: Verify build**

```bash
cd /Users/martinjaimesamperiz/vibe-monorepo/apps/workhub/web && npx tsc --noEmit 2>&1 | head -30
```

If there are type errors, fix them. Common issue: `SalesOrder` in `../types.ts` may not match. Verify.

**Step 3: Commit**

```bash
git add web/src/components/sections/sell-in-operations/OrderDetailPanel/types.ts
git commit -m "feat: add linked document types for unified order panel"
```

---

## Task 3: Add DocumentTimeline Sub-Component

**Why:** The core visual element of the unified panel — shows the lifecycle as a vertical timeline with document status and actions.

**Files:**
- Create: `web/src/components/sections/sell-in-operations/OrderDetailPanel/DocumentTimeline.tsx`

**Step 1: Create the DocumentTimeline component**

```tsx
/**
 * DocumentTimeline
 * ================
 * Visual timeline showing order lifecycle: Pedido → Albarán → Factura → Cobro
 * Each step shows status + action button or download link.
 *
 * SSOT: /src/styles/design-tokens.ts
 */

import { Package, Truck, FileText, CreditCard, Download, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import type { LinkedDocuments } from './types'

interface DocumentTimelineProps {
  orderStatus: string
  orderNumber: string
  linkedDocuments?: LinkedDocuments
  // Actions
  onSubmitOrder?: () => void
  onCreateDelivery?: () => void
  onCreateInvoice?: () => void
  onRegisterPayment?: (invoiceId: string) => void
  // Downloads
  onDownloadDeliveryNotePDF?: (deliveryNoteId: string) => void
  onDownloadInvoicePDF?: (invoiceId: string) => void
  // Permissions
  canSubmitOrder?: boolean
  canCreateDelivery?: boolean
  canCreateInvoice?: boolean
  canCreatePayment?: boolean
  // Loading states
  isSubmitting?: boolean
  isCreatingDelivery?: boolean
  isCreatingInvoice?: boolean
  isCreatingPayment?: boolean
}

type StepStatus = 'completed' | 'active' | 'pending' | 'error'

interface TimelineStep {
  id: string
  label: string
  icon: React.ReactNode
  status: StepStatus
  detail?: string
  action?: {
    label: string
    onClick: () => void
    disabled?: boolean
    loading?: boolean
  }
  downloads?: {
    label: string
    onClick: () => void
  }[]
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
  })
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)

const statusColors: Record<StepStatus, { dot: string; line: string; text: string; bg: string }> = {
  completed: { dot: 'bg-[#4CAF7A]', line: 'bg-[#4CAF7A]', text: 'text-[#2E7D56]', bg: 'bg-[#E8F5EE]' },
  active:    { dot: 'bg-[#E5A530]', line: 'bg-[#E8E6E3]', text: 'text-[#B87A1F]', bg: 'bg-[#FFF8E1]' },
  pending:   { dot: 'bg-[#D6D3D1]', line: 'bg-[#E8E6E3]', text: 'text-[#A8A29E]', bg: 'bg-[#F5F4F2]' },
  error:     { dot: 'bg-[#E07A4C]', line: 'bg-[#E8E6E3]', text: 'text-[#B85A35]', bg: 'bg-[#FFEBEE]' },
}

export function DocumentTimeline({
  orderStatus,
  orderNumber,
  linkedDocuments,
  onSubmitOrder,
  onCreateDelivery,
  onCreateInvoice,
  onRegisterPayment,
  onDownloadDeliveryNotePDF,
  onDownloadInvoicePDF,
  canSubmitOrder,
  canCreateDelivery,
  canCreateInvoice,
  canCreatePayment,
  isSubmitting,
  isCreatingDelivery,
  isCreatingInvoice,
  isCreatingPayment,
}: DocumentTimelineProps) {
  const docs = linkedDocuments || { deliveryNotes: [], invoices: [], payments: [] }

  const hasDelivery = docs.deliveryNotes.length > 0
  const hasInvoice = docs.invoices.length > 0
  const hasPayment = docs.payments.length > 0
  const isConfirmed = !['draft', 'cancelled'].includes(orderStatus)
  const isPaid = orderStatus === 'paid'

  // Build timeline steps
  const steps: TimelineStep[] = [
    // Step 1: Pedido
    {
      id: 'order',
      label: 'Pedido',
      icon: <Package size={16} />,
      status: isConfirmed ? 'completed' : orderStatus === 'draft' ? 'active' : 'pending',
      detail: isConfirmed
        ? `${orderNumber} confirmado`
        : `${orderNumber} — borrador`,
      action: !isConfirmed && canSubmitOrder ? {
        label: 'Confirmar Pedido',
        onClick: () => onSubmitOrder?.(),
        loading: isSubmitting,
      } : undefined,
    },

    // Step 2: Albarán
    {
      id: 'delivery',
      label: 'Albarán',
      icon: <Truck size={16} />,
      status: hasDelivery ? 'completed' : (isConfirmed && !hasDelivery ? 'active' : 'pending'),
      detail: hasDelivery
        ? docs.deliveryNotes.map(dn => `${dn.id} · ${formatDate(dn.date)}`).join(', ')
        : undefined,
      action: !hasDelivery && canCreateDelivery ? {
        label: 'Crear Albarán',
        onClick: () => onCreateDelivery?.(),
        loading: isCreatingDelivery,
      } : undefined,
      downloads: hasDelivery && onDownloadDeliveryNotePDF
        ? docs.deliveryNotes.map(dn => ({
            label: `PDF ${dn.id}`,
            onClick: () => onDownloadDeliveryNotePDF(dn.id),
          }))
        : undefined,
    },

    // Step 3: Factura
    {
      id: 'invoice',
      label: 'Factura',
      icon: <FileText size={16} />,
      status: hasInvoice
        ? (docs.invoices.some(inv => inv.outstanding > 0) ? 'active' : 'completed')
        : (hasDelivery ? 'active' : 'pending'),
      detail: hasInvoice
        ? docs.invoices.map(inv => {
            const suffix = inv.outstanding > 0
              ? ` · Pendiente ${formatCurrency(inv.outstanding)}`
              : ' · Pagada'
            return `${inv.id}${suffix}`
          }).join('\n')
        : undefined,
      action: !hasInvoice && canCreateInvoice ? {
        label: 'Crear Factura',
        onClick: () => onCreateInvoice?.(),
        loading: isCreatingInvoice,
      } : undefined,
      downloads: hasInvoice && onDownloadInvoicePDF
        ? docs.invoices.map(inv => ({
            label: `PDF ${inv.id}`,
            onClick: () => onDownloadInvoicePDF(inv.id),
          }))
        : undefined,
    },

    // Step 4: Cobro
    {
      id: 'payment',
      label: 'Cobro',
      icon: <CreditCard size={16} />,
      status: isPaid ? 'completed' : (hasInvoice && !isPaid ? 'active' : 'pending'),
      detail: hasPayment
        ? docs.payments.map(p => `${formatCurrency(p.amount)} · ${p.method} · ${formatDate(p.date)}`).join('\n')
        : undefined,
      action: hasInvoice && canCreatePayment && !isPaid ? {
        label: 'Registrar Pago',
        onClick: () => {
          const firstUnpaid = docs.invoices.find(inv => inv.outstanding > 0)
          if (firstUnpaid) onRegisterPayment?.(firstUnpaid.id)
        },
        loading: isCreatingPayment,
      } : undefined,
    },
  ]

  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const colors = statusColors[step.status]
        const isLast = index === steps.length - 1
        const StatusIcon = step.status === 'completed' ? CheckCircle
          : step.status === 'error' ? AlertCircle
          : step.status === 'active' ? Clock
          : Clock

        return (
          <div key={step.id} className="flex gap-3">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colors.bg} ${colors.text}`}>
                {step.status === 'completed'
                  ? <CheckCircle size={16} />
                  : step.icon
                }
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 min-h-[24px] ${colors.line}`} />
              )}
            </div>

            {/* Content */}
            <div className={`flex-1 pb-4 ${isLast ? '' : ''}`}>
              <div className="flex items-center justify-between">
                <p className={`text-sm font-medium ${
                  step.status === 'pending' ? 'text-[#A8A29E]' : 'text-[#44403C]'
                }`}>
                  {step.label}
                </p>
                {/* Download buttons */}
                {step.downloads && step.downloads.length > 0 && (
                  <div className="flex gap-1">
                    {step.downloads.map((dl) => (
                      <button
                        key={dl.label}
                        onClick={dl.onClick}
                        className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-[#78716C] hover:text-[#44403C] hover:bg-[#F5F4F2] rounded transition-colors"
                        title={dl.label}
                      >
                        <Download size={12} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Detail text */}
              {step.detail && (
                <p className={`text-xs mt-0.5 whitespace-pre-line ${
                  step.status === 'completed' ? 'text-[#78716C]'
                  : step.status === 'active' ? 'text-[#B87A1F]'
                  : 'text-[#A8A29E]'
                }`}>
                  {step.detail}
                </p>
              )}

              {/* Action button */}
              {step.action && (
                <button
                  onClick={step.action.onClick}
                  disabled={step.action.disabled || step.action.loading}
                  className={`
                    mt-2 inline-flex items-center gap-1.5 px-3 py-1.5
                    text-xs font-medium rounded-sm
                    bg-[#E5A530] text-white hover:bg-[#D4961F]
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors
                  `}
                >
                  {step.action.loading ? (
                    <span className="animate-spin">⟳</span>
                  ) : null}
                  {step.action.label}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

**Step 2: Verify it compiles**

```bash
cd /Users/martinjaimesamperiz/vibe-monorepo/apps/workhub/web && npx tsc --noEmit 2>&1 | head -30
```

**Step 3: Commit**

```bash
git add web/src/components/sections/sell-in-operations/OrderDetailPanel/DocumentTimeline.tsx
git commit -m "feat: add DocumentTimeline component for order lifecycle visualization"
```

---

## Task 4: Add CustomerInfo Sub-Component

**Why:** Extracted sub-component showing customer name, NIF/CIF, and address. Currently the panel only shows customer name + ID.

**Files:**
- Create: `web/src/components/sections/sell-in-operations/OrderDetailPanel/CustomerInfo.tsx`

**Step 1: Create the component**

```tsx
/**
 * CustomerInfo
 * ============
 * Shows customer name, tax ID (NIF/CIF), and fiscal address.
 */

interface CustomerInfoProps {
  customerName: string
  customerId: string
  customerTaxId?: string
  customerAddress?: string
}

export function CustomerInfo({
  customerName,
  customerId,
  customerTaxId,
  customerAddress,
}: CustomerInfoProps) {
  return (
    <div className="p-3 bg-[#F5F4F2] rounded-sm">
      <p className="font-medium text-[#44403C]">{customerName}</p>
      <p className="text-xs text-[#78716C] font-mono">ID: {customerId}</p>
      {customerTaxId && (
        <p className="text-xs text-[#78716C] font-mono mt-1">NIF/CIF: {customerTaxId}</p>
      )}
      {customerAddress && (
        <p className="text-xs text-[#78716C] mt-1 whitespace-pre-line">{customerAddress}</p>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add web/src/components/sections/sell-in-operations/OrderDetailPanel/CustomerInfo.tsx
git commit -m "feat: add CustomerInfo sub-component with fiscal data"
```

---

## Task 5: Add PaymentHistory Sub-Component

**Why:** Shows payment history inline in the panel. Currently only visible in the InvoiceDetailDrawer.

**Files:**
- Create: `web/src/components/sections/sell-in-operations/OrderDetailPanel/PaymentHistory.tsx`

**Step 1: Create the component**

```tsx
/**
 * PaymentHistory
 * ==============
 * Shows list of payments received for order invoices.
 */

import { CheckCircle } from 'lucide-react'
import type { LinkedPayment } from './types'

interface PaymentHistoryProps {
  payments: LinkedPayment[]
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  if (payments.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-[#78716C] uppercase tracking-wide">
        Pagos recibidos
      </p>
      {payments.map((payment) => (
        <div
          key={payment.id}
          className="flex items-center justify-between p-3 bg-[#E8F5EE] rounded-sm"
        >
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-[#4CAF7A]" />
            <div>
              <p className="text-sm font-medium text-[#44403C]">
                {formatCurrency(payment.amount)}
              </p>
              <p className="text-[10px] text-[#78716C]">
                {payment.method} · {formatDate(payment.date)}
              </p>
            </div>
          </div>
          <span className="font-mono text-[10px] text-[#A8A29E]">
            {payment.id}
          </span>
        </div>
      ))}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add web/src/components/sections/sell-in-operations/OrderDetailPanel/PaymentHistory.tsx
git commit -m "feat: add PaymentHistory sub-component"
```

---

## Task 6: Integrate Sub-Components into OrderDetailPanel

**Why:** This is the core task — wire the new sub-components into the existing panel, add workflow actions, and remove the need for InvoiceDetailDrawer.

**Files:**
- Modify: `web/src/components/sections/sell-in-operations/OrderDetailPanel/index.tsx`

**Step 1: Read the current file completely**

Read the full `index.tsx` to understand the exact structure before modifying.

**Step 2: Add imports and workflow hooks**

At the top of the file, add:

```typescript
import { DocumentTimeline } from './DocumentTimeline'
import { CustomerInfo } from './CustomerInfo'
import { PaymentHistory } from './PaymentHistory'
import { salesApi } from '../../../../api/services/sales'
```

**Step 3: Add workflow state and handlers**

Inside the component function, after the existing hooks (around line 94), add:

```typescript
// Workflow states
const [workflowMessage, setWorkflowMessage] = useState<string | null>(null)
const [isSubmitting, setIsSubmitting] = useState(false)
const [isCreatingDelivery, setIsCreatingDelivery] = useState(false)
const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)
const [isCreatingPayment, setIsCreatingPayment] = useState(false)
const [transportMethod, setTransportMethod] = useState<string | null>(null)

// Workflow handlers
const handleSubmitOrder = async () => {
  if (!order) return
  setIsSubmitting(true)
  try {
    const result = await salesApi.submitOrder(order.id)
    if (result.success) {
      setWorkflowMessage('Pedido confirmado ✓')
      // Refetch order detail to get updated status
      // The useOrderDetail hook will auto-refetch when orderId changes
      onWorkflowComplete?.()
    }
  } catch (err) {
    setWorkflowMessage('Error al confirmar pedido')
  } finally {
    setIsSubmitting(false)
    setTimeout(() => setWorkflowMessage(null), 3000)
  }
}

const handleCreateDelivery = async () => {
  if (!order || !transportMethod) return
  setIsCreatingDelivery(true)
  try {
    const result = await salesApi.createDeliveryNote(order.id, transportMethod)
    if (result.success) {
      setWorkflowMessage('Albarán creado ✓')
      onWorkflowComplete?.()
    }
  } catch (err) {
    setWorkflowMessage('Error al crear albarán')
  } finally {
    setIsCreatingDelivery(false)
    setTimeout(() => setWorkflowMessage(null), 3000)
  }
}

const handleCreateInvoice = async () => {
  if (!order) return
  setIsCreatingInvoice(true)
  try {
    const result = await salesApi.createSalesInvoice(order.id)
    if (result.success) {
      setWorkflowMessage('Factura creada ✓')
      onWorkflowComplete?.()
    }
  } catch (err) {
    setWorkflowMessage('Error al crear factura')
  } finally {
    setIsCreatingInvoice(false)
    setTimeout(() => setWorkflowMessage(null), 3000)
  }
}

const handleRegisterPayment = async (invoiceId: string) => {
  onRegisterPayment?.(invoiceId)
}
```

**Step 4: Add permission logic**

After the existing `canEdit` and `canCancelOrder` lines:

```typescript
const docs = order?.linkedDocuments
const hasDelivery = (docs?.deliveryNotes?.length || 0) > 0
const hasInvoice = (docs?.invoices?.length || 0) > 0
const isSellOut = order?.salesType === 'sell_out'

const canSubmitOrder = order?.status === 'draft' && (order?.items?.length || 0) > 0
const canCreateDelivery = !isSellOut && order?.status !== 'cancelled' && order?.status !== 'draft' && !hasDelivery && !!transportMethod
const canCreateInvoice = !isSellOut && hasDelivery && !hasInvoice
const canCreatePayment = !isSellOut && hasInvoice && order?.status !== 'paid'
```

**Step 5: Replace the "Información General" Section content**

In the customer section, replace the customer display div (the one with green border) with:

```tsx
<CustomerInfo
  customerName={order.customerName}
  customerId={order.customerId}
  customerTaxId={order.customerTaxId}
  customerAddress={order.customerAddress}
/>
```

Keep the Sales Type toggle and distributor info as-is.

**Step 6: Add DocumentTimeline Section**

After the "Información General" section and before the "Productos" section, add a new Section:

```tsx
{/* Document Lifecycle */}
<Section title="Flujo de Documentos" icon={<Receipt size={20} />}>
  {/* Transport method selector - only shown when delivery can be created */}
  {canCreateDelivery === false && !hasDelivery && !isSellOut && order.status !== 'draft' && order.status !== 'cancelled' && !transportMethod && (
    <div className="mb-4 p-3 bg-[#FFF8E1] border border-[#E5A530] rounded-sm">
      <p className="text-xs text-[#B87A1F] mb-2">Selecciona método de transporte para crear albarán:</p>
      <div className="flex gap-2">
        {['Transporte propio', 'Agencia', 'Recogida cliente'].map((method) => (
          <button
            key={method}
            onClick={() => setTransportMethod(method)}
            className={`px-3 py-1.5 text-xs border rounded-sm transition-colors ${
              transportMethod === method
                ? 'bg-[#E5A530] text-white border-[#E5A530]'
                : 'border-[#E8E6E3] text-[#78716C] hover:bg-[#F5F4F2]'
            }`}
          >
            {method}
          </button>
        ))}
      </div>
    </div>
  )}

  <DocumentTimeline
    orderStatus={order.status}
    orderNumber={order.orderNumber}
    linkedDocuments={order.linkedDocuments}
    onSubmitOrder={handleSubmitOrder}
    onCreateDelivery={handleCreateDelivery}
    onCreateInvoice={handleCreateInvoice}
    onRegisterPayment={handleRegisterPayment}
    onDownloadDeliveryNotePDF={onDownloadDeliveryNotePDF}
    onDownloadInvoicePDF={onDownloadPDF}
    canSubmitOrder={canSubmitOrder}
    canCreateDelivery={canCreateDelivery}
    canCreateInvoice={canCreateInvoice}
    canCreatePayment={canCreatePayment}
    isSubmitting={isSubmitting}
    isCreatingDelivery={isCreatingDelivery}
    isCreatingInvoice={isCreatingInvoice}
    isCreatingPayment={isCreatingPayment}
  />
</Section>
```

**Step 7: Add PaymentHistory after Totals section**

After the "Resumen" (Totals) section, add:

```tsx
{/* Payment History */}
{docs && docs.payments.length > 0 && (
  <Section title="Pagos" icon={<CreditCard size={20} />}>
    <PaymentHistory payments={docs.payments} />
  </Section>
)}
```

Add the `CreditCard` import from lucide-react at the top.

**Step 8: Add workflow message display**

In the header section (around the `hasChanges` and `saveError` displays), add:

```tsx
{workflowMessage && (
  <div className="flex items-center gap-2 text-amber-600 mt-2">
    <span className="text-xs font-medium">{workflowMessage}</span>
  </div>
)}
```

**Step 9: Update destructured props**

In the component function signature, add the new props:

```typescript
export function OrderDetailPanel({
  orderId,
  isOpen,
  onClose,
  onSave,
  onCancelOrder,
  onWorkflowComplete,
  onDownloadPDF,
  onDownloadDeliveryNotePDF,
  onRegisterPayment,
}: OrderDetailPanelProps) {
```

**Step 10: Verify build**

```bash
cd /Users/martinjaimesamperiz/vibe-monorepo/apps/workhub/web && npx tsc --noEmit 2>&1 | head -30
```

Fix any type errors.

**Step 11: Commit**

```bash
git add web/src/components/sections/sell-in-operations/OrderDetailPanel/
git commit -m "feat: integrate DocumentTimeline, CustomerInfo, and PaymentHistory into OrderDetailPanel"
```

---

## Task 7: Update SalesFlowPage to Use Unified Panel

**Why:** SalesFlowPage currently manages both `OrderDetailPanel` and `InvoiceDetailDrawer` separately. Now that OrderDetailPanel handles everything, we simplify by removing the invoice drawer and wiring PDF downloads + payment to the order panel.

**Files:**
- Modify: `web/src/pages/sales/SalesFlowPage.tsx`

**Step 1: Read the OrderDetailPanel usage section**

Read the section of SalesFlowPage.tsx where OrderDetailPanel is rendered (around lines 1167-1175) and the InvoiceDetailDrawer (around lines 1182-1200).

**Step 2: Wire new props to OrderDetailPanel**

Update the OrderDetailPanel usage to include the new props:

```tsx
<OrderDetailPanel
  orderId={selectedOrderId}
  isOpen={isDetailOpen}
  onClose={() => {
    setIsDetailOpen(false)
    setSelectedOrderId(null)
  }}
  onWorkflowComplete={handleWorkflowComplete}
  onDownloadPDF={handleDownloadPDF}
  onDownloadDeliveryNotePDF={handleDownloadDeliveryNote}
  onRegisterPayment={handleRegisterPayment}
/>
```

Note: `handleDownloadPDF`, `handleDownloadDeliveryNote`, and `handleRegisterPayment` should already exist in SalesFlowPage. Verify they exist and match the expected signatures:
- `handleDownloadPDF(invoiceId: string): void`
- `handleDownloadDeliveryNote(deliveryNoteId: string): void`
- `handleRegisterPayment(invoiceId: string): void`

If `handleDownloadDeliveryNote` doesn't exist, check for similar function names and adapt.

**Step 3: Keep InvoiceDetailDrawer for invoices tab**

The InvoiceDetailDrawer is still needed when clicking invoices from the "Facturación" tab. Don't remove it entirely — just ensure the OrderDetailPanel no longer needs it for the orders flow.

**Step 4: Verify build**

```bash
cd /Users/martinjaimesamperiz/vibe-monorepo/apps/workhub/web && npm run build 2>&1 | tail -20
```

**Step 5: Commit**

```bash
git add web/src/pages/sales/SalesFlowPage.tsx
git commit -m "feat: wire unified OrderDetailPanel with document lifecycle, PDFs, and payments"
```

---

## Task 8: Fix IVA Rate (16% → 21%)

**Why:** The OrderDetailPanel calculates tax at 16% (line 107: `const tax = subtotal * 0.16`) and displays "IVA (16%)". Santa Brisa is a Spanish company — should be 21%.

**Files:**
- Modify: `web/src/components/sections/sell-in-operations/OrderDetailPanel/index.tsx`

**Step 1: Fix the tax calculation**

Change:
```typescript
const tax = subtotal * 0.16
```
to:
```typescript
const tax = subtotal * 0.21
```

**Step 2: Fix the display label**

Change:
```tsx
<span className="text-stone-500 dark:text-stone-400">IVA (16%):</span>
```
to:
```tsx
<span className="text-stone-500 dark:text-stone-400">IVA (21%):</span>
```

**Step 3: Also fix currency from MXN to EUR**

Change:
```typescript
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
```
to:
```typescript
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
```

And:
```typescript
const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
```
to:
```typescript
const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
```

**Step 4: Commit**

```bash
git add web/src/components/sections/sell-in-operations/OrderDetailPanel/index.tsx
git commit -m "fix: correct IVA rate to 21% and currency to EUR for Santa Brisa"
```

---

## Task 9: Build and Verify

**Why:** Final verification that everything compiles and the build succeeds.

**Files:** None (verification only)

**Step 1: Run TypeScript check**

```bash
cd /Users/martinjaimesamperiz/vibe-monorepo/apps/workhub/web && npx tsc --noEmit 2>&1 | head -50
```

**Step 2: Run build**

```bash
cd /Users/martinjaimesamperiz/vibe-monorepo/apps/workhub/web && npm run build 2>&1 | tail -20
```

**Step 3: If errors, fix them**

Common issues:
- Missing imports
- Type mismatches between OrderDetailPanelProps and what SalesFlowPage passes
- Missing `onWorkflowComplete` in the old props interface

**Step 4: Copy changes to main repo**

```bash
rsync -av --exclude='node_modules' --exclude='.git' --exclude='dist' \
  /Users/martinjaimesamperiz/.claude-worktrees/workhub/eager-dewdney/web/src/ \
  /Users/martinjaimesamperiz/vibe-monorepo/apps/workhub/web/src/

rsync -av --exclude='node_modules' --exclude='.git' \
  /Users/martinjaimesamperiz/.claude-worktrees/workhub/eager-dewdney/frappe-app/ \
  /Users/martinjaimesamperiz/vibe-monorepo/apps/workhub/frappe-app/
```

**Step 5: Build from main repo**

```bash
cd /Users/martinjaimesamperiz/vibe-monorepo/apps/workhub/web && npm run build 2>&1 | tail -20
```

---

## Summary of Changes

| Component | Change |
|-----------|--------|
| `get_order_detail` (backend) | Returns customerTaxId, customerAddress, linkedDocuments (delivery notes, invoices, payments) |
| `OrderDetailPanel/types.ts` | New interfaces: LinkedDeliveryNote, LinkedInvoice, LinkedPayment, LinkedDocuments. Extended OrderDetailPanelProps with workflow + PDF callbacks |
| `DocumentTimeline.tsx` (NEW) | 4-step vertical timeline: Pedido → Albarán → Factura → Cobro with status, actions, PDF downloads |
| `CustomerInfo.tsx` (NEW) | Shows customer name, NIF/CIF, fiscal address |
| `PaymentHistory.tsx` (NEW) | Shows payment entries with amount, method, date |
| `OrderDetailPanel/index.tsx` | Integrates all sub-components, adds workflow handlers, fixes IVA 16%→21%, currency MXN→EUR |
| `SalesFlowPage.tsx` | Wires new props (onWorkflowComplete, onDownloadPDF, etc.) to OrderDetailPanel |
