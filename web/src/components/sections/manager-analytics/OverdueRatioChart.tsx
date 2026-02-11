import type { OverdueRatioChartProps } from './types'
import { LoadingState } from '../../ui/LoadingState'
import { TrendingUp, TrendingDown, Minus, Calendar, AlertTriangle } from 'lucide-react'
import { useState } from 'react'

// Format date for display
function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart)
  const end = new Date(weekEnd)
  const startMonth = start.toLocaleDateString('es-ES', { month: 'short' })
  const endMonth = end.toLocaleDateString('es-ES', { month: 'short' })
  const startDay = start.getDate()
  const endDay = end.getDate()

  if (startMonth === endMonth) {
    return `${startDay}-${endDay} ${startMonth}`
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`
}

// Department color mapping
const departmentColors = {
  SALES: {
    fill: 'rgba(91, 191, 191, 0.3)', // turquoise with opacity
    stroke: 'rgb(91, 191, 191)',
    label: 'Ventas'
  },
  OPS: {
    fill: 'rgba(168, 85, 247, 0.3)', // purple-500 with opacity
    stroke: 'rgb(168, 85, 247)',
    label: 'Operaciones'
  },
  MKT: {
    fill: 'rgba(236, 72, 153, 0.3)', // pink-500 with opacity
    stroke: 'rgb(236, 72, 153)',
    label: 'Marketing'
  }
}

type DepartmentKey = keyof typeof departmentColors

export function OverdueRatioChart({
  data,
  loading = false,
  onDrillDown,
  showDepartmentBreakdown = false,
  onToggleDepartmentBreakdown
}: OverdueRatioChartProps) {
  const [showDepartments, setShowDepartments] = useState(showDepartmentBreakdown)

  if (loading) {
    return <LoadingState message="Cargando tendencia de vencimientos..." />
  }

  if (!data || data.weeks.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-100 p-8">
        <div className="text-center text-neutral-500 dark:text-neutral-400">
          <Calendar size={48} className="mx-auto mb-4 opacity-50" />
          <p className="font-medium">No hay datos de vencimiento</p>
        </div>
      </div>
    )
  }

  const handleToggleDepartments = () => {
    const newValue = !showDepartments
    setShowDepartments(newValue)
    onToggleDepartmentBreakdown?.()
  }

  const handleDataPointClick = (weekData: typeof data.weeks[0], department?: DepartmentKey) => {
    if (!onDrillDown) return

    if (department) {
      onDrillDown({
        type: 'overdue',
        weekStart: weekData.week_start,
        weekEnd: weekData.week_end,
        department,
        title: `Tareas vencidas - ${departmentColors[department].label}`,
        description: `Semana ${formatWeekRange(weekData.week_start, weekData.week_end)} - ${(weekData.by_department[department]?.ratio * 100 || 0).toFixed(1)}% vencidas`
      })
    } else {
      onDrillDown({
        type: 'overdue',
        weekStart: weekData.week_start,
        weekEnd: weekData.week_end,
        title: `Tareas vencidas - Semana ${formatWeekRange(weekData.week_start, weekData.week_end)}`,
        description: `${(weekData.overdue_ratio * 100).toFixed(1)}% de tareas vencidas`
      })
    }
  }

  // Calculate chart dimensions
  const chartWidth = 100 // percentage
  const chartHeight = 200 // pixels
  const padding = { top: 20, right: 10, bottom: 40, left: 40 }
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom

  // Find max ratio for scaling (use 100% as max, or actual max if higher)
  const maxRatio = showDepartments
    ? Math.max(
        ...data.weeks.flatMap(w =>
          Object.values(w.by_department).map(d => d.ratio)
        ),
        0.5 // Min 50% for scaling
      )
    : Math.max(...data.weeks.map(w => w.overdue_ratio), 0.5)

  const minRatio = 0

  // Generate SVG path for area chart
  const generateAreaPath = (ratios: number[]): string => {
    if (ratios.length === 0) return ''

    const points = ratios.map((ratio, index) => {
      const x = padding.left + (index / (ratios.length - 1)) * innerWidth
      const y = padding.top + innerHeight - ((ratio - minRatio) / (maxRatio - minRatio)) * innerHeight
      return { x, y }
    })

    // Start from bottom left
    const path = [`M ${padding.left} ${padding.top + innerHeight}`]

    // Line to first point
    path.push(`L ${points[0].x} ${points[0].y}`)

    // Lines through all points
    points.slice(1).forEach(point => {
      path.push(`L ${point.x} ${point.y}`)
    })

    // Line to bottom right
    path.push(`L ${points[points.length - 1].x} ${padding.top + innerHeight}`)

    // Close path
    path.push('Z')

    return path.join(' ')
  }

  // Calculate point positions for interactive dots
  const getPointPosition = (ratio: number, index: number): { x: number; y: number } => {
    const x = padding.left + (index / (data.weeks.length - 1)) * innerWidth
    const y = padding.top + innerHeight - ((ratio - minRatio) / (maxRatio - minRatio)) * innerHeight
    return { x, y }
  }

  // Trend indicator
  const trendConfig = {
    improving: {
      icon: <TrendingDown size={16} />, // Down is good for overdue ratio
      color: 'text-success-dark dark:text-success',
      bg: 'bg-success-light dark:bg-success-dark',
      border: 'border-success-dark',
      label: 'Mejorando'
    },
    worsening: {
      icon: <TrendingUp size={16} />, // Up is bad for overdue ratio
      color: 'text-error-dark dark:text-error',
      bg: 'bg-error-light dark:bg-error-dark',
      border: 'border-error-dark',
      label: 'Empeorando'
    },
    stable: {
      icon: <Minus size={16} />,
      color: 'text-neutral-500 dark:text-neutral-400',
      bg: 'bg-neutral-50 dark:bg-neutral-800',
      border: 'border-neutral-400',
      label: 'Estable'
    }
  }

  const currentTrend = trendConfig[data.trend]

  // Calculate average overdue ratio
  const avgOverdueRatio = data.weeks.reduce((sum, week) => sum + week.overdue_ratio, 0) / data.weeks.length

  // Get latest week ratio
  const latestRatio = data.weeks[data.weeks.length - 1]?.overdue_ratio || 0

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-100 p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
              Ratio de Vencimientos
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Porcentaje de tareas vencidas en las últimas 8 semanas
            </p>
          </div>

          {/* Department breakdown toggle */}
          <button
            onClick={handleToggleDepartments}
            className={`
              px-3 py-1.5 text-xs font-medium
              border border-neutral-200 dark:border-neutral-100
              transition-all duration-75
              ${showDepartments
                ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }
            `}
          >
            Por Departamento
          </button>
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
      {showDepartments && (
        <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-700">
          {(Object.keys(departmentColors) as DepartmentKey[]).map((dept) => (
            <div key={dept} className="flex items-center gap-2">
              <div
                className="w-4 h-3 border border-neutral-900 dark:border-neutral-100"
                style={{ backgroundColor: departmentColors[dept].fill }}
              />
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                {departmentColors[dept].label}
              </span>
            </div>
          ))}
        </div>
      )}

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
              const value = Math.round((minRatio + (maxRatio - minRatio) * ratio) * 100)
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
                    {value}%
                  </text>
                </g>
              )
            })}

            {/* Area fills */}
            {showDepartments ? (
              // Department breakdown areas
              <>
                {(Object.keys(departmentColors) as DepartmentKey[]).map((dept) => {
                  const ratios = data.weeks.map(w => w.by_department[dept]?.ratio || 0)
                  const areaPath = generateAreaPath(ratios)
                  const config = departmentColors[dept]

                  return (
                    <path
                      key={dept}
                      d={areaPath}
                      fill={config.fill}
                      stroke={config.stroke}
                      strokeWidth="2"
                      opacity="0.6"
                    />
                  )
                })}
              </>
            ) : (
              // Overall area
              <path
                d={generateAreaPath(data.weeks.map(w => w.overdue_ratio))}
                fill="rgba(224, 122, 76, 0.3)" // error token with opacity
                stroke="rgb(224, 122, 76)"
                strokeWidth="2"
              />
            )}

            {/* Interactive data points */}
            {showDepartments ? (
              // Points for each department
              <>
                {(Object.keys(departmentColors) as DepartmentKey[]).map((dept) => {
                  const config = departmentColors[dept]
                  return data.weeks.map((weekData, index) => {
                    const ratio = weekData.by_department[dept]?.ratio || 0
                    const pos = getPointPosition(ratio, index)
                    return (
                      <g key={`${dept}-${index}`}>
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r="4"
                          fill="white"
                          stroke={config.stroke}
                          className={`
                            ${onDrillDown ? 'cursor-pointer hover:r-6' : 'cursor-default'}
                            transition-all duration-75
                          `}
                          strokeWidth="2"
                          onClick={() => handleDataPointClick(weekData, dept)}
                        />
                        {onDrillDown && (
                          <circle
                            cx={pos.x}
                            cy={pos.y}
                            r="10"
                            fill="transparent"
                            className="cursor-pointer"
                            onClick={() => handleDataPointClick(weekData, dept)}
                          >
                            <title>{`${formatWeekRange(weekData.week_start, weekData.week_end)} - ${config.label}: ${(ratio * 100).toFixed(1)}%`}</title>
                          </circle>
                        )}
                      </g>
                    )
                  })
                })}
              </>
            ) : (
              // Overall points
              data.weeks.map((weekData, index) => {
                const pos = getPointPosition(weekData.overdue_ratio, index)
                return (
                  <g key={index}>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="5"
                      fill="white"
                      stroke="currentColor"
                      className={`
                        text-error
                        ${onDrillDown ? 'cursor-pointer hover:r-7' : 'cursor-default'}
                        transition-all duration-75
                      `}
                      strokeWidth="2"
                      onClick={() => handleDataPointClick(weekData)}
                    />
                    {onDrillDown && (
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r="12"
                        fill="transparent"
                        className="cursor-pointer"
                        onClick={() => handleDataPointClick(weekData)}
                      >
                        <title>{`${formatWeekRange(weekData.week_start, weekData.week_end)}: ${(weekData.overdue_ratio * 100).toFixed(1)}%`}</title>
                      </circle>
                    )}
                  </g>
                )
              })
            )}

            {/* X-axis labels */}
            {data.weeks.map((weekData, index) => {
              // Show every 2nd label to avoid crowding for 8 weeks
              const showLabel = index % 2 === 0 || index === data.weeks.length - 1
              if (!showLabel) return null

              const pos = getPointPosition(weekData.overdue_ratio, index)
              return (
                <text
                  key={`label-${index}`}
                  x={pos.x}
                  y={padding.top + innerHeight + 15}
                  textAnchor="middle"
                  className="text-[7px] fill-neutral-500 dark:fill-neutral-400"
                >
                  {formatWeekRange(weekData.week_start, weekData.week_end)}
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
            Ratio Actual
          </div>
          <div className="flex items-baseline gap-2">
            <div className="font-mono text-2xl font-bold text-error-dark dark:text-error">
              {(latestRatio * 100).toFixed(1)}%
            </div>
            <AlertTriangle size={16} className="text-error mb-1" />
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            última semana
          </div>
        </div>
        <div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
            Promedio
          </div>
          <div className="font-mono text-2xl font-bold text-neutral-600 dark:text-neutral-400">
            {(avgOverdueRatio * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            últimas 8 semanas
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
            Total Vencidas
          </div>
          <div className="font-mono text-2xl font-bold text-error-dark dark:text-error">
            {data.weeks[data.weeks.length - 1]?.overdue_tasks || 0}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            de {data.weeks[data.weeks.length - 1]?.total_tasks || 0} totales
          </div>
        </div>
      </div>
    </div>
  )
}
