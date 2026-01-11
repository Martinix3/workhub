// Quick Task Modal
// Modal for rapid task creation without navigating away from current view

import { useState, useCallback, useEffect } from 'react'
import { X, Loader2, CheckCircle, AlertCircle, Calendar, Zap } from 'lucide-react'
import { useQuickTask, useQuickTaskOptions, useWorkLinkSuggestions } from '../../api/hooks/useQuickTask'
import { WorkLinkSuggestions } from './WorkLinkSuggestions'
import type { QuickTaskData, QuickTaskModalProps, ModalStep, Priority, Department, WorkLinkSuggestion } from './types'

export function QuickTaskModal({ isOpen, onClose, initialContext }: QuickTaskModalProps) {
  const [step, setStep] = useState<ModalStep>('input')
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('P2')
  const [dueDate, setDueDate] = useState('')
  const [project, setProject] = useState('')
  const [assignee, setAssignee] = useState('')
  const [department, setDepartment] = useState<Department>('')
  const [resultMessage, setResultMessage] = useState('')
  const [selectedDoctype, setSelectedDoctype] = useState<string | undefined>(undefined)
  const [selectedDocId, setSelectedDocId] = useState<string | undefined>(undefined)

  const { creating, createError, createTask, reset } = useQuickTask()
  const { projects, users, loading: optionsLoading } = useQuickTaskOptions()

  // Load WorkLink suggestions if we have a doctype context
  const { suggestions, loading: suggestionsLoading, error: suggestionsError } = useWorkLinkSuggestions(
    initialContext?.doctype,
    initialContext?.docId
  )

  // Initialize department from context when modal opens
  useEffect(() => {
    if (isOpen && initialContext?.department) {
      setDepartment(initialContext.department)
    }
  }, [isOpen, initialContext?.department])

  // Initialize WorkLink selection from context
  useEffect(() => {
    if (isOpen && initialContext?.doctype) {
      setSelectedDoctype(initialContext.doctype)
      setSelectedDocId(initialContext.docId)
    }
  }, [isOpen, initialContext?.doctype, initialContext?.docId])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('input')
        setTitle('')
        setPriority('P2')
        setDueDate('')
        setProject('')
        setAssignee('')
        setDepartment('')
        setResultMessage('')
        setSelectedDoctype(undefined)
        setSelectedDocId(undefined)
        reset()
      }, 300)
    }
  }, [isOpen, reset])

  // Handle WorkLink suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: WorkLinkSuggestion) => {
    setSelectedDoctype(suggestion.source_doctype)
    setSelectedDocId(suggestion.source_id)
  }, [])

  // Handle submit
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) return

    const taskData: QuickTaskData = {
      title: title.trim(),
      priority,
      ...(dueDate && { due_date: dueDate }),
      ...(project && { project }),
      ...(assignee && { assigned_to: assignee }),
      ...(department && { department }),
      ...(selectedDoctype && { source_doctype: selectedDoctype }),
      ...(selectedDocId && { source_id: selectedDocId })
    }

    const result = await createTask(taskData)
    if (result) {
      if (result.success) {
        setResultMessage(`Tarea creada exitosamente${result.worklink_id ? ' con WorkLink' : ''}`)
        setStep('success')
        // Auto-close after 2 seconds
        setTimeout(() => {
          onClose()
        }, 2000)
      } else {
        setResultMessage('Error al crear tarea')
        setStep('error')
      }
    }
  }, [title, priority, dueDate, project, assignee, department, selectedDoctype, selectedDocId, createTask, onClose])

  // Handle close and reset
  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  // Handle back to input
  const handleBack = useCallback(() => {
    setStep('input')
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white border-2 border-stone-900 shadow-[8px_8px_0_#1c1917] w-full max-w-lg max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-stone-200">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-amber-500" />
            <h2 className="font-serif text-lg font-bold">
              {step === 'input' && 'Crear Tarea Rápida'}
              {step === 'success' && 'Tarea Creada'}
              {step === 'error' && 'Error'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-stone-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Step: Input */}
          {step === 'input' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title Field */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Revisar pedido con cliente..."
                  className="w-full px-3 py-2 border-2 border-stone-300 focus:border-stone-900 outline-none"
                  disabled={creating}
                  autoFocus
                  required
                />
              </div>

              {/* Priority Field */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Prioridad
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority('P0')}
                    disabled={creating}
                    className={`flex-1 px-3 py-2 border-2 font-medium text-sm transition-all ${
                      priority === 'P0'
                        ? 'bg-red-100 border-red-500 text-red-700'
                        : 'border-stone-300 hover:border-stone-400'
                    } disabled:opacity-50`}
                  >
                    P0 - Crítica
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('P1')}
                    disabled={creating}
                    className={`flex-1 px-3 py-2 border-2 font-medium text-sm transition-all ${
                      priority === 'P1'
                        ? 'bg-orange-100 border-orange-500 text-orange-700'
                        : 'border-stone-300 hover:border-stone-400'
                    } disabled:opacity-50`}
                  >
                    P1 - Alta
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('P2')}
                    disabled={creating}
                    className={`flex-1 px-3 py-2 border-2 font-medium text-sm transition-all ${
                      priority === 'P2'
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'border-stone-300 hover:border-stone-400'
                    } disabled:opacity-50`}
                  >
                    P2 - Normal
                  </button>
                </div>
              </div>

              {/* Due Date Field */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Fecha de Vencimiento
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border-2 border-stone-300 focus:border-stone-900 outline-none"
                    disabled={creating}
                  />
                </div>
              </div>

              {/* Project Field */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Proyecto
                </label>
                <select
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-stone-300 focus:border-stone-900 outline-none bg-white"
                  disabled={creating || optionsLoading}
                >
                  <option value="">Seleccionar proyecto...</option>
                  {projects.map((proj) => (
                    <option key={proj.name} value={proj.name}>
                      {proj.title}
                    </option>
                  ))}
                </select>
                {optionsLoading && (
                  <p className="text-xs text-stone-500 mt-1">Cargando proyectos...</p>
                )}
              </div>

              {/* Assignee Field */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Asignar a
                </label>
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-stone-300 focus:border-stone-900 outline-none bg-white"
                  disabled={creating || optionsLoading}
                >
                  <option value="">Seleccionar usuario...</option>
                  {users.map((user) => (
                    <option key={user.name} value={user.name}>
                      {user.full_name}
                    </option>
                  ))}
                </select>
                {optionsLoading && (
                  <p className="text-xs text-stone-500 mt-1">Cargando usuarios...</p>
                )}
              </div>

              {/* Department Field */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Departamento
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as Department)}
                  className="w-full px-3 py-2 border-2 border-stone-300 focus:border-stone-900 outline-none bg-white"
                  disabled={creating}
                >
                  <option value="">Seleccionar departamento...</option>
                  <option value="SALES">Ventas</option>
                  <option value="OPS">Operaciones</option>
                  <option value="MKT">Marketing</option>
                </select>
              </div>

              {/* WorkLink Suggestions */}
              {initialContext?.doctype && (
                <div>
                  <WorkLinkSuggestions
                    suggestions={suggestions}
                    loading={suggestionsLoading}
                    error={suggestionsError}
                    onSelect={handleSuggestionSelect}
                    selectedDoctype={selectedDoctype}
                    selectedDocId={selectedDocId}
                  />
                </div>
              )}

              {/* Error Display */}
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
                  {createError.message}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!title.trim() || creating}
                className="w-full flex items-center justify-center gap-2 py-3 bg-amber-400 hover:bg-amber-500 text-stone-900 font-medium uppercase tracking-wider border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] hover:shadow-[2px_2px_0_#1c1917] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:hover:shadow-[4px_4px_0_#1c1917] disabled:hover:translate-x-0 disabled:hover:translate-y-0"
              >
                {creating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Zap size={18} />
                    Crear Tarea
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="text-center py-6 space-y-4">
              <CheckCircle size={48} className="mx-auto text-green-600" />
              <p className="text-lg font-medium">{resultMessage}</p>
              <p className="text-sm text-stone-500">
                Cerrando automáticamente...
              </p>
            </div>
          )}

          {/* Step: Error */}
          {step === 'error' && (
            <div className="text-center py-6 space-y-4">
              <AlertCircle size={48} className="mx-auto text-red-600" />
              <p className="text-lg font-medium text-red-700">{resultMessage}</p>
              {createError && (
                <p className="text-sm text-stone-500">{createError.message}</p>
              )}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleBack}
                  className="px-6 py-2 border-2 border-stone-300 hover:border-stone-400 font-medium uppercase tracking-wider transition-colors"
                >
                  Volver
                </button>
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-stone-900 text-white font-medium uppercase tracking-wider hover:bg-stone-800 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default QuickTaskModal
