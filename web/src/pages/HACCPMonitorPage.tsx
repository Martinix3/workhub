// HACCP Monitor Page with data fetching
import { HACCPMonitor } from '../components/sections/production-and-quality/HACCPMonitor'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { useHACCPMonitor } from '../api'

export function HACCPMonitorPage() {
  const { plans, recentReadings, activeAlerts, loading, error, refetch, acknowledgeAlert } = useHACCPMonitor()

  if (loading) {
    return <LoadingState message="Cargando HACCP..." />
  }

  if (error || !plans) {
    return (
      <ErrorState
        title="Error al cargar HACCP"
        message="No se pudo cargar los planes HACCP."
        error={error}
        onRetry={refetch}
      />
    )
  }

  const handleRecordReading = (ccpId: string) => {
    // TODO: Open modal to record reading for this CCP
    console.log('Record reading for CCP:', ccpId)
  }

  const handleAcknowledgeAlert = async (readingId: string) => {
    try {
      await acknowledgeAlert(readingId)
      refetch()
    } catch (err) {
      console.error('Error acknowledging alert:', err)
    }
  }

  return (
    <HACCPMonitor
      plans={plans}
      recentReadings={recentReadings || []}
      activeAlerts={activeAlerts || []}
      onViewPlan={(id) => console.log('View plan:', id)}
      onRecordReading={handleRecordReading}
      onAcknowledgeAlert={handleAcknowledgeAlert}
    />
  )
}

export default HACCPMonitorPage
