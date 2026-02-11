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
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 shadow-sm">
        <LoadingState message="Cargando KPIs..." />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 shadow-sm">
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
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 shadow-sm p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-bold text-neutral-900 dark:text-neutral-100">
              Mis KPIs de Productividad
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Últimos {data.period === 'week' ? '7 días' : '30 días'}
            </p>
          </div>

          {/* Period Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setPeriod('week')}
              className={`
                px-3 py-1.5 text-xs font-medium uppercase tracking-wider
                border border-neutral-200
                transition-all duration-75
                ${period === 'week'
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                  : 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }
              `}
            >
              Semana
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`
                px-3 py-1.5 text-xs font-medium uppercase tracking-wider
                border border-neutral-200
                transition-all duration-75
                ${period === 'month'
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                  : 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800'
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
        <div className="bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 p-4">
          <div className="flex items-start justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-success-dark dark:text-success" />
          </div>
          <div className="font-mono text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
            {data.completed}
          </div>
          <div className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Tareas Completadas
          </div>
        </div>

        {/* Velocity */}
        <div className="bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 p-4">
          <div className="flex items-start justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-turquoise-dark dark:text-turquoise" />
          </div>
          <div className="font-mono text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
            {data.velocity.toFixed(1)}
          </div>
          <div className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Velocidad (tareas/día)
          </div>
        </div>

        {/* Work Days */}
        <div className="bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 p-4">
          <div className="flex items-start justify-between mb-2">
            <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="font-mono text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
            {data.work_days}
          </div>
          <div className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Días Trabajados
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 p-4">
          <div className="flex items-start justify-between mb-2">
            <FolderOpen className="w-5 h-5 text-gold-dark dark:text-gold" />
          </div>
          <div className="font-mono text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
            {data.active_projects}
          </div>
          <div className="text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Proyectos Activos
          </div>
        </div>
      </div>

      {/* Current Status Breakdown */}
      {hasStatusData && (
        <div className="border-t-2 border-neutral-200 dark:border-neutral-700 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
            <h3 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100">
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
                if (lower.includes('done') || lower.includes('completado')) return 'bg-success-dark dark:bg-success'
                if (lower.includes('doing') || lower.includes('progress') || lower.includes('haciendo')) return 'bg-turquoise-dark dark:bg-turquoise'
                if (lower.includes('blocked') || lower.includes('bloqueado')) return 'bg-error-dark dark:bg-error'
                if (lower.includes('next') || lower.includes('próximo')) return 'bg-purple-600 dark:bg-purple-400'
                return 'bg-neutral-600 dark:bg-neutral-400'
              }

              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                      {status}
                    </span>
                    <span className="font-mono text-neutral-500 dark:text-neutral-400">
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-neutral-200 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600">
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
        <div className="border-t-2 border-neutral-200 dark:border-neutral-700 pt-6 mt-6">
          <h3 className="font-heading text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-3">
            Tendencia Diaria
          </h3>
          <div className="h-12 flex items-end gap-1">
            {data.daily_trend.map((day, index) => {
              const maxCount = Math.max(...data.daily_trend.map(d => d.count), 1)
              const heightPercent = (day.count / maxCount) * 100

              return (
                <div
                  key={index}
                  className="flex-1 bg-gold dark:bg-gold-dark border border-neutral-900 dark:border-neutral-100 transition-all duration-300 hover:bg-gold-dark dark:hover:bg-gold group relative"
                  style={{ height: `${heightPercent}%`, minHeight: day.count > 0 ? '4px' : '2px' }}
                  title={`${day.date}: ${day.count} tareas`}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 text-xs px-2 py-1 whitespace-nowrap z-10">
                    {day.date}: {day.count}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mt-2">
            <span>{data.daily_trend[0]?.date}</span>
            <span>{data.daily_trend[data.daily_trend.length - 1]?.date}</span>
          </div>
        </div>
      )}
    </div>
  )
}
