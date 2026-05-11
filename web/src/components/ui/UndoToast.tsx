import { useState, useEffect } from 'react'
import { X, Undo, Clock, CheckCircle } from 'lucide-react'

interface UndoToastProps {
  /** Whether the toast is visible */
  isVisible: boolean
  /** Callback to dismiss the toast */
  onDismiss: () => void
  /** Callback when undo is clicked */
  onUndo: () => void
  /** Message to display (e.g., "3 tareas actualizadas") */
  message: string
  /** Optional operation label (e.g., "Estado cambiado", "Tareas asignadas") */
  operationLabel?: string
}

export function UndoToast({
  isVisible,
  onDismiss,
  onUndo,
  message,
  operationLabel = 'Operación completada'
}: UndoToastProps) {
  const [timeRemaining, setTimeRemaining] = useState(30)
  const [undoAvailable, setUndoAvailable] = useState(true)

  // Countdown timer for undo
  useEffect(() => {
    if (!isVisible) {
      // Reset state when toast becomes hidden
      setTimeRemaining(30)
      setUndoAvailable(true)
      return
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setUndoAvailable(false)
          clearInterval(timer)
          // Auto-dismiss when timer expires
          setTimeout(() => {
            onDismiss()
          }, 500)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isVisible, onDismiss])

  const handleUndo = () => {
    if (undoAvailable) {
      onUndo()
      onDismiss()
    }
  }

  // Don't render if not visible
  if (!isVisible) {
    return null
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div className="
        bg-white dark:bg-neutral-900
        border border-neutral-200 dark:border-neutral-100
        p-4 pr-3
        flex items-center gap-4
        min-w-[400px] max-w-[500px]
      ">
        {/* Success Icon */}
        <div className="flex-shrink-0">
          <CheckCircle size={24} className="text-success-dark dark:text-success" />
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
            {operationLabel}
          </p>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
            {message}
          </p>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gold-light dark:bg-gold-dark/20 border border-gold dark:border-gold-dark">
          <Clock size={14} className="text-gold-dark dark:text-gold" />
          <span className="text-xs font-bold text-gold-dark dark:text-gold tabular-nums">
            {timeRemaining}s
          </span>
        </div>

        {/* Undo Button */}
        <button
          onClick={handleUndo}
          disabled={!undoAvailable}
          className={`
            px-3 py-1.5
            border border-neutral-200 dark:border-neutral-100
            font-medium text-xs
            transition-all
            flex items-center gap-1.5
            ${undoAvailable
              ? `
                bg-gold text-neutral-900
                hover:bg-gold-dark
              `
              : `
                bg-neutral-200 dark:bg-neutral-700
                text-neutral-400 dark:text-neutral-500
                cursor-not-allowed
              `
            }
          `}
          title={undoAvailable ? 'Deshacer operación' : 'Tiempo expirado'}
        >
          <Undo size={14} />
          <span>Deshacer</span>
        </button>

        {/* Close Button */}
        <button
          onClick={onDismiss}
          className="
            p-1.5
            hover:bg-neutral-100 dark:hover:bg-neutral-800
            transition-colors
            rounded
          "
          title="Cerrar"
        >
          <X size={16} className="text-neutral-500" />
        </button>
      </div>
    </div>
  )
}

export default UndoToast
