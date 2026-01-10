// Sell-In Dashboard Page with data fetching
import { useNavigate } from 'react-router-dom'
import { SellInDashboard } from '../components/sections/sell-in-operations/SellInDashboard'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { useSalesDashboard } from '../api'

export function SellInDashboardPage() {
  const navigate = useNavigate()
  const { kpis, recentActivity, salesTrends, loading, error, refetch } = useSalesDashboard()

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
    />
  )
}

export default SellInDashboardPage
