import { GripVertical, AlertTriangle, Clock, Flag } from 'lucide-react'
import { useTaskSelection } from '../../contexts/TaskSelectionContext'
import type { Task, TaskPriority } from '../sections/tasks/types'

const priorityConfig: Record<TaskPriority, { bg: string; text: string; bar: string }> = {
  P0: { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' },
  P1: { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-400' },
  P2: { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-emerald-400' },
}

interface SelectableTaskCardProps {
  task: Task
  onDragStart: () => void
  onDragEnd: () => void
  onClick: () => void
  isDragging: boolean
  selectionMode?: boolean
}

export function SelectableTaskCard({
  task,
  onDragStart,
  onDragEnd,
  onClick,
  isDragging,
  selectionMode = false
}: SelectableTaskCardProps) {
  const { isSelected, toggleSelection } = useTaskSelection()
  const priority = priorityConfig[task.priority]
  const isDone = task.status === 'DONE'
  const selected = isSelected(task.name)

  // Get initials from assigned_to_name or assigned_to
  const getInitials = () => {
    const name = task.assigned_to_name || task.assigned_to || ''
    if (!name) return '?'
    const parts = name.split(/[@\s]/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleSelection(task.name)
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Ctrl/Cmd+Click toggles selection even when not in selection mode
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      toggleSelection(task.name)
    } else if (selectionMode) {
      toggleSelection(task.name)
    } else {
      onClick()
    }
  }

  return (
    <div
      draggable={!selectionMode}
      onDragStart={selectionMode ? undefined : onDragStart}
      onDragEnd={selectionMode ? undefined : onDragEnd}
      onClick={handleCardClick}
      className={`
        bg-white
        border-2 border-stone-900
        ${selectionMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}
        transition-all duration-75
        ${isDragging
          ? 'opacity-50 rotate-2 shadow-[8px_8px_0_#1c1917]'
          : selected
            ? 'shadow-[4px_4px_0_#f59e0b] ring-2 ring-amber-400'
            : 'hover:shadow-[4px_4px_0_#1c1917]'
        }
      `}
    >
      {/* Priority Bar */}
      <div className={`h-1.5 ${priority.bar}`} />

      <div className="p-3">
        <div className="flex items-start gap-2">
          {/* Checkbox - only shown in selection mode */}
          {selectionMode && (
            <div
              onClick={handleCheckboxClick}
              className="flex-shrink-0 pt-0.5"
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => {}}
                onClick={handleCheckboxClick}
                className="
                  w-5 h-5
                  border-2 border-stone-900
                  cursor-pointer
                  accent-amber-400
                  focus:ring-2 focus:ring-amber-400 focus:ring-offset-0
                "
              />
            </div>
          )}

          {/* Card Content */}
          <div className="flex-1 min-w-0">
            {/* Drag Handle + Priority */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {!selectionMode && (
                  <GripVertical size={14} className="text-stone-400" />
                )}
                <span className={`px-1.5 py-0.5 text-xs font-bold ${priority.bg} ${priority.text}`}>
                  {task.priority}
                </span>
                {task.department && (
                  <span className="text-[10px] text-stone-400 uppercase">{task.department}</span>
                )}
              </div>
              {task.status === 'BLOCKED' && (
                <AlertTriangle size={14} className="text-red-500" />
              )}
            </div>

            {/* Title */}
            <h3 className={`
              font-medium text-sm leading-snug mb-2
              ${isDone ? 'line-through text-stone-400' : 'text-stone-900'}
            `}>
              {task.title}
            </h3>

            {/* Blocked Reason */}
            {task.blocked_reason && (
              <p className="text-xs text-red-500 mb-2 bg-red-50 p-2 border border-red-200">
                {task.blocked_reason}
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-stone-500">
              <div className="flex items-center gap-2">
                {/* Avatar */}
                {task.assigned_to && (
                  <div className="
                    w-6 h-6 flex items-center justify-center
                    bg-stone-200
                    border border-stone-900
                    text-[10px] font-bold
                  " title={task.assigned_to_name || task.assigned_to}>
                    {getInitials()}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Due date */}
                {task.due_date && (
                  <div className="flex items-center gap-1">
                    <Clock size={10} />
                    <span className="font-mono">
                      {new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                )}
                {/* Project title */}
                {task.project_title && (
                  <span className="font-mono text-stone-400 truncate max-w-[60px]" title={task.project_title}>
                    {task.project_title}
                  </span>
                )}
              </div>
            </div>

            {/* Work Days Badge */}
            {task.total_work_days && task.total_work_days > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                <Flag size={10} />
                <span>{task.total_work_days} días trabajados</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SelectableTaskCard
