// HACCP Monitor Page with data fetching
import { useState, useEffect } from 'react'
import { HACCPMonitor } from '../components/sections/production-and-quality/HACCPMonitor'
import { RecordReadingModal } from '../components/sections/production-and-quality/RecordReadingModal'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { useHACCPMonitor } from '../api'
import type { CriticalControlPoint } from '../components/sections/production-and-quality/types'
import type { ReadingSubmission } from '../components/sections/production-and-quality/RecordReadingModal'

export function HACCPMonitorPage() {
  const { plans, recentReadings, activeAlerts, loading, error, refetch, acknowledgeAlert, recordReading } = useHACCPMonitor()

  // Modal state management
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCCP, setSelectedCCP] = useState<CriticalControlPoint | null>(null)

  // Feedback state
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Auto-clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timeout = setTimeout(() => {
        setSuccessMessage(null)
      }, 5000)
      return () => clearTimeout(timeout)
    }
  }, [successMessage])

  // Auto-clear error message after 8 seconds
  useEffect(() => {
    if (errorMessage) {
      const timeout = setTimeout(() => {
        setErrorMessage(null)
      }, 8000)
      return () => clearTimeout(timeout)
    }
  }, [errorMessage])

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

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedCCP(null)
    setSuccessMessage(null)
    setErrorMessage(null)
  }

  const handleModalSubmit = async (data: ReadingSubmission) => {
    try {
      // Clear any previous messages
      setSuccessMessage(null)
      setErrorMessage(null)

      // Call recordReading API with corrective action
      await recordReading(data.ccpId, data.value, data.lotNumber, data.correctiveAction)

      // Refresh data to show the new reading
      await refetch()

      // Show success message
      setSuccessMessage('Lectura registrada exitosamente')

      // Modal closes automatically on success (handled in RecordReadingModal)
    } catch (err) {
      // Show error message to user
      const errorMsg = err instanceof Error ? err.message : 'Error al registrar la lectura'
      setErrorMessage(errorMsg)

      // Re-throw to let modal handle its state
      throw err
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
    <>
      {/* Success/Error Feedback Messages */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className="p-4 bg-success-light border border-success-dark text-success-text animate-in slide-in-from-top">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="font-medium">{successMessage}</p>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-success hover:text-success-text"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className="p-4 bg-error-light border border-error-dark text-error-text animate-in slide-in-from-top">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="font-medium">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-error hover:text-error-text"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <HACCPMonitor
        plans={plans}
        recentReadings={recentReadings || []}
        activeAlerts={activeAlerts || []}
        onViewPlan={(id) => console.log('View plan:', id)}
        onRecordReading={handleRecordReading}
        onAcknowledgeAlert={handleAcknowledgeAlert}
      />

      <RecordReadingModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        ccp={selectedCCP}
        onSubmit={handleModalSubmit}
      />
    </>
  )
}

export default HACCPMonitorPage
