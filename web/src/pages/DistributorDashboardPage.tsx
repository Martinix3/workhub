// Distributor Dashboard Page with data fetching
import { DistributorDashboard } from '../components/sections/distributor-network/DistributorDashboard'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { useDistributorDashboard } from '../api'

export function DistributorDashboardPage() {
  const { kpis, distributors, loading, error, refetch } = useDistributorDashboard()

  if (loading) {
    return <LoadingState message="Cargando red de distribuidores..." />
  }

  if (error || !kpis || !distributors) {
    return (
      <ErrorState
        title="Error al cargar distribuidores"
        message="No se pudo cargar la informacion de distribuidores."
        error={error}
        onRetry={refetch}
      />
    )
  }

  return (
    <DistributorDashboard
      kpis={kpis}
      distributors={distributors}
      onViewDistributor={(id) => console.log('View distributor:', id)}
      onSendAlert={(id) => console.log('Send alert to:', id)}
      onExport={() => console.log('Export data')}
    />
  )
}

export default DistributorDashboardPage
