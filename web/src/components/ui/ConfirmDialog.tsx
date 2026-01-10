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
    ? 'flex-1 flex items-center justify-center gap-2 py-2 bg-red-500 hover:bg-red-600 text-white font-medium uppercase tracking-wider border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] hover:shadow-[2px_2px_0_#1c1917] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:hover:shadow-[4px_4px_0_#1c1917] disabled:hover:translate-x-0 disabled:hover:translate-y-0'
    : 'flex-1 flex items-center justify-center gap-2 py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-medium uppercase tracking-wider border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] hover:shadow-[2px_2px_0_#1c1917] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:hover:shadow-[4px_4px_0_#1c1917] disabled:hover:translate-x-0 disabled:hover:translate-y-0'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={isLoading ? undefined : onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 shadow-[8px_8px_0_#1c1917] dark:shadow-[8px_8px_0_#f5f5f4] w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b-2 border-stone-900 dark:border-stone-100 bg-stone-50 dark:bg-stone-800">
          {variant === 'destructive' && (
            <AlertCircle size={24} className="text-red-600 flex-shrink-0" />
          )}
          <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
            {title}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-stone-700 dark:text-stone-300 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t-2 border-stone-200 dark:border-stone-700">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2 border-2 border-stone-300 hover:border-stone-400 dark:border-stone-600 dark:hover:border-stone-500 font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
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
