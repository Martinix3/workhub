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
    <div data-testid="blocked-reason-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        data-testid="modal-backdrop"
        className="absolute inset-0 bg-black/50"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-100 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} className="text-gold-dark" />
            <h2 data-testid="modal-title" className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Task Blocked
            </h2>
          </div>
          <button
            data-testid="close-button"
            onClick={handleCancel}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={20} className="text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {taskName && (
            <p data-testid="task-name" className="text-sm text-neutral-600 dark:text-neutral-400">
              You're blocking: <span className="font-medium text-neutral-900 dark:text-neutral-100">{taskName}</span>
            </p>
          )}

          <div className="space-y-2">
            <label
              htmlFor="blocked-reason"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Why is this task blocked?
            </label>
            <textarea
              id="blocked-reason"
              data-testid="reason-input"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setError('')
              }}
              placeholder="E.g., Waiting for client feedback, missing dependencies, technical blocker..."
              rows={4}
              className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 focus:border-neutral-900 dark:focus:border-neutral-100 outline-none resize-none transition-colors"
              autoFocus
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Minimum 10 characters. Be specific to help your team understand the blocker.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div data-testid="error-message" className="p-3 bg-error-light dark:bg-error-dark/20 border border-error dark:border-error-dark text-error-text dark:text-error text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              data-testid="cancel-button"
              onClick={handleCancel}
              className="flex-1 px-4 py-2 border border-neutral-200 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500 text-neutral-700 dark:text-neutral-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              data-testid="confirm-button"
              onClick={handleConfirm}
              disabled={!reason.trim()}
              className="flex-1 px-4 py-2 bg-gold hover:bg-gold-dark text-neutral-900 font-medium border border-neutral-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Block Task
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
