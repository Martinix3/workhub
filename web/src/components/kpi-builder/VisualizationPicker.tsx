import { BarChart3, Activity, TrendingUp, Gauge } from 'lucide-react'
import type { VisualizationType, ValueType } from '../../types/custom-kpi'

interface VisualizationPickerProps {
  /** Selected visualization type */
  value: VisualizationType
  /** Callback when visualization type is selected */
  onChange: (type: VisualizationType) => void
  /** Optional current value to show in preview */
  currentValue?: number
  /** Value type for formatting */
  valueType?: ValueType
}

/**
 * Visual selector for KPI visualization type
 * Shows preview of each type: number card, gauge, sparkline, progress bar
 */
export function VisualizationPicker({
  value,
  onChange,
  currentValue = 75,
  valueType = 'number'
}: VisualizationPickerProps) {
  const formatValue = (val: number): string => {
    switch (valueType) {
      case 'currency':
        return `$${val.toLocaleString()}`
      case 'percent':
        return `${val}%`
      default:
        return val.toLocaleString()
    }
  }

  const visualizations: Array<{
    type: VisualizationType
    label: string
    description: string
    icon: typeof BarChart3
    preview: () => JSX.Element
  }> = [
    {
      type: 'number',
      label: 'Number Card',
      description: 'Large number display with trend indicator',
      icon: BarChart3,
      preview: () => (
        <div className="flex flex-col items-center justify-center h-24 gap-1">
          <div className="text-2xl font-bold font-mono text-stone-900 dark:text-stone-100">
            {formatValue(currentValue)}
          </div>
          <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <TrendingUp size={12} />
            <span>+12%</span>
          </div>
        </div>
      )
    },
    {
      type: 'gauge',
      label: 'Gauge',
      description: 'Circular gauge with color zones',
      icon: Gauge,
      preview: () => (
        <div className="flex items-center justify-center h-24">
          {/* Simple SVG gauge preview */}
          <svg width="80" height="80" viewBox="0 0 100 100" className="transform -rotate-90">
            {/* Background arc */}
            <circle
              cx="50"
              cy="50"
              r="35"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              strokeDasharray="220"
              strokeLinecap="round"
              className="text-stone-200 dark:text-stone-700"
            />
            {/* Value arc (75% of 220 = 165) */}
            <circle
              cx="50"
              cy="50"
              r="35"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              strokeDasharray="165 220"
              strokeLinecap="round"
              className="text-green-600 dark:text-green-400"
            />
          </svg>
        </div>
      )
    },
    {
      type: 'sparkline',
      label: 'Sparkline',
      description: 'Mini trend chart showing recent history',
      icon: Activity,
      preview: () => (
        <div className="flex items-center justify-center h-24 px-2">
          {/* Simple SVG sparkline preview */}
          <svg width="100" height="40" viewBox="0 0 100 40" className="w-full">
            <polyline
              points="0,30 14,25 28,28 42,18 56,22 70,15 84,20 100,10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-blue-600 dark:text-blue-400"
            />
            {/* Value dot at end */}
            <circle
              cx="100"
              cy="10"
              r="3"
              fill="currentColor"
              className="text-blue-600 dark:text-blue-400"
            />
          </svg>
        </div>
      )
    },
    {
      type: 'progress',
      label: 'Progress Bar',
      description: 'Horizontal bar showing percentage to goal',
      icon: TrendingUp,
      preview: () => (
        <div className="flex flex-col items-center justify-center h-24 gap-2 px-4">
          <div className="text-sm font-mono text-stone-900 dark:text-stone-100">
            {formatValue(currentValue)}
          </div>
          <div className="w-full h-3 bg-stone-200 dark:bg-stone-700 border border-stone-900 dark:border-stone-100">
            <div
              className="h-full bg-green-600 dark:bg-green-400 transition-all"
              style={{ width: '75%' }}
            />
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400">
            75% to goal
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-4">
      {/* Label */}
      <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
        <BarChart3 size={16} />
        <span className="text-xs uppercase tracking-wider font-semibold">Visualization</span>
      </div>

      {/* Visualization options grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visualizations.map((viz) => {
          const Icon = viz.icon
          const isSelected = value === viz.type

          return (
            <button
              key={viz.type}
              type="button"
              onClick={() => onChange(viz.type)}
              className={`
                relative text-left p-4
                bg-white dark:bg-stone-800
                border-2
                transition-all
                ${
                  isSelected
                    ? 'border-amber-600 dark:border-amber-400 shadow-[4px_4px_0_#d97706] dark:shadow-[4px_4px_0_#fbbf24]'
                    : 'border-stone-900 dark:border-stone-100 shadow-[2px_2px_0_#1c1917] dark:shadow-[2px_2px_0_#f5f5f4] hover:shadow-[4px_4px_0_#1c1917] dark:hover:shadow-[4px_4px_0_#f5f5f4]'
                }
              `}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="w-3 h-3 bg-amber-600 dark:bg-amber-400 rounded-full border-2 border-white dark:border-stone-800" />
                </div>
              )}

              {/* Header */}
              <div className="flex items-start gap-2 mb-3">
                <Icon
                  size={16}
                  className={`flex-shrink-0 mt-0.5 ${
                    isSelected
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-stone-500 dark:text-stone-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold mb-0.5 ${
                      isSelected
                        ? 'text-amber-900 dark:text-amber-100'
                        : 'text-stone-900 dark:text-stone-100'
                    }`}
                  >
                    {viz.label}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2">
                    {viz.description}
                  </p>
                </div>
              </div>

              {/* Preview */}
              <div
                className={`
                  border-t-2 -mx-4 px-4
                  ${
                    isSelected
                      ? 'border-amber-600 dark:border-amber-400 bg-amber-50 dark:bg-amber-900/10'
                      : 'border-stone-900 dark:border-stone-100 bg-stone-50 dark:bg-stone-900/50'
                  }
                `}
              >
                {viz.preview()}
              </div>
            </button>
          )
        })}
      </div>

      {/* Helper text */}
      <p className="text-xs text-stone-500 dark:text-stone-400">
        Choose how you want this KPI to be displayed on your dashboard
      </p>
    </div>
  )
}
