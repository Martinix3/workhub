import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus, Edit2, Trash2, Users } from 'lucide-react'
import type { CustomKPI, ValueType } from '../../types/custom-kpi'
import { Modal } from '../ui/Modal'

interface CustomKPICardProps {
  /** Custom KPI to display */
  kpi: CustomKPI
  /** Optional click handler for drill-down */
  onClick?: () => void
  /** Callback when edit is requested */
  onEdit?: (kpi: CustomKPI) => void
  /** Callback when delete is requested */
  onDelete?: (kpi: CustomKPI) => void
}

/**
 * Generic card that renders any custom KPI based on its visualization type
 * Handles number, gauge, sparkline, progress variants
 */
export function CustomKPICard({ kpi, onClick, onEdit, onDelete }: CustomKPICardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Format value based on value type
  const formatValue = (value: number, valueType: ValueType): string => {
    if (valueType === 'currency') {
      if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`
      }
      if (value >= 1000) {
        return `$${(value / 1000).toFixed(0)}k`
      }
      return `$${value.toLocaleString()}`
    }
    if (valueType === 'percent') {
      return `${value.toFixed(1)}%`
    }
    return value.toLocaleString()
  }

  // Get metric metadata from metric field (metric_code is stored)
  // For now, we'll infer value_type from the formatted value
  const valueType: ValueType = kpi.formatted?.startsWith('$')
    ? 'currency'
    : kpi.formatted?.endsWith('%')
    ? 'percent'
    : 'number'

  // Get status color
  const getStatusColor = () => {
    switch (kpi.status) {
      case 'ok':
        return 'text-green-600 dark:text-green-400'
      case 'warning':
        return 'text-amber-600 dark:text-amber-400'
      case 'critical':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-stone-500 dark:text-stone-400'
    }
  }

  const getStatusBorderColor = () => {
    switch (kpi.status) {
      case 'ok':
        return 'border-green-600 dark:border-green-400'
      case 'warning':
        return 'border-amber-600 dark:border-amber-400'
      case 'critical':
        return 'border-red-600 dark:border-red-400'
      default:
        return 'border-stone-900 dark:border-stone-100'
    }
  }

  // Render trend indicator
  const renderTrend = () => {
    if (!kpi.trend) return null

    const isPositive = kpi.trend.direction === 'up'
    const isNegative = kpi.trend.direction === 'down'
    const isNeutral = kpi.trend.direction === 'stable'

    return (
      <div className={`
        flex items-center gap-1 font-mono text-sm font-medium
        ${isPositive ? 'text-green-600 dark:text-green-400' : ''}
        ${isNegative ? 'text-red-600 dark:text-red-400' : ''}
        ${isNeutral ? 'text-stone-400' : ''}
      `}>
        {isPositive && <TrendingUp size={14} />}
        {isNegative && <TrendingDown size={14} />}
        {isNeutral && <Minus size={14} />}
        <span>
          {isPositive && '+'}
          {kpi.trend.change_percent.toFixed(1)}%
        </span>
      </div>
    )
  }

  // Render visualization based on type
  const renderVisualization = () => {
    switch (kpi.visualization_type) {
      case 'number':
        return renderNumberVisualization()
      case 'gauge':
        return renderGaugeVisualization()
      case 'sparkline':
        return renderSparklineVisualization()
      case 'progress':
        return renderProgressVisualization()
      default:
        return renderNumberVisualization()
    }
  }

  const renderNumberVisualization = () => (
    <>
      {/* Value */}
      <div className={`font-mono text-3xl lg:text-4xl font-bold mb-1 ${getStatusColor()}`}>
        {kpi.formatted || formatValue(kpi.value, valueType)}
      </div>

      {/* Separator */}
      <div className="w-12 h-0.5 bg-stone-900 dark:bg-stone-100 mb-2" />

      {/* Label */}
      <div className="font-sans text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
        {kpi.title}
      </div>

      {/* Trend indicator */}
      {renderTrend()}
    </>
  )

  const renderGaugeVisualization = () => {
    // Calculate percentage for gauge (0-100)
    let percentage = 0
    if (kpi.target_value) {
      percentage = Math.min(100, Math.max(0, (kpi.value / kpi.target_value) * 100))
    } else {
      percentage = 50 // Default if no target
    }

    // Calculate arc length (220 is max arc length for a semicircle gauge)
    const maxArc = 220
    const arcLength = (percentage / 100) * maxArc

    return (
      <div className="flex flex-col items-center">
        {/* Gauge */}
        <svg width="120" height="120" viewBox="0 0 100 100" className="transform -rotate-90 mb-4">
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
            className="text-stone-200 dark:text-stone-700"
          />
          {/* Value arc */}
          <circle
            cx="50"
            cy="50"
            r="35"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeDasharray={`${arcLength} ${maxArc}`}
            strokeLinecap="round"
            className={getStatusColor()}
          />
        </svg>

        {/* Value */}
        <div className={`font-mono text-2xl font-bold mb-1 ${getStatusColor()}`}>
          {kpi.formatted || formatValue(kpi.value, valueType)}
        </div>

        {/* Label */}
        <div className="font-sans text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 text-center">
          {kpi.title}
        </div>
      </div>
    )
  }

  const renderSparklineVisualization = () => {
    // Generate simple sparkline data (we don't have historical data yet)
    // For now, show a simple trend line based on current trend
    const points = kpi.trend
      ? generateSparklinePoints(kpi.trend.direction)
      : '0,30 14,25 28,28 42,18 56,22 70,15 84,20 100,10'

    return (
      <>
        {/* Sparkline */}
        <div className="mb-4">
          <svg width="100%" height="60" viewBox="0 0 100 40" className="w-full">
            <polyline
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={getStatusColor()}
            />
            {/* Current value dot at end */}
            <circle
              cx="100"
              cy={points.split(' ').pop()?.split(',')[1] || '10'}
              r="3"
              fill="currentColor"
              className={getStatusColor()}
            />
          </svg>
        </div>

        {/* Value */}
        <div className={`font-mono text-2xl font-bold mb-1 ${getStatusColor()}`}>
          {kpi.formatted || formatValue(kpi.value, valueType)}
        </div>

        {/* Label */}
        <div className="font-sans text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
          {kpi.title}
        </div>

        {/* Trend */}
        {renderTrend()}
      </>
    )
  }

  const renderProgressVisualization = () => {
    // Calculate percentage toward target
    let percentage = 0
    let progressText = 'No target set'

    if (kpi.target_value) {
      percentage = Math.min(100, Math.max(0, (kpi.value / kpi.target_value) * 100))
      progressText = `${percentage.toFixed(0)}% to goal`
    }

    return (
      <>
        {/* Value */}
        <div className={`font-mono text-2xl font-bold mb-2 ${getStatusColor()}`}>
          {kpi.formatted || formatValue(kpi.value, valueType)}
        </div>

        {/* Label */}
        <div className="font-sans text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
          {kpi.title}
        </div>

        {/* Progress bar */}
        <div className="w-full mb-2">
          <div className="w-full h-4 bg-stone-200 dark:bg-stone-700 border-2 border-stone-900 dark:border-stone-100">
            <div
              className={`h-full transition-all ${getStatusColor().replace('text-', 'bg-')}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Progress text */}
        <div className="text-xs text-stone-500 dark:text-stone-400">
          {progressText}
          {kpi.target_value && ` (${formatValue(kpi.target_value, valueType)})`}
        </div>
      </>
    )
  }

  // Generate sparkline points based on trend direction
  const generateSparklinePoints = (direction: 'up' | 'down' | 'stable'): string => {
    if (direction === 'up') {
      return '0,35 14,32 28,28 42,25 56,20 70,15 84,12 100,8'
    } else if (direction === 'down') {
      return '0,8 14,12 28,15 42,20 56,25 70,28 84,32 100,35'
    } else {
      return '0,20 14,22 28,19 42,21 56,20 70,22 84,19 100,20'
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onEdit) {
      onEdit(kpi)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    if (onDelete) {
      onDelete(kpi)
    }
    setShowDeleteConfirm(false)
  }

  // Render error state
  if (kpi.error) {
    return (
      <div className="
        relative
        bg-white dark:bg-stone-900
        border-2 border-red-600 dark:border-red-400
        p-4 lg:p-6
        shadow-[4px_4px_0_#dc2626] dark:shadow-[4px_4px_0_#f87171]
      ">
        <div className="font-mono text-sm font-bold text-red-600 dark:text-red-400 mb-2">
          Error
        </div>
        <div className="text-xs text-stone-600 dark:text-stone-400 mb-2">
          {kpi.title}
        </div>
        <div className="text-xs text-red-600 dark:text-red-400">
          {kpi.error}
        </div>

        {/* Actions for owner */}
        {kpi.is_owned && (
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleEdit}
              className="text-xs text-stone-600 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={handleDelete}
              className="text-xs text-stone-600 dark:text-stone-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div
        onClick={onClick}
        className={`
          relative
          bg-white dark:bg-stone-900
          border-2 ${getStatusBorderColor()}
          p-4 lg:p-6
          shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9]
          ${onClick ? 'hover:shadow-[2px_2px_0_#1c1917] dark:hover:shadow-[2px_2px_0_#fafaf9] hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer' : ''}
          transition-all duration-75
          group
        `}
      >
        {/* Shared indicator */}
        {!kpi.is_owned && (
          <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
            <Users size={12} />
            <span className="hidden lg:inline">Shared</span>
          </div>
        )}

        {/* Visualization */}
        {renderVisualization()}

        {/* Actions for owner */}
        {kpi.is_owned && (onEdit || onDelete) && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-stone-200 dark:border-stone-700">
            {onEdit && (
              <button
                onClick={handleEdit}
                className="flex items-center gap-1 px-2 py-1 text-xs text-stone-600 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10 border border-stone-300 dark:border-stone-600 transition-colors"
              >
                <Edit2 size={12} />
                <span>Edit</span>
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1 px-2 py-1 text-xs text-stone-600 dark:text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 border border-stone-300 dark:border-stone-600 transition-colors"
              >
                <Trash2 size={12} />
                <span>Delete</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete KPI"
        size="sm"
      >
        <div className="p-6">
          <p className="text-stone-700 dark:text-stone-300 mb-6">
            Are you sure you want to delete <strong>{kpi.title}</strong>? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 text-sm border-2 border-stone-900 dark:border-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 text-sm bg-red-600 text-white border-2 border-red-700 hover:bg-red-700 transition-colors shadow-[2px_2px_0_#b91c1c]"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
