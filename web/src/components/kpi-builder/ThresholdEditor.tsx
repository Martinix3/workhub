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
      <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
        <Target size={16} />
        <span className="text-xs uppercase tracking-wider font-semibold">Thresholds</span>
      </div>

      {/* Info message */}
      <div className="flex items-start gap-2 p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
        <Info size={14} className="text-neutral-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
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
          <label className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-medium text-neutral-700 dark:text-neutral-300">
            <Target size={12} className="text-success-dark dark:text-success" />
            Target
          </label>
          <div className="relative">
            {getInputPrefix() && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-sm">
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
                bg-white dark:bg-neutral-800
                border border-neutral-200
                text-neutral-900 dark:text-neutral-100
                placeholder:text-neutral-400
                focus:outline-none focus:ring-0
                focus:border-success-dark dark:focus:border-success
              `}
            />
            {getInputSuffix() && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-sm">
                {getInputSuffix()}
              </span>
            )}
          </div>
        </div>

        {/* Warning Threshold */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-medium text-neutral-700 dark:text-neutral-300">
            <AlertTriangle size={12} className="text-gold-dark dark:text-gold" />
            Warning
          </label>
          <div className="relative">
            {getInputPrefix() && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-sm">
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
                bg-white dark:bg-neutral-800
                border border-neutral-200
                text-neutral-900 dark:text-neutral-100
                placeholder:text-neutral-400
                focus:outline-none focus:ring-0
                focus:border-gold-dark dark:focus:border-gold
              `}
            />
            {getInputSuffix() && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-sm">
                {getInputSuffix()}
              </span>
            )}
          </div>
        </div>

        {/* Critical Threshold */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-medium text-neutral-700 dark:text-neutral-300">
            <AlertCircle size={12} className="text-error-dark dark:text-error" />
            Critical
          </label>
          <div className="relative">
            {getInputPrefix() && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-sm">
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
                bg-white dark:bg-neutral-800
                border border-neutral-200
                text-neutral-900 dark:text-neutral-100
                placeholder:text-neutral-400
                focus:outline-none focus:ring-0
                focus:border-error-dark dark:focus:border-error
              `}
            />
            {getInputSuffix() && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-sm">
                {getInputSuffix()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="flex items-start gap-2 p-3 bg-error-light dark:bg-error-dark/20 border-2 border-error-dark dark:border-error">
          <AlertCircle size={14} className="text-error-dark dark:text-error flex-shrink-0 mt-0.5" />
          <p className="text-xs text-error-text dark:text-error font-medium">
            {validationError}
          </p>
        </div>
      )}

      {/* Visual preview */}
      {positions && !validationError && (
        <div className="space-y-3 pt-2">
          <div className="text-xs uppercase tracking-wider font-medium text-neutral-600 dark:text-neutral-400">
            Visual Preview
          </div>

          {/* Bar with threshold markers */}
          <div className="relative h-12 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200">
            {/* Critical zone (left for higher-is-better, right for lower-is-better) */}
            {positions.critical !== null && (
              <div
                className="absolute top-0 bottom-0 bg-error-light dark:bg-error-dark/30"
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
                className="absolute top-0 bottom-0 bg-gold-light dark:bg-gold-dark/30"
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
                className="absolute top-0 bottom-0 w-0.5 bg-success-dark dark:bg-success z-10"
                style={{ left: `${positions.target}%` }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                  <Target size={12} className="text-success-dark dark:text-success" />
                </div>
              </div>
            )}

            {/* Warning marker */}
            {positions.warning !== null && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-gold-dark dark:bg-gold z-10"
                style={{ left: `${positions.warning}%` }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                  <AlertTriangle size={12} className="text-gold-dark dark:text-gold" />
                </div>
              </div>
            )}

            {/* Critical marker */}
            {positions.critical !== null && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-error-dark dark:bg-error z-10"
                style={{ left: `${positions.critical}%` }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                  <AlertCircle size={12} className="text-error-dark dark:text-error" />
                </div>
              </div>
            )}

            {/* Current value marker (if provided) */}
            {positions.current !== null && (
              <div
                className="absolute top-0 bottom-0 w-1 bg-neutral-900 dark:bg-neutral-100 z-20"
                style={{ left: `${positions.current}%` }}
              >
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                  Current
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {positions.target !== null && (
              <div className="flex items-center gap-1.5">
                <Target size={10} className="text-success-dark dark:text-success" />
                <span className="text-neutral-600 dark:text-neutral-400">
                  Target: <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">{target}</span>
                </span>
              </div>
            )}
            {positions.warning !== null && (
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={10} className="text-gold-dark dark:text-gold" />
                <span className="text-neutral-600 dark:text-neutral-400">
                  Warning: <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">{warning}</span>
                </span>
              </div>
            )}
            {positions.critical !== null && (
              <div className="flex items-center gap-1.5">
                <AlertCircle size={10} className="text-error-dark dark:text-error" />
                <span className="text-neutral-600 dark:text-neutral-400">
                  Critical: <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">{critical}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
