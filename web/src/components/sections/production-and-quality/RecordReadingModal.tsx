// HACCP Reading Recording Modal
// Allows production staff to record Critical Control Point readings with validation

import { useState, useMemo } from 'react'
import { Modal } from '../../ui/Modal'
import type { CriticalControlPoint, CCPStatus } from './types'

interface RecordReadingModalProps {
  isOpen: boolean
  onClose: () => void
  ccp: CriticalControlPoint | null
  onSubmit: (data: ReadingSubmission) => Promise<void>
}

export interface ReadingSubmission {
  ccpId: string
  value: string
  lotNumber?: string
  correctiveAction?: string
}

// Types for parsed critical limits
interface RangeLimitParsed {
  type: 'range'
  min: number
  max: number
  unit: string
}

interface ThresholdLimitParsed {
  type: 'threshold'
  operator: '<' | '>' | '<=' | '>='
  value: number
  unit: string
}

type ParsedLimit = RangeLimitParsed | ThresholdLimitParsed | null

/**
 * Parse critical limit string into structured format
 * Supports formats like: '25-32°C', '45-55%', '<300mg/L', '>10ppm'
 */
function parseCriticalLimit(limitStr: string): ParsedLimit {
  if (!limitStr) return null

  const trimmed = limitStr.trim()

  // Range format: "25-32°C" or "45-55%"
  const rangeMatch = trimmed.match(/^(\d+\.?\d*)\s*-\s*(\d+\.?\d*)(.*)$/)
  if (rangeMatch) {
    return {
      type: 'range',
      min: parseFloat(rangeMatch[1]),
      max: parseFloat(rangeMatch[2]),
      unit: rangeMatch[3].trim()
    }
  }

  // Threshold format: "<300mg/L" or ">10ppm"
  const thresholdMatch = trimmed.match(/^(<=?|>=?)\s*(\d+\.?\d*)(.*)$/)
  if (thresholdMatch) {
    return {
      type: 'threshold',
      operator: thresholdMatch[1] as '<' | '>' | '<=' | '>=',
      value: parseFloat(thresholdMatch[2]),
      unit: thresholdMatch[3].trim()
    }
  }

  return null
}

/**
 * Extract numeric value from user input
 * Handles formats like: "28.5", "28.5 C", "28.5°C", "48%"
 */
function extractNumericValue(input: string): number | null {
  if (!input) return null

  const match = input.trim().match(/^(\d+\.?\d*)/)
  if (match) {
    return parseFloat(match[1])
  }

  return null
}

/**
 * Validate reading value against parsed critical limit
 * Returns status: 'normal' | 'warning' | 'critical'
 */
function validateReading(parsedLimit: ParsedLimit, numericValue: number | null): CCPStatus {
  if (!parsedLimit || numericValue === null) {
    return 'normal'
  }

  if (parsedLimit.type === 'range') {
    if (numericValue >= parsedLimit.min && numericValue <= parsedLimit.max) {
      return 'normal'
    }
    // Out of range is critical
    return 'critical'
  }

  if (parsedLimit.type === 'threshold') {
    let withinLimit = false

    switch (parsedLimit.operator) {
      case '<':
        withinLimit = numericValue < parsedLimit.value
        break
      case '<=':
        withinLimit = numericValue <= parsedLimit.value
        break
      case '>':
        withinLimit = numericValue > parsedLimit.value
        break
      case '>=':
        withinLimit = numericValue >= parsedLimit.value
        break
    }

    return withinLimit ? 'normal' : 'critical'
  }

  return 'normal'
}

export function RecordReadingModal({
  isOpen,
  onClose,
  ccp,
  onSubmit
}: RecordReadingModalProps) {
  const [value, setValue] = useState('')
  const [lotNumber, setLotNumber] = useState('')
  const [correctiveAction, setCorrectiveAction] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Parse critical limit once
  const parsedLimit = useMemo(() => {
    return ccp ? parseCriticalLimit(ccp.criticalLimit) : null
  }, [ccp])

  // Validate reading value in real-time
  const validationStatus = useMemo(() => {
    const numericValue = extractNumericValue(value)
    return validateReading(parsedLimit, numericValue)
  }, [parsedLimit, value])

  if (!ccp) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return

    // Validate corrective action is required for out-of-range readings
    if (validationStatus === 'critical' && !correctiveAction.trim()) {
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        ccpId: ccp.id,
        value: value.trim(),
        lotNumber: lotNumber.trim() || undefined,
        correctiveAction: correctiveAction.trim() || undefined
      })

      // Reset form
      setValue('')
      setLotNumber('')
      setCorrectiveAction('')
      onClose()
    } catch (error) {
      // Error handling will be done by parent component
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Lectura HACCP"
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* CCP Information */}
        <div className="space-y-2">
          <div>
            <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
              {ccp.name}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 capitalize">
              Peligro: {ccp.hazardType}
            </p>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-800 p-3 border border-neutral-200 dark:border-neutral-700">
            <div className="text-xs uppercase tracking-wider text-neutral-400 mb-1">
              Límite Crítico
            </div>
            <div className="font-mono text-sm text-neutral-700 dark:text-neutral-300">
              {ccp.criticalLimit}
            </div>
          </div>
        </div>

        {/* Reading Value Input with Validation */}
        <div>
          <label
            htmlFor="reading-value"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
          >
            Valor de Lectura *
          </label>
          <input
            id="reading-value"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ej: 28.5 C"
            className={`
              w-full px-3 py-2
              border-2
              ${
                !value
                  ? 'border-neutral-300 dark:border-neutral-600'
                  : validationStatus === 'normal'
                  ? 'border-success-dark dark:border-success'
                  : validationStatus === 'critical'
                  ? 'border-error-dark dark:border-error'
                  : 'border-neutral-300 dark:border-neutral-600'
              }
              focus:border-neutral-900 dark:focus:border-neutral-100
              bg-white dark:bg-neutral-900
              text-neutral-900 dark:text-neutral-100
              outline-none
            `}
            disabled={submitting}
            required
          />

          {/* Validation Status Indicator */}
          {value && parsedLimit && (
            <div className="mt-2">
              {validationStatus === 'normal' ? (
                <div className="flex items-center gap-2 text-sm text-success-text dark:text-success">
                  <span className="font-bold">✓</span>
                  <span>Dentro del límite crítico</span>
                </div>
              ) : validationStatus === 'critical' ? (
                <div className="flex items-center gap-2 text-sm text-error-text dark:text-error">
                  <span className="font-bold">⚠</span>
                  <span>Fuera del límite crítico - Se requiere acción correctiva</span>
                </div>
              ) : null}
            </div>
          )}

          {/* Help text showing expected range */}
          {parsedLimit && parsedLimit.type === 'range' && (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Rango aceptable: {parsedLimit.min} - {parsedLimit.max} {parsedLimit.unit}
            </p>
          )}
          {parsedLimit && parsedLimit.type === 'threshold' && (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Límite: {parsedLimit.operator} {parsedLimit.value} {parsedLimit.unit}
            </p>
          )}
        </div>

        {/* Lot Number Input (Optional) */}
        <div>
          <label
            htmlFor="lot-number"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
          >
            Número de Lote (opcional)
          </label>
          <input
            id="lot-number"
            type="text"
            value={lotNumber}
            onChange={(e) => setLotNumber(e.target.value)}
            placeholder="Ej: LOT-2026-001"
            className="
              w-full px-3 py-2
              border-2 border-neutral-300 dark:border-neutral-600
              focus:border-neutral-900 dark:focus:border-neutral-100
              bg-white dark:bg-neutral-900
              text-neutral-900 dark:text-neutral-100
              outline-none
            "
            disabled={submitting}
          />
        </div>

        {/* Corrective Action (Required for out-of-range readings) */}
        {validationStatus === 'critical' && (
          <div className="bg-error-light dark:bg-error-dark/20 p-4 border-2 border-error dark:border-error-dark">
            <label
              htmlFor="corrective-action"
              className="block text-sm font-medium text-error-text dark:text-error mb-2"
            >
              Acción Correctiva * <span className="text-xs">(Obligatoria)</span>
            </label>

            {/* Show predefined corrective action as reference */}
            {ccp.correctiveAction && (
              <div className="mb-3 p-3 bg-white dark:bg-neutral-800 border border-error dark:border-error-dark">
                <div className="text-xs uppercase tracking-wider text-error-dark dark:text-error mb-1">
                  Acción Correctiva Definida
                </div>
                <div className="text-sm text-neutral-700 dark:text-neutral-300 italic">
                  {ccp.correctiveAction}
                </div>
              </div>
            )}

            <textarea
              id="corrective-action"
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              placeholder="Describa la acción correctiva tomada..."
              rows={4}
              className="
                w-full px-3 py-2
                border-2 border-error dark:border-error-dark
                focus:border-error-dark dark:focus:border-error-dark
                bg-white dark:bg-neutral-900
                text-neutral-900 dark:text-neutral-100
                outline-none
                resize-vertical
              "
              disabled={submitting}
              required
            />
            <p className="mt-2 text-xs text-error-text dark:text-error">
              Este campo es obligatorio porque la lectura está fuera del límite crítico.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="
              flex-1 px-4 py-2
              border-2 border-neutral-300 dark:border-neutral-600
              text-neutral-700 dark:text-neutral-300
              hover:bg-neutral-100 dark:hover:bg-neutral-800
              transition-colors
              disabled:opacity-50
            "
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={
              submitting ||
              !value.trim() ||
              (validationStatus === 'critical' && !correctiveAction.trim())
            }
            className="
              flex-1 px-4 py-2
              bg-gold hover:bg-gold-dark
              text-neutral-900
              font-medium uppercase tracking-wider
              border border-neutral-200
              shadow-sm
              hover:shadow-sm
              transition-all
              disabled:opacity-50
            "
          >
            {submitting ? 'Guardando...' : 'Guardar Lectura'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
