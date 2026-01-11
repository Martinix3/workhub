import { useState, useEffect } from 'react'
import {
  X, Loader2, Save, Calendar, User, Truck, Building2,
  Package, Plus, Minus, Receipt, ChevronDown, ChevronUp
} from 'lucide-react'
import { SidePanel } from '../../../ui/SidePanel'
import type { OrderDetailPanelProps, OrderDetail, SalesType } from './types'
import type { OrderItem } from '../types'
import { useOrderDetail, useUpdateOrder, useCancelOrder } from '../../../../api/hooks/useSalesData'

// Status configuration
const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Borrador', color: 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  in_transit: { label: 'En Transito', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' },
  delivered: { label: 'Entregado', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' },
  invoiced: { label: 'Facturado', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300' },
  paid: { label: 'Pagado', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
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
            <Loader2 size={32} className="animate-spin text-amber-500 mx-auto mb-3" />
            <p className="text-sm text-stone-500">Cargando pedido...</p>
          </div>
        </div>
      )}

      {/* Order Content */}
      {!loading && order && (
        <div className="flex flex-col h-full">
          {/* Header with status */}
          <div className="px-6 py-4 border-b-2 border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-mono text-lg font-bold text-stone-900 dark:text-stone-100">
                  {order.orderNumber}
                </h2>
                <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                  <Calendar size={14} />
                  <span>{formatDate(order.orderDate)}</span>
                </div>
              </div>
              <span className={`
                px-3 py-1.5 text-xs uppercase tracking-wider font-semibold
                border-2 border-stone-900 dark:border-stone-100
                ${statusConfig[order.status]?.color || statusConfig.draft.color}
              `}>
                {statusConfig[order.status]?.label || order.status}
              </span>
            </div>
            {hasChanges && (
              <div className="flex items-center gap-2 text-amber-600 mt-2">
                <Save size={14} />
                <span className="text-xs font-medium">Cambios sin guardar</span>
              </div>
            )}
            {saveError && (
              <div className="flex items-center gap-2 text-red-600 mt-2">
                <X size={14} />
                <span className="text-xs font-medium">Error al guardar: {saveError.message}</span>
              </div>
            )}
            {cancelError && (
              <div className="flex items-center gap-2 text-red-600 mt-2">
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
                <label className="text-sm font-medium text-stone-700 dark:text-stone-300">
                  Cliente
                </label>
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border-2 border-green-600 dark:border-green-500">
                  <div>
                    <p className="font-medium text-stone-900 dark:text-stone-100">
                      {order.customerName}
                    </p>
                    <p className="text-xs text-stone-500">ID: {order.customerId}</p>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      className="text-xs text-stone-500 hover:text-stone-700 underline"
                    >
                      Cambiar
                    </button>
                  )}
                </div>
              </div>

              {/* Sales Type Toggle */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700 dark:text-stone-300">
                  Tipo de Venta
                </label>
                <div className="flex border-2 border-stone-900 dark:border-stone-100">
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => handleSalesTypeChange('sell_in')}
                    className={`
                      flex-1 py-2 px-4 text-sm font-medium transition-colors
                      ${order.salesType === 'sell_in'
                        ? 'bg-amber-400 text-stone-900'
                        : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'
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
                      flex-1 py-2 px-4 text-sm font-medium border-l-2 border-stone-900 dark:border-stone-100 transition-colors
                      ${order.salesType === 'sell_out'
                        ? 'bg-amber-400 text-stone-900'
                        : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'
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
                      ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700'
                      : 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-600'
                    }
                  `}>
                    {order.assignedDistributor ? (
                      <div className="flex items-center gap-3">
                        <Truck size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                            Entrega: <span className="text-blue-700 dark:text-blue-300">{order.assignedDistributor.name}</span>
                          </p>
                          <p className="text-xs text-stone-500 dark:text-stone-400">
                            El distribuidor recibirá y entregará al cliente final
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Building2 size={20} className="text-amber-600 flex-shrink-0" />
                        <p className="text-sm text-amber-700 dark:text-amber-300">
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
              <div className="border-2 border-stone-300 dark:border-stone-600 overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-stone-100 dark:bg-stone-800 border-b border-stone-300 dark:border-stone-600">
                  <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-stone-500">
                    Qty
                  </div>
                  <div className="col-span-5 text-xs font-medium uppercase tracking-wider text-stone-500">
                    Producto
                  </div>
                  <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-stone-500 text-right">
                    P.U.
                  </div>
                  <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-stone-500 text-right">
                    Total
                  </div>
                  <div className="col-span-1" />
                </div>

                {/* Items */}
                <div className="divide-y divide-stone-200 dark:divide-stone-700">
                  {order.items.map((item, index) => (
                    <div key={item.itemCode} className="grid grid-cols-12 gap-2 px-3 py-3 items-center">
                      {/* Quantity with controls */}
                      <div className="col-span-2 flex items-center gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => updateItemQty(index, -1)}
                            className="p-0.5 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                            disabled={item.qty <= 1}
                          >
                            <Minus size={12} className="text-stone-400" />
                          </button>
                        )}
                        <span className="font-mono text-sm font-medium text-stone-900 dark:text-stone-100 w-6 text-center">
                          {item.qty}
                        </span>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => updateItemQty(index, 1)}
                            className="p-0.5 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                          >
                            <Plus size={12} className="text-stone-400" />
                          </button>
                        )}
                      </div>

                      {/* Product Name */}
                      <div className="col-span-5">
                        <p className="text-sm text-stone-900 dark:text-stone-100">
                          {item.itemName}
                        </p>
                        <p className="text-xs text-stone-400 font-mono">
                          {item.itemCode}
                        </p>
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-2 text-right">
                        <span className="text-sm text-stone-500 dark:text-stone-400">
                          {formatCurrency(item.rate)}
                        </span>
                      </div>

                      {/* Total */}
                      <div className="col-span-2 text-right">
                        <span className="font-mono text-sm font-medium text-stone-900 dark:text-stone-100">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>

                      {/* Remove */}
                      <div className="col-span-1 flex justify-end">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                          >
                            <X size={14} className="text-stone-400 hover:text-red-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Empty State */}
                  {order.items.length === 0 && (
                    <div className="px-3 py-8 text-center">
                      <Package size={32} className="mx-auto text-stone-300 dark:text-stone-600 mb-2" />
                      <p className="text-sm text-stone-500">No hay productos</p>
                    </div>
                  )}
                </div>
              </div>
            </Section>

            {/* Totals Section */}
            <Section title="Resumen" icon={<Receipt size={20} />}>
              <div className="space-y-2 bg-stone-50 dark:bg-stone-800/50 p-4 border-2 border-stone-200 dark:border-stone-700">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500 dark:text-stone-400">Subtotal:</span>
                  <span className="font-mono text-stone-700 dark:text-stone-300">
                    {formatCurrency(order.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500 dark:text-stone-400">IVA (16%):</span>
                  <span className="font-mono text-stone-700 dark:text-stone-300">
                    {formatCurrency(order.tax)}
                  </span>
                </div>
                <div className="border-t-2 border-stone-300 dark:border-stone-600 my-2" />
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">TOTAL:</span>
                  <span className="font-mono text-xl font-bold text-stone-900 dark:text-stone-100">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </div>
            </Section>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t-2 border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800">
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
                      text-red-600 hover:text-red-700 dark:text-red-400
                      text-sm font-medium
                      hover:bg-red-50 dark:hover:bg-red-900/20
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
                    text-stone-600 dark:text-stone-400
                    hover:bg-stone-100 dark:hover:bg-stone-800
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
                      bg-amber-400 hover:bg-amber-500
                      text-stone-900 font-medium text-sm uppercase tracking-wider
                      border-2 border-stone-900
                      shadow-[4px_4px_0_#1c1917]
                      hover:shadow-[2px_2px_0_#1c1917]
                      hover:translate-x-[2px] hover:translate-y-[2px]
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
            <p className="text-stone-500">
              {error ? error.message : 'No se pudo cargar el pedido'}
            </p>
            <button
              onClick={onClose}
              className="mt-4 text-sm text-amber-600 hover:underline"
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
