import { useState, useEffect } from 'react'
import { Target, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import type { ThresholdConfig, ValueType } from '../../types/custom-kpi'

interface ThresholdEditorProps {
  /** Current threshold configuration */
  value: ThresholdConfig
  /** Callback when thresholds change */
  onChange: (thresholds: ThresholdConfig) => void
  /** Value type for formatting hints */
  valueType?: ValueType
  /** Optional current value to show on preview */
  currentValue?: number
  /** Higher is better (target > warning > critical) or lower is better (target < warning < critical) */
  higherIsBetter?: boolean
}

/**
 * Form inputs for setting target, warning, and critical threshold values
 * with visual preview showing threshold zones
 */
export function ThresholdEditor({
  value,
  onChange,
  valueType = 'number',
  currentValue,
  higherIsBetter = true
}: ThresholdEditorProps) {
  const [target, setTarget] = useState(value.target_value?.toString() || '')
  const [warning, setWarning] = useState(value.warning_threshold?.toString() || '')
  const [critical, setCritical] = useState(value.critical_threshold?.toString() || '')
  const [validationError, setValidationError] = useState<string | null>(null)

  // Update local state when value prop changes
  useEffect(() => {
    setTarget(value.target_value?.toString() || '')
    setWarning(value.warning_threshold?.toString() || '')
    setCritical(value.critical_threshold?.toString() || '')
  }, [value])

  // Validate thresholds
  const validateThresholds = (
    targetVal: number | null,
    warningVal: number | null,
    criticalVal: number | null
  ): string | null => {
    // All values are optional
    if (targetVal === null && warningVal === null && criticalVal === null) {
      return null
    }

    if (higherIsBetter) {
      // For "higher is better" metrics: target > warning > critical
      if (criticalVal !== null && warningVal !== null && criticalVal >= warningVal) {
        return 'Critical threshold must be less than warning threshold'
      }
      if (warningVal !== null && targetVal !== null && warningVal >= targetVal) {
        return 'Warning threshold must be less than target value'
      }
      if (criticalVal !== null && targetVal !== null && criticalVal >= targetVal) {
        return 'Critical threshold must be less than target value'
      }
    } else {
      // For "lower is better" metrics: target < warning < critical
      if (warningVal !== null && criticalVal !== null && warningVal >= criticalVal) {
        return 'Warning threshold must be less than critical threshold'
      }
      if (targetVal !== null && warningVal !== null && targetVal >= warningVal) {
        return 'Target value must be less than warning threshold'
      }
      if (targetVal !== null && criticalVal !== null && targetVal >= criticalVal) {
        return 'Target value must be less than critical threshold'
      }
    }

    return null
  }

  const handleChange = (field: 'target' | 'warning' | 'critical', rawValue: string) => {
    // Update local state
    if (field === 'target') setTarget(rawValue)
    if (field === 'warning') setWarning(rawValue)
    if (field === 'critical') setCritical(rawValue)

    // Parse values
    const targetVal = field === 'target' ? parseFloat(rawValue) : parseFloat(target)
    const warningVal = field === 'warning' ? parseFloat(rawValue) : parseFloat(warning)
    const criticalVal = field === 'critical' ? parseFloat(rawValue) : parseFloat(critical)

    // Convert NaN to null
    const targetNum = isNaN(targetVal) ? null : targetVal
    const warningNum = isNaN(warningVal) ? null : warningVal
    const criticalNum = isNaN(criticalVal) ? null : criticalVal

    // Validate
    const error = validateThresholds(targetNum, warningNum, criticalNum)
    setValidationError(error)

    // Update parent if valid
    if (!error) {
      onChange({
        target_value: targetNum,
        warning_threshold: warningNum,
        critical_threshold: criticalNum
      })
    }
  }

  const getInputPrefix = (): string => {
    switch (valueType) {
      case 'currency':
        return '$'
      case 'percent':
        return ''
      default:
        return ''
    }
  }

  const getInputSuffix = (): string => {
    return valueType === 'percent' ? '%' : ''
  }

  // Calculate visual preview positions
  const getPreviewPositions = () => {
    const targetNum = parseFloat(target)
    const warningNum = parseFloat(warning)
    const criticalNum = parseFloat(critical)

    const values = [targetNum, warningNum, criticalNum, currentValue].filter(v => !isNaN(v!))
    if (values.length === 0) return null

    const minVal = Math.min(...values)
    const maxVal = Math.max(...values)
    const range = maxVal - minVal || 1 // Avoid division by zero

    const normalize = (val: number) => ((val - minVal) / range) * 100

    return {
      target: !isNaN(targetNum) ? normalize(targetNum) : null,
      warning: !isNaN(warningNum) ? normalize(warningNum) : null,
      critical: !isNaN(criticalNum) ? normalize(criticalNum) : null,
      current: currentValue !== undefined && !isNaN(currentValue) ? normalize(currentValue) : null,
      min: minVal,
      max: maxVal
    }
  }

  const positions = getPreviewPositions()

  return (
    <div className="space-y-4">
      {/* Label */}
      <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
        <Target size={16} />
        <span className="text-xs uppercase tracking-wider font-semibold">Thresholds</span>
      </div>

      {/* Info message */}
      <div className="flex items-start gap-2 p-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
        <Info size={14} className="text-stone-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-stone-600 dark:text-stone-400">
          {higherIsBetter ? (
            <>Define thresholds where <strong>higher values are better</strong>. Target should be the goal, with warning and critical levels below it.</>
          ) : (
            <>Define thresholds where <strong>lower values are better</strong>. Target should be the goal, with warning and critical levels above it.</>
          )}
        </p>
      </div>

      {/* Input fields */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Target Value */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-medium text-stone-700 dark:text-stone-300">
            <Target size={12} className="text-green-600 dark:text-green-400" />
            Target
          </label>
          <div className="relative">
            {getInputPrefix() && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-mono text-sm">
                {getInputPrefix()}
              </span>
            )}
            <input
              type="number"
              step="any"
              value={target}
              onChange={(e) => handleChange('target', e.target.value)}
              placeholder="Optional"
              className={`
                w-full py-2 font-mono text-sm
                ${getInputPrefix() ? 'pl-7 pr-3' : 'px-3'}
                ${getInputSuffix() ? 'pr-8' : ''}
                bg-white dark:bg-stone-800
                border-2 border-stone-900 dark:border-stone-100
                text-stone-900 dark:text-stone-100
                placeholder:text-stone-400
                focus:outline-none focus:ring-0
                focus:border-green-600 dark:focus:border-green-400
              `}
            />
            {getInputSuffix() && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 font-mono text-sm">
                {getInputSuffix()}
              </span>
            )}
          </div>
        </div>

        {/* Warning Threshold */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-medium text-stone-700 dark:text-stone-300">
            <AlertTriangle size={12} className="text-amber-600 dark:text-amber-400" />
            Warning
          </label>
          <div className="relative">
            {getInputPrefix() && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-mono text-sm">
                {getInputPrefix()}
              </span>
            )}
            <input
              type="number"
              step="any"
              value={warning}
              onChange={(e) => handleChange('warning', e.target.value)}
              placeholder="Optional"
              className={`
                w-full py-2 font-mono text-sm
                ${getInputPrefix() ? 'pl-7 pr-3' : 'px-3'}
                ${getInputSuffix() ? 'pr-8' : ''}
                bg-white dark:bg-stone-800
                border-2 border-stone-900 dark:border-stone-100
                text-stone-900 dark:text-stone-100
                placeholder:text-stone-400
                focus:outline-none focus:ring-0
                focus:border-amber-600 dark:focus:border-amber-400
              `}
            />
            {getInputSuffix() && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 font-mono text-sm">
                {getInputSuffix()}
              </span>
            )}
          </div>
        </div>

        {/* Critical Threshold */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-medium text-stone-700 dark:text-stone-300">
            <AlertCircle size={12} className="text-red-600 dark:text-red-400" />
            Critical
          </label>
          <div className="relative">
            {getInputPrefix() && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-mono text-sm">
                {getInputPrefix()}
              </span>
            )}
            <input
              type="number"
              step="any"
              value={critical}
              onChange={(e) => handleChange('critical', e.target.value)}
              placeholder="Optional"
              className={`
                w-full py-2 font-mono text-sm
                ${getInputPrefix() ? 'pl-7 pr-3' : 'px-3'}
                ${getInputSuffix() ? 'pr-8' : ''}
                bg-white dark:bg-stone-800
                border-2 border-stone-900 dark:border-stone-100
                text-stone-900 dark:text-stone-100
                placeholder:text-stone-400
                focus:outline-none focus:ring-0
                focus:border-red-600 dark:focus:border-red-400
              `}
            />
            {getInputSuffix() && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 font-mono text-sm">
                {getInputSuffix()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-600 dark:border-red-400">
          <AlertCircle size={14} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-300 font-medium">
            {validationError}
          </p>
        </div>
      )}

      {/* Visual preview */}
      {positions && !validationError && (
        <div className="space-y-3 pt-2">
          <div className="text-xs uppercase tracking-wider font-medium text-stone-600 dark:text-stone-400">
            Visual Preview
          </div>

          {/* Bar with threshold markers */}
          <div className="relative h-12 bg-stone-100 dark:bg-stone-800 border-2 border-stone-900 dark:border-stone-100">
            {/* Critical zone (left for higher-is-better, right for lower-is-better) */}
            {positions.critical !== null && (
              <div
                className="absolute top-0 bottom-0 bg-red-200 dark:bg-red-900/30"
                style={
                  higherIsBetter
                    ? { left: 0, width: `${positions.critical}%` }
                    : { right: 0, width: `${100 - positions.critical}%` }
                }
              />
            )}

            {/* Warning zone */}
            {positions.warning !== null && positions.critical !== null && (
              <div
                className="absolute top-0 bottom-0 bg-amber-200 dark:bg-amber-900/30"
                style={
                  higherIsBetter
                    ? { left: `${positions.critical}%`, width: `${positions.warning - positions.critical}%` }
                    : { left: `${positions.warning}%`, width: `${positions.critical - positions.warning}%` }
                }
              />
            )}

            {/* Target marker */}
            {positions.target !== null && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-green-600 dark:bg-green-400 z-10"
                style={{ left: `${positions.target}%` }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                  <Target size={12} className="text-green-600 dark:text-green-400" />
                </div>
              </div>
            )}

            {/* Warning marker */}
            {positions.warning !== null && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-600 dark:bg-amber-400 z-10"
                style={{ left: `${positions.warning}%` }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                  <AlertTriangle size={12} className="text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            )}

            {/* Critical marker */}
            {positions.critical !== null && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-600 dark:bg-red-400 z-10"
                style={{ left: `${positions.critical}%` }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                  <AlertCircle size={12} className="text-red-600 dark:text-red-400" />
                </div>
              </div>
            )}

            {/* Current value marker (if provided) */}
            {positions.current !== null && (
              <div
                className="absolute top-0 bottom-0 w-1 bg-stone-900 dark:bg-stone-100 z-20"
                style={{ left: `${positions.current}%` }}
              >
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-stone-900 dark:text-stone-100 whitespace-nowrap">
                  Current
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {positions.target !== null && (
              <div className="flex items-center gap-1.5">
                <Target size={10} className="text-green-600 dark:text-green-400" />
                <span className="text-stone-600 dark:text-stone-400">
                  Target: <span className="font-mono font-medium text-stone-900 dark:text-stone-100">{target}</span>
                </span>
              </div>
            )}
            {positions.warning !== null && (
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={10} className="text-amber-600 dark:text-amber-400" />
                <span className="text-stone-600 dark:text-stone-400">
                  Warning: <span className="font-mono font-medium text-stone-900 dark:text-stone-100">{warning}</span>
                </span>
              </div>
            )}
            {positions.critical !== null && (
              <div className="flex items-center gap-1.5">
                <AlertCircle size={10} className="text-red-600 dark:text-red-400" />
                <span className="text-stone-600 dark:text-stone-400">
                  Critical: <span className="font-mono font-medium text-stone-900 dark:text-stone-100">{critical}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
