// Quality Dashboard Page with data fetching
import { QualityDashboard } from '../components/sections/production-and-quality/QualityDashboard'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { useQualityDashboard } from '../api'
import { tasksApi } from '../api/services/tasks'
import { downloadJSON, downloadCSV } from '../utils/download'

export function QualityDashboardPage() {
  const { kpis, pendingInspections, openNCs, weeklyTrend, loading, error, refetch } = useQualityDashboard()

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const data = await tasksApi.exportKPIs(format)
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `quality-kpis-${timestamp}`

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
      onExport={handleExport}
    />
  )
}

export default QualityDashboardPage
