import type { OrderListProps, SalesOrder } from './types'
import { Plus, Search, Eye, Edit, X, Package, FileText } from 'lucide-react'

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400' },
  confirmed: { label: 'Confirmado', color: 'bg-turquoise-light text-turquoise-dark dark:bg-turquoise-dark dark:text-turquoise' },
  in_transit: { label: 'En Transito', color: 'bg-gold-light text-gold-dark dark:bg-gold-dark dark:text-gold' },
  delivered: { label: 'Entregado', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' },
  invoiced: { label: 'Facturado', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300' },
  paid: { label: 'Pagado', color: 'bg-success-light text-success-text dark:bg-success-dark dark:text-success' },
  cancelled: { label: 'Cancelado', color: 'bg-error-light text-error-text dark:bg-error-dark dark:text-error' },
}

interface OrderRowProps {
  order: SalesOrder
  onView?: () => void
  onEdit?: () => void
  onCancel?: () => void
}

function ProgressBar({ value, icon }: { value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-neutral-400">{icon}</span>
      <div className="w-16 h-1.5 bg-neutral-200 dark:bg-neutral-700">
        <div
          className={`h-full transition-all ${value === 100 ? 'bg-success' : 'bg-gold'}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="font-mono text-xs text-neutral-500 w-8">{value}%</span>
    </div>
  )
}

function OrderRow({ order, onView, onEdit, onCancel }: OrderRowProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
  }

  const canCancel = ['draft', 'confirmed'].includes(order.status)

  return (
    <tr className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
      <td className="px-4 py-3">
        <div>
          <p className="font-mono text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {order.orderNumber}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {formatDate(order.orderDate)}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          {order.customerName}
        </p>
      </td>
      <td className="px-4 py-3">
        <span className={`
          inline-block px-2 py-0.5 text-xs uppercase tracking-wider font-medium
          ${statusConfig[order.status]?.color || statusConfig.draft.color}
        `}>
          {statusConfig[order.status]?.label || order.status}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {formatCurrency(order.total)}
        </span>
      </td>
      <td className="px-4 py-3">
        <ProgressBar value={order.deliveryProgress} icon={<Package size={12} />} />
      </td>
      <td className="px-4 py-3">
        <ProgressBar value={order.invoiceProgress} icon={<FileText size={12} />} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onView}
            className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title="Ver"
          >
            <Eye size={16} className="text-neutral-500 dark:text-neutral-400" />
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title="Editar"
          >
            <Edit size={16} className="text-neutral-500 dark:text-neutral-400" />
          </button>
          {canCancel && (
            <button
              onClick={onCancel}
              className="p-1.5 hover:bg-error-light dark:hover:bg-error-dark/30 transition-colors"
              title="Cancelar"
            >
              <X size={16} className="text-neutral-500 dark:text-neutral-400 hover:text-error-dark" />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

export function OrderList({
  orders,
  onViewOrder,
  onCreateOrder,
  onEditOrder,
  onCancelOrder,
  onFilterChange
}: OrderListProps) {
  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            Pedidos
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {orders.length} pedidos en el sistema
          </p>
        </div>

        <button
          onClick={onCreateOrder}
          className="
            inline-flex items-center gap-2 px-4 py-2
            bg-gold hover:bg-gold-dark
            text-neutral-900 font-medium text-sm uppercase tracking-wider
            border border-neutral-200
            shadow-sm
            hover:shadow-sm
            transition-all duration-75
          "
        >
          <Plus size={18} />
          Nuevo Pedido
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar pedido..."
            className="
              w-full pl-9 pr-4 py-2
              bg-white dark:bg-neutral-800
              border border-neutral-200 dark:border-neutral-100
              text-sm text-neutral-900 dark:text-neutral-100
              placeholder:text-neutral-400
              focus:outline-none focus:ring-2 focus:ring-gold dark:focus:ring-gold
            "
            onChange={(e) => onFilterChange?.({ search: e.target.value })}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {([
            { label: 'Todos', value: undefined },
            { label: 'Confirmado', value: 'confirmed' as const },
            { label: 'En Transito', value: 'in_transit' as const },
            { label: 'Entregado', value: 'delivered' as const },
            { label: 'Pagado', value: 'paid' as const }
          ]).map((filter) => (
            <button
              key={filter.label}
              onClick={() => onFilterChange?.({ status: filter.value })}
              className="
                px-3 py-1.5 text-xs uppercase tracking-wider whitespace-nowrap
                border border-neutral-300 dark:border-neutral-600
                text-neutral-600 dark:text-neutral-400
                hover:bg-neutral-100 dark:hover:bg-neutral-800
                transition-colors
              "
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-100">
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                  Pedido
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                  Estado
                </th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                  Entrega
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                  Factura
                </th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onView={() => onViewOrder?.(order.id)}
                  onEdit={() => onEditOrder?.(order.id)}
                  onCancel={() => onCancelOrder?.(order.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
