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
        bg-white dark:bg-stone-900
        border-2 border-stone-900 dark:border-stone-100
        shadow-[6px_6px_0_#1c1917] dark:shadow-[6px_6px_0_#f5f5f4]
        p-4 pr-3
        flex items-center gap-4
        min-w-[400px] max-w-[500px]
      ">
        {/* Success Icon */}
        <div className="flex-shrink-0">
          <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-stone-900 dark:text-stone-100">
            {operationLabel}
          </p>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
            {message}
          </p>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-400 dark:border-amber-600">
          <Clock size={14} className="text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-bold text-amber-700 dark:text-amber-400 tabular-nums">
            {timeRemaining}s
          </span>
        </div>

        {/* Undo Button */}
        <button
          onClick={handleUndo}
          disabled={!undoAvailable}
          className={`
            px-3 py-1.5
            border-2 border-stone-900 dark:border-stone-100
            font-medium text-xs uppercase tracking-wider
            transition-all
            shadow-[2px_2px_0_#1c1917] dark:shadow-[2px_2px_0_#f5f5f4]
            flex items-center gap-1.5
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
            hover:bg-stone-100 dark:hover:bg-stone-800
            transition-colors
            rounded
          "
          title="Cerrar"
        >
          <X size={16} className="text-stone-500" />
        </button>
      </div>
    </div>
  )
}

export default UndoToast
