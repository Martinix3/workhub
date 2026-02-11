import { AlertTriangle, Clock, User, Play, CheckCircle } from 'lucide-react'
import type { Task, TaskPriority } from './types'

interface BlockedTasksPanelProps {
  tasks: Task[]
  onUnblock?: (taskId: string, newStatus: 'NEXT' | 'DOING') => void
  onTaskClick?: (taskId: string) => void
  loading?: boolean
}

const priorityConfig: Record<TaskPriority, { bg: string; text: string; softBg: string }> = {
  P0: { bg: 'bg-error', text: 'text-error-text', softBg: 'bg-error-light' },
  P1: { bg: 'bg-gold', text: 'text-gold-dark', softBg: 'bg-gold-light' },
  P2: { bg: 'bg-success', text: 'text-success-text', softBg: 'bg-success-light' },
}

export function BlockedTasksPanel({
  tasks,
  onUnblock,
  onTaskClick,
  loading = false
}: BlockedTasksPanelProps) {
  if (loading) {
    return (
      <div className="bg-white border border-neutral-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <AlertTriangle size={20} className="text-error" />
          <h2 className="font-heading text-lg font-bold text-neutral-900 uppercase tracking-wider">
            Tareas Bloqueadas
          </h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-neutral-100 border-2 border-neutral-200 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div data-testid="blocked-tasks-panel" className="bg-white border border-neutral-200">
      {/* Header */}
      <div className="p-6 border-b-2 border-neutral-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-error" />
            <h2 className="font-heading text-lg font-bold text-neutral-900 uppercase tracking-wider">
              Tareas Bloqueadas
            </h2>
          </div>
          <div data-testid="blocked-count-badge" className="px-3 py-1 bg-error-light border-2 border-error-dark">
            <span className="font-mono text-lg font-bold text-error-text">{tasks.length}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {tasks.length === 0 ? (
          <div data-testid="empty-state" className="text-center py-8">
            <CheckCircle size={48} className="mx-auto mb-4 text-emerald-400" />
            <h3 className="font-heading text-lg font-bold text-neutral-900 mb-2">
              Sin Bloqueos
            </h3>
            <p className="text-neutral-500 text-sm">
              No hay tareas bloqueadas en este momento
            </p>
          </div>
        ) : (
          <div data-testid="blocked-tasks-list" className="space-y-4">
            {tasks.map((task) => (
              <BlockedTaskCard
                key={task.name}
                task={task}
                onUnblock={onUnblock}
                onClick={() => onTaskClick?.(task.name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Blocked Task Card
interface BlockedTaskCardProps {
  task: Task
  onUnblock?: (taskId: string, newStatus: 'NEXT' | 'DOING') => void
  onClick?: () => void
}

function BlockedTaskCard({ task, onUnblock, onClick }: BlockedTaskCardProps) {
  const priority = priorityConfig[task.priority]
  const isOverdue = task.due_date && new Date(task.due_date) < new Date()

  return (
    <div data-testid={`blocked-task-${task.name}`} className="bg-neutral-50 border border-neutral-200 hover:border-neutral-900 shadow-sm transition-all duration-75">
      {/* Task Info */}
      <div
        data-testid="task-info"
        className="p-4 cursor-pointer"
        onClick={onClick}
      >
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span data-testid="priority-badge" className={`px-1.5 py-0.5 text-xs font-medium ${priority.softBg} ${priority.text}`}>
                {task.priority}
              </span>
              {task.project_title && (
                <span data-testid="project-title" className="text-xs text-neutral-500 truncate">{task.project_title}</span>
              )}
              {isOverdue && (
                <span data-testid="overdue-badge" className="px-1.5 py-0.5 text-xs font-medium bg-error-light text-error-text animate-pulse">
                  VENCIDA
                </span>
              )}
            </div>
            <h3 data-testid="task-title" className="font-medium text-neutral-900 hover:underline">
              {task.title}
            </h3>
          </div>
        </div>

        {/* Blocked Reason */}
        {task.blocked_reason && (
          <div data-testid="blocked-reason" className="mb-3 p-3 bg-error-light border-l-4 border-error-dark">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-error flex-shrink-0 mt-0.5" />
              <p className="text-sm text-error-text flex-1">
                {task.blocked_reason}
              </p>
            </div>
          </div>
        )}

        {/* Metadata Row */}
        <div className="flex items-center gap-4 text-xs text-neutral-500 flex-wrap">
          {task.assigned_to_name && (
            <div className="flex items-center gap-1">
              <User size={12} />
              <span>{task.assigned_to_name}</span>
            </div>
          )}
          {task.due_date && (
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-error font-medium' : ''}`}>
              <Clock size={12} />
              <span>
                {new Date(task.due_date).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                  year: new Date(task.due_date).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Unblock Actions */}
      {onUnblock && (
        <div className="px-4 pb-4 flex gap-2">
          <button
            data-testid="unblock-to-next-button"
            onClick={(e) => {
              e.stopPropagation()
              onUnblock(task.name, 'NEXT')
            }}
            className="
              flex-1 py-2 px-3
              bg-cyan-100 hover:bg-cyan-200
              text-cyan-700 font-medium uppercase tracking-wider text-xs
              border-2 border-cyan-400
              transition-colors
              flex items-center justify-center gap-2
            "
            title="Desbloquear a NEXT"
          >
            <Play size={14} />
            Next
          </button>
          <button
            data-testid="unblock-to-doing-button"
            onClick={(e) => {
              e.stopPropagation()
              onUnblock(task.name, 'DOING')
            }}
            className="
              flex-1 py-2 px-3
              bg-gold hover:bg-gold-dark
              text-neutral-900 font-medium uppercase tracking-wider text-xs
              border border-neutral-200
              shadow-sm
              transition-all duration-75
              flex items-center justify-center gap-2
            "
            title="Desbloquear y empezar"
          >
            <Play size={14} />
            Doing
          </button>
        </div>
      )}
    </div>
  )
}

export default BlockedTasksPanel
