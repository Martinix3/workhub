// New Project Page - Create a new project with initial tasks
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, X, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useAuth } from '../../auth'
import { tasksApi } from '../../api/services/tasks'
import { AssigneeSelector } from '../../components/ui/AssigneeSelector'
import type { Department, TaskAssignee } from '../../components/sections/tasks/types'

const departmentConfig: Record<Department, { bg: string; text: string; label: string }> = {
  SALES: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Ventas' },
  OPS: { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Operaciones' },
  MKT: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Marketing' },
}

interface SubtaskData {
  id: string
  title: string
  assignees: TaskAssignee[]
}

interface TaskData {
  id: string
  title: string
  assignees: TaskAssignee[]
  subtasks: SubtaskData[]
  expanded: boolean
}

interface FormData {
  title: string
  description: string
  department: Department
  start_date: string
  target_date: string
}

// Generate unique IDs for tasks/subtasks
let idCounter = 0
const generateId = () => `temp-${++idCounter}`

export function NewProjectPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const templateId = searchParams.get('template')

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    department: 'SALES',
    start_date: new Date().toISOString().split('T')[0],
    target_date: '',
  })

  const [tasks, setTasks] = useState<TaskData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [templateInfo, setTemplateInfo] = useState<{ title: string; duration: number } | null>(null)

  // If template is provided, fetch its info
  useEffect(() => {
    if (templateId) {
      tasksApi.getProjectTemplates().then(templates => {
        const template = templates.find(t => t.name === templateId)
        if (template) {
          setTemplateInfo({
            title: template.title,
            duration: template.default_duration_days
          })
          setFormData(prev => ({
            ...prev,
            department: template.department,
          }))
          const targetDate = new Date()
          targetDate.setDate(targetDate.getDate() + template.default_duration_days)
          setFormData(prev => ({
            ...prev,
            target_date: targetDate.toISOString().split('T')[0],
          }))
        }
      }).catch(() => {
        // Ignore error
      })
    }
  }, [templateId])

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }))
  }

  // Task management functions
  const addTask = () => {
    const defaultAssignees: TaskAssignee[] = user?.email ? [{
      user: user.email,
      role: 'Owner',
      user_name: user.full_name || user.email,
      user_email: user.email
    }] : []

    setTasks(prev => [
      ...prev,
      {
        id: generateId(),
        title: '',
        assignees: defaultAssignees,
        subtasks: [],
        expanded: true
      }
    ])
  }

  const updateTask = (taskId: string, updates: Partial<TaskData>) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, ...updates } : t
    ))
  }

  const removeTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const addSubtask = (taskId: string) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? {
            ...t,
            subtasks: [
              ...t.subtasks,
              {
                id: generateId(),
                title: '',
                assignees: [...t.assignees] // Inherit from parent
              }
            ]
          }
        : t
    ))
  }

  const updateSubtask = (taskId: string, subtaskId: string, updates: Partial<SubtaskData>) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? {
            ...t,
            subtasks: t.subtasks.map(st =>
              st.id === subtaskId ? { ...st, ...updates } : st
            )
          }
        : t
    ))
  }

  const removeSubtask = (taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, subtasks: t.subtasks.filter(st => st.id !== subtaskId) }
        : t
    ))
  }

  const toggleTaskExpanded = (taskId: string) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, expanded: !t.expanded } : t
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      setError('El titulo es requerido')
      return
    }

    // Validate tasks have titles
    const invalidTask = tasks.find(t => !t.title.trim())
    if (invalidTask) {
      setError('Todas las tareas deben tener un titulo')
      return
    }

    const invalidSubtask = tasks.flatMap(t => t.subtasks).find(st => !st.title.trim())
    if (invalidSubtask) {
      setError('Todas las subtareas deben tener un titulo')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Create project
      const projectData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        department: formData.department,
        start_date: formData.start_date,
        target_date: formData.target_date || undefined,
        owner_user: user?.email || '',
      }

      let projectResult: { success: boolean; project_id: string }
      if (templateId) {
        projectResult = await tasksApi.createFromTemplate(templateId, projectData) as unknown as { success: boolean; project_id: string }
      } else {
        projectResult = await tasksApi.createProject(projectData) as unknown as { success: boolean; project_id: string }
      }

      const projectId = projectResult.project_id

      // 2. Create tasks and subtasks
      for (const task of tasks) {
        if (!task.title.trim()) continue

        const taskResult = await tasksApi.createTask({
          title: task.title.trim(),
          project: projectId,
          department: formData.department,
          assignees: task.assignees.length > 0 ? task.assignees : (user?.email ? [{
            user: user.email,
            role: 'Owner',
            user_name: user.full_name || user.email,
            user_email: user.email
          }] : []),
          status: 'BACKLOG',
          priority: 'P1'
        }) as unknown as { success: boolean; task_id: string }

        // Create subtasks
        for (const subtask of task.subtasks) {
          if (!subtask.title.trim()) continue

          await tasksApi.createTask({
            title: subtask.title.trim(),
            project: projectId,
            department: formData.department,
            assignees: subtask.assignees.length > 0 ? subtask.assignees : task.assignees,
            parent_task: taskResult.task_id,
            status: 'BACKLOG',
            priority: 'P1'
          })
        }
      }

      // Navigate to the new project's kanban view
      navigate(`/tareas/kanban?project=${projectId}`)
    } catch (err) {
      console.error('Error creating project:', err)
      setError(err instanceof Error ? err.message : 'Error al crear el proyecto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-100">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/tareas/proyectos')}
            className="p-2 hover:bg-white border-2 border-transparent hover:border-stone-900 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-serif text-2xl lg:text-3xl font-bold text-stone-900">
              Nuevo Proyecto
            </h1>
            {templateInfo && (
              <p className="text-stone-500 text-sm mt-1">
                Basado en plantilla: <span className="font-medium">{templateInfo.title}</span>
              </p>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white border-2 border-stone-900 shadow-[4px_4px_0_#1c1917]">
            <div className="p-6 space-y-6">
              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border-2 border-red-500 text-red-700">
                  {error}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-stone-700 uppercase tracking-wider mb-2">
                  Nombre del Proyecto *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={handleChange('title')}
                  placeholder="Ej: Campaña Q1 2024"
                  className="w-full px-4 py-3 border-2 border-stone-300 focus:border-stone-900 focus:outline-none transition-colors"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-stone-700 uppercase tracking-wider mb-2">
                  Descripcion
                </label>
                <textarea
                  value={formData.description}
                  onChange={handleChange('description')}
                  placeholder="Describe los objetivos del proyecto..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-stone-300 focus:border-stone-900 focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-stone-700 uppercase tracking-wider mb-2">
                  Departamento *
                </label>
                <div className="flex gap-3">
                  {(Object.keys(departmentConfig) as Department[]).map(dept => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, department: dept }))}
                      className={`
                        flex-1 py-3 px-4
                        border-2 border-stone-900
                        font-medium text-sm uppercase tracking-wider
                        transition-all duration-75
                        ${formData.department === dept
                          ? `${departmentConfig[dept].bg} ${departmentConfig[dept].text} shadow-[2px_2px_0_#1c1917]`
                          : 'bg-white text-stone-600 hover:bg-stone-50'
                        }
                      `}
                    >
                      {departmentConfig[dept].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 uppercase tracking-wider mb-2">
                    Fecha Inicio *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={handleChange('start_date')}
                    className="w-full px-4 py-3 border-2 border-stone-300 focus:border-stone-900 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 uppercase tracking-wider mb-2">
                    Fecha Objetivo
                  </label>
                  <input
                    type="date"
                    value={formData.target_date}
                    onChange={handleChange('target_date')}
                    min={formData.start_date}
                    className="w-full px-4 py-3 border-2 border-stone-300 focus:border-stone-900 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Tasks Section */}
            <div className="border-t-2 border-stone-200">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium text-stone-700 uppercase tracking-wider">
                    Tareas Iniciales
                  </label>
                  <span className="text-xs text-stone-500">
                    {tasks.length} tarea{tasks.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Tasks List */}
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="border-2 border-stone-300 bg-stone-50"
                    >
                      {/* Task Row */}
                      <div className="p-3 space-y-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleTaskExpanded(task.id)}
                            className="text-stone-400 hover:text-stone-600"
                          >
                            {task.expanded ? (
                              <ChevronDown size={18} />
                            ) : (
                              <ChevronRight size={18} />
                            )}
                          </button>

                          <input
                            type="text"
                            value={task.title}
                            onChange={(e) => updateTask(task.id, { title: e.target.value })}
                            placeholder="Nombre de la tarea"
                            className="flex-1 px-3 py-2 border-2 border-stone-300 bg-white focus:border-stone-900 focus:outline-none text-sm"
                          />

                          <button
                            type="button"
                            onClick={() => removeTask(task.id)}
                            className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* Assignees */}
                        <AssigneeSelector
                          value={task.assignees}
                          onChange={(assignees) => updateTask(task.id, { assignees })}
                        />
                      </div>

                      {/* Subtasks */}
                      {task.expanded && (
                        <div className="border-t border-stone-300 bg-white">
                          {task.subtasks.map((subtask) => (
                            <div
                              key={subtask.id}
                              className="px-3 py-3 space-y-3 border-b border-stone-200 last:border-b-0"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-6 flex justify-center">
                                  <span className="text-stone-300">└</span>
                                </div>

                                <input
                                  type="text"
                                  value={subtask.title}
                                  onChange={(e) => updateSubtask(task.id, subtask.id, { title: e.target.value })}
                                  placeholder="Nombre de la subtarea"
                                  className="flex-1 px-3 py-1.5 border border-stone-300 focus:border-stone-900 focus:outline-none text-sm"
                                />

                                <button
                                  type="button"
                                  onClick={() => removeSubtask(task.id, subtask.id)}
                                  className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              {/* Subtask Assignees */}
                              <div className="ml-8">
                                <AssigneeSelector
                                  value={subtask.assignees}
                                  onChange={(assignees) => updateSubtask(task.id, subtask.id, { assignees })}
                                />
                              </div>
                            </div>
                          ))}

                          {/* Add Subtask Button */}
                          <button
                            type="button"
                            onClick={() => addSubtask(task.id)}
                            className="w-full px-3 py-2 flex items-center gap-2 text-stone-500 hover:text-stone-700 hover:bg-stone-50 transition-colors text-sm"
                          >
                            <Plus size={14} />
                            Agregar subtarea
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Task Button */}
                <button
                  type="button"
                  onClick={addTask}
                  className="
                    mt-4 w-full py-3
                    flex items-center justify-center gap-2
                    border-2 border-dashed border-stone-300
                    text-stone-500 hover:text-stone-700 hover:border-stone-400 hover:bg-stone-50
                    transition-colors
                    text-sm font-medium uppercase tracking-wider
                  "
                >
                  <Plus size={18} />
                  Agregar Tarea
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t-2 border-stone-200 bg-stone-50 flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className={`
                  flex-1 py-3 px-6
                  inline-flex items-center justify-center gap-2
                  bg-amber-400 hover:bg-amber-500
                  text-stone-900 font-medium uppercase tracking-wider
                  border-2 border-stone-900
                  shadow-[4px_4px_0_#1c1917]
                  hover:shadow-[2px_2px_0_#1c1917]
                  hover:translate-x-[2px] hover:translate-y-[2px]
                  transition-all duration-75
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <Save size={18} />
                {loading ? 'Creando...' : 'Crear Proyecto'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/tareas/proyectos')}
                className="px-6 py-3 text-stone-600 hover:text-stone-900 font-medium uppercase tracking-wider transition-colors"
              >
                <X size={18} className="inline mr-2" />
                Cancelar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewProjectPage
