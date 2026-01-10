import { useState, useCallback, useEffect } from 'react'
import { X, AlertCircle } from 'lucide-react'

interface BlockedReasonModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  taskName?: string
}

export function BlockedReasonModal({
  isOpen,
  onClose,
  onConfirm,
  taskName
}: BlockedReasonModalProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setReason('')
        setError('')
      }, 300)
    }
  }, [isOpen])

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const handleConfirm = useCallback(() => {
    const trimmedReason = reason.trim()

    if (!trimmedReason) {
      setError('Please provide a reason for blocking this task')
      return
    }

    if (trimmedReason.length < 10) {
      setError('Reason must be at least 10 characters')
      return
    }

    onConfirm(trimmedReason)
    onClose()
  }, [reason, onConfirm, onClose])

  const handleCancel = useCallback(() => {
    onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 shadow-[8px_8px_0_#1c1917] dark:shadow-[8px_8px_0_#f5f5f4] w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-stone-200 dark:border-stone-700">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} className="text-amber-500" />
            <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
              Task Blocked
            </h2>
          </div>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X size={20} className="text-stone-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {taskName && (
            <p className="text-sm text-stone-600 dark:text-stone-400">
              You're blocking: <span className="font-medium text-stone-900 dark:text-stone-100">{taskName}</span>
            </p>
          )}

          <div className="space-y-2">
            <label
              htmlFor="blocked-reason"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Why is this task blocked?
            </label>
            <textarea
              id="blocked-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setError('')
              }}
              placeholder="E.g., Waiting for client feedback, missing dependencies, technical blocker..."
              rows={4}
              className="w-full px-3 py-2 border-2 border-stone-300 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 focus:border-stone-900 dark:focus:border-stone-100 outline-none resize-none transition-colors"
              autoFocus
            />
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Minimum 10 characters. Be specific to help your team understand the blocker.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2 border-2 border-stone-300 dark:border-stone-600 hover:border-stone-400 dark:hover:border-stone-500 text-stone-700 dark:text-stone-300 font-medium uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!reason.trim()}
              className="flex-1 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-medium uppercase tracking-wider border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] hover:shadow-[2px_2px_0_#1c1917] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[4px_4px_0_#1c1917] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
            >
              Block Task
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
