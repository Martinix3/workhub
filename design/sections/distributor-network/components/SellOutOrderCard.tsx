import { useState } from 'react'
import { Package, Calendar, Truck, AlertTriangle, CheckCircle2, Clock, X } from 'lucide-react'
import type { SellOutOrder, SellOutOrderStatus } from '../types'

interface SellOutOrderCardProps {
  order: SellOutOrder
  onStartDelivery?: (orderId: string) => void
  onMarkDelivered?: (orderId: string) => void
  onReportIssue?: (orderId: string, notes: string) => void
}

const statusConfig: Record<SellOutOrderStatus, { label: string; color: string; icon: typeof Clock }> = {
  'Pending': {
    label: 'Pendiente',
    color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
    icon: Clock
  },
  'In Progress': {
    label: 'En Camino',
    color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    icon: Truck
  },
  'Delivered': {
    label: 'Entregado',
    color: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
    icon: CheckCircle2
  },
  'Issue': {
    label: 'Incidencia',
    color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
    icon: AlertTriangle
  },
  'Cancelled': {
    label: 'Cancelado',
    color: 'bg-stone-100 text-stone-600 border-stone-300 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-600',
    icon: X
  }
}

export function SellOutOrderCard({ order, onStartDelivery, onMarkDelivered, onReportIssue }: SellOutOrderCardProps) {
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [issueNotes, setIssueNotes] = useState('')

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })

  const status = statusConfig[order.status]
  const StatusIcon = status.icon

  const handleReportIssue = () => {
    if (issueNotes.trim() && onReportIssue) {
      onReportIssue(order.id, issueNotes)
      setShowIssueModal(false)
      setIssueNotes('')
    }
  }

  return (
    <>
      <div className="
        border-2 border-stone-900 dark:border-stone-100
        bg-white dark:bg-stone-900
        shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#f5f5f4]
      ">
        {/* Header */}
        <div className="
          flex items-center justify-between
          px-4 py-3
          border-b-2 border-stone-900 dark:border-stone-100
          bg-stone-50 dark:bg-stone-800
        ">
          <div>
            <h3 className="font-mono text-sm font-bold text-stone-900 dark:text-stone-100">
              {order.id}
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              {order.customerName}
            </p>
          </div>
          <div className={`
            inline-flex items-center gap-1.5 px-2.5 py-1
            text-xs font-medium uppercase tracking-wider
            border ${status.color}
          `}>
            <StatusIcon size={12} />
            {status.label}
          </div>
        </div>

        {/* Delivery Info */}
        <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-700">
          <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
            <Calendar size={14} />
            <span>Entrega esperada: </span>
            <span className="font-medium text-stone-900 dark:text-stone-100">
              {formatDate(order.expectedDeliveryDate)}
            </span>
          </div>
          {order.actualDeliveryDate && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mt-1">
              <CheckCircle2 size={14} />
              <span>Entregado: {formatDate(order.actualDeliveryDate)}</span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="px-4 py-3 space-y-2 border-b border-stone-200 dark:border-stone-700">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Items ({order.items.length})
          </p>
          {order.items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Package size={14} className="text-stone-400" />
                <span className="text-stone-700 dark:text-stone-300">{item.itemName}</span>
              </div>
              <div className="text-right">
                <span className="text-stone-500">{item.qty} uds</span>
                <span className="ml-3 font-mono font-medium text-stone-900 dark:text-stone-100">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-stone-200 dark:border-stone-700">
          <span className="text-sm text-stone-500">Total:</span>
          <span className="font-mono text-lg font-bold text-stone-900 dark:text-stone-100">
            {formatCurrency(order.totalAmount)}
          </span>
        </div>

        {/* Issue Notes (if any) */}
        {order.status === 'Issue' && order.issueNotes && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-stone-200 dark:border-stone-700">
            <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Incidencia:</p>
            <p className="text-sm text-red-600 dark:text-red-300">{order.issueNotes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="px-4 py-3 flex flex-wrap gap-2">
          {order.status === 'Pending' && onStartDelivery && (
            <button
              onClick={() => onStartDelivery(order.id)}
              className="
                inline-flex items-center gap-2 px-4 py-2
                bg-blue-500 hover:bg-blue-600 text-white
                text-sm font-medium
                border-2 border-stone-900
                shadow-[2px_2px_0_#1c1917]
                hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]
                transition-all duration-75
              "
            >
              <Truck size={14} />
              Iniciar Entrega
            </button>
          )}

          {order.status === 'In Progress' && (
            <>
              {onMarkDelivered && (
                <button
                  onClick={() => onMarkDelivered(order.id)}
                  className="
                    inline-flex items-center gap-2 px-4 py-2
                    bg-green-500 hover:bg-green-600 text-white
                    text-sm font-medium
                    border-2 border-stone-900
                    shadow-[2px_2px_0_#1c1917]
                    hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]
                    transition-all duration-75
                  "
                >
                  <CheckCircle2 size={14} />
                  Marcar Entregado
                </button>
              )}
              {onReportIssue && (
                <button
                  onClick={() => setShowIssueModal(true)}
                  className="
                    inline-flex items-center gap-2 px-4 py-2
                    bg-red-500 hover:bg-red-600 text-white
                    text-sm font-medium
                    border-2 border-stone-900
                    shadow-[2px_2px_0_#1c1917]
                    hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]
                    transition-all duration-75
                  "
                >
                  <AlertTriangle size={14} />
                  Reportar Incidencia
                </button>
              )}
            </>
          )}

          {order.status === 'Issue' && onStartDelivery && (
            <button
              onClick={() => onStartDelivery(order.id)}
              className="
                inline-flex items-center gap-2 px-4 py-2
                bg-blue-500 hover:bg-blue-600 text-white
                text-sm font-medium
                border-2 border-stone-900
                shadow-[2px_2px_0_#1c1917]
                hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]
                transition-all duration-75
              "
            >
              <Truck size={14} />
              Reintentar Entrega
            </button>
          )}

          {order.status === 'Delivered' && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
              <CheckCircle2 size={16} />
              Pedido completado
            </div>
          )}
        </div>
      </div>

      {/* Issue Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="
            w-full max-w-md mx-4
            bg-white dark:bg-stone-900
            border-2 border-stone-900 dark:border-stone-100
            shadow-[8px_8px_0_#1c1917] dark:shadow-[8px_8px_0_#f5f5f4]
          ">
            <div className="px-6 py-4 border-b-2 border-stone-900 dark:border-stone-100 bg-red-50 dark:bg-red-900/20">
              <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
                Reportar Incidencia
              </h3>
              <p className="text-sm text-stone-600 dark:text-stone-400">
                Pedido {order.id}
              </p>
            </div>
            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                Describe la incidencia:
              </label>
              <textarea
                value={issueNotes}
                onChange={(e) => setIssueNotes(e.target.value)}
                rows={4}
                placeholder="Ej: Cliente no disponible, dirección incorrecta, producto dañado..."
                className="
                  w-full px-3 py-2
                  bg-white dark:bg-stone-800
                  border-2 border-stone-900 dark:border-stone-100
                  text-stone-900 dark:text-stone-100
                  placeholder:text-stone-400
                  focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-300
                "
              />
            </div>
            <div className="px-6 py-4 border-t-2 border-stone-200 dark:border-stone-700 flex justify-end gap-3">
              <button
                onClick={() => setShowIssueModal(false)}
                className="
                  px-4 py-2 text-sm
                  text-stone-600 dark:text-stone-400
                  hover:bg-stone-100 dark:hover:bg-stone-800
                "
              >
                Cancelar
              </button>
              <button
                onClick={handleReportIssue}
                disabled={!issueNotes.trim()}
                className="
                  px-4 py-2
                  bg-red-500 hover:bg-red-600 text-white
                  text-sm font-medium
                  border-2 border-stone-900
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                Reportar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
