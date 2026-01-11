import { useState, useEffect, useMemo } from 'react'
import { Search, TrendingUp, Info } from 'lucide-react'
import { useAvailableMetrics } from '../../api'
import type { KPIMetric, Department, ValueType } from '../../types/custom-kpi'

interface MetricSelectorProps {
  /** Selected metric code */
  value?: string
  /** Callback when metric is selected */
  onChange: (metric: KPIMetric | null) => void
  /** Filter metrics by department */
  department?: Department
  /** Show loading state */
  loading?: boolean
}

/**
 * Dropdown/card selector for choosing a metric from the catalog
 * Shows metric description and preview with searchable, grouped list
 */
export function MetricSelector({
  value,
  onChange,
  department,
  loading: externalLoading
}: MetricSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const { data: metrics, loading: metricsLoading } = useAvailableMetrics(department)

  const loading = externalLoading || metricsLoading

  // Find selected metric
  const selectedMetric = useMemo(
    () => metrics?.find(m => m.metric_code === value) || null,
    [metrics, value]
  )

  // Filter and group metrics by search term
  const filteredMetrics = useMemo(() => {
    if (!metrics) return []

    const filtered = searchTerm.trim()
      ? metrics.filter(m =>
          m.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.metric_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : metrics

    return filtered
  }, [metrics, searchTerm])

  // Group metrics by department
  const groupedMetrics = useMemo(() => {
    const groups: Record<Department, KPIMetric[]> = {
      'SALES': [],
      'OPS': [],
      'MKT': [],
      'ALL': []
    }

    filteredMetrics.forEach(metric => {
      groups[metric.department].push(metric)
    })

    return groups
  }, [filteredMetrics])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowDropdown(false)
    if (showDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showDropdown])

  const handleSelectMetric = (metric: KPIMetric) => {
    onChange(metric)
    setShowDropdown(false)
    setSearchTerm('')
  }

  const formatValueType = (type: ValueType): string => {
    switch (type) {
      case 'currency': return 'Currency'
      case 'percent': return 'Percentage'
      case 'number': return 'Number'
      default: return type
    }
  }

  const getDepartmentLabel = (dept: Department): string => {
    switch (dept) {
      case 'SALES': return 'Sales'
      case 'OPS': return 'Operations'
      case 'MKT': return 'Marketing'
      case 'ALL': return 'All Departments'
      default: return dept
    }
  }

  const departmentOrder: Department[] = ['ALL', 'SALES', 'OPS', 'MKT']

  return (
    <div className="space-y-2">
      {/* Label */}
      <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
        <TrendingUp size={16} />
        <span className="text-xs uppercase tracking-wider font-semibold">Metric</span>
      </div>

      {/* Selected metric display or search */}
      <div className="relative" onClick={e => e.stopPropagation()}>
        {selectedMetric && !showDropdown ? (
          <button
            type="button"
            onClick={() => setShowDropdown(true)}
            className="
              w-full text-left p-4
              bg-white dark:bg-stone-800
              border-2 border-stone-900 dark:border-stone-100
              hover:bg-stone-50 dark:hover:bg-stone-700
              transition-colors
            "
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-900 dark:text-stone-100 mb-1">
                  {selectedMetric.label}
                </p>
                {selectedMetric.description && (
                  <p className="text-sm text-stone-500 dark:text-stone-400 line-clamp-2">
                    {selectedMetric.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-stone-500 uppercase tracking-wider">
                    {getDepartmentLabel(selectedMetric.department)}
                  </span>
                  <span className="text-xs text-stone-500">•</span>
                  <span className="text-xs text-stone-500">
                    {formatValueType(selectedMetric.value_type)}
                  </span>
                </div>
              </div>
              <Info size={16} className="text-stone-400 flex-shrink-0 mt-1" />
            </div>
          </button>
        ) : (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search metrics..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
              disabled={loading}
              className="
                w-full pl-9 pr-4 py-3
                bg-white dark:bg-stone-800
                border-2 border-stone-900 dark:border-stone-100
                text-sm text-stone-900 dark:text-stone-100
                placeholder:text-stone-400
                focus:outline-none focus:ring-0
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            />
          </div>
        )}

        {/* Dropdown */}
        {showDropdown && !loading && metrics && metrics.length > 0 && (
          <div className="
            absolute top-full left-0 right-0 z-10 mt-2
            bg-white dark:bg-stone-800
            border-2 border-stone-900 dark:border-stone-100
            shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#f5f5f4]
            max-h-96 overflow-y-auto
          ">
            {filteredMetrics.length === 0 ? (
              <div className="p-4 text-center text-sm text-stone-500">
                No metrics found matching "{searchTerm}"
              </div>
            ) : (
              departmentOrder.map(dept => {
                const deptMetrics = groupedMetrics[dept]
                if (deptMetrics.length === 0) return null

                return (
                  <div key={dept} className="border-b-2 border-stone-900 dark:border-stone-100 last:border-0">
                    {/* Department header */}
                    <div className="px-4 py-2 bg-stone-100 dark:bg-stone-700">
                      <p className="text-xs uppercase tracking-wider font-semibold text-stone-600 dark:text-stone-300">
                        {getDepartmentLabel(dept)}
                      </p>
                    </div>

                    {/* Metrics in this department */}
                    {deptMetrics.map(metric => (
                      <button
                        key={metric.metric_code}
                        type="button"
                        onClick={() => handleSelectMetric(metric)}
                        className={`
                          w-full px-4 py-3 text-left
                          hover:bg-stone-50 dark:hover:bg-stone-700
                          border-b border-stone-200 dark:border-stone-600 last:border-0
                          transition-colors
                          ${value === metric.metric_code ? 'bg-amber-50 dark:bg-amber-900/20' : ''}
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-900 dark:text-stone-100 mb-0.5">
                              {metric.label}
                            </p>
                            {metric.description && (
                              <p className="text-xs text-stone-500 dark:text-stone-400 mb-1 line-clamp-2">
                                {metric.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="
                                inline-block px-1.5 py-0.5 text-[10px] uppercase tracking-wider
                                bg-stone-200 dark:bg-stone-600
                                text-stone-700 dark:text-stone-300
                                font-medium
                              ">
                                {formatValueType(metric.value_type)}
                              </span>
                              <span className="text-[10px] text-stone-400">
                                {metric.aggregation.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          {value === metric.metric_code && (
                            <div className="flex-shrink-0 mt-1">
                              <div className="w-2 h-2 bg-amber-500 rounded-full" />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Loading state */}
        {showDropdown && loading && (
          <div className="
            absolute top-full left-0 right-0 z-10 mt-2
            bg-white dark:bg-stone-800
            border-2 border-stone-900 dark:border-stone-100
            shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#f5f5f4]
            p-4
          ">
            <div className="text-sm text-stone-500 text-center">
              Loading metrics...
            </div>
          </div>
        )}

        {/* Empty state */}
        {showDropdown && !loading && (!metrics || metrics.length === 0) && (
          <div className="
            absolute top-full left-0 right-0 z-10 mt-2
            bg-white dark:bg-stone-800
            border-2 border-stone-900 dark:border-stone-100
            shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#f5f5f4]
            p-4
          ">
            <div className="text-sm text-stone-500 text-center">
              No metrics available
            </div>
          </div>
        )}
      </div>

      {/* Helper text */}
      {selectedMetric && !showDropdown && (
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Click to change metric
        </p>
      )}
    </div>
  )
}
