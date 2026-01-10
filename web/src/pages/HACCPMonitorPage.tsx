// HACCP Monitor Page with data fetching
import { useState } from 'react'
import { HACCPMonitor } from '../components/sections/production-and-quality/HACCPMonitor'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { useHACCPMonitor } from '../api'
import type { CriticalControlPoint } from '../components/sections/production-and-quality/types'

export function HACCPMonitorPage() {
  const { plans, recentReadings, activeAlerts, loading, error, refetch, acknowledgeAlert } = useHACCPMonitor()

  // Modal state management
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCCP, setSelectedCCP] = useState<CriticalControlPoint | null>(null)

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
    // Find the CCP from the plans
    let foundCCP: CriticalControlPoint | null = null
    for (const plan of plans) {
      const ccp = plan.ccps.find(c => c.id === ccpId)
      if (ccp) {
        foundCCP = ccp
        break
      }
    }

    if (foundCCP) {
      setSelectedCCP(foundCCP)
      setIsModalOpen(true)
    }
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
