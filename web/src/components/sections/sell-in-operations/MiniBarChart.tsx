import type { TrendDataPoint } from './types'

interface MiniBarChartProps {
  data: TrendDataPoint[]
  title: string
}

export function MiniBarChart({ data, title }: MiniBarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))

  return (
    <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 p-4 lg:p-6">
      <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 mb-4">
        {title}
      </h3>

      <div className="flex items-end gap-2 h-32">
        {data.map((point, index) => {
          const height = (point.value / maxValue) * 100
          const isLast = index === data.length - 1

          return (
            <div key={point.period} className="flex-1 flex flex-col items-center gap-2">
              {/* Bar */}
              <div className="w-full flex items-end h-24">
                <div
                  className={`
                    w-full transition-all duration-300
                    ${isLast
                      ? 'bg-amber-400 dark:bg-amber-500'
                      : 'bg-stone-900 dark:bg-stone-100'
                    }
                  `}
                  style={{ height: `${height}%` }}
                />
              </div>

              {/* Label */}
              <span className="font-mono text-xs text-stone-500 dark:text-stone-400">
                {point.period}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
