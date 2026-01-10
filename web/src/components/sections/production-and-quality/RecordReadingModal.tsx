// HACCP Reading Recording Modal
// Allows production staff to record Critical Control Point readings with validation

import { useState } from 'react'
import { Modal } from '../../ui/Modal'
import type { CriticalControlPoint } from './types'

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

export function RecordReadingModal({
  isOpen,
  onClose,
  ccp,
  onSubmit
}: RecordReadingModalProps) {
  const [value, setValue] = useState('')
  const [lotNumber, setLotNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!ccp) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim()) return

    setSubmitting(true)
    try {
      await onSubmit({
        ccpId: ccp.id,
        value: value.trim(),
        lotNumber: lotNumber.trim() || undefined
      })

      // Reset form
      setValue('')
      setLotNumber('')
      onClose()
    } catch (error) {
      console.error('Error submitting reading:', error)
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
            <h3 className="font-medium text-stone-900 dark:text-stone-100">
              {ccp.name}
            </h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 capitalize">
              Peligro: {ccp.hazardType}
            </p>
          </div>

          <div className="bg-stone-50 dark:bg-stone-800 p-3 border border-stone-200 dark:border-stone-700">
            <div className="text-xs uppercase tracking-wider text-stone-400 mb-1">
              Límite Crítico
            </div>
            <div className="font-mono text-sm text-stone-700 dark:text-stone-300">
              {ccp.criticalLimit}
            </div>
          </div>
        </div>

        {/* Reading Value Input */}
        <div>
          <label
            htmlFor="reading-value"
            className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
          >
            Valor de Lectura *
          </label>
          <input
            id="reading-value"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ej: 28.5 C"
            className="
              w-full px-3 py-2
              border-2 border-stone-300 dark:border-stone-600
              focus:border-stone-900 dark:focus:border-stone-100
              bg-white dark:bg-stone-900
              text-stone-900 dark:text-stone-100
              outline-none
            "
            disabled={submitting}
            required
          />
        </div>

        {/* Lot Number Input (Optional) */}
        <div>
          <label
            htmlFor="lot-number"
            className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2"
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
              border-2 border-stone-300 dark:border-stone-600
              focus:border-stone-900 dark:focus:border-stone-100
              bg-white dark:bg-stone-900
              text-stone-900 dark:text-stone-100
              outline-none
            "
            disabled={submitting}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-stone-200 dark:border-stone-700">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="
              flex-1 px-4 py-2
              border-2 border-stone-300 dark:border-stone-600
              text-stone-700 dark:text-stone-300
              hover:bg-stone-100 dark:hover:bg-stone-800
              transition-colors
              disabled:opacity-50
            "
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting || !value.trim()}
            className="
              flex-1 px-4 py-2
              bg-amber-400 hover:bg-amber-500
              text-stone-900
              font-medium uppercase tracking-wider
              border-2 border-stone-900
              shadow-[4px_4px_0_#1c1917]
              hover:shadow-[2px_2px_0_#1c1917]
              hover:translate-x-[2px] hover:translate-y-[2px]
              transition-all
              disabled:opacity-50 disabled:hover:shadow-[4px_4px_0_#1c1917]
              disabled:hover:translate-x-0 disabled:hover:translate-y-0
            "
          >
            {submitting ? 'Guardando...' : 'Guardar Lectura'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
