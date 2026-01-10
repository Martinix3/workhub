import { useState } from 'react'
import { GripVertical, Trash2, Plus, Calendar, User } from 'lucide-react'
import type { Department } from '../sections/tasks/types'

export interface TemplateTaskData {
  id: string
  sequence: number
  title: string
  description?: string
  offset_days: number
  duration_days: number
  default_assignee_role?: string
  is_milestone: boolean
  depends_on_sequence?: number
}

export interface TemplateEditorData {
  template_name: string
  description?: string
  department: Department | 'PRODUCTION'
  default_duration_days: number
  tasks: TemplateTaskData[]
}

export interface TemplateEditorProps {
  initialData?: TemplateEditorData
  onSave: (data: TemplateEditorData) => void | Promise<void>
  onCancel: () => void
  loading?: boolean
  saveLabel?: string
}

const departmentConfig: Record<Department | 'PRODUCTION', { bg: string; text: string; label: string }> = {
  SALES: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Ventas' },
  OPS: { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Operaciones' },
  MKT: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Marketing' },
  PRODUCTION: { bg: 'bg-green-100', text: 'text-green-700', label: 'Producción' },
}

// Generate unique IDs for new tasks
let idCounter = 0
const generateId = () => `temp-task-${++idCounter}`

export function TemplateEditor({
  initialData,
  onSave,
  onCancel,
  loading = false,
  saveLabel = 'Guardar Plantilla'
}: TemplateEditorProps) {
  const [formData, setFormData] = useState<TemplateEditorData>(
    initialData || {
      template_name: '',
      description: '',
      department: 'SALES',
      default_duration_days: 30,
      tasks: []
    }
  )

  const [draggedTask, setDraggedTask] = useState<TemplateTaskData | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (field: keyof Omit<TemplateEditorData, 'tasks'>) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'default_duration_days' ? parseInt(e.target.value) || 0 : e.target.value
    }))
  }

  const addTask = () => {
    const newSequence = formData.tasks.length + 1
    setFormData(prev => ({
      ...prev,
      tasks: [
        ...prev.tasks,
        {
          id: generateId(),
          sequence: newSequence,
          title: '',
          description: '',
          offset_days: 0,
          duration_days: 1,
          default_assignee_role: '',
          is_milestone: false,
          depends_on_sequence: undefined
        }
      ]
    }))
  }

  const updateTask = (taskId: string, updates: Partial<TemplateTaskData>) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      )
    }))
  }

  const removeTask = (taskId: string) => {
    setFormData(prev => {
      const newTasks = prev.tasks.filter(t => t.id !== taskId)
      // Resequence tasks
      return {
        ...prev,
        tasks: newTasks.map((t, idx) => ({
          ...t,
          sequence: idx + 1
        }))
      }
    })
  }

  // Drag and drop handlers
  const handleDragStart = (task: TemplateTaskData) => {
    setDraggedTask(task)
  }

  const handleDragEnd = () => {
    setDraggedTask(null)
    setDragOverIndex(null)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (dropIndex: number) => {
    if (!draggedTask) return

    const dragIndex = formData.tasks.findIndex(t => t.id === draggedTask.id)
    if (dragIndex === dropIndex) {
      setDraggedTask(null)
      setDragOverIndex(null)
      return
    }

    // Reorder tasks
    const newTasks = [...formData.tasks]
    newTasks.splice(dragIndex, 1)
    newTasks.splice(dropIndex, 0, draggedTask)

    // Resequence
    const resequencedTasks = newTasks.map((t, idx) => ({
      ...t,
      sequence: idx + 1
    }))

    setFormData(prev => ({
      ...prev,
      tasks: resequencedTasks
    }))

    setDraggedTask(null)
    setDragOverIndex(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.template_name.trim()) {
      setError('El nombre de la plantilla es requerido')
      return
    }

    if (formData.default_duration_days <= 0) {
      setError('La duración estimada debe ser mayor a 0')
      return
    }

    const invalidTask = formData.tasks.find(t => !t.title.trim())
    if (invalidTask) {
      setError('Todas las tareas deben tener un título')
      return
    }

    setError(null)
    await onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Template Metadata */}
      <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9]">
        <div className="p-6 space-y-6">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2">
              Nombre de la Plantilla *
            </label>
            <input
              type="text"
              value={formData.template_name}
              onChange={handleChange('template_name')}
              placeholder="Ej: Lanzamiento de Producto"
              className="w-full px-4 py-3 border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-stone-100 focus:outline-none transition-colors"
              autoFocus
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={handleChange('description')}
              placeholder="Describe el propósito y alcance de esta plantilla..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-stone-100 focus:outline-none transition-colors resize-none"
              disabled={loading}
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2">
              Departamento *
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {(Object.keys(departmentConfig) as (Department | 'PRODUCTION')[]).map(dept => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, department: dept }))}
                  disabled={loading}
                  className={`
                    py-3 px-4
                    border-2 border-stone-900 dark:border-stone-100
                    font-medium text-sm uppercase tracking-wider
                    transition-all duration-75
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${formData.department === dept
                      ? `${departmentConfig[dept].bg} dark:opacity-90 ${departmentConfig[dept].text} shadow-[2px_2px_0_#1c1917] dark:shadow-[2px_2px_0_#fafaf9]`
                      : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700'
                    }
                  `}
                >
                  {departmentConfig[dept].label}
                </button>
              ))}
            </div>
          </div>

          {/* Default Duration */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2">
              Duración Estimada (días) *
            </label>
            <div className="relative max-w-xs">
              <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="number"
                min="1"
                max="365"
                value={formData.default_duration_days}
                onChange={handleChange('default_duration_days')}
                className="w-full pl-10 pr-4 py-3 border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-mono focus:border-stone-900 dark:focus:border-stone-100 focus:outline-none transition-colors"
                disabled={loading}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-stone-700 dark:text-stone-300 uppercase tracking-wider">
              Tareas de la Plantilla
            </label>
            <span className="text-xs text-stone-500 dark:text-stone-400 font-mono">
              {formData.tasks.length} {formData.tasks.length === 1 ? 'tarea' : 'tareas'}
            </span>
          </div>

          {/* Info Text */}
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
            Arrastra las tareas para reordenarlas. Las tareas se ejecutarán en el orden definido.
          </p>

          {/* Tasks List */}
          <div className="space-y-3">
            {formData.tasks.map((task, index) => (
              <div
                key={task.id}
                draggable={!loading}
                onDragStart={() => handleDragStart(task)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(index)}
                className={`
                  border-2 border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-800
                  transition-all duration-75
                  ${draggedTask?.id === task.id
                    ? 'opacity-50 rotate-1'
                    : ''
                  }
                  ${dragOverIndex === index && draggedTask?.id !== task.id
                    ? 'border-amber-400 shadow-[4px_4px_0_#f59e0b]'
                    : ''
                  }
                `}
              >
                {/* Task Header */}
                <div className="p-3 flex items-start gap-3">
                  {/* Drag Handle + Sequence */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      className="cursor-grab active:cursor-grabbing text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                      disabled={loading}
                    >
                      <GripVertical size={18} />
                    </button>
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-bold font-mono">
                      {task.sequence}
                    </span>
                  </div>

                  {/* Task Fields */}
                  <div className="flex-1 space-y-3">
                    {/* Title */}
                    <input
                      type="text"
                      value={task.title}
                      onChange={(e) => updateTask(task.id, { title: e.target.value })}
                      placeholder="Título de la tarea"
                      className="w-full px-3 py-2 border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-stone-100 focus:outline-none text-sm font-medium"
                      disabled={loading}
                    />

                    {/* Description */}
                    <textarea
                      value={task.description}
                      onChange={(e) => updateTask(task.id, { description: e.target.value })}
                      placeholder="Descripción de la tarea (opcional)"
                      rows={2}
                      className="w-full px-3 py-2 border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-stone-100 focus:outline-none text-sm resize-none"
                      disabled={loading}
                    />

                    {/* Metadata Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Offset Days */}
                      <div>
                        <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">
                          Inicio (día)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={task.offset_days}
                          onChange={(e) => updateTask(task.id, { offset_days: parseInt(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-mono text-sm focus:border-stone-900 dark:focus:border-stone-100 focus:outline-none"
                          disabled={loading}
                        />
                      </div>

                      {/* Duration Days */}
                      <div>
                        <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">
                          Duración (días)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={task.duration_days}
                          onChange={(e) => updateTask(task.id, { duration_days: parseInt(e.target.value) || 1 })}
                          className="w-full px-2 py-1.5 border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-mono text-sm focus:border-stone-900 dark:focus:border-stone-100 focus:outline-none"
                          disabled={loading}
                        />
                      </div>

                      {/* Default Assignee Role */}
                      <div>
                        <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">
                          Rol Asignado
                        </label>
                        <div className="relative">
                          <User size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400" />
                          <input
                            type="text"
                            value={task.default_assignee_role}
                            onChange={(e) => updateTask(task.id, { default_assignee_role: e.target.value })}
                            placeholder="Ej: Manager"
                            className="w-full pl-7 pr-2 py-1.5 border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-sm focus:border-stone-900 dark:focus:border-stone-100 focus:outline-none"
                            disabled={loading}
                          />
                        </div>
                      </div>

                      {/* Depends On */}
                      <div>
                        <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">
                          Depende de #
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={task.sequence - 1}
                          value={task.depends_on_sequence || ''}
                          onChange={(e) => updateTask(task.id, {
                            depends_on_sequence: e.target.value ? parseInt(e.target.value) : undefined
                          })}
                          placeholder="0"
                          className="w-full px-2 py-1.5 border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-mono text-sm focus:border-stone-900 dark:focus:border-stone-100 focus:outline-none"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    {/* Milestone Checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={task.is_milestone}
                        onChange={(e) => updateTask(task.id, { is_milestone: e.target.checked })}
                        className="w-4 h-4 border-2 border-stone-900 dark:border-stone-100 checked:bg-amber-400"
                        disabled={loading}
                      />
                      <span className="text-sm text-stone-700 dark:text-stone-300">
                        Marcar como hito
                      </span>
                    </label>
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => removeTask(task.id)}
                    className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-2"
                    disabled={loading}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}

            {/* Empty State */}
            {formData.tasks.length === 0 && (
              <div className="border-2 border-dashed border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 p-8 text-center">
                <p className="text-stone-500 dark:text-stone-400 mb-2">
                  No hay tareas en esta plantilla
                </p>
                <p className="text-sm text-stone-400 dark:text-stone-500">
                  Agrega tareas para definir el flujo de trabajo
                </p>
              </div>
            )}
          </div>

          {/* Add Task Button */}
          <button
            type="button"
            onClick={addTask}
            disabled={loading}
            className="
              mt-4 w-full py-3
              flex items-center justify-center gap-2
              border-2 border-dashed border-stone-300 dark:border-stone-600
              text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200
              hover:border-stone-400 dark:hover:border-stone-500 hover:bg-stone-50 dark:hover:bg-stone-800
              transition-colors
              text-sm font-medium uppercase tracking-wider
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <Plus size={18} />
            Agregar Tarea
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="
            flex-1 py-3 px-6
            inline-flex items-center justify-center gap-2
            bg-amber-400 hover:bg-amber-500
            text-stone-900 font-medium uppercase tracking-wider
            border-2 border-stone-900 dark:border-stone-100
            shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9]
            hover:shadow-[2px_2px_0_#1c1917] dark:hover:shadow-[2px_2px_0_#fafaf9]
            hover:translate-x-[2px] hover:translate-y-[2px]
            transition-all duration-75
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {loading ? 'Guardando...' : saveLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-3 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
