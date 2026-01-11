import { useState } from 'react'
import type { ValueType, TrendDirection } from '../../types/custom-kpi'

/**
 * Data point for sparkline chart
 */
export interface SparklineDataPoint {
  /** Value for this data point */
  value: number
  /** Optional label (e.g., date) */
  label?: string
}

interface SparklineVisualizationProps {
  /** Current value to display */
  value: number
  /** Historical data points (last 7-14 points) */
  dataPoints?: SparklineDataPoint[]
  /** Trend direction for generating fallback data */
  trend?: TrendDirection
  /** Value type for formatting */
  valueType?: ValueType
  /** Label to display below sparkline */
  label?: string
  /** Size of the sparkline */
  size?: 'sm' | 'md' | 'lg'
  /** Color based on KPI status */
  color?: 'green' | 'amber' | 'red' | 'blue'
  /** Whether to show hover tooltips */
  showTooltip?: boolean
}

/**
 * Mini line chart showing KPI trend over time
 * Displays last 7-14 data points with hover tooltips
 */
export function SparklineVisualization({
  value,
  dataPoints,
  trend = 'stable',
  valueType = 'number',
  label,
  size = 'md',
  color = 'blue',
  showTooltip = true
}: SparklineVisualizationProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Generate fallback data if none provided
  const data = dataPoints || generateFallbackData(value, trend, 10)

  // Calculate min/max for scaling
  const values = data.map((d) => d.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const valueRange = maxValue - minValue || 1 // Avoid division by zero

  // Get size dimensions
  const dimensions = {
    sm: { width: 80, height: 40, viewBox: '0 0 100 40', dotSize: 2, strokeWidth: 1.5, textSize: 'text-sm' },
    md: { width: 120, height: 60, viewBox: '0 0 100 40', dotSize: 3, strokeWidth: 2, textSize: 'text-base' },
    lg: { width: 160, height: 80, viewBox: '0 0 100 40', dotSize: 4, strokeWidth: 2.5, textSize: 'text-lg' }
  }

  const dim = dimensions[size]

  // Convert data points to SVG coordinates
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 35 - ((d.value - minValue) / valueRange) * 30 // 35 max, 5 min (leaving margins)
    return { x, y, value: d.value, label: d.label }
  })

  // Create polyline points string
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ')

  // Get color classes
  const getColorClass = () => {
    switch (color) {
      case 'green':
        return 'text-green-600 dark:text-green-400'
      case 'amber':
        return 'text-amber-600 dark:text-amber-400'
      case 'red':
        return 'text-red-600 dark:text-red-400'
      case 'blue':
      default:
        return 'text-blue-600 dark:text-blue-400'
    }
  }

  // Format value based on value type
  const formatValue = (val: number): string => {
    if (valueType === 'currency') {
      if (val >= 1000000) {
        return `$${(val / 1000000).toFixed(1)}M`
      }
      if (val >= 1000) {
        return `$${(val / 1000).toFixed(0)}k`
      }
      return `$${val.toLocaleString()}`
    }
    if (valueType === 'percent') {
      return `${val.toFixed(1)}%`
    }
    return val.toLocaleString()
  }

  // Get trend indicator
  const getTrendIndicator = () => {
    switch (trend) {
      case 'up':
        return { symbol: '↑', color: 'text-green-600 dark:text-green-400' }
      case 'down':
        return { symbol: '↓', color: 'text-red-600 dark:text-red-400' }
      case 'stable':
      default:
        return { symbol: '→', color: 'text-stone-400 dark:text-stone-500' }
    }
  }

  const trendIndicator = getTrendIndicator()

  return (
    <div className="flex flex-col items-center">
      {/* Sparkline SVG */}
      <div className="relative">
        <svg
          width={dim.width}
          height={dim.height}
          viewBox={dim.viewBox}
          className="mb-3"
        >
          {/* Line chart */}
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="currentColor"
            strokeWidth={dim.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`${getColorClass()} transition-all duration-300`}
          />

          {/* Data point dots */}
          {points.map((point, i) => (
            <g key={i}>
              {/* Invisible larger circle for better hover target */}
              {showTooltip && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={dim.dotSize + 3}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              )}

              {/* Visible dot */}
              <circle
                cx={point.x}
                cy={point.y}
                r={i === points.length - 1 ? dim.dotSize * 1.5 : dim.dotSize}
                fill="currentColor"
                className={`
                  ${getColorClass()}
                  ${hoveredIndex === i ? 'opacity-100' : i === points.length - 1 ? 'opacity-100' : 'opacity-60'}
                  transition-opacity duration-150
                `}
              />
            </g>
          ))}

          {/* Hover indicator line */}
          {showTooltip && hoveredIndex !== null && (
            <line
              x1={points[hoveredIndex].x}
              y1="0"
              x2={points[hoveredIndex].x}
              y2="40"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="2,2"
              className="text-stone-300 dark:text-stone-600"
            />
          )}
        </svg>

        {/* Tooltip */}
        {showTooltip && hoveredIndex !== null && (
          <div
            className="
              absolute -top-8 left-1/2 -translate-x-1/2
              px-2 py-1
              bg-stone-900 dark:bg-stone-100
              text-white dark:text-stone-900
              text-xs font-mono
              border-2 border-stone-900 dark:border-stone-100
              shadow-[2px_2px_0_#1c1917] dark:shadow-[2px_2px_0_#f5f5f4]
              whitespace-nowrap
              pointer-events-none
              z-10
            "
          >
            {formatValue(points[hoveredIndex].value)}
            {points[hoveredIndex].label && (
              <div className="text-[10px] opacity-75 mt-0.5">
                {points[hoveredIndex].label}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Current value display */}
      <div className={`font-mono ${dim.textSize} font-bold mb-1 ${getColorClass()}`}>
        {formatValue(value)}
      </div>

      {/* Label with trend indicator */}
      <div className="flex items-center gap-1.5">
        {label && (
          <div className="font-sans text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 text-center">
            {label}
          </div>
        )}
        <span className={`text-xs font-bold ${trendIndicator.color}`}>
          {trendIndicator.symbol}
        </span>
      </div>
    </div>
  )
}

/**
 * Generate fallback data points based on trend direction
 * Used when historical data is not available
 */
function generateFallbackData(
  currentValue: number,
  trend: TrendDirection,
  count: number = 10
): SparklineDataPoint[] {
  const data: SparklineDataPoint[] = []

  // Calculate starting value based on trend
  // For 'up' trend, start lower; for 'down' trend, start higher
  const trendMultiplier = trend === 'up' ? 0.7 : trend === 'down' ? 1.3 : 1.0
  const startValue = currentValue * trendMultiplier

  // Generate points with some randomness
  for (let i = 0; i < count; i++) {
    const progress = i / (count - 1) // 0 to 1

    let value: number
    if (trend === 'up') {
      // Upward trend with some noise
      value = startValue + (currentValue - startValue) * progress + (Math.random() - 0.5) * (currentValue * 0.1)
    } else if (trend === 'down') {
      // Downward trend with some noise
      value = startValue - (startValue - currentValue) * progress + (Math.random() - 0.5) * (currentValue * 0.1)
    } else {
      // Stable trend with noise
      value = currentValue + (Math.random() - 0.5) * (currentValue * 0.15)
    }

    // Ensure last value is exactly the current value
    if (i === count - 1) {
      value = currentValue
    }

    data.push({
      value: Math.max(0, value), // Ensure non-negative
      label: `Day ${count - i}` // Simple label (most recent is Day 1)
    })
  }

  return data
}
