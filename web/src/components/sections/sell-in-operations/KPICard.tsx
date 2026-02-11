import type { KPI } from './types'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KPICardProps {
  kpi: KPI
  onClick?: () => void
}

export function KPICard({ kpi, onClick }: KPICardProps) {
  const isPositive = kpi.change > 0
  const isNegative = kpi.change < 0
  const isNeutral = kpi.change === 0

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`
    }
    return value.toString()
  }

  return (
    <button
      onClick={onClick}
      className="
        w-full text-left bg-white dark:bg-neutral-900
        border border-neutral-200 dark:border-neutral-100
        p-4 lg:p-6
        shadow-sm
        hover:shadow-sm
        transition-all duration-75
        group
      "
    >
      {/* Value */}
      <div className="font-mono text-3xl lg:text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
        {formatValue(kpi.value)}
      </div>

      {/* Separator */}
      <div className="w-12 h-0.5 bg-neutral-900 dark:bg-neutral-100 mb-2" />

      {/* Label */}
      <div className="font-sans text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
        {kpi.label}
      </div>

      {/* Change indicator */}
      <div className={`
        flex items-center gap-1 font-mono text-sm font-medium
        ${isPositive ? 'text-success-dark dark:text-success' : ''}
        ${isNegative ? 'text-error-dark dark:text-error' : ''}
        ${isNeutral ? 'text-neutral-400' : ''}
      `}>
        {isPositive && <TrendingUp size={14} />}
        {isNegative && <TrendingDown size={14} />}
        {isNeutral && <Minus size={14} />}
        <span>
          {isPositive && '+'}
          {kpi.change.toFixed(1)}%
        </span>
      </div>
    </button>
  )
}
