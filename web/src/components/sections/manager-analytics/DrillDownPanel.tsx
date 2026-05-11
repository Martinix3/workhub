// Drill-Down Panel for Manager Analytics - Shows filtered task list
import { useEffect } from 'react'
import { X, Clock, AlertTriangle, CheckCircle2, Circle, ArrowRight, User, Folder } from 'lucide-react'
import { SidePanel } from '../../ui/SidePanel'
import { LoadingState } from '../../ui/LoadingState'
import { useTasks } from '../../../api'
import type { DrillDownContext } from './types'
import type { Task, TaskStatus, TaskPriority } from '../tasks/types'

interface DrillDownPanelProps {
  context: DrillDownContext | null
  onClose: () => void
  onTaskClick?: (taskId: string) => void
}

const priorityConfig: Record<TaskPriority, { bg: string; text: string; border: string }> = {
  P0: { bg: 'bg-error-light dark:bg-error-dark', text: 'text-error-text dark:text-error', border: 'border-error-dark' },
  P1: { bg: 'bg-gold-light dark:bg-gold-dark/20', text: 'text-gold-dark dark:text-gold', border: 'border-gold-dark' },
  P2: { bg: 'bg-success-light dark:bg-success-dark', text: 'text-success-text dark:text-success', border: 'border-success-dark' },
}

const statusConfig: Record<TaskStatus, { icon: any; color: string; label: string; border: string }> = {
  BACKLOG: { icon: Circle, color: 'text-neutral-400', label: 'Backlog', border: 'border-t-neutral-400' },
  NEXT: { icon: ArrowRight, color: 'text-cyan-500', label: 'Siguiente', border: 'border-t-cyan-400' },
  DOING: { icon: Clock, color: 'text-gold-dark', label: 'En Progreso', border: 'border-t-gold' },
  BLOCKED: { icon: AlertTriangle, color: 'text-error', label: 'Bloqueada', border: 'border-t-error-dark' },
  DONE: { icon: CheckCircle2, color: 'text-success', label: 'Completada', border: 'border-t-success-dark' },
}

export function DrillDownPanel({ context, onClose, onTaskClick }: DrillDownPanelProps) {
  // Build filters from drill-down context
  const filters = context ? buildFilters(context) : undefined

  // Fetch tasks with filters
  const { data: tasks, loading, error, refetch } = useTasks(filters)

  // Refetch when context changes
  useEffect(() => {
    if (context) {
      refetch()
    }
  }, [context, refetch])

  if (!context) return null

  return (
    <SidePanel
      isOpen={!!context}
      onClose={onClose}
      title={context.title}
      width="lg"
    >
      <div className="p-6">
        {/* Context Description */}
        {context.description && (
          <div className="mb-4 p-3 bg-neutral-50 dark:bg-neutral-800 border-l-4 border-cyan-400">
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              {context.description}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="py-12">
            <LoadingState message="Cargando tareas..." />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-4 bg-error-light dark:bg-error-dark border-2 border-error-dark">
            <p className="text-error-text dark:text-error font-medium">
              Error al cargar tareas
            </p>
            <p className="text-sm text-error-dark dark:text-error mt-1">
              {error.message}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-3 px-3 py-1.5 bg-error text-white text-sm font-medium hover:bg-error-dark transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Task List */}
        {!loading && !error && tasks && (
          <>
            {/* Task Count */}
            <div className="mb-4 flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
              <span className="font-mono font-bold">{tasks.length}</span>
              <span>tarea{tasks.length !== 1 ? 's' : ''} encontrada{tasks.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Tasks */}
            {tasks.length === 0 ? (
              <div className="py-12 text-center">
                <Circle size={48} className="mx-auto mb-4 text-neutral-300 dark:text-neutral-600" />
                <h3 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                  No se encontraron tareas
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400">
                  No hay tareas que coincidan con los criterios seleccionados
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map(task => (
                  <TaskCard
                    key={task.name}
                    task={task}
                    onClick={() => onTaskClick?.(task.name)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </SidePanel>
  )
}

// Helper function to build filters from drill-down context
function buildFilters(context: DrillDownContext) {
  const filters: any = {}

  // Add filters based on context type and available fields
  if (context.user) {
    filters.assigned_to = context.user
  }

  if (context.status) {
    filters.status = context.status
  }

  if (context.department) {
    filters.department = context.department
  }

  if (context.project) {
    filters.project = context.project
  }

  // For velocity drill-down by date, we don't have a date range filter in the API
  // but we can filter by status=DONE which is typically what velocity shows
  if (context.type === 'velocity') {
    filters.status = 'DONE'
  }

  // For blocker drill-down, filter by BLOCKED status
  if (context.type === 'blocker' && !context.blockedTaskId) {
    filters.status = 'BLOCKED'
  }

  return filters
}

// Task Card Component
interface TaskCardProps {
  task: Task
  onClick?: () => void
}

function TaskCard({ task, onClick }: TaskCardProps) {
  const priority = priorityConfig[task.priority]
  const status = statusConfig[task.status]
  const StatusIcon = status.icon

  // Calculate if task is overdue
  const isOverdue = task.due_date && task.status !== 'DONE' && new Date(task.due_date) < new Date()

  return (
    <div
      onClick={onClick}
      className={`
        bg-white dark:bg-neutral-800
        border border-neutral-200 dark:border-neutral-100
        border-t-4 ${status.border}
        shadow-sm
        transition-all duration-75
        cursor-pointer
      `}
    >
      <div className="p-4">
        {/* Header Row */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {/* Priority Badge */}
          <span className={`px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${priority.bg} ${priority.text} border ${priority.border}`}>
            {task.priority}
          </span>

          {/* Status Badge */}
          <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
            <StatusIcon size={12} className={status.color} />
            {status.label}
          </span>

          {/* Project */}
          {task.project_title && (
            <span className="inline-flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
              <Folder size={12} />
              {task.project_title}
            </span>
          )}

          {/* Overdue Indicator */}
          {isOverdue && (
            <span className="px-2 py-0.5 text-xs font-medium bg-error-light dark:bg-error-dark text-error-text dark:text-error border border-error-dark">
              VENCIDA
            </span>
          )}
        </div>

        {/* Task Title */}
        <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2 hover:underline">
          {task.title}
        </h3>

        {/* Description */}
        {task.description && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Blocked Reason */}
        {task.status === 'BLOCKED' && task.blocked_reason && (
          <div className="mb-2 p-2 bg-error-light dark:bg-error-dark border-l-2 border-error-dark">
            <p className="text-xs text-error-text dark:text-error italic">
              "{task.blocked_reason}"
            </p>
          </div>
        )}

        {/* Footer Row */}
        <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
          {/* Assignee */}
          {task.assigned_to_name && (
            <span className="inline-flex items-center gap-1">
              <User size={12} />
              {task.assigned_to_name}
            </span>
          )}

          {/* Due Date */}
          {task.due_date && (
            <span className={`inline-flex items-center gap-1 ${isOverdue ? 'text-error-dark dark:text-error font-medium' : ''}`}>
              <Clock size={12} />
              {new Date(task.due_date).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          )}

          {/* Department */}
          {task.department && (
            <span className="uppercase">
              {task.department}
            </span>
          )}
        </div>

        {/* Task ID */}
        <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
          <code className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
            {task.name}
          </code>
        </div>
      </div>
    </div>
  )
}
