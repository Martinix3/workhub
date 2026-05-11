// Distributor Dashboard Page with data fetching
import { DistributorDashboard } from '../components/sections/distributor-network/DistributorDashboard'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { useDistributorDashboard } from '../api'
import { tasksApi } from '../api/services/tasks'
import { downloadJSON, downloadCSV } from '../utils/download'

export function DistributorDashboardPage() {
  const { kpis, distributors, loading, error, refetch } = useDistributorDashboard()

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const data = await tasksApi.exportKPIs(format)
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `distributor-kpis-${timestamp}`

      if (format === 'json') {
        downloadJSON(data, filename)
      } else {
        downloadCSV(data as string, filename)
      }
    } catch (error) {
      console.error('Failed to export KPIs:', error)
      // TODO: Add toast notification for error
    }
  }

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
      onExport={handleExport}
    />
  )
}

export default DistributorDashboardPage
