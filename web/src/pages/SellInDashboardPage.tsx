// Sell-In Dashboard Page with data fetching
import { useNavigate } from 'react-router-dom'
import { SellInDashboard } from '../components/sections/sell-in-operations/SellInDashboard'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { useSalesDashboard } from '../api'
import { tasksApi } from '../api/services/tasks'
import { downloadJSON, downloadCSV } from '../utils/download'

export function SellInDashboardPage() {
  const navigate = useNavigate()
  const { kpis, recentActivity, salesTrends, loading, error, refetch } = useSalesDashboard()

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const data = await tasksApi.exportKPIs(format)
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `sales-kpis-${timestamp}`

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
    return <LoadingState message="Cargando dashboard de ventas..." />
  }

  if (error || !kpis || !salesTrends) {
    return (
      <ErrorState
        title="Error al cargar ventas"
        message="No se pudo cargar la informacion de ventas."
        error={error}
        onRetry={refetch}
      />
    )
  }

  return (
    <SellInDashboard
      kpis={kpis}
      recentActivity={recentActivity || []}
      salesTrends={salesTrends}
      onKpiClick={(kpi) => console.log('KPI clicked:', kpi)}
      onCreateOrder={() => navigate('/ventas/pedidos/nuevo')}
      onExport={handleExport}
    />
  )
}

export default SellInDashboardPage
