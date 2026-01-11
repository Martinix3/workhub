import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useCustomKPIs, useCustomKPIMutations } from '../../api/hooks/useCustomKPIs'
import { CustomKPICard } from './CustomKPICard'
import { KPIBuilderModal } from './KPIBuilderModal'
import { SkeletonCard } from '../ui/LoadingState'
import { useToast } from '../../hooks/useToast'
import type { CustomKPI, Department } from '../../types/custom-kpi'

interface CustomKPIGridProps {
  /** Department to filter KPIs */
  department?: Department
  /** Whether to include shared KPIs (default: true) */
  includeShared?: boolean
  /** Optional click handler for KPI drill-down */
  onKpiClick?: (kpi: CustomKPI) => void
}

/**
 * Grid layout for displaying multiple custom KPIs with drag-and-drop reordering support
 */
export function CustomKPIGrid({
  department,
  includeShared = true,
  onKpiClick
}: CustomKPIGridProps) {
  const { data: kpis, loading, error, refetch } = useCustomKPIs(department, includeShared)
  const { deleteKPI, reorderKPIs } = useCustomKPIMutations(refetch)
  const toast = useToast()

  // Optimistic UI state
  const [optimisticKPIs, setOptimisticKPIs] = useState<CustomKPI[] | null>(null)
  const displayKPIs = optimisticKPIs ?? kpis

  // Sync optimistic state with server data
  useEffect(() => {
    if (kpis && !optimisticKPIs) {
      setOptimisticKPIs(kpis)
    }
  }, [kpis, optimisticKPIs])

  // Modal state
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [editingKPI, setEditingKPI] = useState<CustomKPI | undefined>(undefined)

  // Drag-and-drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null)

  // Handle opening builder for new KPI
  const handleAddKPI = () => {
    setEditingKPI(undefined)
    setIsBuilderOpen(true)
  }

  // Handle opening builder for editing existing KPI
  const handleEditKPI = (kpi: CustomKPI) => {
    setEditingKPI(kpi)
    setIsBuilderOpen(true)
  }

  // Handle deleting a KPI with optimistic update
  const handleDeleteKPI = async (kpi: CustomKPI) => {
    if (!optimisticKPIs) return

    // Optimistic update: remove KPI from UI immediately
    const previousKPIs = optimisticKPIs
    setOptimisticKPIs(optimisticKPIs.filter(k => k.name !== kpi.name))

    // Attempt to delete from backend
    const success = await deleteKPI(kpi.name)
    if (success) {
      toast.success(`KPI "${kpi.title}" deleted successfully`)
      // Refetch to ensure sync with server
      await refetch()
    } else {
      // Rollback on failure
      setOptimisticKPIs(previousKPIs)
      toast.error('Failed to delete KPI')
    }
  }

  // Handle drag start
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDraggedOverIndex(index)
  }

  // Handle drop with optimistic update
  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()

    if (draggedIndex === null || !optimisticKPIs) return

    // Don't allow reordering shared KPIs
    const draggedKPI = optimisticKPIs[draggedIndex]
    if (!draggedKPI.is_owned) return

    // Optimistic update: reorder KPIs in UI immediately
    const previousKPIs = optimisticKPIs
    const reorderedKPIs = [...optimisticKPIs]
    const [draggedKPI_] = reorderedKPIs.splice(draggedIndex, 1)
    reorderedKPIs.splice(dropIndex, 0, draggedKPI_)
    setOptimisticKPIs(reorderedKPIs)

    // Filter only owned KPIs for reordering (backend requires owner permission)
    const ownedKPIs = reorderedKPIs.filter(kpi => kpi.is_owned)
    const kpiOrder = ownedKPIs.map(kpi => kpi.name)

    // Update order in backend
    const success = await reorderKPIs(kpiOrder)
    if (success) {
      toast.success('KPI order updated')
      // Refetch to ensure sync with server
      await refetch()
    } else {
      // Rollback on failure
      setOptimisticKPIs(previousKPIs)
      toast.error('Failed to update KPI order')
    }

    // Reset drag state
    setDraggedIndex(null)
    setDraggedOverIndex(null)
  }

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDraggedOverIndex(null)
  }

  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="
        bg-white dark:bg-stone-900
        border-2 border-red-600 dark:border-red-400
        p-6
        shadow-[4px_4px_0_#dc2626] dark:shadow-[4px_4px_0_#f87171]
      ">
        <h3 className="font-mono text-lg font-bold text-red-600 dark:text-red-400 mb-2">
          Error Loading KPIs
        </h3>
        <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
          {error.message}
        </p>
        <button
          onClick={() => refetch()}
          className="
            px-4 py-2 text-sm
            bg-red-600 text-white
            border-2 border-red-700
            hover:bg-red-700
            transition-colors
            shadow-[2px_2px_0_#b91c1c]
          "
        >
          Retry
        </button>
      </div>
    )
  }

  // Empty state
  if (!displayKPIs || displayKPIs.length === 0) {
    return (
      <div className="
        bg-white dark:bg-stone-900
        border-2 border-stone-900 dark:border-stone-100
        p-8 lg:p-12
        shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9]
        text-center
      ">
        <div className="max-w-md mx-auto">
          <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">
            No Custom KPIs Yet
          </h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
            Create your first custom KPI to start tracking metrics that matter to your team.
          </p>
          <button
            onClick={handleAddKPI}
            className="
              inline-flex items-center gap-2 px-6 py-3
              bg-amber-400 hover:bg-amber-500
              text-stone-900 font-medium text-sm uppercase tracking-wider
              border-2 border-stone-900
              shadow-[4px_4px_0_#1c1917]
              hover:shadow-[2px_2px_0_#1c1917]
              hover:translate-x-[2px] hover:translate-y-[2px]
              transition-all duration-75
            "
          >
            <Plus size={18} />
            Add Your First KPI
          </button>
        </div>

        {/* Builder Modal */}
        <KPIBuilderModal
          isOpen={isBuilderOpen}
          onClose={() => setIsBuilderOpen(false)}
          department={department && department !== 'ALL' ? department : undefined}
          existingKPI={editingKPI}
          onSuccess={refetch}
        />
      </div>
    )
  }

  return (
    <>
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {displayKPIs.map((kpi, index) => (
          <div
            key={kpi.name}
            draggable={kpi.is_owned}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`
              transition-all duration-150
              ${kpi.is_owned ? 'cursor-move' : 'cursor-default'}
              ${draggedIndex === index ? 'opacity-50' : 'opacity-100'}
              ${draggedOverIndex === index && draggedIndex !== index ? 'scale-95' : 'scale-100'}
            `}
          >
            <CustomKPICard
              kpi={kpi}
              onClick={onKpiClick ? () => onKpiClick(kpi) : undefined}
              onEdit={kpi.is_owned ? handleEditKPI : undefined}
              onDelete={kpi.is_owned ? handleDeleteKPI : undefined}
            />
          </div>
        ))}

        {/* Add KPI Card */}
        <button
          onClick={handleAddKPI}
          className="
            min-h-[200px]
            bg-white dark:bg-stone-900
            border-2 border-dashed border-stone-400 dark:border-stone-600
            p-6
            hover:border-amber-600 dark:hover:border-amber-400
            hover:bg-amber-50 dark:hover:bg-amber-900/10
            transition-all duration-150
            flex flex-col items-center justify-center
            group
          "
        >
          <div className="
            w-12 h-12 mb-3
            border-2 border-stone-400 dark:border-stone-600
            group-hover:border-amber-600 dark:group-hover:border-amber-400
            flex items-center justify-center
            transition-colors
          ">
            <Plus
              size={24}
              className="text-stone-400 dark:text-stone-600 group-hover:text-amber-600 dark:group-hover:text-amber-400"
            />
          </div>
          <span className="
            text-sm font-medium uppercase tracking-wider
            text-stone-500 dark:text-stone-400
            group-hover:text-amber-600 dark:group-hover:text-amber-400
            transition-colors
          ">
            Add KPI
          </span>
        </button>
      </div>

      {/* Builder Modal */}
      <KPIBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        department={department && department !== 'ALL' ? department : undefined}
        existingKPI={editingKPI}
        onSuccess={refetch}
      />
    </>
  )
}
