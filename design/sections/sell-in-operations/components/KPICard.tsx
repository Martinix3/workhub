import type { KPI } from '../types'
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
        w-full text-left bg-white dark:bg-stone-900
        border-2 border-stone-900 dark:border-stone-100
        p-4 lg:p-6
        shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9]
        hover:shadow-[2px_2px_0_#1c1917] dark:hover:shadow-[2px_2px_0_#fafaf9]
        hover:translate-x-[2px] hover:translate-y-[2px]
        transition-all duration-75
        group
      "
    >
      {/* Value */}
      <div className="font-mono text-3xl lg:text-4xl font-bold text-stone-900 dark:text-stone-100 mb-1">
        {formatValue(kpi.value)}
      </div>

      {/* Separator */}
      <div className="w-12 h-0.5 bg-stone-900 dark:bg-stone-100 mb-2" />

      {/* Label */}
      <div className="font-sans text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
        {kpi.label}
      </div>

      {/* Change indicator */}
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
          {kpi.change.toFixed(1)}%
        </span>
      </div>
    </button>
  )
}
