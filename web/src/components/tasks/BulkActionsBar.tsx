import { X, Edit, User, Flag, FolderOpen, Link } from 'lucide-react'
import { useTaskSelection } from '../../contexts/TaskSelectionContext'

interface BulkActionsBarProps {
  onChangeStatus: () => void
  onAssign: () => void
  onChangePriority: () => void
  onMoveProject: () => void
  onAddWorkLink: () => void
}

export function BulkActionsBar({
  onChangeStatus,
  onAssign,
  onChangePriority,
  onMoveProject,
  onAddWorkLink
}: BulkActionsBarProps) {
  const { selectedTasks, clearSelection } = useTaskSelection()

  // Don't show if no tasks selected
  if (selectedTasks.size === 0) {
    return null
  }

  const actionButtonClass = `
    px-4 py-2.5
    bg-white
    border-2 border-stone-900
    font-medium text-sm text-stone-900
    hover:bg-amber-50
    transition-all
    shadow-[2px_2px_0_#1c1917]
    hover:shadow-[1px_1px_0_#1c1917]
    hover:translate-x-[1px] hover:translate-y-[1px]
    active:shadow-none
    active:translate-x-[2px] active:translate-y-[2px]
    flex items-center gap-2
  `

  const clearButtonClass = `
    px-3 py-2.5
    bg-red-500
    border-2 border-stone-900
    font-medium text-sm text-white
    hover:bg-red-600
    transition-all
    shadow-[2px_2px_0_#1c1917]
    hover:shadow-[1px_1px_0_#1c1917]
    hover:translate-x-[1px] hover:translate-y-[1px]
    active:shadow-none
    active:translate-x-[2px] active:translate-y-[2px]
    flex items-center gap-2
  `

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-amber-400 border-2 border-stone-900 shadow-[6px_6px_0_#1c1917] p-4 flex items-center gap-4">
        {/* Selected Count */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-stone-900">
          <span className="font-bold text-stone-900 text-sm">
            {selectedTasks.size} {selectedTasks.size === 1 ? 'tarea' : 'tareas'}
          </span>
        </div>

        {/* Divider */}
        <div className="w-0.5 h-8 bg-stone-900" />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onChangeStatus}
            className={actionButtonClass}
            title="Cambiar estado"
          >
            <Edit size={16} />
            <span>Estado</span>
          </button>

          <button
            onClick={onAssign}
            className={actionButtonClass}
            title="Asignar a usuario"
          >
            <User size={16} />
            <span>Asignar</span>
          </button>

          <button
            onClick={onChangePriority}
            className={actionButtonClass}
            title="Cambiar prioridad"
          >
            <Flag size={16} />
            <span>Prioridad</span>
          </button>

          <button
            onClick={onMoveProject}
            className={actionButtonClass}
            title="Mover a proyecto"
          >
            <FolderOpen size={16} />
            <span>Proyecto</span>
          </button>

          <button
            onClick={onAddWorkLink}
            className={actionButtonClass}
            title="Añadir WorkLink"
          >
            <Link size={16} />
            <span>WorkLink</span>
          </button>
        </div>

        {/* Divider */}
        <div className="w-0.5 h-8 bg-stone-900" />

        {/* Clear Selection */}
        <button
          onClick={clearSelection}
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
