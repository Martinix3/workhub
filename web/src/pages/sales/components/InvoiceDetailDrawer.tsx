/**
 * Invoice Detail Drawer
 * =====================
 *
 * Drawer para mostrar el detalle de una factura.
 * Usa UnifiedDrawer con los colores del SSOT.
 *
 * SSOT: /src/styles/design-tokens.ts
 */

import { Download, FileBox, CreditCard, CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react'
import {
  UnifiedDrawer,
  DrawerSection,
  DrawerBadge,
  DrawerCTA,
  DrawerAlert,
} from '../../../components/ui/UnifiedDrawer'
import { colors } from '../../../styles/design-tokens'
import type { InvoiceDetail } from '../../../api/services/sales'

// ============================================================================
// TYPES
// ============================================================================

export interface InvoiceDetailDrawerProps {
  isOpen: boolean
  onClose: () => void
  invoice: InvoiceDetail | null
  isLoading: boolean
  onDownloadPDF: (invoiceId: string) => void
  onDownloadDeliveryNote?: (deliveryNoteId: string) => void
  onRegisterPayment: (invoiceId: string) => void
}

// ============================================================================
// INVOICE STATUS CONFIG - Usando colores SSOT
// ============================================================================

interface StatusConfig {
  label: string
  color: string
  bgColor: string
  icon: React.ReactNode
}

const INVOICE_STATUS_CONFIG: Record<string, StatusConfig> = {
  overdue: {
    label: 'Vencida',
    color: '#B85A35',      // colors.error.text
    bgColor: '#FFEBEE',    // colors.error.light
    icon: <AlertCircle size={14} />,
  },
  unpaid: {
    label: 'Pendiente',
    color: '#B87A1F',      // colors.warning.text
    bgColor: '#FFF8E1',    // colors.warning.light
    icon: <Clock size={14} />,
  },
  draft: {
    label: 'Borrador',
    color: '#78716C',      // colors.neutral[500]
    bgColor: '#F5F4F2',    // colors.neutral[100]
    icon: <FileText size={14} />,
  },
  paid: {
    label: 'Pagada',
    color: '#2E7D56',      // colors.success.text
    bgColor: '#E8F5EE',    // colors.success.light
    icon: <CheckCircle size={14} />,
  },
  cancelled: {
    label: 'Cancelada',
    color: '#A8A29E',      // colors.neutral[400]
    bgColor: '#F5F4F2',    // colors.neutral[100]
    icon: <AlertCircle size={14} />,
  },
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatDateLong = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InvoiceDetailDrawer({
  isOpen,
  onClose,
  invoice,
  isLoading,
  onDownloadPDF,
  onDownloadDeliveryNote,
  onRegisterPayment,
}: InvoiceDetailDrawerProps) {
  const statusConfig = invoice ? INVOICE_STATUS_CONFIG[invoice.status] : null

  // Header badges
  const headerBadges = invoice && statusConfig ? (
    <DrawerBadge
      customBg={statusConfig.bgColor}
      customColor={statusConfig.color}
    >
      <span className="flex items-center gap-1.5">
        {statusConfig.icon}
        {statusConfig.label}
      </span>
    </DrawerBadge>
  ) : null

  // Header actions
  const headerActions = invoice ? (
    <div className="flex gap-2">
      <button
        onClick={() => onDownloadPDF(invoice.id)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#E8E6E3] rounded-sm hover:bg-[#F5F4F2] transition-colors"
      >
        <Download size={14} />
        Factura
      </button>
      {invoice.deliveryNote && onDownloadDeliveryNote && (
        <button
          onClick={() => onDownloadDeliveryNote(invoice.deliveryNote!.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#E8E6E3] rounded-sm hover:bg-[#F5F4F2] transition-colors"
        >
          <FileBox size={14} />
          Albarán
        </button>
      )}
    </div>
  ) : null

  // Footer with CTA - Using gold as primary color per SSOT
  const footer = invoice && invoice.outstanding > 0 ? (
    <DrawerCTA
      variant="primary"
      icon={<CreditCard size={16} />}
      onClick={() => onRegisterPayment(invoice.id)}
    >
      Registrar Pago
    </DrawerCTA>
  ) : null

  return (
    <UnifiedDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={invoice ? `Factura ${invoice.invoiceNumber}` : 'Cargando...'}
      headerBadges={headerBadges}
      headerActions={headerActions}
      footer={footer}
      size="lg"
      testId="invoice-detail-drawer"
    >
      {isLoading ? (
        <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5BBFBF]"></div>
          <p className="mt-4 text-sm text-[#78716C]">Cargando detalle...</p>
        </div>
      ) : invoice && (
        <div className="p-6 space-y-6">
          {/* Customer Info */}
          <div className="p-4 bg-[#F5F4F2] rounded-sm">
            <p className="text-[10px] text-[#78716C] uppercase tracking-wide mb-1">
              Cliente
            </p>
            <p className="font-medium text-[#44403C]">{invoice.customerName}</p>
            {invoice.customerTaxId && (
              <p className="text-xs text-[#78716C] font-mono">{invoice.customerTaxId}</p>
            )}
            <p className="text-sm text-[#78716C] whitespace-pre-line">{invoice.customerAddress}</p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-[#78716C] uppercase tracking-wide mb-1">
                Fecha de factura
              </p>
              <p className="text-sm font-medium text-[#44403C]">
                {formatDateLong(invoice.invoiceDate)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[#78716C] uppercase tracking-wide mb-1">
                Fecha de vencimiento
              </p>
              <p
                className="text-sm font-medium"
                style={{ color: invoice.status === 'overdue' ? '#E07A4C' : '#44403C' }}
              >
                {formatDateLong(invoice.dueDate)}
                {invoice.daysOverdue > 0 && (
                  <span className="ml-1 text-[10px]">({invoice.daysOverdue} días vencida)</span>
                )}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <p className="text-[10px] text-[#78716C] uppercase tracking-wide mb-2">
              Productos
            </p>
            <div className="border border-[#E8E6E3] rounded-sm overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-[#F5F4F2] text-[10px] text-[#78716C] uppercase tracking-wide">
                <div className="col-span-6">Producto</div>
                <div className="col-span-2 text-right">Cant.</div>
                <div className="col-span-2 text-right">Precio</div>
                <div className="col-span-2 text-right">Total</div>
              </div>

              {/* Rows */}
              {invoice.items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-[#E8E6E3] text-sm"
                >
                  <div className="col-span-6">
                    <p className="font-medium text-[#44403C]">{item.itemName}</p>
                    <p className="text-[10px] text-[#A8A29E] font-mono">{item.itemCode}</p>
                  </div>
                  <div className="col-span-2 text-right text-[#78716C]">
                    {item.qty} {item.uom}
                  </div>
                  <div className="col-span-2 text-right text-[#78716C]">
                    {formatCurrency(item.rate)}
                  </div>
                  <div className="col-span-2 text-right font-medium text-[#44403C]">
                    {formatCurrency(item.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="flex flex-col items-end gap-1 pt-4 border-t border-[#E8E6E3]">
            <div className="flex justify-between w-48 text-sm">
              <span className="text-[#78716C]">Subtotal</span>
              <span className="text-[#44403C]">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.taxBreakdown && invoice.taxBreakdown.length > 0 ? (
              invoice.taxBreakdown.map((tax, i) => (
                <div key={i} className="flex justify-between w-48 text-sm">
                  <span className="text-[#78716C]">{tax.description}</span>
                  <span className="text-[#44403C]">{formatCurrency(tax.tax_amount)}</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between w-48 text-sm">
                <span className="text-[#78716C]">Impuestos</span>
                <span className="text-[#44403C]">{formatCurrency(invoice.tax)}</span>
              </div>
            )}
            <div className="flex justify-between w-48 text-base font-semibold pt-2 border-t border-[#E8E6E3]">
              <span className="text-[#44403C]">Total</span>
              <span className="text-[#44403C]">{formatCurrency(invoice.total)}</span>
            </div>
            {invoice.paid > 0 && (
              <div className="flex justify-between w-48 text-sm text-[#4CAF7A]">
                <span>Pagado</span>
                <span>-{formatCurrency(invoice.paid)}</span>
              </div>
            )}
            {invoice.outstanding > 0 && (
              <div className="flex justify-between w-48 text-base font-semibold text-[#E5A530]">
                <span>Pendiente</span>
                <span>{formatCurrency(invoice.outstanding)}</span>
              </div>
            )}
          </div>

          {/* Payments History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div>
              <p className="text-[10px] text-[#78716C] uppercase tracking-wide mb-2">
                Pagos recibidos
              </p>
              <div className="space-y-2">
                {invoice.payments.map((payment) => (
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
                          {payment.method} • {formatDateLong(payment.date)}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-[#A8A29E]">
                      {payment.paymentNumber}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overdue Alert */}
          {invoice.status === 'overdue' && (
            <DrawerAlert type="error" icon={<AlertCircle size={16} />}>
              Esta factura tiene {invoice.daysOverdue} días de vencida.
              Es importante contactar al cliente para gestionar el cobro.
            </DrawerAlert>
          )}
        </div>
      )}
    </UnifiedDrawer>
  )
}

export default InvoiceDetailDrawer
