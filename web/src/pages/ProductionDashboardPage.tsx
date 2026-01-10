// Production Dashboard Page with data fetching
import { ProductionDashboard } from '../components/sections/production-and-quality/ProductionDashboard'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { useProductionDashboard } from '../api'
import { tasksApi } from '../api/services/tasks'
import { downloadJSON, downloadCSV } from '../utils/download'

export function ProductionDashboardPage() {
  const { kpis, orders, lines, loading, error, refetch } = useProductionDashboard()

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const data = await tasksApi.exportKPIs(format)
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `production-kpis-${timestamp}`

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
    return <LoadingState message="Cargando produccion..." />
  }

  if (error || !kpis) {
    return (
      <ErrorState
        title="Error al cargar produccion"
        message="No se pudo cargar la informacion de produccion."
        error={error}
        onRetry={refetch}
      />
    )
  }

  return (
    <ProductionDashboard
      kpis={kpis}
      orders={orders || []}
      lines={lines || []}
      onViewOrder={(id) => console.log('View order:', id)}
      onViewLine={(id) => console.log('View line:', id)}
      onExport={handleExport}
    />
  )
}

export default ProductionDashboardPage
