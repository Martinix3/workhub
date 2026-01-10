// Lot Management Page with data fetching
import { LotManagement } from '../components/sections/production-and-quality/LotManagement'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { useLots, productionApi } from '../api'

export function LotManagementPage() {
  const { data: lots, loading, error, refetch } = useLots()

  if (loading) {
    return <LoadingState message="Cargando lotes..." />
  }

  if (error || !lots) {
    return (
      <ErrorState
        title="Error al cargar lotes"
        message="No se pudo cargar la lista de lotes."
        error={error}
        onRetry={refetch}
      />
    )
  }

  const handleReleaseLot = async (id: string) => {
    try {
      await productionApi.releaseLot(id)
      refetch()
    } catch (err) {
      console.error('Error releasing lot:', err)
    }
  }

  const handleHoldLot = async (id: string) => {
    try {
      await productionApi.holdLot(id)
      refetch()
    } catch (err) {
      console.error('Error holding lot:', err)
    }
  }

  return (
    <LotManagement
      lots={lots}
      onViewLot={(id) => console.log('View lot:', id)}
      onReleaseLot={handleReleaseLot}
      onHoldLot={handleHoldLot}
    />
  )
}

export default LotManagementPage
