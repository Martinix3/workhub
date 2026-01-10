// Distributor Portal Page with data fetching
import { DistributorPortal } from '../components/sections/distributor-network/DistributorPortal'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { useDistributorPortal } from '../api'

export function DistributorPortalPage() {
  const { orders, inventory, sellOutRecords, analytics, loading, error, refetch, submitSellOut, uploadCSV } = useDistributorPortal()

  if (loading) {
    return <LoadingState message="Cargando portal de distribuidor..." />
  }

  if (error || !analytics) {
    return (
      <ErrorState
        title="Error al cargar portal"
        message="No se pudo cargar la informacion del distribuidor."
        error={error}
        onRetry={refetch}
      />
    )
  }

  return (
    <DistributorPortal
      orders={orders || []}
      inventory={inventory || []}
      sellOutRecords={sellOutRecords || []}
      analytics={analytics}
      sellOutOrders={[]}
      sellOutOrderStats={{ pending: 0, inProgress: 0, delivered: 0, issues: 0 }}
      onViewOrder={(id) => console.log('View order:', id)}
      onSubmitSellOut={async (items) => {
        await submitSellOut(items.map(i => ({ itemCode: i.itemCode, qty: i.qty, customer: i.customer })))
        refetch()
      }}
      onUploadCSV={async (file) => {
        await uploadCSV(file)
        refetch()
      }}
      onExportInventory={() => console.log('Export inventory')}
    />
  )
}

export default DistributorPortalPage
