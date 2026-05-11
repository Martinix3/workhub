import { useEffect, useCallback, useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** Use 'destructive' for dangerous actions (red button) */
  variant?: 'default' | 'destructive'
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default'
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = useCallback(async () => {
    setIsLoading(true)
    try {
      await onConfirm()
    } finally {
      setIsLoading(false)
    }
  }, [onConfirm])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (!isLoading) onClose()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (!isLoading) handleConfirm()
    }
  }, [onClose, handleConfirm, isLoading])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  // Button styles based on variant
  const confirmButtonClass = variant === 'destructive'
    ? 'flex-1 flex items-center justify-center gap-2 py-2 bg-error hover:bg-error-dark text-white font-medium border border-neutral-200 transition-all disabled:opacity-50'
    : 'flex-1 flex items-center justify-center gap-2 py-2 bg-gold hover:bg-gold-dark text-neutral-900 font-medium border border-neutral-200 transition-all disabled:opacity-50'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={isLoading ? undefined : onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-100 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-neutral-200 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-800">
          {variant === 'destructive' && (
            <AlertCircle size={24} className="text-error-dark flex-shrink-0" />
          )}
          <h2 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {title}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2 border border-neutral-200 hover:border-neutral-400 dark:border-neutral-600 dark:hover:border-neutral-500 font-medium transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={confirmButtonClass}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Procesando...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
