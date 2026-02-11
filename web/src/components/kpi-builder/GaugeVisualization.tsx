import type { ValueType, KPIStatus } from '../../types/custom-kpi'

interface GaugeVisualizationProps {
  /** Current value to display */
  value: number
  /** Target value (100% on gauge) */
  targetValue?: number
  /** Warning threshold for coloring */
  warningThreshold?: number
  /** Critical threshold for coloring */
  criticalThreshold?: number
  /** Value type for formatting */
  valueType?: ValueType
  /** Status for color coding (overrides threshold calculation) */
  status?: KPIStatus
  /** Label to display below gauge */
  label?: string
  /** Size of the gauge */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to animate the gauge fill */
  animated?: boolean
}

/**
 * SVG gauge visualization for KPIs with threshold coloring
 * Displays a circular arc gauge with color zones for ok/warning/critical states
 */
export function GaugeVisualization({
  value,
  targetValue,
  warningThreshold,
  criticalThreshold,
  valueType = 'number',
  status,
  label,
  size = 'md',
  animated = true
}: GaugeVisualizationProps) {
  // Calculate percentage for gauge (0-100)
  let percentage = 0
  if (targetValue && targetValue > 0) {
    percentage = Math.min(100, Math.max(0, (value / targetValue) * 100))
  } else {
    percentage = 50 // Default if no target
  }

  // Calculate arc length (220 is max arc length for a semicircle gauge)
  const maxArc = 220
  const arcLength = (percentage / 100) * maxArc

  // Determine status based on thresholds if not provided
  const gaugeStatus: KPIStatus = status || calculateStatus(
    value,
    targetValue,
    warningThreshold,
    criticalThreshold
  )

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

  // Get status color class
  const getStatusColor = () => {
    switch (gaugeStatus) {
      case 'ok':
        return 'text-success-dark dark:text-success'
      case 'warning':
        return 'text-gold-dark dark:text-gold'
      case 'critical':
        return 'text-error-dark dark:text-error'
      default:
        return 'text-neutral-500 dark:text-neutral-400'
    }
  }

  // Get size dimensions
  const dimensions = {
    sm: { width: 80, height: 80, viewBox: '0 0 100 100', textSize: 'text-lg' },
    md: { width: 120, height: 120, viewBox: '0 0 100 100', textSize: 'text-2xl' },
    lg: { width: 160, height: 160, viewBox: '0 0 100 100', textSize: 'text-3xl' }
  }

  const dim = dimensions[size]

  return (
    <div className="flex flex-col items-center">
      {/* Gauge SVG */}
      <svg
        width={dim.width}
        height={dim.height}
        viewBox={dim.viewBox}
        className="transform -rotate-90 mb-4"
      >
        {/* Background arc */}
        <circle
          cx="50"
          cy="50"
          r="35"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeDasharray={maxArc}
          strokeLinecap="round"
          className="text-neutral-200 dark:text-neutral-700"
        />

        {/* Color zones (optional background) */}
        {renderColorZones(maxArc, targetValue, warningThreshold, criticalThreshold)}

        {/* Value arc with animation */}
        <circle
          cx="50"
          cy="50"
          r="35"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeDasharray={`${arcLength} ${maxArc}`}
          strokeLinecap="round"
          className={`${getStatusColor()} ${animated ? 'transition-all duration-500 ease-out' : ''}`}
          style={{
            strokeDasharray: `${arcLength} ${maxArc}`
          }}
        />
      </svg>

      {/* Value display */}
      <div className={`font-mono ${dim.textSize} font-bold mb-1 ${getStatusColor()}`}>
        {formatValue(value)}
      </div>

      {/* Label */}
      {label && (
        <div className="font-sans text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 text-center">
          {label}
        </div>
      )}

      {/* Percentage to target */}
      {targetValue && (
        <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
          {percentage.toFixed(0)}% of target
        </div>
      )}
    </div>
  )
}

/**
 * Calculate status based on value and thresholds
 * Assumes "higher is better" - target > warning > critical
 */
function calculateStatus(
  value: number,
  targetValue?: number,
  warningThreshold?: number,
  criticalThreshold?: number
): KPIStatus {
  // If no thresholds defined, return neutral
  if (!targetValue && !warningThreshold && !criticalThreshold) {
    return 'ok'
  }

  // Check critical threshold (lowest)
  if (criticalThreshold !== undefined && value <= criticalThreshold) {
    return 'critical'
  }

  // Check warning threshold
  if (warningThreshold !== undefined && value <= warningThreshold) {
    return 'warning'
  }

  // Check if at or above target
  if (targetValue !== undefined && value >= targetValue) {
    return 'ok'
  }

  // Between warning and target, or above warning if no target
  if (warningThreshold !== undefined && value > warningThreshold) {
    return 'ok'
  }

  // Default to ok
  return 'ok'
}

/**
 * Render optional color zones on the gauge background
 * This shows the threshold zones visually
 */
function renderColorZones(
  maxArc: number,
  targetValue?: number,
  warningThreshold?: number,
  criticalThreshold?: number
): JSX.Element | null {
  // Skip if no thresholds defined
  if (!targetValue || !warningThreshold || !criticalThreshold) {
    return null
  }

  // Calculate zone arcs
  // Assuming higher is better: critical (0-40%), warning (40-70%), ok (70-100%)
  const criticalArc = (criticalThreshold / targetValue) * maxArc
  const warningArc = (warningThreshold / targetValue) * maxArc
  const targetArc = maxArc

  return (
    <g className="opacity-30">
      {/* Critical zone (red) */}
      <circle
        cx="50"
        cy="50"
        r="35"
        fill="none"
        stroke="#dc2626"
        strokeWidth="10"
        strokeDasharray={`${criticalArc} ${maxArc}`}
        strokeLinecap="round"
      />

      {/* Warning zone (amber) */}
      <circle
        cx="50"
        cy="50"
        r="35"
        fill="none"
        stroke="#d97706"
        strokeWidth="10"
        strokeDasharray={`${warningArc - criticalArc} ${maxArc}`}
        strokeDashoffset={-criticalArc}
        strokeLinecap="round"
      />

      {/* Target zone (green) */}
      <circle
        cx="50"
        cy="50"
        r="35"
        fill="none"
        stroke="#16a34a"
        strokeWidth="10"
        strokeDasharray={`${targetArc - warningArc} ${maxArc}`}
        strokeDashoffset={-warningArc}
        strokeLinecap="round"
      />
    </g>
  )
}
