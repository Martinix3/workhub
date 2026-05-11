import type { VelocityTrendChartProps } from './types'
import { LoadingState } from '../../ui/LoadingState'
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react'
import { useState } from 'react'

// Format date for display based on period
function formatDate(dateString: string, period: 'daily' | 'weekly'): string {
  const date = new Date(dateString)
  if (period === 'weekly') {
    const month = date.toLocaleDateString('es-ES', { month: 'short' })
    const day = date.getDate()
    return `${day} ${month}`
  } else {
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }
}

export function VelocityTrendChart({
  data,
  loading = false,
  onDrillDown,
  onPeriodChange
}: VelocityTrendChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly'>(data?.period || 'daily')

  if (loading) {
    return <LoadingState message="Cargando tendencia de velocidad..." />
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-100 p-8">
        <div className="text-center text-neutral-500 dark:text-neutral-400">
          <Activity size={48} className="mx-auto mb-4 opacity-50" />
          <p className="font-medium">No hay datos de velocidad</p>
        </div>
      </div>
    )
  }

  const handlePeriodToggle = (period: 'daily' | 'weekly') => {
    setSelectedPeriod(period)
    onPeriodChange?.(period)
  }

  const handleDataPointClick = (dataPoint: typeof data.data[0], index: number) => {
    if (!onDrillDown) return

    onDrillDown({
      type: 'velocity',
      date: dataPoint.date,
      period: data.period,
      title: `Tareas completadas - ${formatDate(dataPoint.date, data.period)}`,
      description: `${dataPoint.completed} tareas completadas`
    })
  }

  // Calculate chart dimensions
  const chartWidth = 100 // percentage
  const chartHeight = 200 // pixels
  const padding = { top: 20, right: 10, bottom: 30, left: 40 }
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom

  // Find min and max values for scaling
  const allValues = data.data.flatMap(d => [d.completed, d.previous_period])
  const maxValue = Math.max(...allValues, 10) // Min 10 for scaling
  const minValue = 0

  // Generate SVG path for line
  const generatePath = (values: number[]): string => {
    if (values.length === 0) return ''

    const points = values.map((value, index) => {
      const x = padding.left + (index / (values.length - 1)) * innerWidth
      const y = padding.top + innerHeight - ((value - minValue) / (maxValue - minValue)) * innerHeight
      return `${x},${y}`
    })

    return `M ${points.join(' L ')}`
  }

  const currentPath = generatePath(data.data.map(d => d.completed))
  const previousPath = generatePath(data.data.map(d => d.previous_period))

  // Calculate point positions for interactive dots
  const getPointPosition = (value: number, index: number): { x: number; y: number } => {
    const x = padding.left + (index / (data.data.length - 1)) * innerWidth
    const y = padding.top + innerHeight - ((value - minValue) / (maxValue - minValue)) * innerHeight
    return { x, y }
  }

  // Trend indicator
  const trendConfig = {
    up: {
      icon: <TrendingUp size={16} />,
      color: 'text-success-dark dark:text-success',
      bg: 'bg-success-light dark:bg-success-dark',
      border: 'border-success-dark',
      label: 'Tendencia al alza'
    },
    down: {
      icon: <TrendingDown size={16} />,
      color: 'text-error-dark dark:text-error',
      bg: 'bg-error-light dark:bg-error-dark',
      border: 'border-error-dark',
      label: 'Tendencia a la baja'
    },
    stable: {
      icon: <Minus size={16} />,
      color: 'text-neutral-500 dark:text-neutral-400',
      bg: 'bg-neutral-50 dark:bg-neutral-800',
      border: 'border-neutral-400',
      label: 'Tendencia estable'
    }
  }

  const currentTrend = trendConfig[data.trend]

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-100 p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Velocidad de Completado
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Tareas completadas a lo largo del tiempo
            </p>
          </div>

          {/* Period toggle */}
          <div className="flex gap-1 border border-neutral-200 dark:border-neutral-100 bg-neutral-100 dark:bg-neutral-800">
            <button
              onClick={() => handlePeriodToggle('daily')}
              className={`
                px-3 py-1 text-xs font-medium transition-all duration-75
                ${selectedPeriod === 'daily'
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                  : 'bg-transparent text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }
              `}
            >
              Diario
            </button>
            <button
              onClick={() => handlePeriodToggle('weekly')}
              className={`
                px-3 py-1 text-xs font-medium transition-all duration-75
                ${selectedPeriod === 'weekly'
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                  : 'bg-transparent text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }
              `}
            >
              Semanal
            </button>
          </div>
        </div>

        {/* Trend indicator */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 border ${currentTrend.border} ${currentTrend.bg}`}>
          <span className={currentTrend.color}>
            {currentTrend.icon}
          </span>
          <span className={`text-xs font-medium ${currentTrend.color}`}>
            {currentTrend.label}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-turquoise-dark dark:bg-turquoise" />
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Período actual
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 border-t-2 border-dashed border-neutral-400 dark:border-neutral-500" />
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Período anterior
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-6">
        <div className="relative bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 p-4">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto"
            style={{ minHeight: '200px' }}
          >
            {/* Y-axis grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding.top + innerHeight - (ratio * innerHeight)
              const value = Math.round(minValue + (maxValue - minValue) * ratio)
              return (
                <g key={ratio}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={padding.left + innerWidth}
                    y2={y}
                    stroke="currentColor"
                    className="text-neutral-200 dark:text-neutral-700"
                    strokeWidth="0.5"
                    strokeDasharray="2,2"
                  />
                  <text
                    x={padding.left - 5}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="text-[8px] fill-neutral-500 dark:fill-neutral-400"
                  >
                    {value}
                  </text>
                </g>
              )
            })}

            {/* Previous period line (dashed) */}
            <path
              d={previousPath}
              fill="none"
              stroke="currentColor"
              className="text-neutral-400 dark:text-neutral-500"
              strokeWidth="1.5"
              strokeDasharray="3,3"
            />

            {/* Current period line (solid) */}
            <path
              d={currentPath}
              fill="none"
              stroke="currentColor"
              className="text-turquoise-dark dark:text-turquoise"
              strokeWidth="2"
            />

            {/* Interactive data points */}
            {data.data.map((dataPoint, index) => {
              const pos = getPointPosition(dataPoint.completed, index)
              return (
                <g key={index}>
                  {/* Clickable area */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="6"
                    fill="white"
                    stroke="currentColor"
                    className={`
                      text-turquoise-dark dark:text-turquoise
                      ${onDrillDown ? 'cursor-pointer hover:r-8' : 'cursor-default'}
                      transition-all duration-75
                    `}
                    strokeWidth="2"
                    onClick={() => handleDataPointClick(dataPoint, index)}
                  />
                  {onDrillDown && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="12"
                      fill="transparent"
                      className="cursor-pointer"
                      onClick={() => handleDataPointClick(dataPoint, index)}
                    >
                      <title>{`${formatDate(dataPoint.date, data.period)}: ${dataPoint.completed} completadas`}</title>
                    </circle>
                  )}
                </g>
              )
            })}

            {/* X-axis labels */}
            {data.data.map((dataPoint, index) => {
              // Show every nth label to avoid crowding
              const showLabel = data.data.length <= 7 || index % Math.ceil(data.data.length / 7) === 0 || index === data.data.length - 1
              if (!showLabel) return null

              const pos = getPointPosition(dataPoint.completed, index)
              return (
                <text
                  key={`label-${index}`}
                  x={pos.x}
                  y={padding.top + innerHeight + 15}
                  textAnchor="middle"
                  className="text-[8px] fill-neutral-500 dark:fill-neutral-400"
                >
                  {formatDate(dataPoint.date, data.period)}
                </text>
              )
            })}
          </svg>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-neutral-200 dark:border-neutral-700">
        <div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
            Promedio Actual
          </div>
          <div className="font-mono text-2xl font-bold text-turquoise-dark dark:text-turquoise">
            {data.avg_current.toFixed(1)}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            tareas/{data.period === 'daily' ? 'día' : 'semana'}
          </div>
        </div>
        <div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
            Promedio Anterior
          </div>
          <div className="font-mono text-2xl font-bold text-neutral-600 dark:text-neutral-400">
            {data.avg_previous.toFixed(1)}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            tareas/{data.period === 'daily' ? 'día' : 'semana'}
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
            Cambio
          </div>
          <div className={`font-mono text-2xl font-bold ${
            data.avg_current > data.avg_previous
              ? 'text-success-dark dark:text-success'
              : data.avg_current < data.avg_previous
              ? 'text-error-dark dark:text-error'
              : 'text-neutral-600 dark:text-neutral-400'
          }`}>
            {data.avg_current > data.avg_previous && '+'}
            {((data.avg_current - data.avg_previous) / data.avg_previous * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            vs. período anterior
          </div>
        </div>
      </div>
    </div>
  )
}
