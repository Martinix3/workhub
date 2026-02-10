/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    NEW PROJECT DRAWER - WIZARD STYLE                         ║
 * ║                    Santa Brisa Design System v2.1                           ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * Drawer con wizard de 3 pasos para crear proyectos:
 * 1. INFO BÁSICA: Nombre, descripción, departamento, fechas
 * 2. TAREAS: Crear tareas con subtareas (pantalla completa dedicada)
 * 3. RESUMEN: Vista previa antes de crear
 *
 * v2.1 Cambios:
 * - Simplificado asignación: Solo "Responsable" por tarea (no Owner/Asignado)
 * - Fix: start_date siempre tiene valor válido
 * - Validación de fecha antes de enviar
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Save,
  Calendar,
  Target,
  FileText,
  ListTodo,
  Check,
  Building2,
  Clock,
  Sparkles,
  AlertCircle,
  User
} from 'lucide-react'
import { useAuth } from '../../auth'
import { tasksApi } from '../../api/services/tasks'
import CopilotChat from '../ai/CopilotChat'
import { DEPARTMENTS, DEPARTMENT_LABELS, type Department } from '../../api/types/ssot/enums'
import type { ProjectProposal } from '../../api/services/copilot'

import type { AssignableUser } from '../../api/services/tasks'

// ============================================================================
// TYPES
// ============================================================================

interface NewProjectDrawerProps {
  isOpen: boolean
  onClose: () => void
  onProjectCreated?: (projectId: string) => void
}

type WizardStep = 1 | 2 | 3

interface SubtaskData {
  id: string
  title: string
  responsible: string // Solo un responsable por subtarea
  due_date: string
}

interface TaskData {
  id: string
  title: string
  responsible: string // Solo un responsable por tarea
  subtasks: SubtaskData[]
  expanded: boolean
  due_date: string
  priority: 'P0' | 'P1' | 'P2'
}

interface FormData {
  title: string
  description: string
  department: Department
  start_date: string
  target_date: string
  success_metric_label: string
  success_metric_value: string
  success_metric_unit: string
}

// ============================================================================
// HELPERS
// ============================================================================

let idCounter = 0
const generateId = () => `temp-${++idCounter}`

// Asegurar fecha en formato YYYY-MM-DD
const getTodayDate = () => {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

const PRIORITY_CONFIG = {
  P0: { bg: '#FFEBEE', text: '#E07A4C', label: 'Crítica', border: '#E07A4C' },
  P1: { bg: '#FFF8E1', text: '#B8860B', label: 'Alta', border: '#F5CE3E' },
  P2: { bg: '#F5F4F2', text: '#78716C', label: 'Normal', border: '#D4D1CC' }
}

const departmentConfig: Record<Department, { bg: string; text: string; border: string }> = {
  SALES: { bg: 'bg-[#E0F4F4]', text: 'text-[#5BBFBF]', border: 'border-[#5BBFBF]' },
  MKT: { bg: 'bg-[#FCE7F3]', text: 'text-[#EC4899]', border: 'border-[#EC4899]' },
  OPS: { bg: 'bg-[#F3E8FF]', text: 'text-[#8B5CF6]', border: 'border-[#8B5CF6]' },
  PRODUCTION: { bg: 'bg-[#FFF8E1]', text: 'text-[#B8860B]', border: 'border-[#F5CE3E]' },
  QUALITY: { bg: 'bg-[#E8F5EE]', text: 'text-[#4CAF7A]', border: 'border-[#4CAF7A]' },
  FINANCE: { bg: 'bg-[#EFF6FF]', text: 'text-[#1D4ED8]', border: 'border-[#1D4ED8]' },
  HR: { bg: 'bg-[#FEF2F2]', text: 'text-[#DC2626]', border: 'border-[#DC2626]' },
}

const STEP_INFO = [
  { num: 1, label: 'Información', icon: FileText },
  { num: 2, label: 'Tareas', icon: ListTodo },
  { num: 3, label: 'Resumen', icon: Check }
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NewProjectDrawer({ isOpen, onClose, onProjectCreated }: NewProjectDrawerProps) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [showCopilot, setShowCopilot] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    department: 'SALES',
    start_date: getTodayDate(),
    target_date: '',
    success_metric_label: '',
    success_metric_value: '',
    success_metric_unit: '',
  })
  const [tasks, setTasks] = useState<TaskData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<AssignableUser[]>([])

  // Load users for assignment
  useEffect(() => {
    if (!isOpen) return
    const loadUsers = async () => {
      try {
        const data = await tasksApi.getAssignableUsers()
        setUsers(data)
      } catch (err) {
        console.error('Failed to load users', err)
        setUsers([])
      }
    }
    loadUsers()
  }, [isOpen])

  // Reset form when drawer opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1)
      setShowCopilot(false)
      setFormData({
        title: '',
        description: '',
        department: 'SALES',
        start_date: getTodayDate(),
        target_date: '',
        success_metric_label: '',
        success_metric_value: '',
        success_metric_unit: '',
      })
      setTasks([])
      setError(null)
    }
  }, [isOpen])

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
  }

  // Copilot Integration Handler
  const handleProposalAccepted = (proposal: ProjectProposal) => {
    setFormData(prev => ({
      ...prev,
      title: proposal.nombre,
      description: proposal.descripcion,
      department: (proposal.departamento.toUpperCase() as Department) || 'MKT',
      start_date: proposal.fecha_inicio || getTodayDate(),
      target_date: proposal.fecha_objetivo || prev.target_date,
      success_metric_label: proposal.kpi || prev.success_metric_label,
      success_metric_value: proposal.valor_objetivo?.toString() || prev.success_metric_value,
      success_metric_unit: proposal.unidad || prev.success_metric_unit
    }))

    const newTasks: TaskData[] = proposal.tareas.map(t => ({
      id: generateId(),
      title: t.titulo,
      responsible: user?.email || '',
      subtasks: [],
      expanded: false,
      due_date: t.fecha_limite || proposal.fecha_objetivo || '',
      priority: t.prioridad === 'alta' ? 'P0' : t.prioridad === 'media' ? 'P1' : 'P2'
    }))

    setTasks(prev => [...prev, ...newTasks])
    setShowCopilot(false)
  }

  // Task management
  const addTask = () => {
    setTasks(prev => [
      ...prev,
      {
        id: generateId(),
        title: '',
        responsible: user?.email || '',
        subtasks: [],
        expanded: true,
        due_date: formData.target_date || '',
        priority: 'P1'
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
              responsible: t.responsible, // Hereda del padre
              due_date: t.due_date || formData.target_date || ''
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

  // Navigation
  const canGoNext = () => {
    if (currentStep === 1) {
      return formData.title.trim().length > 0 && formData.start_date.length > 0
    }
    return true
  }

  const goNext = () => {
    if (currentStep < 3 && canGoNext()) {
      setCurrentStep((currentStep + 1) as WizardStep)
    }
  }

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep)
    }
  }

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setError('El título es requerido')
      return
    }

    // Asegurar que start_date tenga valor
    const startDate = formData.start_date || getTodayDate()

    setLoading(true)
    setError(null)

    try {
      const projectData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        department: formData.department,
        start_date: startDate,
        target_date: formData.target_date || undefined,
        owner_user: user?.email || '',
      }

      console.log('Creating project with data:', projectData)

      const projectResult = await tasksApi.createProject(projectData) as unknown as { success: boolean; project_id: string }
      const projectId = projectResult.project_id

      // Create tasks and subtasks
      for (const task of tasks) {
        if (!task.title.trim()) continue

        const taskResult = await tasksApi.createTask({
          title: task.title.trim(),
          project: projectId,
          department: formData.department,
          due_date: task.due_date || formData.target_date || undefined,
          assigned_to: task.responsible || user?.email || undefined,
          status: 'BACKLOG',
          priority: task.priority || 'P1'
        }) as unknown as { success: boolean; task_id: string }

        // Create subtasks
        for (const subtask of task.subtasks) {
          if (!subtask.title.trim()) continue

          await tasksApi.createTask({
            title: subtask.title.trim(),
            project: projectId,
            department: formData.department,
            due_date: subtask.due_date || task.due_date || formData.target_date || undefined,
            assigned_to: subtask.responsible || task.responsible || user?.email || undefined,
            parent_task: taskResult.task_id,
            status: 'BACKLOG',
            priority: 'P1'
          })
        }
      }

      onProjectCreated?.(projectId)
      onClose()
      navigate(`/tareas/kanban?project=${projectId}`)
    } catch (err) {
      console.error('Error creating project:', err)
      setError(err instanceof Error ? err.message : 'Error al crear el proyecto')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 drawer-overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        className="fixed right-0 top-0 h-full w-full max-w-[720px] bg-[#FFFDF7] shadow-xl flex flex-col drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-[#E8E6E3] bg-white">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h2
                id="drawer-title"
                className="font-['Playfair_Display',Georgia,serif] text-xl font-semibold text-[#292524]"
              >
                Nuevo Proyecto
              </h2>
              <p className="text-sm text-[#78716C] mt-0.5">
                Paso {currentStep} de 3: {STEP_INFO[currentStep - 1].label}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-2 text-[#A8A29E] hover:text-[#57534E] hover:bg-[#F5F4F2] rounded-sm transition-colors"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="px-6 pb-4">
            <div className="flex items-center gap-2">
              {STEP_INFO.map((step, idx) => {
                const Icon = step.icon
                const isActive = currentStep === step.num
                const isCompleted = currentStep > step.num
                return (
                  <div key={step.num} className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-2">
                      <div
                        className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                          ${isCompleted ? 'bg-[#4CAF7A] text-white' : ''}
                          ${isActive ? 'bg-[#F5CE3E] text-[#292524]' : ''}
                          ${!isActive && !isCompleted ? 'bg-[#F5F4F2] text-[#A8A29E]' : ''}
                        `}
                      >
                        {isCompleted ? <Check size={14} /> : <Icon size={14} />}
                      </div>
                      <span className={`text-xs font-medium hidden sm:inline ${isActive || isCompleted ? 'text-[#44403C]' : 'text-[#A8A29E]'}`}>
                        {step.label}
                      </span>
                    </div>
                    {idx < STEP_INFO.length - 1 && (
                      <div className={`flex-1 h-0.5 ${currentStep > step.num ? 'bg-[#4CAF7A]' : 'bg-[#E8E6E3]'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
            {/* Main Form Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Error Message */}
              {error && (
                <div className="mx-6 mt-4 p-3 bg-[#FFEBEE] border border-[#E07A4C] text-[#B85A35] text-sm rounded-sm flex items-start gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {/* Step 1: Basic Info */}
              {currentStep === 1 && (
                <Step1BasicInfo
                  formData={formData}
                  onChange={handleChange}
                  setFormData={setFormData}
                />
              )}

              {/* Step 2: Tasks */}
              {currentStep === 2 && (
                <Step2Tasks
                  tasks={tasks}
                  users={users}
                  userEmail={user?.email || ''}
                  projectTitle={formData.title}
                  projectDescription={formData.description}
                  projectDepartment={formData.department}
                  formStartDate={formData.start_date}
                  formTargetDate={formData.target_date}
                  showCopilot={showCopilot}
                  setShowCopilot={setShowCopilot}
                  setTasks={setTasks}
                  onAddTask={addTask}
                  onUpdateTask={updateTask}
                  onRemoveTask={removeTask}
                  onToggleExpand={toggleTaskExpanded}
                  onAddSubtask={addSubtask}
                  onUpdateSubtask={updateSubtask}
                  onRemoveSubtask={removeSubtask}
                />
              )}

              {/* Step 3: Summary */}
              {currentStep === 3 && (
                <Step3Summary
                  formData={formData}
                  tasks={tasks}
                  users={users}
                />
              )}
            </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-[#E8E6E3] p-4 bg-white flex justify-between gap-3">
          <button
            type="button"
            onClick={currentStep === 1 ? onClose : goBack}
            className="
              inline-flex items-center gap-2 px-4 py-2.5
              bg-white text-[#44403C] font-medium text-sm
              border border-[#E8E6E3] hover:bg-[#F5F4F2]
              transition-colors rounded-sm
            "
          >
            {currentStep === 1 ? (
              'Cancelar'
            ) : (
              <>
                <ArrowLeft size={16} />
                Atrás
              </>
            )}
          </button>

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext()}
              className="
                inline-flex items-center gap-2 px-6 py-2.5
                bg-[#F5CE3E] text-[#292524] font-medium text-sm
                hover:bg-[#E5B82A] transition-colors rounded-sm
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              Continuar
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="
                inline-flex items-center gap-2 px-6 py-2.5
                bg-[#4CAF7A] text-white font-medium text-sm
                hover:bg-[#3D9A68] transition-colors rounded-sm
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              <Save size={16} />
              {loading ? 'Creando...' : 'Crear Proyecto'}
            </button>
          )}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        .drawer-overlay {
          animation: fadeIn 0.2s ease-out;
        }
        .drawer-panel {
          animation: slideIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// STEP 1: BASIC INFO
// ============================================================================

interface Step1Props {
  formData: FormData
  onChange: (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  setFormData: React.Dispatch<React.SetStateAction<FormData>>
}

function Step1BasicInfo({ formData, onChange, setFormData }: Step1Props) {
  return (
    <div className="p-6 space-y-5">
      {/* Title */}
      <div>
        <label className="block text-[10px] text-[#78716C] uppercase tracking-[0.1em] font-medium mb-1.5">
          <FileText size={12} className="inline mr-1" />
          Nombre del Proyecto *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={onChange('title')}
          placeholder="Ej: Campaña Q1 2024"
          className="w-full py-3 px-4 bg-white border border-[#E8E6E3] text-[#44403C] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#44403C] rounded-sm text-sm"
          autoFocus
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-[10px] text-[#78716C] uppercase tracking-[0.1em] font-medium mb-1.5">
          Descripción
        </label>
        <textarea
          value={formData.description}
          onChange={onChange('description')}
          placeholder="Describe los objetivos del proyecto..."
          rows={3}
          className="w-full py-3 px-4 bg-white border border-[#E8E6E3] text-[#44403C] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#44403C] rounded-sm text-sm resize-none"
        />
      </div>

      {/* Department Pills */}
      <div>
        <label className="block text-[10px] text-[#78716C] uppercase tracking-[0.1em] font-medium mb-1.5">
          <Building2 size={12} className="inline mr-1" />
          Departamento
        </label>
        <div className="flex flex-wrap gap-2">
          {DEPARTMENTS.map(dept => {
            const config = departmentConfig[dept]
            const isSelected = formData.department === dept
            return (
              <button
                key={dept}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, department: dept }))}
                className={`
                  px-3 py-1.5 text-xs font-medium uppercase tracking-[0.05em]
                  border rounded-sm transition-all duration-100
                  ${isSelected
                    ? `${config.bg} ${config.text} ${config.border} border`
                    : 'bg-white text-[#78716C] border-[#E8E6E3] hover:border-[#D4D1CC]'
                  }
                `}
              >
                {DEPARTMENT_LABELS[dept]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Dates Row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] text-[#78716C] uppercase tracking-[0.1em] font-medium mb-1.5">
            <Calendar size={12} className="inline mr-1" />
            Fecha Inicio *
          </label>
          <input
            type="date"
            value={formData.start_date}
            onChange={onChange('start_date')}
            className="w-full py-3 px-4 bg-white border border-[#E8E6E3] text-[#44403C] focus:outline-none focus:border-[#44403C] rounded-sm text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-[10px] text-[#78716C] uppercase tracking-[0.1em] font-medium mb-1.5">
            <Target size={12} className="inline mr-1" />
            Fecha Objetivo
          </label>
          <input
            type="date"
            value={formData.target_date}
            onChange={onChange('target_date')}
            min={formData.start_date}
            className="w-full py-3 px-4 bg-white border border-[#E8E6E3] text-[#44403C] focus:outline-none focus:border-[#44403C] rounded-sm text-sm"
          />
        </div>
      </div>

      {/* KPI Section */}
      <div className="pt-4 border-t border-[#E8E6E3]">
        <label className="block text-[10px] text-[#78716C] uppercase tracking-[0.1em] font-medium mb-3">
          <Target size={12} className="inline mr-1" />
          Métrica de Éxito (Opcional)
        </label>
        <div className="grid grid-cols-3 gap-3">
          <input
            type="text"
            value={formData.success_metric_label}
            onChange={onChange('success_metric_label')}
            placeholder="Ej: Leads"
            className="col-span-2 py-2 px-3 bg-white border border-[#E8E6E3] text-[#44403C] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#44403C] rounded-sm text-sm"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.success_metric_value}
              onChange={onChange('success_metric_value')}
              placeholder="500"
              className="flex-1 py-2 px-3 bg-white border border-[#E8E6E3] text-[#44403C] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#44403C] rounded-sm text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// STEP 2: TASKS
// ============================================================================

interface Step2Props {
  tasks: TaskData[]
  users: AssignableUser[]
  userEmail: string
  projectTitle: string
  projectDescription: string
  projectDepartment: Department
  formStartDate: string
  formTargetDate: string
  showCopilot: boolean
  setShowCopilot: (show: boolean) => void
  setTasks: React.Dispatch<React.SetStateAction<TaskData[]>>
  onAddTask: () => void
  onUpdateTask: (taskId: string, updates: Partial<TaskData>) => void
  onRemoveTask: (taskId: string) => void
  onToggleExpand: (taskId: string) => void
  onAddSubtask: (taskId: string) => void
  onUpdateSubtask: (taskId: string, subtaskId: string, updates: Partial<SubtaskData>) => void
  onRemoveSubtask: (taskId: string, subtaskId: string) => void
}

function Step2Tasks({
  tasks,
  users,
  userEmail,
  projectTitle,
  projectDescription,
  projectDepartment,
  formStartDate,
  formTargetDate,
  showCopilot,
  setShowCopilot,
  setTasks,
  onAddTask,
  onUpdateTask,
  onRemoveTask,
  onToggleExpand,
  onAddSubtask,
  onUpdateSubtask,
  onRemoveSubtask
}: Step2Props) {
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestedTasks, setAiSuggestedTasks] = useState<Array<{ title: string; subtasks: string[]; priority: 'P0' | 'P1' | 'P2' }>>([])

  // AI suggestion for project tasks based on project info
  const handleAiSuggestTasks = async () => {
    if (!projectTitle.trim()) return

    setAiLoading(true)
    setAiSuggestedTasks([])

    // Simulate AI thinking
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Generate contextual task suggestions based on project title, description and department
    const titleLower = projectTitle.toLowerCase()
    const descLower = projectDescription.toLowerCase()
    const context = `${titleLower} ${descLower} ${aiInput.toLowerCase()}`
    let suggestions: Array<{ title: string; subtasks: string[]; priority: 'P0' | 'P1' | 'P2' }> = []

    // Department-specific suggestions
    if (projectDepartment === 'MKT') {
      suggestions = [
        { title: 'Definir estrategia y objetivos', subtasks: ['Análisis de mercado', 'Definir KPIs', 'Identificar audiencia target'], priority: 'P0' },
        { title: 'Crear contenido y creatividades', subtasks: ['Diseñar assets visuales', 'Redactar copy', 'Preparar videos/fotos'], priority: 'P1' },
        { title: 'Planificar y ejecutar campaña', subtasks: ['Configurar plataformas', 'Programar publicaciones', 'Activar anuncios'], priority: 'P1' },
        { title: 'Medir y optimizar resultados', subtasks: ['Configurar tracking', 'Reportar métricas', 'Ajustar estrategia'], priority: 'P2' }
      ]
    } else if (projectDepartment === 'SALES') {
      suggestions = [
        { title: 'Preparar propuesta comercial', subtasks: ['Investigar cliente', 'Definir propuesta de valor', 'Crear presentación'], priority: 'P0' },
        { title: 'Contactar y cualificar leads', subtasks: ['Lista de contactos', 'Llamadas de prospección', 'Agendar reuniones'], priority: 'P1' },
        { title: 'Negociación y cierre', subtasks: ['Presentar propuesta', 'Negociar términos', 'Preparar contrato'], priority: 'P1' },
        { title: 'Seguimiento post-venta', subtasks: ['Onboarding cliente', 'Primera revisión', 'Solicitar feedback'], priority: 'P2' }
      ]
    } else if (projectDepartment === 'PRODUCTION') {
      suggestions = [
        { title: 'Planificación de producción', subtasks: ['Definir especificaciones', 'Calcular materiales', 'Programar máquinas'], priority: 'P0' },
        { title: 'Preparación de línea', subtasks: ['Verificar inventario', 'Configurar equipos', 'Preparar personal'], priority: 'P1' },
        { title: 'Ejecución de producción', subtasks: ['Producir lote', 'Control de calidad en línea', 'Registrar métricas'], priority: 'P1' },
        { title: 'Control y cierre', subtasks: ['Inspección final', 'Empaque y etiquetado', 'Documentar producción'], priority: 'P2' }
      ]
    } else if (projectDepartment === 'QUALITY') {
      suggestions = [
        { title: 'Definir plan de inspección', subtasks: ['Identificar puntos críticos', 'Definir criterios', 'Crear checklist'], priority: 'P0' },
        { title: 'Ejecutar inspecciones', subtasks: ['Muestreo', 'Análisis de laboratorio', 'Registro de hallazgos'], priority: 'P1' },
        { title: 'Gestionar no conformidades', subtasks: ['Documentar NC', 'Análisis causa raíz', 'Definir acciones correctivas'], priority: 'P1' },
        { title: 'Reportar y mejorar', subtasks: ['Generar informe', 'Presentar resultados', 'Implementar mejoras'], priority: 'P2' }
      ]
    } else if (projectDepartment === 'OPS') {
      suggestions = [
        { title: 'Análisis y diagnóstico', subtasks: ['Mapear proceso actual', 'Identificar cuellos de botella', 'Medir tiempos'], priority: 'P0' },
        { title: 'Diseñar mejoras', subtasks: ['Proponer soluciones', 'Evaluar impacto', 'Definir roadmap'], priority: 'P1' },
        { title: 'Implementar cambios', subtasks: ['Preparar recursos', 'Ejecutar cambios', 'Capacitar equipo'], priority: 'P1' },
        { title: 'Monitorear y ajustar', subtasks: ['Medir resultados', 'Comparar vs baseline', 'Documentar aprendizajes'], priority: 'P2' }
      ]
    } else if (projectDepartment === 'FINANCE') {
      suggestions = [
        { title: 'Recopilar información financiera', subtasks: ['Solicitar datos', 'Validar fuentes', 'Consolidar información'], priority: 'P0' },
        { title: 'Análisis y proyecciones', subtasks: ['Crear modelo financiero', 'Escenarios', 'Calcular indicadores'], priority: 'P1' },
        { title: 'Preparar informes', subtasks: ['Diseñar formato', 'Redactar análisis', 'Crear visualizaciones'], priority: 'P1' },
        { title: 'Presentar y aprobar', subtasks: ['Presentación a gerencia', 'Ajustes solicitados', 'Obtener aprobación'], priority: 'P2' }
      ]
    } else if (projectDepartment === 'HR') {
      suggestions = [
        { title: 'Definir necesidades', subtasks: ['Análisis de requerimientos', 'Perfil del puesto', 'Presupuesto'], priority: 'P0' },
        { title: 'Proceso de selección', subtasks: ['Publicar vacante', 'Filtrar candidatos', 'Entrevistas'], priority: 'P1' },
        { title: 'Contratación', subtasks: ['Oferta laboral', 'Documentación', 'Alta en sistema'], priority: 'P1' },
        { title: 'Onboarding', subtasks: ['Inducción', 'Entrega de equipo', 'Seguimiento 30 días'], priority: 'P2' }
      ]
    } else {
      suggestions = [
        { title: 'Fase de inicio', subtasks: ['Definir alcance', 'Identificar stakeholders', 'Kick-off meeting'], priority: 'P0' },
        { title: 'Planificación', subtasks: ['Crear cronograma', 'Asignar recursos', 'Definir entregables'], priority: 'P1' },
        { title: 'Ejecución', subtasks: ['Desarrollar entregables', 'Seguimiento semanal', 'Gestionar cambios'], priority: 'P1' },
        { title: 'Cierre', subtasks: ['Revisión final', 'Documentar lecciones', 'Presentar resultados'], priority: 'P2' }
      ]
    }

    // Customize based on project context
    if (context.includes('campaña') || context.includes('lanzamiento')) {
      suggestions[0].title = 'Estrategia de lanzamiento'
      suggestions[1].title = 'Desarrollo de campaña'
    } else if (context.includes('auditoría') || context.includes('audit')) {
      suggestions = [
        { title: 'Planificación de auditoría', subtasks: ['Definir alcance', 'Crear checklist', 'Programar fechas'], priority: 'P0' },
        { title: 'Ejecución de auditoría', subtasks: ['Revisión documental', 'Entrevistas', 'Verificación en sitio'], priority: 'P1' },
        { title: 'Análisis de hallazgos', subtasks: ['Clasificar hallazgos', 'Identificar riesgos', 'Priorizar acciones'], priority: 'P1' },
        { title: 'Informe y seguimiento', subtasks: ['Redactar informe', 'Presentar resultados', 'Plan de acción'], priority: 'P2' }
      ]
    } else if (context.includes('evento') || context.includes('feria')) {
      suggestions = [
        { title: 'Logística del evento', subtasks: ['Reservar espacio', 'Contratar proveedores', 'Preparar materiales'], priority: 'P0' },
        { title: 'Comunicación y promoción', subtasks: ['Invitaciones', 'Difusión en redes', 'Confirmaciones'], priority: 'P1' },
        { title: 'Ejecución del evento', subtasks: ['Montaje', 'Coordinación del día', 'Atención a invitados'], priority: 'P1' },
        { title: 'Post-evento', subtasks: ['Desmontaje', 'Encuestas', 'Informe de resultados'], priority: 'P2' }
      ]
    }

    // Apply urgency modifier
    if (aiInput.toLowerCase().includes('urgente') || aiInput.toLowerCase().includes('rápido')) {
      suggestions = suggestions.slice(0, 3)
      suggestions.forEach(s => s.subtasks = s.subtasks.slice(0, 2))
    }

    setAiSuggestedTasks(suggestions)
    setAiLoading(false)
  }

  const handleAddSuggestedTask = (suggestion: { title: string; subtasks: string[]; priority: 'P0' | 'P1' | 'P2' }) => {
    const newTask: TaskData = {
      id: generateId(),
      title: suggestion.title,
      responsible: userEmail,
      subtasks: suggestion.subtasks.map(st => ({
        id: generateId(),
        title: st,
        responsible: userEmail,
        due_date: formTargetDate || ''
      })),
      expanded: true,
      due_date: formTargetDate || '',
      priority: suggestion.priority
    }

    setTasks(prev => [...prev, newTask])
    setAiSuggestedTasks(prev => prev.filter(s => s.title !== suggestion.title))
  }

  const handleAddAllSuggestedTasks = () => {
    if (aiSuggestedTasks.length === 0) return

    const newTasks: TaskData[] = aiSuggestedTasks.map(suggestion => ({
      id: generateId(),
      title: suggestion.title,
      responsible: userEmail,
      subtasks: suggestion.subtasks.map(st => ({
        id: generateId(),
        title: st,
        responsible: userEmail,
        due_date: formTargetDate || ''
      })),
      expanded: false,
      due_date: formTargetDate || '',
      priority: suggestion.priority
    }))

    setTasks(prev => [...prev, ...newTasks])
    setAiSuggestedTasks([])
    setShowCopilot(false)
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-[#44403C]">Tareas del Proyecto</h3>
          <p className="text-xs text-[#78716C] mt-0.5">
            {tasks.length === 0
              ? 'Añade tareas para organizar el trabajo'
              : `${tasks.length} tarea${tasks.length !== 1 ? 's' : ''} • ${tasks.reduce((acc, t) => acc + t.subtasks.length, 0)} subtareas`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCopilot(!showCopilot)}
            className={`
              inline-flex items-center gap-2 px-3 py-2
              text-sm font-medium rounded-sm transition-colors
              ${showCopilot
                ? 'bg-[#E0F4F4] text-[#5BBFBF] border border-[#5BBFBF]'
                : 'bg-[#F5F4F2] text-[#78716C] hover:bg-[#E8E6E3] border border-[#E8E6E3]'
              }
            `}
          >
            <Sparkles size={14} />
            Asistente IA
          </button>
          <button
            type="button"
            onClick={onAddTask}
            className="
              inline-flex items-center gap-2 px-3 py-2
              text-sm font-medium
              bg-[#F5CE3E] text-[#44403C]
              border border-[#44403C]
              hover:bg-[#E5B82A]
              transition-colors rounded-sm
            "
          >
            <Plus size={14} />
            Nueva Tarea
          </button>
        </div>
      </div>

      {/* AI Assistant Panel - Project Task Generator */}
      {showCopilot && (
        <div className="bg-gradient-to-r from-[#E0F4F4] to-[#F0FAFA] border border-[#5BBFBF]/30 rounded-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#5BBFBF]/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#5BBFBF] flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#3D8B8B]">Asistente de Planificación</p>
                <p className="text-[10px] text-[#5BBFBF]">Genera tareas y subtareas para tu proyecto</p>
              </div>
            </div>
            <button
              onClick={() => setShowCopilot(false)}
              className="p-1 text-[#5BBFBF] hover:text-[#3D8B8B] hover:bg-[#5BBFBF]/10 rounded-sm"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {/* Project Context Display */}
            <div className="bg-white/60 border border-[#5BBFBF]/20 rounded-sm p-3">
              <p className="text-[10px] text-[#3D8B8B] uppercase tracking-[0.1em] font-medium mb-1">Proyecto</p>
              <p className="text-sm font-medium text-[#44403C]">{projectTitle || 'Sin título'}</p>
              {projectDescription && (
                <p className="text-xs text-[#78716C] mt-1 line-clamp-2">{projectDescription}</p>
              )}
              <span className={`inline-flex mt-2 px-2 py-0.5 text-[10px] font-medium rounded-sm ${departmentConfig[projectDepartment]?.bg} ${departmentConfig[projectDepartment]?.text}`}>
                {DEPARTMENT_LABELS[projectDepartment]}
              </span>
            </div>

            {/* Context Input */}
            <div>
              <label className="block text-[10px] text-[#3D8B8B] uppercase tracking-[0.1em] font-medium mb-1.5">
                Instrucciones adicionales (opcional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Ej: 'urgente', 'incluir análisis', 'enfocado en ventas'..."
                  className="flex-1 py-2 px-3 bg-white border border-[#5BBFBF]/30 text-[#44403C] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#5BBFBF] rounded-sm text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAiSuggestTasks()}
                />
                <button
                  onClick={handleAiSuggestTasks}
                  disabled={aiLoading || !projectTitle.trim()}
                  className="
                    inline-flex items-center gap-2 px-4 py-2
                    text-sm font-medium
                    bg-[#5BBFBF] text-white
                    hover:bg-[#4AA9A9]
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors rounded-sm
                  "
                >
                  {aiLoading ? (
                    <>
                      <span className="animate-spin h-4 w-4 border border-white border-t-transparent rounded-full" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Generar Tareas
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Suggested Tasks */}
            {aiSuggestedTasks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-[#3D8B8B] uppercase tracking-[0.1em] font-medium">
                    Tareas sugeridas ({aiSuggestedTasks.length})
                  </p>
                  <button
                    onClick={handleAddAllSuggestedTasks}
                    className="text-xs text-[#5BBFBF] hover:text-[#3D8B8B] font-medium"
                  >
                    + Añadir todas
                  </button>
                </div>
                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                  {aiSuggestedTasks.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-[#5BBFBF]/20 rounded-sm overflow-hidden group hover:border-[#5BBFBF]/40 transition-colors"
                    >
                      <div className="p-3 flex items-start gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#E0F4F4] flex items-center justify-center text-xs font-medium text-[#5BBFBF] flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[#44403C]">{suggestion.title}</p>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-sm font-medium"
                              style={{
                                backgroundColor: PRIORITY_CONFIG[suggestion.priority].bg,
                                color: PRIORITY_CONFIG[suggestion.priority].text
                              }}
                            >
                              {PRIORITY_CONFIG[suggestion.priority].label}
                            </span>
                          </div>
                          {suggestion.subtasks.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {suggestion.subtasks.map((st, stIdx) => (
                                <span key={stIdx} className="text-[10px] text-[#78716C] bg-[#F5F4F2] px-1.5 py-0.5 rounded-sm">
                                  {st}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleAddSuggestedTask(suggestion)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-[#5BBFBF] hover:text-white hover:bg-[#5BBFBF] rounded-sm transition-all flex-shrink-0"
                          title="Añadir tarea"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State for AI */}
            {aiSuggestedTasks.length === 0 && !aiLoading && (
              <div className="text-center py-6 bg-white/40 rounded-sm">
                <ListTodo size={24} className="mx-auto text-[#5BBFBF]/50 mb-2" />
                <p className="text-sm text-[#5BBFBF]">
                  Haz clic en "Generar Tareas" para obtener sugerencias
                </p>
                <p className="text-[10px] text-[#78716C] mt-1">
                  Basado en el proyecto: <span className="font-medium">{projectTitle || 'Sin título'}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            index={index}
            users={users}
            formStartDate={formStartDate}
            formTargetDate={formTargetDate}
            onUpdate={(updates) => onUpdateTask(task.id, updates)}
            onRemove={() => onRemoveTask(task.id)}
            onToggleExpand={() => onToggleExpand(task.id)}
            onAddSubtask={() => onAddSubtask(task.id)}
            onUpdateSubtask={(subtaskId, updates) => onUpdateSubtask(task.id, subtaskId, updates)}
            onRemoveSubtask={(subtaskId) => onRemoveSubtask(task.id, subtaskId)}
          />
        ))}
      </div>

      {/* Empty State */}
      {tasks.length === 0 && !showCopilot && (
        <div className="text-center py-12 bg-[#F5F4F2] border border-dashed border-[#D4D1CC] rounded-sm">
          <ListTodo size={32} className="mx-auto text-[#D4D1CC] mb-3" />
          <p className="text-sm text-[#78716C] mb-3">
            No hay tareas aún
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowCopilot(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-[#E0F4F4] text-[#5BBFBF] border border-[#5BBFBF]/30 hover:bg-[#5BBFBF] hover:text-white transition-colors rounded-sm"
            >
              <Sparkles size={14} />
              Generar con IA
            </button>
            <span className="text-[#A8A29E]">o</span>
            <button
              type="button"
              onClick={onAddTask}
              className="text-[#5BBFBF] text-sm font-medium hover:underline"
            >
              + Añadir manualmente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// TASK CARD
// ============================================================================

interface TaskCardProps {
  task: TaskData
  index: number
  users: AssignableUser[]
  formStartDate: string
  formTargetDate: string
  onUpdate: (updates: Partial<TaskData>) => void
  onRemove: () => void
  onToggleExpand: () => void
  onAddSubtask: () => void
  onUpdateSubtask: (subtaskId: string, updates: Partial<SubtaskData>) => void
  onRemoveSubtask: (subtaskId: string) => void
}

function TaskCard({
  task,
  index,
  users,
  formStartDate,
  onUpdate,
  onRemove,
  onToggleExpand,
  onAddSubtask,
  onUpdateSubtask,
  onRemoveSubtask
}: TaskCardProps) {
  const priorityStyle = PRIORITY_CONFIG[task.priority]

  return (
    <div className="border border-[#E8E6E3] bg-white rounded-sm overflow-hidden shadow-sm">
      {/* Task Header */}
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          {/* Expand Button */}
          <button
            type="button"
            onClick={onToggleExpand}
            className="mt-1 text-[#A8A29E] hover:text-[#44403C] transition-colors"
          >
            {task.expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {/* Task Number */}
          <span className="mt-1 w-6 h-6 rounded-full bg-[#F5F4F2] flex items-center justify-center text-xs font-medium text-[#78716C]">
            {index + 1}
          </span>

          {/* Task Title */}
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={task.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Nombre de la tarea"
              className="w-full px-3 py-2 border border-[#E8E6E3] bg-[#FAFAF9] focus:border-[#44403C] focus:outline-none text-sm rounded-sm font-medium"
            />
          </div>

          {/* Delete */}
          <button
            type="button"
            onClick={onRemove}
            className="p-2 text-[#A8A29E] hover:text-[#E07A4C] hover:bg-[#FFEBEE] transition-colors rounded-sm"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Task Controls Row */}
        <div className="flex flex-wrap items-center gap-2 ml-12">
          {/* Priority */}
          <select
            value={task.priority}
            onChange={(e) => onUpdate({ priority: e.target.value as 'P0' | 'P1' | 'P2' })}
            className="text-xs px-2 py-1.5 rounded-sm border font-medium"
            style={{
              backgroundColor: priorityStyle.bg,
              color: priorityStyle.text,
              borderColor: priorityStyle.border
            }}
          >
            <option value="P0">P0 - Crítica</option>
            <option value="P1">P1 - Alta</option>
            <option value="P2">P2 - Normal</option>
          </select>

          {/* Due Date */}
          <div className="flex items-center gap-1">
            <Clock size={12} className="text-[#78716C]" />
            <input
              type="date"
              value={task.due_date}
              min={formStartDate}
              onChange={(e) => onUpdate({ due_date: e.target.value })}
              className="text-xs px-2 py-1.5 border border-[#E8E6E3] bg-white focus:border-[#44403C] focus:outline-none rounded-sm"
            />
          </div>

          {/* Responsable Selector */}
          <div className="flex items-center gap-1">
            <User size={12} className="text-[#78716C]" />
            <select
              value={task.responsible}
              onChange={(e) => onUpdate({ responsible: e.target.value })}
              className="text-xs px-2 py-1.5 border border-[#E8E6E3] bg-white focus:border-[#44403C] focus:outline-none rounded-sm min-w-[120px]"
            >
              <option value="">Sin asignar</option>
              {users.map(u => (
                <option key={u.name} value={u.name}>{u.full_name}</option>
              ))}
            </select>
          </div>

          {/* Subtask Count */}
          {task.subtasks.length > 0 && (
            <span className="text-xs text-[#78716C] bg-[#F5F4F2] px-2 py-1 rounded-sm">
              {task.subtasks.length} subtarea{task.subtasks.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Subtasks Panel */}
      {task.expanded && (
        <div className="border-t border-[#E8E6E3] bg-[#FAFAF9]">
          {/* Subtasks List */}
          {task.subtasks.map((subtask, subIndex) => (
            <div
              key={subtask.id}
              className="px-4 py-3 border-b border-[#E8E6E3] last:border-b-0"
            >
              <div className="flex items-center gap-2 ml-6">
                <span className="text-[#D4D1CC]">└</span>
                <span className="w-5 h-5 rounded-full bg-[#E8E6E3] flex items-center justify-center text-[10px] font-medium text-[#78716C]">
                  {subIndex + 1}
                </span>

                <input
                  type="text"
                  value={subtask.title}
                  onChange={(e) => onUpdateSubtask(subtask.id, { title: e.target.value })}
                  placeholder="Subtarea"
                  className="flex-1 px-2 py-1.5 border border-[#E8E6E3] bg-white focus:border-[#44403C] focus:outline-none text-sm rounded-sm"
                />

                <select
                  value={subtask.responsible}
                  onChange={(e) => onUpdateSubtask(subtask.id, { responsible: e.target.value })}
                  className="text-xs px-2 py-1.5 border border-[#E8E6E3] bg-white focus:border-[#44403C] focus:outline-none rounded-sm w-28"
                >
                  <option value="">Sin asignar</option>
                  {users.map(u => (
                    <option key={u.name} value={u.name}>{u.full_name}</option>
                  ))}
                </select>

                <input
                  type="date"
                  value={subtask.due_date}
                  min={formStartDate}
                  onChange={(e) => onUpdateSubtask(subtask.id, { due_date: e.target.value })}
                  className="px-2 py-1.5 border border-[#E8E6E3] bg-white focus:border-[#44403C] focus:outline-none text-xs rounded-sm w-28"
                />

                <button
                  type="button"
                  onClick={() => onRemoveSubtask(subtask.id)}
                  className="p-1.5 text-[#A8A29E] hover:text-[#E07A4C] hover:bg-[#FFEBEE] transition-colors rounded-sm"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {/* Add Subtask Button */}
          <button
            type="button"
            onClick={onAddSubtask}
            className="w-full px-4 py-3 flex items-center gap-2 text-[#78716C] hover:text-[#44403C] hover:bg-[#F5F4F2] transition-colors text-sm"
          >
            <span className="ml-6 text-[#D4D1CC]">└</span>
            <Plus size={14} />
            Agregar subtarea
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// STEP 3: SUMMARY
// ============================================================================

interface Step3Props {
  formData: FormData
  tasks: TaskData[]
  users: AssignableUser[]
}

function Step3Summary({ formData, tasks, users }: Step3Props) {
  const totalSubtasks = tasks.reduce((acc, t) => acc + t.subtasks.length, 0)
  const config = departmentConfig[formData.department]

  const getUserName = (email: string) => {
    const u = users.find(user => user.name === email)
    return u?.full_name || email || 'Sin asignar'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Project Summary Card */}
      <div className="bg-white border border-[#E8E6E3] rounded-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E8E6E3] bg-[#FAFAF9]">
          <h3 className="font-medium text-[#44403C] flex items-center gap-2">
            <FileText size={16} className="text-[#F5CE3E]" />
            Resumen del Proyecto
          </h3>
        </div>
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <p className="text-[10px] text-[#78716C] uppercase tracking-[0.1em] font-medium">Nombre</p>
            <p className="font-medium text-[#292524] text-lg">{formData.title || 'Sin nombre'}</p>
          </div>

          {/* Description */}
          {formData.description && (
            <div>
              <p className="text-[10px] text-[#78716C] uppercase tracking-[0.1em] font-medium">Descripción</p>
              <p className="text-sm text-[#44403C]">{formData.description}</p>
            </div>
          )}

          {/* Meta Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div>
              <p className="text-[10px] text-[#78716C] uppercase tracking-[0.1em] font-medium">Departamento</p>
              <span className={`inline-flex mt-1 px-2 py-1 text-xs font-medium rounded-sm ${config?.bg} ${config?.text}`}>
                {DEPARTMENT_LABELS[formData.department]}
              </span>
            </div>
            <div>
              <p className="text-[10px] text-[#78716C] uppercase tracking-[0.1em] font-medium">Inicio</p>
              <p className="text-sm text-[#44403C] font-medium mt-1">{formData.start_date || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#78716C] uppercase tracking-[0.1em] font-medium">Objetivo</p>
              <p className="text-sm text-[#44403C] font-medium mt-1">{formData.target_date || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#78716C] uppercase tracking-[0.1em] font-medium">Tareas</p>
              <p className="text-sm text-[#44403C] font-medium mt-1">{tasks.length} tareas, {totalSubtasks} subtareas</p>
            </div>
          </div>

          {/* KPI */}
          {formData.success_metric_label && (
            <div className="pt-2 border-t border-[#E8E6E3]">
              <p className="text-[10px] text-[#78716C] uppercase tracking-[0.1em] font-medium">Métrica de Éxito</p>
              <p className="text-sm text-[#44403C] mt-1">
                <span className="font-medium">{formData.success_metric_label}</span>
                {formData.success_metric_value && (
                  <span className="text-[#5BBFBF] ml-2">
                    Meta: {formData.success_metric_value} {formData.success_metric_unit}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tasks Summary */}
      {tasks.length > 0 && (
        <div className="bg-white border border-[#E8E6E3] rounded-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E8E6E3] bg-[#FAFAF9]">
            <h3 className="font-medium text-[#44403C] flex items-center gap-2">
              <ListTodo size={16} className="text-[#5BBFBF]" />
              Tareas a Crear ({tasks.length})
            </h3>
          </div>
          <div className="divide-y divide-[#E8E6E3]">
            {tasks.map((task, index) => {
              const priorityStyle = PRIORITY_CONFIG[task.priority]
              return (
                <div key={task.id} className="p-3 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#F5F4F2] flex items-center justify-center text-xs font-medium text-[#78716C]">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[#44403C] truncate">{task.title || 'Sin título'}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-sm font-medium"
                        style={{ backgroundColor: priorityStyle.bg, color: priorityStyle.text }}
                      >
                        {priorityStyle.label}
                      </span>
                      {task.due_date && (
                        <span className="text-[10px] text-[#78716C]">{task.due_date}</span>
                      )}
                      {task.responsible && (
                        <span className="text-[10px] text-[#5BBFBF] flex items-center gap-1">
                          <User size={10} />
                          {getUserName(task.responsible)}
                        </span>
                      )}
                      {task.subtasks.length > 0 && (
                        <span className="text-[10px] text-[#78716C]">
                          {task.subtasks.length} subtarea{task.subtasks.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty Tasks Warning */}
      {tasks.length === 0 && (
        <div className="bg-[#FFF8E1] border border-[#F5CE3E] rounded-sm p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-[#B8860B] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-[#B8860B] text-sm">Sin tareas</p>
            <p className="text-xs text-[#B8860B]/80 mt-0.5">
              El proyecto se creará sin tareas. Puedes agregarlas después desde el Kanban.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default NewProjectDrawer
