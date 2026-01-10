// Quality Dashboard Page with data fetching
import { QualityDashboard } from '../components/sections/production-and-quality/QualityDashboard'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { useQualityDashboard } from '../api'

export function QualityDashboardPage() {
  const { kpis, pendingInspections, openNCs, weeklyTrend, loading, error, refetch } = useQualityDashboard()

  if (loading) {
    return <LoadingState message="Cargando calidad..." />
  }

  if (error || !kpis) {
    return (
      <ErrorState
        title="Error al cargar calidad"
        message="No se pudo cargar la informacion de calidad."
        error={error}
        onRetry={refetch}
      />
    )
  }

  return (
    <QualityDashboard
      kpis={kpis}
      pendingInspections={pendingInspections || []}
      openNCs={openNCs || []}
      weeklyTrend={weeklyTrend || []}
      onViewInspection={(id) => console.log('View inspection:', id)}
      onViewNC={(id) => console.log('View NC:', id)}
    />
  )
}

export default QualityDashboardPage
