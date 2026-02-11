// Task Completion Modal
// Modal for completing tasks with optional completion notes

import { useState, useCallback, useEffect } from 'react'
import { X, CheckCircle, Loader2 } from 'lucide-react'
import type { Task } from '../sections/tasks/types'

interface TaskCompletionModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
  onComplete: (taskId: string, notes?: string) => Promise<void>
}

export function TaskCompletionModal({
  isOpen,
  onClose,
  task,
  onComplete,
}: TaskCompletionModalProps) {
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Reset state when modal closes or task changes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setNotes('')
        setSubmitting(false)
      }, 300)
    }
  }, [isOpen])

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!task || submitting) return

    setSubmitting(true)
    try {
      await onComplete(task.name, notes.trim() || undefined)
      onClose()
    } catch (error) {
      // Error handling is done by parent component
      setSubmitting(false)
    }
  }, [task, notes, submitting, onComplete, onClose])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  if (!isOpen || !task) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={submitting ? undefined : onClose}
      />

      {/* Modal */}
      <div className="relative bg-white border border-neutral-200 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-neutral-200">
          <div className="flex items-center gap-2">
            <CheckCircle size={20} className="text-success-dark" />
            <h2 className="font-heading text-lg font-bold">
              Completar Tarea
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1 hover:bg-neutral-100 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Task Title */}
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">
              Tarea
            </label>
            <p className="text-base font-medium text-neutral-900">
              {task.title}
            </p>
          </div>

          {/* Completion Notes */}
          <div>
            <label className="block text-sm font-medium text-neutral-600 mb-1">
              Notas de Cierre
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Notas de cierre (opcional)"
              rows={4}
              disabled={submitting}
              className="w-full px-3 py-2 border-2 border-neutral-300 focus:border-neutral-900 outline-none resize-none disabled:opacity-50 disabled:bg-neutral-50"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Cmd/Ctrl + Enter para completar
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {/* Cancel Button */}
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2 border-2 border-neutral-300 hover:border-neutral-400 font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>

            {/* Complete Button */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-gold hover:bg-gold-dark text-neutral-900 font-medium uppercase tracking-wider border border-neutral-200 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Completando...
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  Completar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskCompletionModal
