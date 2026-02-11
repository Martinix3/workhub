import { GripVertical, AlertTriangle, Clock, Flag } from 'lucide-react'
import { useTaskSelection } from '../../contexts/TaskSelectionContext'
import type { Task, TaskPriority } from '../sections/tasks/types'

const priorityConfig: Record<TaskPriority, { bg: string; text: string; bar: string }> = {
  P0: { bg: 'bg-error-light', text: 'text-error-text', bar: 'bg-error' },
  P1: { bg: 'bg-gold-light', text: 'text-gold-dark', bar: 'bg-gold' },
  P2: { bg: 'bg-success-light', text: 'text-success-text', bar: 'bg-emerald-400' },
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
        border border-neutral-200
        ${selectionMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}
        transition-all duration-75
        ${isDragging
          ? 'opacity-50 rotate-2'
          : selected
            ? 'ring-2 ring-gold'
            : 'shadow-sm'
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
                  border border-neutral-200
                  cursor-pointer
                  accent-gold
                  focus:ring-2 focus:ring-gold focus:ring-offset-0
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
                  <GripVertical size={14} className="text-neutral-400" />
                )}
                <span className={`px-1.5 py-0.5 text-xs font-bold ${priority.bg} ${priority.text}`}>
                  {task.priority}
                </span>
                {task.department && (
                  <span className="text-[10px] text-neutral-400 uppercase">{task.department}</span>
                )}
              </div>
              {task.status === 'BLOCKED' && (
                <AlertTriangle size={14} className="text-error" />
              )}
            </div>

            {/* Title */}
            <h3 className={`
              font-medium text-sm leading-snug mb-2
              ${isDone ? 'line-through text-neutral-400' : 'text-neutral-900'}
            `}>
              {task.title}
            </h3>

            {/* Blocked Reason */}
            {task.blocked_reason && (
              <p className="text-xs text-error mb-2 bg-error-light p-2 border border-error">
                {task.blocked_reason}
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <div className="flex items-center gap-2">
                {/* Avatar */}
                {task.assigned_to && (
                  <div className="
                    w-6 h-6 flex items-center justify-center
                    bg-neutral-200
                    border border-neutral-900
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
                  <span className="font-mono text-neutral-400 truncate max-w-[60px]" title={task.project_title}>
                    {task.project_title}
                  </span>
                )}
              </div>
            </div>

            {/* Work Days Badge */}
            {task.total_work_days && task.total_work_days > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-gold-dark">
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
