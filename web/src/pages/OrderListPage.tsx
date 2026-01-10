// Order List Page with data fetching and in-app order viewing/editing
import { useState } from 'react'
import { OrderList } from '../components/sections/sell-in-operations/OrderList'
import { CreateOrderWizard } from '../components/sections/sell-in-operations/CreateOrderWizard'
import { OrderDetailPanel } from '../components/sections/sell-in-operations/OrderDetailPanel'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { useOrders } from '../api'
import type { OrderFilters } from '../components/sections/sell-in-operations/types'

export function OrderListPage() {
  const [filters, setFilters] = useState<OrderFilters>({})
  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false)
  const { data: orders, loading, error, refetch } = useOrders(filters)

  const handleCreateOrder = () => {
    // Open in-app wizard modal (TDAH-friendly)
    setShowCreateWizard(true)
  }

  const handleOrderCreated = (orderId: string) => {
    setShowCreateWizard(false)
    // Refresh the list to show the new order
    refetch()
    // Optional: show success toast or navigate to order detail
    console.log('Order created:', orderId)
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

  const handleCancelOrder = async (id: string) => {
    if (window.confirm(`¿Cancelar pedido ${id}?`)) {
      // TODO: Call API to cancel order
      console.log('Cancel order:', id)
      refetch()
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
    </>
  )
}

export default OrderListPage
