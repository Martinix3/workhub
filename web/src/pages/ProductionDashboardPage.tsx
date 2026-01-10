// Production Dashboard Page with data fetching
import { ProductionDashboard } from '../components/sections/production-and-quality/ProductionDashboard'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { useProductionDashboard } from '../api'

export function ProductionDashboardPage() {
  const { kpis, orders, lines, loading, error, refetch } = useProductionDashboard()

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
    />
  )
}

export default ProductionDashboardPage
