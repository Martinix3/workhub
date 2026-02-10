/**
 * DeliveryDetailPanel
 * ===================
 * SidePanel showing full detail of a delivery note.
 * Pattern: same as OrderDetailPanel from sell-in-operations.
 */

import { useState } from 'react'
import {
  Loader2, Calendar, User, Truck, Package,
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
