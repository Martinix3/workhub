// Command Center Page with data fetching
import { useNavigate } from 'react-router-dom'
import { ExecutiveDashboard } from '../components/sections/command-center/ExecutiveDashboard'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { useCommandCenter } from '../api'

export function CommandCenterPage() {
  const navigate = useNavigate()
  const { areas, alerts, loading, error, refetch, dismissAlert } = useCommandCenter()

  if (loading) {
    return <LoadingState message="Cargando Command Center..." />
  }

  if (error || !areas || !alerts) {
    return (
      <ErrorState
        title="Error al cargar Command Center"
        message="No se pudo cargar la informacion ejecutiva."
        error={error}
        onRetry={refetch}
      />
    )
  }

  return (
    <ExecutiveDashboard
      areas={areas}
      alerts={alerts}
      onNavigateToArea={(areaId) => {
        const routes: Record<string, string> = {
          sales: '/ventas',
          operations: '/distribuidores',
          production: '/produccion',
          quality: '/calidad',
          finance: '/finanzas',
          marketing: '/marketing'
        }
        navigate(routes[areaId] || '/')
      }}
      onDismissAlert={dismissAlert}
      onViewAlert={(id) => {
        const alert = alerts.find(a => a.id === id)
        if (alert?.actionUrl) {
          navigate(alert.actionUrl)
        }
      }}
    />
  )
}

export default CommandCenterPage
