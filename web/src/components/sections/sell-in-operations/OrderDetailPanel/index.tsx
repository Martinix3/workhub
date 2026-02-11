import { useState, useEffect } from 'react'
import {
  X, Loader2, Save, Calendar, User, Truck, Building2,
  Package, Plus, Minus, Receipt, ChevronDown, ChevronUp, Link
} from 'lucide-react'
import { SidePanel } from '../../../ui/SidePanel'
import type { OrderDetailPanelProps, OrderDetail, SalesType } from './types'
import type { OrderItem } from '../types'
import { useOrderDetail, useUpdateOrder, useCancelOrder, useOrderWorkLinks } from '../../../../api/hooks/useSalesData'

// Status configuration
const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300' },
  confirmed: { label: 'Confirmado', color: 'bg-turquoise-light text-turquoise-dark dark:bg-turquoise-dark dark:text-turquoise' },
  in_transit: { label: 'En Transito', color: 'bg-gold-light text-gold-dark dark:bg-gold-dark dark:text-gold' },
  delivered: { label: 'Entregado', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' },
  invoiced: { label: 'Facturado', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300' },
  paid: { label: 'Pagado', color: 'bg-success-light text-success-text dark:bg-success-dark dark:text-success' },
  cancelled: { label: 'Cancelado', color: 'bg-error-light text-error-text dark:bg-error-dark dark:text-error' },
}

// Collapsible Section Component
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
    <div className="border border-neutral-200 dark:border-neutral-100">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-gold-dark">{icon}</span>
          <span className="font-medium text-neutral-900 dark:text-neutral-100 uppercase text-sm tracking-wider">
            {title}
          </span>
          {badge && (
            <span className="px-2 py-0.5 text-xs bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400">
              {badge}
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {isOpen && (
        <div className="p-4 space-y-4 border-t border-neutral-200 dark:border-neutral-100">
          {children}
        </div>
      )}
    </div>
  )
}

// Format helpers
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })

export function OrderDetailPanel({
  orderId,
  isOpen,
  onClose,
  onSave,
  onCancelOrder
}: OrderDetailPanelProps) {
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch order detail from API
  const { data: orderData, loading, error } = useOrderDetail(isOpen ? orderId : null)

  // Update order mutation hook
  const { updateOrder, loading: isSaving, error: saveError } = useUpdateOrder()

  // Cancel order mutation hook
  const { cancelOrder, loading: isCancelling, error: cancelError } = useCancelOrder()

  // Fetch WorkLinks for this order
  const { data: workLinks = [], loading: workLinksLoading } = useOrderWorkLinks(isOpen && order ? order.id : null)

  // Update local state when hook data changes
  useEffect(() => {
    if (orderData) {
      setOrder(orderData)
      setHasChanges(false)
    }
  }, [orderData])

  const handleItemsChange = (items: OrderItem[]) => {
    if (!order) return
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
    const tax = subtotal * 0.16
    setOrder({
      ...order,
      items,
      subtotal,
      tax,
      total: subtotal + tax
    })
    setHasChanges(true)
  }

  const updateItemQty = (index: number, delta: number) => {
    if (!order) return
    const newItems = [...order.items]
    const newQty = Math.max(1, newItems[index].qty + delta)
    newItems[index] = {
      ...newItems[index],
      qty: newQty,
      amount: newQty * newItems[index].rate
    }
    handleItemsChange(newItems)
  }

  const removeItem = (index: number) => {
    if (!order) return
    const newItems = order.items.filter((_, i) => i !== index)
    handleItemsChange(newItems)
  }

  const handleSalesTypeChange = (salesType: SalesType) => {
    if (!order) return
    setOrder({ ...order, salesType })
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!order) return

    // Prepare update data
    const updateData = {
      deliveryDate: order.deliveryDate,
      salesType: order.salesType,
      items: order.items.map(item => ({
        itemCode: item.itemCode,
        itemName: item.itemName,
        qty: item.qty,
        rate: item.rate,
        amount: item.amount
      }))
    }

    // Call API to update order
    const result = await updateOrder(order.id, updateData)

    if (result) {
      // Update succeeded
      setOrder(result)
      setHasChanges(false)
      onSave?.(result)
    }
    // Error handling is managed by the hook and displayed in UI
  }

  const handleCancelOrder = async () => {
    if (!order) return
    if (confirm('¿Estás seguro de cancelar este pedido?')) {
      // Call API to cancel order
      const result = await cancelOrder(order.id)

      if (result && result.success) {
        // Cancellation succeeded - refresh parent list and close panel
        onCancelOrder?.(order.id)
        onClose()
      }
      // Error handling is managed by the hook and displayed in UI
    }
  }

  const handleClose = () => {
    if (hasChanges) {
      if (confirm('Tienes cambios sin guardar. ¿Descartar cambios?')) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  // Calculate if order can be edited
  const canEdit = order ? ['draft', 'confirmed'].includes(order.status) : false
  const canCancelOrder = order ? ['draft', 'confirmed'].includes(order.status) : false

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={handleClose}
      title={order ? `Pedido ${order.orderNumber}` : 'Cargando...'}
      width="lg"
    >
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-gold-dark mx-auto mb-3" />
            <p className="text-sm text-neutral-500">Cargando pedido...</p>
          </div>
        </div>
      )}

      {/* Order Content */}
      {!loading && order && (
        <div className="flex flex-col h-full">
          {/* Header with status */}
          <div className="px-6 py-4 border-b-2 border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-mono text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {order.orderNumber}
                </h2>
                <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                  <Calendar size={14} />
                  <span>{formatDate(order.orderDate)}</span>
                </div>
              </div>
              <span className={`
                px-3 py-1.5 text-xs uppercase tracking-wider font-semibold
                border border-neutral-200 dark:border-neutral-100
                ${statusConfig[order.status]?.color || statusConfig.draft.color}
              `}>
                {statusConfig[order.status]?.label || order.status}
              </span>
            </div>
            {hasChanges && (
              <div className="flex items-center gap-2 text-gold-dark mt-2">
                <Save size={14} />
                <span className="text-xs font-medium">Cambios sin guardar</span>
              </div>
            )}
            {saveError && (
              <div className="flex items-center gap-2 text-error-dark mt-2">
                <X size={14} />
                <span className="text-xs font-medium">Error al guardar: {saveError.message}</span>
              </div>
            )}
            {cancelError && (
              <div className="flex items-center gap-2 text-error-dark mt-2">
                <X size={14} />
                <span className="text-xs font-medium">Error al cancelar: {cancelError.message}</span>
              </div>
            )}
          </div>

          {/* Body - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Customer Section */}
            <Section title="Información General" icon={<User size={20} />}>
              {/* Customer Display */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Cliente
                </label>
                <div className="flex items-center justify-between p-3 bg-success-light dark:bg-success-dark/20 border-2 border-success-dark dark:border-success-dark">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      {order.customerName}
                    </p>
                    <p className="text-xs text-neutral-500">ID: {order.customerId}</p>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      className="text-xs text-neutral-500 hover:text-neutral-700 underline"
                    >
                      Cambiar
                    </button>
                  )}
                </div>
              </div>

              {/* Sales Type Toggle */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Tipo de Venta
                </label>
                <div className="flex border border-neutral-200 dark:border-neutral-100">
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => handleSalesTypeChange('sell_in')}
                    className={`
                      flex-1 py-2 px-4 text-sm font-medium transition-colors
                      ${order.salesType === 'sell_in'
                        ? 'bg-gold text-neutral-900'
                        : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                      }
                      ${!canEdit ? 'cursor-not-allowed opacity-50' : ''}
                    `}
                  >
                    <span className="block font-semibold">SELL IN</span>
                    <span className="block text-xs font-normal opacity-75">Vta. Directa</span>
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => handleSalesTypeChange('sell_out')}
                    className={`
                      flex-1 py-2 px-4 text-sm font-medium border-l border-neutral-200 dark:border-neutral-100 transition-colors
                      ${order.salesType === 'sell_out'
                        ? 'bg-gold text-neutral-900'
                        : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                      }
                      ${!canEdit ? 'cursor-not-allowed opacity-50' : ''}
                    `}
                  >
                    <span className="block font-semibold">SELL OUT</span>
                    <span className="block text-xs font-normal opacity-75">Vía Distrib.</span>
                  </button>
                </div>

                {/* Distributor Info */}
                {order.salesType === 'sell_out' && (
                  <div className={`
                    mt-3 p-3 border-2
                    ${order.assignedDistributor
                      ? 'border-turquoise bg-turquoise-light dark:bg-turquoise-dark/20 dark:border-turquoise-dark'
                      : 'border-gold bg-gold-light dark:bg-gold-dark/20 dark:border-gold-dark'
                    }
                  `}>
                    {order.assignedDistributor ? (
                      <div className="flex items-center gap-3">
                        <Truck size={20} className="text-turquoise-dark dark:text-turquoise flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            Entrega: <span className="text-turquoise-dark dark:text-turquoise">{order.assignedDistributor.name}</span>
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            El distribuidor recibirá y entregará al cliente final
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Building2 size={20} className="text-gold-dark flex-shrink-0" />
                        <p className="text-sm text-gold-dark dark:text-gold">
                          Sin distribuidor asignado
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Section>

            {/* Products Section */}
            <Section title="Productos" icon={<Package size={20} />} badge={`${order.items.length} items`}>
              {/* Items Table */}
              <div className="border-2 border-neutral-300 dark:border-neutral-600 overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-600">
                  <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Qty
                  </div>
                  <div className="col-span-5 text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Producto
                  </div>
                  <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-neutral-500 text-right">
                    P.U.
                  </div>
                  <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-neutral-500 text-right">
                    Total
                  </div>
                  <div className="col-span-1" />
                </div>

                {/* Items */}
                <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {order.items.map((item, index) => (
                    <div key={item.itemCode} className="grid grid-cols-12 gap-2 px-3 py-3 items-center">
                      {/* Quantity with controls */}
                      <div className="col-span-2 flex items-center gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => updateItemQty(index, -1)}
                            className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                            disabled={item.qty <= 1}
                          >
                            <Minus size={12} className="text-neutral-400" />
                          </button>
                        )}
                        <span className="font-mono text-sm font-medium text-neutral-900 dark:text-neutral-100 w-6 text-center">
                          {item.qty}
                        </span>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => updateItemQty(index, 1)}
                            className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                          >
                            <Plus size={12} className="text-neutral-400" />
                          </button>
                        )}
                      </div>

                      {/* Product Name */}
                      <div className="col-span-5">
                        <p className="text-sm text-neutral-900 dark:text-neutral-100">
                          {item.itemName}
                        </p>
                        <p className="text-xs text-neutral-400 font-mono">
                          {item.itemCode}
                        </p>
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-2 text-right">
                        <span className="text-sm text-neutral-500 dark:text-neutral-400">
                          {formatCurrency(item.rate)}
                        </span>
                      </div>

                      {/* Total */}
                      <div className="col-span-2 text-right">
                        <span className="font-mono text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>

                      {/* Remove */}
                      <div className="col-span-1 flex justify-end">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1 hover:bg-error-light dark:hover:bg-error-dark/30 transition-colors"
                          >
                            <X size={14} className="text-neutral-400 hover:text-error-dark" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Empty State */}
                  {order.items.length === 0 && (
                    <div className="px-3 py-8 text-center">
                      <Package size={32} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
                      <p className="text-sm text-neutral-500">No hay productos</p>
                    </div>
                  )}
                </div>
              </div>
            </Section>

            {/* Totals Section */}
            <Section title="Resumen" icon={<Receipt size={20} />}>
              <div className="space-y-2 bg-neutral-50 dark:bg-neutral-800/50 p-4 border-2 border-neutral-200 dark:border-neutral-700">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">Subtotal:</span>
                  <span className="font-mono text-neutral-700 dark:text-neutral-300">
                    {formatCurrency(order.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">IVA (16%):</span>
                  <span className="font-mono text-neutral-700 dark:text-neutral-300">
                    {formatCurrency(order.tax)}
                  </span>
                </div>
                <div className="border-t-2 border-neutral-300 dark:border-neutral-600 my-2" />
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">TOTAL:</span>
                  <span className="font-mono text-xl font-bold text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </div>
            </Section>

            {/* WorkLinks Section */}
            <Section
              title="Tareas Asociadas"
              icon={<Link size={20} />}
              badge={workLinks.length > 0 ? `${workLinks.length}` : undefined}
              defaultOpen={false}
            >
              {workLinksLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={20} className="animate-spin text-gold-dark" />
                  <span className="ml-2 text-sm text-neutral-500">Cargando tareas...</span>
                </div>
              ) : workLinks.length > 0 ? (
                <div className="space-y-2">
                  {workLinks.map((workLink) => (
                    <div
                      key={workLink.id}
                      className="p-3 bg-neutral-50 dark:bg-neutral-800/50 border-2 border-neutral-200 dark:border-neutral-700"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                            {workLink.taskTitle}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-1">
                            ID: {workLink.taskId}
                          </p>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium uppercase tracking-wider bg-turquoise-light text-turquoise-dark dark:bg-turquoise-dark dark:text-turquoise border border-turquoise dark:border-turquoise-dark flex-shrink-0">
                          {workLink.taskStatus}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Link size={32} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
                  <p className="text-sm text-neutral-500">No hay tareas asociadas a este pedido</p>
                </div>
              )}
            </Section>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t-2 border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
            <div className="flex items-center justify-between">
              {/* Cancel Order Button */}
              <div>
                {canCancelOrder && (
                  <button
                    type="button"
                    onClick={handleCancelOrder}
                    disabled={isCancelling}
                    className="
                      inline-flex items-center gap-2 px-4 py-2
                      text-error-dark hover:text-error-text dark:text-error
                      text-sm font-medium
                      hover:bg-error-light dark:hover:bg-error-dark/20
                      transition-colors
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                  >
                    {isCancelling ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <X size={16} />
                    )}
                    {isCancelling ? 'Cancelando...' : 'Cancelar Pedido'}
                  </button>
                )}
              </div>

              {/* Save/Close Actions */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="
                    px-4 py-2 text-sm
                    text-neutral-600 dark:text-neutral-400
                    hover:bg-neutral-100 dark:hover:bg-neutral-800
                    transition-colors
                  "
                >
                  {hasChanges ? 'Descartar' : 'Cerrar'}
                </button>

                {hasChanges && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="
                      inline-flex items-center gap-2 px-4 py-2
                      bg-gold hover:bg-gold-dark
                      text-neutral-900 font-medium text-sm uppercase tracking-wider
                      border border-neutral-200
                      shadow-sm
                      hover:shadow-sm
                      transition-all duration-75
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                  >
                    {isSaving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    {isSaving ? 'Guardando...' : 'Guardar'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && !order && orderId && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-neutral-500">
              {error ? error.message : 'No se pudo cargar el pedido'}
            </p>
            <button
              onClick={onClose}
              className="mt-4 text-sm text-gold-dark hover:underline"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </SidePanel>
  )
}

export * from './types'
