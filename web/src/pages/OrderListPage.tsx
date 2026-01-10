// Order List Page with data fetching and in-app order viewing/editing
import { useState } from 'react'
import { OrderList } from '../components/sections/sell-in-operations/OrderList'
import { CreateOrderWizard } from '../components/sections/sell-in-operations/CreateOrderWizard'
import { OrderDetailPanel } from '../components/sections/sell-in-operations/OrderDetailPanel'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useOrders } from '../api'
import { useCancelOrder } from '../api/hooks/useSalesData'
import type { OrderFilters } from '../components/sections/sell-in-operations/types'

export function OrderListPage() {
  const [filters, setFilters] = useState<OrderFilters>({})
  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false)
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null)
  const { data: orders, loading, error, refetch } = useOrders(filters)
  const { cancelOrder, loading: cancelling, error: cancelError } = useCancelOrder()

  const handleCreateOrder = () => {
    // Open in-app wizard modal (TDAH-friendly)
    setShowCreateWizard(true)
  }

  const handleOrderCreated = (orderId: string) => {
    setShowCreateWizard(false)
    // Refresh the list to show the new order
    refetch()
    // Optional: show success toast or navigate to order detail
  }

  const handleViewOrder = (id: string) => {
    // Open in-app Side Panel (TDAH-friendly - no external tabs!)
    setSelectedOrderId(id)
    setIsDetailPanelOpen(true)
  }

  const handleEditOrder = (id: string) => {
    // Open in-app Side Panel for editing
    setSelectedOrderId(id)
    setIsDetailPanelOpen(true)
  }

  const handleCloseDetailPanel = () => {
    setIsDetailPanelOpen(false)
    setSelectedOrderId(null)
  }

  const handleOrderSaved = () => {
    // Refresh list after save
    refetch()
    handleCloseDetailPanel()
  }

  const handleCancelOrder = (id: string) => {
    // Show confirmation dialog instead of window.confirm
    setOrderToCancel(id)
  }

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return

    try {
      const result = await cancelOrder(orderToCancel)

      if (result?.success) {
        // Close dialog
        setOrderToCancel(null)
        // Refresh order list to show updated status
        refetch()
      } else {
        // Error occurred - dialog stays open, error is logged
        console.error('Failed to cancel order:', result?.message || 'Unknown error')
      }
    } catch (err) {
      // Exception occurred - dialog stays open, error is logged
      console.error('Error cancelling order:', err)
    }
  }

  if (loading) {
    return <LoadingState message="Cargando pedidos..." />
  }

  if (error || !orders) {
    return (
      <ErrorState
        title="Error al cargar pedidos"
        message="No se pudo cargar la lista de pedidos."
        error={error}
        onRetry={refetch}
      />
    )
  }

  return (
    <>
      <OrderList
        orders={orders}
        onViewOrder={handleViewOrder}
        onCreateOrder={handleCreateOrder}
        onEditOrder={handleEditOrder}
        onCancelOrder={handleCancelOrder}
        onFilterChange={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))}
      />

      {/* In-app order creation wizard */}
      <CreateOrderWizard
        isOpen={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
        onSuccess={handleOrderCreated}
      />

      {/* In-app order detail Side Panel (TDAH-friendly - no external tabs!) */}
      <OrderDetailPanel
        orderId={selectedOrderId}
        isOpen={isDetailPanelOpen}
        onClose={handleCloseDetailPanel}
        onSave={handleOrderSaved}
        onCancelOrder={handleCancelOrder}
      />

      {/* Order cancellation confirmation dialog */}
      <ConfirmDialog
        isOpen={!!orderToCancel}
        onClose={() => setOrderToCancel(null)}
        onConfirm={handleConfirmCancel}
        title="Cancelar Pedido"
        message={`¿Estás seguro de que deseas cancelar el pedido ${orderToCancel}? Esta acción actualizará el estado del pedido a 'Cancelado'.`}
        confirmLabel="Cancelar Pedido"
        cancelLabel="Volver"
        variant="destructive"
      />
    </>
  )
}

export default OrderListPage
