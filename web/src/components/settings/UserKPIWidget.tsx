import { useState } from 'react'
import { useUserKPIs } from '../../api'
import { LoadingState } from '../ui/LoadingState'
import { ErrorState } from '../ui/ErrorState'
import { BarChart3, Calendar, CheckCircle, FolderOpen, TrendingUp } from 'lucide-react'

export function UserKPIWidget() {
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const { data, loading, error, refetch } = useUserKPIs(period)

  if (loading) {
    return (
      <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9]">
        <LoadingState message="Cargando KPIs..." />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9]">
        <ErrorState
          title="Error al cargar KPIs"
          message="No se pudieron cargar tus métricas de productividad."
          error={error}
          onRetry={refetch}
        />
      </div>
    )
  }

  // Get status breakdown entries
  const statusEntries = Object.entries(data.current)
  const hasStatusData = statusEntries.length > 0

  return (
    <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9] p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
              Mis KPIs de Productividad
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
              Últimos {data.period === 'week' ? '7 días' : '30 días'}
            </p>
          </div>

          {/* Period Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setPeriod('week')}
              className={`
                px-3 py-1.5 text-xs font-medium uppercase tracking-wider
                border-2 border-stone-900 dark:border-stone-100
                transition-all duration-75
                ${period === 'week'
                  ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                  : 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'
                }
              `}
            >
              Semana
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`
                px-3 py-1.5 text-xs font-medium uppercase tracking-wider
                border-2 border-stone-900 dark:border-stone-100
                transition-all duration-75
                ${period === 'month'
                  ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900'
                  : 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'
                }
              `}
            >
              Mes
            </button>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Completed Tasks */}
        <div className="bg-stone-50 dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700 p-4">
          <div className="flex items-start justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="font-mono text-3xl font-bold text-stone-900 dark:text-stone-100 mb-1">
            {data.completed}
          </div>
          <div className="text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Tareas Completadas
          </div>
        </div>

        {/* Velocity */}
        <div className="bg-stone-50 dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700 p-4">
          <div className="flex items-start justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="font-mono text-3xl font-bold text-stone-900 dark:text-stone-100 mb-1">
            {data.velocity.toFixed(1)}
          </div>
          <div className="text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Velocidad (tareas/día)
          </div>
        </div>

        {/* Work Days */}
        <div className="bg-stone-50 dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700 p-4">
          <div className="flex items-start justify-between mb-2">
            <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="font-mono text-3xl font-bold text-stone-900 dark:text-stone-100 mb-1">
            {data.work_days}
          </div>
          <div className="text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Días Trabajados
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-stone-50 dark:bg-stone-800 border-2 border-stone-200 dark:border-stone-700 p-4">
          <div className="flex items-start justify-between mb-2">
            <FolderOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="font-mono text-3xl font-bold text-stone-900 dark:text-stone-100 mb-1">
            {data.active_projects}
          </div>
          <div className="text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Proyectos Activos
          </div>
        </div>
      </div>

      {/* Current Status Breakdown */}
      {hasStatusData && (
        <div className="border-t-2 border-stone-200 dark:border-stone-700 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-stone-700 dark:text-stone-300" />
            <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
              Estado Actual de Tareas
            </h3>
          </div>

          <div className="space-y-3">
            {statusEntries.map(([status, count]) => {
              const total = statusEntries.reduce((sum, [, c]) => sum + c, 0)
              const percentage = total > 0 ? (count / total) * 100 : 0

              // Map status to color
              const getStatusColor = (s: string) => {
                const lower = s.toLowerCase()
                if (lower.includes('done') || lower.includes('completado')) return 'bg-green-600 dark:bg-green-400'
                if (lower.includes('doing') || lower.includes('progress') || lower.includes('haciendo')) return 'bg-blue-600 dark:bg-blue-400'
                if (lower.includes('blocked') || lower.includes('bloqueado')) return 'bg-red-600 dark:bg-red-400'
                if (lower.includes('next') || lower.includes('próximo')) return 'bg-purple-600 dark:bg-purple-400'
                return 'bg-stone-600 dark:bg-stone-400'
              }

              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-stone-700 dark:text-stone-300 font-medium">
                      {status}
                    </span>
                    <span className="font-mono text-stone-500 dark:text-stone-400">
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-stone-200 dark:bg-stone-700 border border-stone-300 dark:border-stone-600">
                    <div
                      className={`h-full transition-all duration-500 ${getStatusColor(status)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Daily Trend Sparkline */}
      {data.daily_trend && data.daily_trend.length > 0 && (
        <div className="border-t-2 border-stone-200 dark:border-stone-700 pt-6 mt-6">
          <h3 className="font-serif text-sm font-bold text-stone-900 dark:text-stone-100 mb-3">
            Tendencia Diaria
          </h3>
          <div className="h-12 flex items-end gap-1">
            {data.daily_trend.map((day, index) => {
              const maxCount = Math.max(...data.daily_trend.map(d => d.count), 1)
              const heightPercent = (day.count / maxCount) * 100

              return (
                <div
                  key={index}
                  className="flex-1 bg-amber-400 dark:bg-amber-500 border border-stone-900 dark:border-stone-100 transition-all duration-300 hover:bg-amber-500 dark:hover:bg-amber-400 group relative"
                  style={{ height: `${heightPercent}%`, minHeight: day.count > 0 ? '4px' : '2px' }}
                  title={`${day.date}: ${day.count} tareas`}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 text-xs px-2 py-1 whitespace-nowrap z-10">
                    {day.date}: {day.count}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-stone-500 dark:text-stone-400 mt-2">
            <span>{data.daily_trend[0]?.date}</span>
            <span>{data.daily_trend[data.daily_trend.length - 1]?.date}</span>
          </div>
        </div>
      )}
    </div>
  )
}
