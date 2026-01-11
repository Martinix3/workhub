// TaskEditModal Component - Edit task with WorkLink suggestions
import { useState, useEffect } from 'react'
import { X, Save, Link2, Trash2, ChevronDown, ChevronUp, Search } from 'lucide-react'
import type { Task, TaskPriority, TaskStatus, WorkLinkDocType } from './types'
import { useWorkLinkSuggestions } from '../../../api/hooks/useWorkLinkSuggestions'
import { WorkLinkSuggestions } from './WorkLinkSuggestions'
import { DOCTYPE_CONFIG } from './WorkLinkSuggestions'
import workLinkSuggestionsApi from '../../../api/services/worklink-suggestions'
import { tasksApi } from '../../../api/services/tasks'

interface TaskEditModalProps {
  task: Task
  onClose: () => void
  onSave?: (task: Task) => void
  onManualSearch?: () => void
}

const priorityConfig: Record<TaskPriority, { bg: string; text: string; softBg: string }> = {
  P0: { bg: 'bg-red-500', text: 'text-red-700', softBg: 'bg-red-100' },
  P1: { bg: 'bg-amber-400', text: 'text-amber-700', softBg: 'bg-amber-100' },
  P2: { bg: 'bg-green-500', text: 'text-green-700', softBg: 'bg-green-100' },
}

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'BACKLOG', label: 'Backlog' },
  { value: 'NEXT', label: 'Siguiente' },
  { value: 'DOING', label: 'En Progreso' },
  { value: 'BLOCKED', label: 'Bloqueada' },
  { value: 'DONE', label: 'Completada' },
]

export function TaskEditModal({ task, onClose, onSave, onManualSearch }: TaskEditModalProps) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [blockedReason, setBlockedReason] = useState(task.blocked_reason || '')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedWorkLink, setSelectedWorkLink] = useState<{
    doctype: string
    docId: string
    docName?: string
    confidence: number
  } | null>(
    task.worklink && task.source_doctype && task.source_name
      ? {
          doctype: task.source_doctype,
          docId: task.source_name,
          docName: task.source_name,
          confidence: 1.0,
        }
      : null
  )

  // Only fetch suggestions if task doesn't have a WorkLink
  const hasWorkLink = task.worklink || selectedWorkLink

  // WorkLink suggestions hook
  const {
    suggestions,
    loading: suggestionsLoading,
    error: suggestionsError,
  } = useWorkLinkSuggestions({
    title,
    description,
    enabled: !hasWorkLink && (title.trim().length > 3 || description.trim().length > 10),
    debounceMs: 500,
  })

  // Auto-expand suggestions when they first appear
  useEffect(() => {
    if (suggestions.length > 0 && !showSuggestions && !hasWorkLink) {
      setShowSuggestions(true)
    }
  }, [suggestions.length, showSuggestions, hasWorkLink])

  const handleAcceptSuggestion = (doctype: string, docId: string, confidence: number) => {
    const suggestion = suggestions.find(s => s.doctype === doctype && s.doc_id === docId)
    setSelectedWorkLink({
      doctype,
      docId,
      docName: suggestion?.doc_name || docId,
      confidence,
    })
    setShowSuggestions(false)
  }

  const handleDismissSuggestion = async (doctype: string, docId: string, confidence: number) => {
    // Record dismissal for pattern learning
    try {
      await workLinkSuggestionsApi.dismissSuggestion({
        taskId: task.name,
        doctype,
        docId,
        confidence,
      })
    } catch (error) {
      console.error('Failed to record dismissal:', error)
      // Don't fail the whole operation
    }
  }

  const handleRemoveWorkLink = () => {
    setSelectedWorkLink(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return

    setIsSubmitting(true)

    try {
      // Update the task
      const updatedTask = await tasksApi.updateTask(task.name, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        status,
        blocked_reason: status === 'BLOCKED' ? blockedReason.trim() : undefined,
      })

      // Handle WorkLink changes
      if (selectedWorkLink && !task.worklink) {
        // New WorkLink - accept the suggestion
        try {
          await workLinkSuggestionsApi.acceptSuggestion({
            taskId: task.name,
            doctype: selectedWorkLink.doctype,
            docId: selectedWorkLink.docId,
            confidence: selectedWorkLink.confidence,
          })
        } catch (error) {
          console.error('Failed to link WorkLink:', error)
          // Don't fail the whole operation
        }
      } else if (!selectedWorkLink && task.worklink) {
        // WorkLink removed - update task to remove it
        try {
          await tasksApi.updateTask(task.name, {
            worklink: '',
            source_doctype: '',
            source_name: '',
          })
        } catch (error) {
          console.error('Failed to remove WorkLink:', error)
          // Don't fail the whole operation
        }
      }

      // Call the parent callback
      onSave?.(updatedTask)

      // Close the modal
      onClose()
    } catch (error) {
      console.error('Failed to update task:', error)
      // TODO: Show error to user
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-900/50 flex items-start justify-center pt-12 overflow-y-auto"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        className="bg-white border-2 border-stone-900 shadow-[8px_8px_0_#1c1917] w-full max-w-2xl mx-4 my-8"
      >
        {/* Header */}
        <div className="p-4 border-b-2 border-stone-900 flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-stone-900">Editar Tarea</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-500 hover:text-stone-900"
            title="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="¿Qué necesitas hacer?"
              autoFocus
              className="
                w-full px-4 py-3 text-lg
                border-2 border-stone-300
                focus:border-stone-900
                bg-white
                text-stone-900
                outline-none
              "
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalles adicionales..."
              rows={4}
              className="
                w-full px-4 py-3
                border-2 border-stone-300
                focus:border-stone-900
                bg-white
                text-stone-900
                outline-none
                resize-none
              "
            />
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Prioridad
              </label>
              <div className="flex gap-2">
                {(['P0', 'P1', 'P2'] as TaskPriority[]).map(p => {
                  const cfg = priorityConfig[p]
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`
                        flex-1 px-3 py-2 text-sm font-medium
                        border-2 border-stone-900
                        ${priority === p ? `${cfg.softBg} ${cfg.text}` : 'bg-white text-stone-500'}
                      `}
                    >
                      {p}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Estado
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as TaskStatus)}
                className="
                  w-full px-4 py-2
                  border-2 border-stone-900
                  bg-white
                  text-stone-900
                  outline-none
                  cursor-pointer
                "
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Blocked Reason - only show if status is BLOCKED */}
          {status === 'BLOCKED' && (
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Razón de Bloqueo
              </label>
              <input
                type="text"
                value={blockedReason}
                onChange={e => setBlockedReason(e.target.value)}
                placeholder="¿Por qué está bloqueada?"
                className="
                  w-full px-4 py-3
                  border-2 border-red-300
                  focus:border-red-500
                  bg-red-50
                  text-stone-900
                  outline-none
                "
              />
            </div>
          )}

          {/* Existing WorkLink Display */}
          {selectedWorkLink && (
            <div className="p-4 bg-green-50 border-2 border-green-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link2 size={16} className="text-green-600" />
                  <div>
                    <p className="text-xs font-medium text-green-700 uppercase tracking-wider">
                      {DOCTYPE_CONFIG[selectedWorkLink.doctype as WorkLinkDocType]?.label || selectedWorkLink.doctype}
                    </p>
                    <p className="text-sm font-medium text-green-900">
                      {selectedWorkLink.docName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveWorkLink}
                  className="
                    p-2 text-green-600 hover:text-red-600
                    hover:bg-red-50
                    border-2 border-transparent hover:border-red-300
                    transition-colors
                  "
                  title="Quitar WorkLink"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )}

          {/* WorkLink Suggestions - Only show if no existing WorkLink */}
          {!selectedWorkLink && (title.trim().length > 3 || description.trim().length > 10) && (
            <div>
              <button
                type="button"
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="
                  w-full flex items-center justify-between px-3 py-2
                  bg-stone-100 hover:bg-stone-200
                  border-2 border-stone-300
                  text-stone-700 font-medium text-sm
                  transition-colors
                "
              >
                <span className="flex items-center gap-2">
                  <Link2 size={14} />
                  Sugerencias de WorkLink
                  {suggestions.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-cyan-500 text-white text-xs font-bold rounded-full">
                      {suggestions.length}
                    </span>
                  )}
                </span>
                {showSuggestions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showSuggestions && (
                <div className="mt-2">
                  <WorkLinkSuggestions
                    suggestions={suggestions}
                    loading={suggestionsLoading}
                    error={suggestionsError}
                    onAccept={handleAcceptSuggestion}
                    onDismiss={handleDismissSuggestion}
                    onManualSearch={onManualSearch}
                    className="shadow-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* Manual Search Option */}
          {!selectedWorkLink && onManualSearch && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onManualSearch}
                className="
                  inline-flex items-center gap-2 px-4 py-2
                  text-stone-600 hover:text-stone-900
                  text-sm font-medium
                  border-2 border-stone-300 hover:border-stone-900
                  bg-white
                  transition-colors
                "
              >
                <Search size={14} />
                Buscar documento manualmente
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-stone-900 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="
              px-4 py-2
              text-stone-500 hover:text-stone-900
              font-medium
              disabled:opacity-50
            "
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            className="
              inline-flex items-center gap-2 px-4 py-2
              bg-amber-400 hover:bg-amber-500
              text-stone-900 font-medium uppercase tracking-wider text-sm
              border-2 border-stone-900
              shadow-[4px_4px_0_#1c1917]
              hover:shadow-[2px_2px_0_#1c1917]
              hover:translate-x-[2px] hover:translate-y-[2px]
              disabled:opacity-50 disabled:cursor-not-allowed
              disabled:hover:shadow-[4px_4px_0_#1c1917]
              disabled:hover:translate-x-0 disabled:hover:translate-y-0
              transition-all duration-75
            "
          >
            <Save size={16} />
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default TaskEditModal
