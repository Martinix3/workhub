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
            ? 'bg-green-50 dark:bg-green-950/20 border-green-500 dark:border-green-700'
            : hasFailures
              ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-500 dark:border-amber-700'
              : 'bg-blue-50 dark:bg-blue-950/20 border-blue-500 dark:border-blue-700'
          }
        `}>
          <div className="flex-shrink-0">
            {isFullSuccess ? (
              <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
            ) : (
              <XCircle size={24} className="text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-bold text-stone-900 dark:text-stone-100">
              {isFullSuccess
                ? '¡Operación completada con éxito!'
                : hasFailures
                  ? 'Operación completada con errores'
                  : 'Operación completada'}
            </p>
            <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
              {result.success_count} de {result.total} {result.total === 1 ? 'tarea procesada' : 'tareas procesadas'} correctamente
            </p>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-stone-100 dark:bg-stone-800 border-2 border-stone-900 dark:border-stone-100 p-4">
            <div className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              {result.total}
            </div>
            <div className="text-xs text-stone-600 dark:text-stone-400 uppercase tracking-wider mt-1">
              Total
            </div>
          </div>
          <div className="bg-green-100 dark:bg-green-950/30 border-2 border-green-600 dark:border-green-500 p-4">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {result.success_count}
            </div>
            <div className="text-xs text-green-700 dark:text-green-400 uppercase tracking-wider mt-1">
              Exitosas
            </div>
          </div>
          <div className="bg-red-100 dark:bg-red-950/30 border-2 border-red-600 dark:border-red-500 p-4">
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {result.failure_count}
            </div>
            <div className="text-xs text-red-700 dark:text-red-400 uppercase tracking-wider mt-1">
              Fallidas
            </div>
          </div>
        </div>

        {/* Failures List */}
        {hasFailures && (
          <div className="space-y-3">
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm uppercase tracking-wider">
              Tareas con errores:
            </h3>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {result.results.failed.map((failure, index) => (
                <div
                  key={index}
                  className="
                    bg-red-50 dark:bg-red-950/20
                    border-2 border-red-200 dark:border-red-800
                    p-3
                  "
                >
                  <div className="flex items-start gap-3">
                    <XCircle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs text-stone-900 dark:text-stone-100 font-bold truncate">
                        {failure.task_id}
                      </div>
                      <div className="text-sm text-red-700 dark:text-red-300 mt-1">
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
            bg-amber-50 dark:bg-amber-950/20
            border-2 border-amber-300 dark:border-amber-700
            p-4
            space-y-3
          ">
            <div className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
              <Clock size={16} className="text-amber-600" />
              <span className="font-medium">
                Tiempo restante para deshacer:{' '}
                <span className="font-bold text-amber-700 dark:text-amber-400">
                  {timeRemaining}s
                </span>
              </span>
            </div>
            <button
              onClick={handleUndo}
              disabled={!undoAvailable}
              className={`
                w-full px-6 py-2.5
                border-2 border-stone-900 dark:border-stone-100
                font-medium text-sm uppercase tracking-wider
                transition-all
                shadow-[2px_2px_0_#1c1917] dark:shadow-[2px_2px_0_#f5f5f4]
                flex items-center justify-center gap-2
                ${undoAvailable
                  ? `
                    bg-amber-400 text-stone-900
                    hover:bg-amber-500
                    hover:shadow-[1px_1px_0_#1c1917] dark:hover:shadow-[1px_1px_0_#f5f5f4]
                    hover:translate-x-[1px] hover:translate-y-[1px]
                    active:shadow-none
                    active:translate-x-[2px] active:translate-y-[2px]
                  `
                  : `
                    bg-stone-200 dark:bg-stone-700
                    text-stone-400 dark:text-stone-500
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
              bg-white dark:bg-stone-800
              border-2 border-stone-900 dark:border-stone-100
              font-medium text-sm text-stone-900 dark:text-stone-100
              uppercase tracking-wider
              hover:bg-stone-50 dark:hover:bg-stone-700
              transition-all
              shadow-[2px_2px_0_#1c1917] dark:shadow-[2px_2px_0_#f5f5f4]
              hover:shadow-[1px_1px_0_#1c1917] dark:hover:shadow-[1px_1px_0_#f5f5f4]
              hover:translate-x-[1px] hover:translate-y-[1px]
              active:shadow-none
              active:translate-x-[2px] active:translate-y-[2px]
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
