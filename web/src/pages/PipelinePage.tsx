// Pipeline Page with data fetching
import { Pipeline } from '../components/sections/sell-in-operations/Pipeline'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { useOpportunities, salesApi } from '../api'
import type { OpportunityStage } from '../components/sections/sell-in-operations/types'

export function PipelinePage() {
  const { data: opportunities, loading, error, refetch } = useOpportunities()

  if (loading) {
    return <LoadingState message="Cargando pipeline..." />
  }

  if (error || !opportunities) {
    return (
      <ErrorState
        title="Error al cargar pipeline"
        message="No se pudo cargar las oportunidades."
        error={error}
        onRetry={refetch}
      />
    )
  }

  const handleMoveOpportunity = async (id: string, stage: OpportunityStage) => {
    try {
      await salesApi.updateOpportunityStage(id, stage)
      refetch()
    } catch (err) {
      console.error('Error moving opportunity:', err)
    }
  }

  return (
    <Pipeline
      opportunities={opportunities}
      onMoveOpportunity={handleMoveOpportunity}
      onViewOpportunity={(id) => console.log('View:', id)}
      onCreateOpportunity={() => console.log('Create opportunity')}
      onEditOpportunity={(id) => console.log('Edit:', id)}
    />
  )
}

export default PipelinePage
