import type { WorkloadDistributionChartProps } from './types'
import { LoadingState } from '../../ui/LoadingState'
import { User } from 'lucide-react'

// Status color mapping (neobrutal style)
const statusColors = {
  backlog: {
    bg: 'bg-stone-400 dark:bg-stone-500',
    hover: 'hover:bg-stone-500 dark:hover:bg-stone-600',
    label: 'Backlog',
    textColor: 'text-stone-700 dark:text-stone-300'
  },
  next: {
    bg: 'bg-blue-500 dark:bg-blue-600',
    hover: 'hover:bg-blue-600 dark:hover:bg-blue-700',
    label: 'Next',
    textColor: 'text-blue-700 dark:text-blue-300'
  },
  doing: {
    bg: 'bg-amber-500 dark:bg-amber-600',
    hover: 'hover:bg-amber-600 dark:hover:bg-amber-700',
    label: 'Doing',
    textColor: 'text-amber-700 dark:text-amber-300'
  },
  blocked: {
    bg: 'bg-red-500 dark:bg-red-600',
    hover: 'hover:bg-red-600 dark:hover:bg-red-700',
    label: 'Blocked',
    textColor: 'text-red-700 dark:text-red-300'
  },
  done_recent: {
    bg: 'bg-green-500 dark:bg-green-600',
    hover: 'hover:bg-green-600 dark:hover:bg-green-700',
    label: 'Done',
    textColor: 'text-green-700 dark:text-green-300'
  }
}

type StatusKey = keyof typeof statusColors

export function WorkloadDistributionChart({
  data,
  loading = false,
  onDrillDown
}: WorkloadDistributionChartProps) {
  if (loading) {
    return <LoadingState message="Cargando distribución de carga..." />
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 p-8">
        <div className="text-center text-stone-500 dark:text-stone-400">
          <User size={48} className="mx-auto mb-4 opacity-50" />
          <p className="font-medium">No hay datos de carga de trabajo</p>
        </div>
      </div>
    )
  }

  // Find max total for scaling
  const maxTotal = Math.max(...data.map(member => member.total))

  const handleSegmentClick = (
    user: string,
    userName: string,
    status: StatusKey
  ) => {
    if (!onDrillDown) return

    // Map status key to TaskStatus enum
    const statusMap: Record<StatusKey, string> = {
      backlog: 'BACKLOG',
      next: 'NEXT',
      doing: 'DOING',
      blocked: 'BLOCKED',
      done_recent: 'DONE'
    }

    onDrillDown({
      type: 'workload',
      user,
      userName,
      status: statusMap[status] as any,
      title: `Tareas de ${userName}`,
      description: `Estado: ${statusColors[status].label}`
    })
  }

  return (
    <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 mb-2">
          Distribución de Carga por Persona
        </h3>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Haz clic en las barras para ver el detalle de tareas
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-6 pb-4 border-b border-stone-200 dark:border-stone-700">
        {(Object.keys(statusColors) as StatusKey[]).map((status) => (
          <div key={status} className="flex items-center gap-2">
            <div className={`w-3 h-3 ${statusColors[status].bg}`} />
            <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
              {statusColors[status].label}
            </span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="space-y-4">
        {data.map((member) => {
          const segments: Array<{
            key: StatusKey
            count: number
            percentage: number
          }> = [
            { key: 'backlog', count: member.backlog, percentage: 0 },
            { key: 'next', count: member.next, percentage: 0 },
            { key: 'doing', count: member.doing, percentage: 0 },
            { key: 'blocked', count: member.blocked, percentage: 0 },
            { key: 'done_recent', count: member.done_recent, percentage: 0 }
          ]

          // Calculate percentages based on total
          segments.forEach((segment) => {
            segment.percentage = member.total > 0 ? (segment.count / member.total) * 100 : 0
          })

          // Filter out segments with 0 count
          const visibleSegments = segments.filter((s) => s.count > 0)

          return (
            <div key={member.user} className="space-y-2">
              {/* Member name and stats */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-stone-400 dark:text-stone-500" />
                  <span className="font-medium text-stone-900 dark:text-stone-100">
                    {member.full_name}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-stone-500 dark:text-stone-400">
                    {member.total} tarea{member.total !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">
                    {member.done_recent} completadas
                  </span>
                </div>
              </div>

              {/* Horizontal stacked bar */}
              <div className="relative">
                {/* Background bar (full width scaled by total vs max) */}
                <div
                  className="h-8 bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700"
                  style={{
                    width: `${(member.total / maxTotal) * 100}%`,
                    minWidth: '100%'
                  }}
                />

                {/* Stacked segments (absolute positioned) */}
                <div className="absolute inset-0 flex">
                  {visibleSegments.map((segment, index) => {
                    const config = statusColors[segment.key]
                    return (
                      <button
                        key={segment.key}
                        onClick={() => handleSegmentClick(member.user, member.full_name, segment.key)}
                        className={`
                          group relative h-8 transition-all duration-75
                          ${config.bg} ${config.hover}
                          ${onDrillDown ? 'cursor-pointer' : 'cursor-default'}
                          ${index === 0 ? '' : 'border-l border-white dark:border-stone-900'}
                        `}
                        style={{ width: `${segment.percentage}%` }}
                        title={`${config.label}: ${segment.count}`}
                      >
                        {/* Count label (only show if segment is wide enough) */}
                        {segment.percentage > 8 && (
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                            {segment.count}
                          </span>
                        )}

                        {/* Hover tooltip */}
                        {onDrillDown && (
                          <div className="
                            absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                            opacity-0 group-hover:opacity-100
                            transition-opacity duration-150
                            pointer-events-none
                            whitespace-nowrap
                            bg-stone-900 dark:bg-stone-100
                            text-white dark:text-stone-900
                            text-xs font-medium
                            px-2 py-1
                            shadow-lg
                            z-10
                          ">
                            {config.label}: {segment.count}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Detailed breakdown (below bar) */}
              <div className="flex flex-wrap gap-2 ml-5">
                {visibleSegments.map((segment) => {
                  const config = statusColors[segment.key]
                  return (
                    <span
                      key={segment.key}
                      className={`text-[10px] ${config.textColor} font-mono`}
                    >
                      {config.label.toLowerCase()}: {segment.count}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary stats */}
      <div className="mt-6 pt-6 border-t border-stone-200 dark:border-stone-700">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">
              Total Personas
            </div>
            <div className="font-mono text-2xl font-bold text-stone-900 dark:text-stone-100">
              {data.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">
              Total Tareas
            </div>
            <div className="font-mono text-2xl font-bold text-stone-900 dark:text-stone-100">
              {data.reduce((sum, member) => sum + member.total, 0)}
            </div>
          </div>
          <div>
            <div className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">
              Bloqueadas
            </div>
            <div className="font-mono text-2xl font-bold text-red-600 dark:text-red-400">
              {data.reduce((sum, member) => sum + member.blocked, 0)}
            </div>
          </div>
          <div>
            <div className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">
              Completadas
            </div>
            <div className="font-mono text-2xl font-bold text-green-600 dark:text-green-400">
              {data.reduce((sum, member) => sum + member.done_recent, 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
