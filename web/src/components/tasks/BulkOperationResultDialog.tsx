import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { CheckCircle, XCircle, Undo, Clock } from 'lucide-react'
import type { BulkOperationResult } from '../../api/services/bulk'

interface BulkOperationResultDialogProps {
  isOpen: boolean
  onClose: () => void
  result: BulkOperationResult | null
  onUndo?: (undoId: string) => void
  operationLabel?: string
}

export function BulkOperationResultDialog({
  isOpen,
  onClose,
  result,
  onUndo,
  operationLabel = 'Operación'
}: BulkOperationResultDialogProps) {
  const [timeRemaining, setTimeRemaining] = useState(30)
  const [undoAvailable, setUndoAvailable] = useState(true)

  // Countdown timer for undo
  useEffect(() => {
    if (!isOpen || !result?.undo_id) {
      setTimeRemaining(30)
      setUndoAvailable(true)
      return
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setUndoAvailable(false)
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, result?.undo_id])

  const handleUndo = () => {
    if (result?.undo_id && onUndo && undoAvailable) {
      onUndo(result.undo_id)
      onClose()
    }
  }

  if (!result) return null

  const hasFailures = result.failure_count > 0
  const isFullSuccess = result.success_count === result.total

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Resultado: ${operationLabel}`}
      size="lg"
    >
      <div className="p-6 space-y-6">
        {/* Success/Failure Summary */}
        <div className={`
          flex items-start gap-4 p-4
          border-2 ${isFullSuccess
            ? 'bg-success-light dark:bg-success-dark/20 border-success-dark dark:border-success-dark'
            : hasFailures
              ? 'bg-gold-light dark:bg-gold-dark/20 border-gold-dark dark:border-gold-dark'
              : 'bg-turquoise-light dark:bg-turquoise-dark/20 border-turquoise-dark dark:border-turquoise-dark'
          }
        `}>
          <div className="flex-shrink-0">
            {isFullSuccess ? (
              <CheckCircle size={24} className="text-success-dark dark:text-success" />
            ) : (
              <XCircle size={24} className="text-gold-dark dark:text-gold" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-bold text-neutral-900 dark:text-neutral-100">
              {isFullSuccess
                ? '¡Operación completada con éxito!'
                : hasFailures
                  ? 'Operación completada con errores'
                  : 'Operación completada'}
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              {result.success_count} de {result.total} {result.total === 1 ? 'tarea procesada' : 'tareas procesadas'} correctamente
            </p>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-100 p-4">
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {result.total}
            </div>
            <div className="text-xs text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mt-1">
              Total
            </div>
          </div>
          <div className="bg-success-light dark:bg-success-dark/30 border-2 border-success-dark dark:border-success-dark p-4">
            <div className="text-2xl font-bold text-success-text dark:text-success">
              {result.success_count}
            </div>
            <div className="text-xs text-success-text dark:text-success uppercase tracking-wider mt-1">
              Exitosas
            </div>
          </div>
          <div className="bg-error-light dark:bg-error-dark/30 border-2 border-error-dark dark:border-error-dark p-4">
            <div className="text-2xl font-bold text-error-text dark:text-error">
              {result.failure_count}
            </div>
            <div className="text-xs text-error-text dark:text-error uppercase tracking-wider mt-1">
              Fallidas
            </div>
          </div>
        </div>

        {/* Failures List */}
        {hasFailures && (
          <div className="space-y-3">
            <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm uppercase tracking-wider">
              Tareas con errores:
            </h3>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {result.results.failed.map((failure, index) => (
                <div
                  key={index}
                  className="
                    bg-error-light dark:bg-error-dark/20
                    border-2 border-error dark:border-error-dark
                    p-3
                  "
                >
                  <div className="flex items-start gap-3">
                    <XCircle size={16} className="text-error-dark dark:text-error flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs text-neutral-900 dark:text-neutral-100 font-bold truncate">
                        {failure.task_id}
                      </div>
                      <div className="text-sm text-error-text dark:text-error mt-1">
                        {failure.error}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Undo Section */}
        {result.undo_id && (
          <div className="
            bg-gold-light dark:bg-gold-dark/20
            border-2 border-gold dark:border-gold-dark
            p-4
            space-y-3
          ">
            <div className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <Clock size={16} className="text-gold-dark" />
              <span className="font-medium">
                Tiempo restante para deshacer:{' '}
                <span className="font-bold text-gold-dark dark:text-gold">
                  {timeRemaining}s
                </span>
              </span>
            </div>
            <button
              onClick={handleUndo}
              disabled={!undoAvailable}
              className={`
                w-full px-6 py-2.5
                border border-neutral-200 dark:border-neutral-100
                font-medium text-sm uppercase tracking-wider
                transition-all
                shadow-sm
                flex items-center justify-center gap-2
                ${undoAvailable
                  ? `
                    bg-gold text-neutral-900
                    hover:bg-gold-dark
                  `
                  : `
                    bg-neutral-200 dark:bg-neutral-700
                    text-neutral-400 dark:text-neutral-500
                    cursor-not-allowed
                    shadow-none
                  `
                }
              `}
            >
              <Undo size={16} />
              {undoAvailable ? 'Deshacer Operación' : 'Tiempo Expirado'}
            </button>
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="
              px-6 py-2.5
              bg-white dark:bg-neutral-800
              border border-neutral-200 dark:border-neutral-100
              font-medium text-sm text-neutral-900 dark:text-neutral-100
              uppercase tracking-wider
              hover:bg-neutral-50 dark:hover:bg-neutral-700
              transition-all
              shadow-sm
            "
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default BulkOperationResultDialog
