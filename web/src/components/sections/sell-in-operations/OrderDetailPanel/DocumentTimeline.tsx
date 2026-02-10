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

const statusColors: Record<StepStatus, { text: string; bg: string; line: string }> = {
  completed: { text: 'text-[#2E7D56]', bg: 'bg-[#E8F5EE]', line: 'bg-[#4CAF7A]' },
  active:    { text: 'text-[#B87A1F]', bg: 'bg-[#FFF8E1]', line: 'bg-[#E8E6E3]' },
  pending:   { text: 'text-[#A8A29E]', bg: 'bg-[#F5F4F2]', line: 'bg-[#E8E6E3]' },
  error:     { text: 'text-[#B85A35]', bg: 'bg-[#FFEBEE]', line: 'bg-[#E8E6E3]' },
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
            <div className="flex-1 pb-4">
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
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-sm bg-[#E5A530] text-white hover:bg-[#D4961F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
