import type { BlockerAnalysisPanelProps } from './types'
import { LoadingState } from '../../ui/LoadingState'
import { AlertCircle, Clock, User, ExternalLink } from 'lucide-react'

export function BlockerAnalysisPanel({
  data,
  loading = false,
  onDrillDown,
  onViewTask
}: BlockerAnalysisPanelProps) {
  if (loading) {
    return <LoadingState message="Cargando análisis de bloqueos..." />
  }

  if (!data || (data.blocked_areas.length === 0 && data.top_blocked_tasks.length === 0)) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-100 p-8">
        <div className="text-center text-neutral-500 dark:text-neutral-400">
          <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
          <p className="font-medium">No hay tareas bloqueadas</p>
          <p className="text-xs mt-2">¡Excelente trabajo!</p>
        </div>
      </div>
    )
  }

  const handleAreaClick = (area: typeof data.blocked_areas[0]) => {
    if (!onDrillDown) return

    onDrillDown({
      type: 'blocker',
      project: area.type === 'project' ? area.name : undefined,
      department: area.type === 'department' ? (area.name as any) : undefined,
      title: `Tareas bloqueadas - ${area.name}`,
      description: `${area.blocked_count} tarea${area.blocked_count !== 1 ? 's' : ''} bloqueada${area.blocked_count !== 1 ? 's' : ''}`
    })
  }

  const handleTaskClick = (task: typeof data.top_blocked_tasks[0]) => {
    if (!onDrillDown) return

    onDrillDown({
      type: 'blocker',
      blockedTaskId: task.task_id,
      title: task.title,
      description: `Bloqueada ${task.blocked_days} día${task.blocked_days !== 1 ? 's' : ''}`
    })
  }

  const handleViewTaskClick = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onViewTask?.(taskId)
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-100 p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          Análisis de Bloqueos
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Áreas más afectadas y tareas con mayor tiempo bloqueado
        </p>
      </div>

      {/* Key metric - Average blocked time */}
      <div className="mb-6 p-4 bg-error-light dark:bg-error-dark border-2 border-error-dark dark:border-error-dark">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <Clock size={32} className="text-error-dark dark:text-error" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-error-text dark:text-error uppercase tracking-wider font-medium mb-1">
              Tiempo Promedio Bloqueado
            </div>
            <div className="font-mono text-3xl font-bold text-error-dark dark:text-error">
              {data.avg_blocked_time_days.toFixed(1)}
              <span className="text-base font-normal ml-2">días</span>
            </div>
          </div>
        </div>
      </div>

      {/* Blocked areas breakdown */}
      {data.blocked_areas.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 pb-2 border-b border-neutral-200 dark:border-neutral-700">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Áreas con Más Bloqueos
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Distribución por proyecto y departamento
            </p>
          </div>

          <div className="space-y-2">
            {data.blocked_areas.map((area, index) => {
              const maxCount = Math.max(...data.blocked_areas.map(a => a.blocked_count))
              const widthPercentage = (area.blocked_count / maxCount) * 100

              return (
                <button
                  key={`${area.type}-${area.name}`}
                  onClick={() => handleAreaClick(area)}
                  className={`
                    w-full text-left group
                    ${onDrillDown ? 'cursor-pointer' : 'cursor-default'}
                  `}
                  disabled={!onDrillDown}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500">
                        #{index + 1}
                      </span>
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-error-dark dark:group-hover:text-error transition-colors">
                        {area.name}
                      </span>
                      <span className={`
                        text-[10px] px-1.5 py-0.5 font-medium uppercase tracking-wider
                        ${area.type === 'project'
                          ? 'bg-turquoise-light dark:bg-turquoise-dark text-turquoise-dark dark:text-turquoise border border-turquoise'
                          : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-400'
                        }
                      `}>
                        {area.type === 'project' ? 'Proyecto' : 'Depto'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-error-dark dark:text-error">
                      {area.blocked_count} tarea{area.blocked_count !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Bar visualization */}
                  <div className="relative h-6 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700">
                    <div
                      className={`
                        absolute inset-y-0 left-0
                        bg-error dark:bg-error-dark
                        group-hover:bg-error-dark dark:group-hover:bg-error-dark
                        transition-all duration-75
                      `}
                      style={{ width: `${widthPercentage}%` }}
                    >
                      {widthPercentage > 15 && (
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                          {area.blocked_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Top blocked tasks */}
      {data.top_blocked_tasks.length > 0 && (
        <div>
          <div className="mb-3 pb-2 border-b border-neutral-200 dark:border-neutral-700">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Top 5 Tareas Bloqueadas
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Ordenadas por días bloqueados
            </p>
          </div>

          <div className="space-y-2">
            {data.top_blocked_tasks.slice(0, 5).map((task, index) => (
              <div
                key={task.task_id}
                className={`
                  relative p-3 border border-neutral-200 dark:border-neutral-100
                  bg-white dark:bg-neutral-800
                  transition-all duration-75
                `}
              >
                {/* Rank badge */}
                <div className="absolute -top-2 -left-2 w-6 h-6 bg-error-dark dark:bg-error text-white flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>

                {/* Task header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <button
                    onClick={() => handleTaskClick(task)}
                    className={`
                      flex-1 text-left group
                      ${onDrillDown ? 'cursor-pointer' : 'cursor-default'}
                    `}
                    disabled={!onDrillDown}
                  >
                    <h5 className="font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-error-dark dark:group-hover:text-error transition-colors line-clamp-1">
                      {task.title}
                    </h5>
                  </button>

                  {/* Days blocked - prominent */}
                  <div className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1 bg-error-light dark:bg-error-dark border border-error-dark dark:border-error-dark">
                    <Clock size={14} className="text-error-dark dark:text-error" />
                    <span className="text-sm font-bold text-error-dark dark:text-error">
                      {task.blocked_days}d
                    </span>
                  </div>
                </div>

                {/* Blocked reason */}
                {task.blocked_reason && (
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2 line-clamp-2 italic">
                    "{task.blocked_reason}"
                  </p>
                )}

                {/* Task metadata */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                  <div className="flex items-center gap-1">
                    <User size={12} />
                    <span>{task.assigned_name}</span>
                  </div>
                  {task.project && (
                    <>
                      <span>•</span>
                      <span className="font-mono">{task.project}</span>
                    </>
                  )}
                  {task.department && (
                    <>
                      <span>•</span>
                      <span className="uppercase tracking-wider">{task.department}</span>
                    </>
                  )}
                </div>

                {/* Quick actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                  {onViewTask && (
                    <button
                      onClick={(e) => handleViewTaskClick(task.task_id, e)}
                      className="
                        flex items-center gap-1.5 px-3 py-1.5
                        text-xs font-medium
                        bg-neutral-900 dark:bg-neutral-100
                        text-white dark:text-neutral-900
                        border border-neutral-200 dark:border-neutral-100
                        transition-all duration-75
                        shadow-sm
                      "
                    >
                      <ExternalLink size={12} />
                      Ver Tarea
                    </button>
                  )}
                  {onDrillDown && (
                    <button
                      onClick={() => handleTaskClick(task)}
                      className="
                        flex items-center gap-1.5 px-3 py-1.5
                        text-xs font-medium
                        bg-white dark:bg-neutral-800
                        text-neutral-900 dark:text-neutral-100
                        border border-neutral-200 dark:border-neutral-100
                        transition-all duration-75
                        shadow-sm
                      "
                    >
                      <AlertCircle size={12} />
                      Ver Detalles
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-100">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
              Áreas Afectadas
            </div>
            <div className="font-mono text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {data.blocked_areas.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
              Total Bloqueadas
            </div>
            <div className="font-mono text-2xl font-bold text-error-dark dark:text-error">
              {data.blocked_areas.reduce((sum, area) => sum + area.blocked_count, 0)}
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
              Max Días Bloqueado
            </div>
            <div className="font-mono text-2xl font-bold text-error-dark dark:text-error">
              {data.top_blocked_tasks.length > 0 ? Math.max(...data.top_blocked_tasks.map(t => t.blocked_days)) : 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
