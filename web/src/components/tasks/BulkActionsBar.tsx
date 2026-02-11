import { X, Edit, User, Flag, FolderOpen, Link, Loader2 } from 'lucide-react'
import { useTaskSelection } from '../../contexts/TaskSelectionContext'

interface BulkActionsBarProps {
  onChangeStatus: () => void
  onAssign: () => void
  onChangePriority: () => void
  onMoveProject: () => void
  onAddWorkLink: () => void
  loading?: boolean
}

export function BulkActionsBar({
  onChangeStatus,
  onAssign,
  onChangePriority,
  onMoveProject,
  onAddWorkLink,
  loading = false
}: BulkActionsBarProps) {
  const { selectedTasks, clearSelection } = useTaskSelection()

  // Don't show if no tasks selected
  if (selectedTasks.size === 0) {
    return null
  }

  const actionButtonClass = `
    px-4 py-2.5
    bg-white
    border border-neutral-200
    font-medium text-sm text-neutral-900
    hover:bg-gold-light
    transition-all
    shadow-sm
    disabled:opacity-50 disabled:cursor-not-allowed
    flex items-center gap-2
  `

  const clearButtonClass = `
    px-3 py-2.5
    bg-error
    border border-neutral-200
    font-medium text-sm text-white
    hover:bg-error-dark
    transition-all
    shadow-sm
    disabled:opacity-50 disabled:cursor-not-allowed
    flex items-center gap-2
  `

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-gold border border-neutral-200 p-4 flex items-center gap-4">
        {/* Selected Count */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200">
          {loading && <Loader2 size={16} className="animate-spin text-gold-dark" />}
          <span className="font-bold text-neutral-900 text-sm">
            {selectedTasks.size} {selectedTasks.size === 1 ? 'tarea' : 'tareas'}
          </span>
        </div>

        {/* Divider */}
        <div className="w-0.5 h-8 bg-neutral-900" />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onChangeStatus}
            disabled={loading}
            className={actionButtonClass}
            title="Cambiar estado"
          >
            <Edit size={16} />
            <span>Estado</span>
          </button>

          <button
            onClick={onAssign}
            disabled={loading}
            className={actionButtonClass}
            title="Asignar a usuario"
          >
            <User size={16} />
            <span>Asignar</span>
          </button>

          <button
            onClick={onChangePriority}
            disabled={loading}
            className={actionButtonClass}
            title="Cambiar prioridad"
          >
            <Flag size={16} />
            <span>Prioridad</span>
          </button>

          <button
            onClick={onMoveProject}
            disabled={loading}
            className={actionButtonClass}
            title="Mover a proyecto"
          >
            <FolderOpen size={16} />
            <span>Proyecto</span>
          </button>

          <button
            onClick={onAddWorkLink}
            disabled={loading}
            className={actionButtonClass}
            title="Añadir WorkLink"
          >
            <Link size={16} />
            <span>WorkLink</span>
          </button>
        </div>

        {/* Divider */}
        <div className="w-0.5 h-8 bg-neutral-900" />

        {/* Clear Selection */}
        <button
          onClick={clearSelection}
          disabled={loading}
          className={clearButtonClass}
          title="Limpiar selección"
        >
          <X size={16} />
          <span>Limpiar</span>
        </button>
      </div>
    </div>
  )
}

export default BulkActionsBar
