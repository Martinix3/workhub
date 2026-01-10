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
      <div className="relative bg-white border-2 border-stone-900 shadow-[8px_8px_0_#1c1917] w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-stone-200">
          <div className="flex items-center gap-2">
            <CheckCircle size={20} className="text-green-600" />
            <h2 className="font-serif text-lg font-bold">
              Completar Tarea
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1 hover:bg-stone-100 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Task Title */}
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              Tarea
            </label>
            <p className="text-base font-medium text-stone-900">
              {task.title}
            </p>
          </div>

          {/* Completion Notes */}
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              Notas de Cierre
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Notas de cierre (opcional)"
              rows={4}
              disabled={submitting}
              className="w-full px-3 py-2 border-2 border-stone-300 focus:border-stone-900 outline-none resize-none disabled:opacity-50 disabled:bg-stone-50"
            />
            <p className="text-xs text-stone-500 mt-1">
              Cmd/Ctrl + Enter para completar
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {/* Cancel Button */}
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2 border-2 border-stone-300 hover:border-stone-400 font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>

            {/* Complete Button */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-medium uppercase tracking-wider border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] hover:shadow-[2px_2px_0_#1c1917] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:hover:shadow-[4px_4px_0_#1c1917] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
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
