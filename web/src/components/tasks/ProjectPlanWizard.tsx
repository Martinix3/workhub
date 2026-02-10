import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { projectDetailApi } from '../../api/services/project-detail'
import { tasksApi } from '../../api/services/tasks'

import type { AssignableUser } from '../../api/services/tasks'
import type {
  ProjectPlan,
  ProjectPlanPayload,
  ProjectPlanContributor,
  ProjectPlanDeliverable,
  ProjectPlanTask,
  ProjectPlanRisk,
  ProjectPlanGuardrail,
  ProjectPlanDependency
} from '../../api/types/focus'

interface ProjectPlanWizardProps {
  isOpen: boolean
  projectId: string
  onClose: () => void
  onSaved?: () => void
}

type PlanForm = {
  title: string
  area: string
  targetAudience: string
  meetingLink: string
  driUser: string
  contributors: ProjectPlanContributor[]
  purpose: string
  deliverables: ProjectPlanDeliverable[]
  successMetricLabel: string
  successMetricValue: string
  successMetricUnit: string
  milestones: ProjectPlanTask[]
  subtasks: ProjectPlanTask[]
  risks: ProjectPlanRisk[]
  dependencies: ProjectPlanDependency[]
  guardrails: ProjectPlanGuardrail[]
  nextAction: {
    action: string
    owner: string
    dueDate: string
    output: string
  }
}

const AREA_OPTIONS = [
  'Global',
  'Distribucion',
  'POS',
  'Activaciones',
  'Marketing',
  'Ventas',
  'Operaciones',
  'Produccion',
  'Calidad',
  'Otro'
]

const STEP_LABELS = [
  'Base',
  'Proposito',
  'Entregable',
  'Metrica',
  'Hitos',
  'Subtareas',
  'Riesgos',
  'Dependencias',
  'Guardrails',
  'Proxima accion'
]

const createEmptyTask = (): ProjectPlanTask => ({
  title: '',
  owner: '',
  due_date: ''
})

const ensureSubtaskSlots = (tasks: ProjectPlanTask[]): ProjectPlanTask[] => {
  const filled = [...tasks]
  while (filled.length < 10) {
    filled.push(createEmptyTask())
  }
  return filled
}

const formatDateTimeInput = (value?: string | null): string => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toISOString().slice(0, 16)
}

const mapPlanToForm = (plan: ProjectPlan): PlanForm => ({
  title: plan.title || '',
  area: plan.area || 'Global',
  targetAudience: plan.target_audience || '',
  meetingLink: plan.meeting_link || '',
  driUser: plan.dri_user || '',
  contributors: plan.contributors || [],
  purpose: plan.purpose || '',
  deliverables: plan.deliverables?.length ? plan.deliverables : [{ text: '', done: false }],
  successMetricLabel: plan.success_metric_label || '',
  successMetricValue: plan.success_metric_value || '',
  successMetricUnit: plan.success_metric_unit || '',
  milestones: plan.milestones?.length ? plan.milestones : [createEmptyTask()],
  subtasks: ensureSubtaskSlots(plan.subtasks || []),
  risks: plan.risks?.length ? plan.risks : [{ risk: '', missing: '', owner: '', due_date: '' }],
  dependencies: plan.dependencies?.length ? plan.dependencies : [{ from_item: '', to_item: '', notes: '' }],
  guardrails: plan.guardrails?.length ? plan.guardrails : [{ label: '', value: '', unit: '' }],
  nextAction: {
    action: plan.next_action?.action || '',
    owner: plan.next_action?.owner || '',
    dueDate: formatDateTimeInput(plan.next_action?.due_date),
    output: plan.next_action?.output || ''
  }
})

const createEmptyForm = (): PlanForm => ({
  title: '',
  area: 'Global',
  targetAudience: '',
  meetingLink: '',
  driUser: '',
  contributors: [],
  purpose: '',
  deliverables: [{ text: '', done: false }],
  successMetricLabel: '',
  successMetricValue: '',
  successMetricUnit: '',
  milestones: [createEmptyTask()],
  subtasks: ensureSubtaskSlots([]),
  risks: [{ risk: '', missing: '', owner: '', due_date: '' }],
  dependencies: [{ from_item: '', to_item: '', notes: '' }],
  guardrails: [{ label: '', value: '', unit: '' }],
  nextAction: {
    action: '',
    owner: '',
    dueDate: '',
    output: ''
  }
})

export function ProjectPlanWizard({ isOpen, projectId, onClose, onSaved }: ProjectPlanWizardProps) {
  const [form, setForm] = useState<PlanForm>(createEmptyForm())
  const [stepIndex, setStepIndex] = useState(0)
  const [users, setUsers] = useState<AssignableUser[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const progress = useMemo(() => Math.round(((stepIndex + 1) / STEP_LABELS.length) * 100), [stepIndex])

  useEffect(() => {
    if (!isOpen) return
    setStepIndex(0)
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const plan = await projectDetailApi.getProjectPlan(projectId)
        setForm(mapPlanToForm(plan))
      } catch (err) {
        console.error('Failed to load project plan', err)
        setError('No se pudo cargar el plan del proyecto.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isOpen, projectId])

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

  const updateForm = (updates: Partial<PlanForm>) => {
    setForm((prev) => ({ ...prev, ...updates }))
  }

  const updateContributor = (index: number, updates: Partial<ProjectPlanContributor>) => {
    setForm((prev) => {
      const next = [...prev.contributors]
      next[index] = { ...next[index], ...updates }
      return { ...prev, contributors: next }
    })
  }

  const addContributor = () => {
    setForm((prev) => ({ ...prev, contributors: [...prev.contributors, { user: '', role: '' }] }))
  }

  const removeContributor = (index: number) => {
    setForm((prev) => ({
      ...prev,
      contributors: prev.contributors.filter((_, i) => i !== index)
    }))
  }

  const updateDeliverable = (index: number, updates: Partial<ProjectPlanDeliverable>) => {
    setForm((prev) => {
      const next = [...prev.deliverables]
      next[index] = { ...next[index], ...updates }
      return { ...prev, deliverables: next }
    })
  }

  const addDeliverable = () => {
    setForm((prev) => ({ ...prev, deliverables: [...prev.deliverables, { text: '', done: false }] }))
  }

  const removeDeliverable = (index: number) => {
    setForm((prev) => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== index)
    }))
  }

  const updateMilestone = (index: number, updates: Partial<ProjectPlanTask>) => {
    setForm((prev) => {
      const next = [...prev.milestones]
      next[index] = { ...next[index], ...updates }
      return { ...prev, milestones: next }
    })
  }

  const addMilestone = () => {
    setForm((prev) => {
      if (prev.milestones.length >= 3) return prev
      return { ...prev, milestones: [...prev.milestones, createEmptyTask()] }
    })
  }

  const removeMilestone = (index: number) => {
    setForm((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index)
    }))
  }

  const updateSubtask = (index: number, updates: Partial<ProjectPlanTask>) => {
    setForm((prev) => {
      const next = [...prev.subtasks]
      next[index] = { ...next[index], ...updates }
      return { ...prev, subtasks: next }
    })
  }

  const updateRisk = (index: number, updates: Partial<ProjectPlanRisk>) => {
    setForm((prev) => {
      const next = [...prev.risks]
      next[index] = { ...next[index], ...updates }
      return { ...prev, risks: next }
    })
  }

  const addRisk = () => {
    setForm((prev) => ({ ...prev, risks: [...prev.risks, { risk: '', missing: '', owner: '', due_date: '' }] }))
  }

  const removeRisk = (index: number) => {
    setForm((prev) => ({
      ...prev,
      risks: prev.risks.filter((_, i) => i !== index)
    }))
  }

  const updateGuardrail = (index: number, updates: Partial<ProjectPlanGuardrail>) => {
    setForm((prev) => {
      const next = [...prev.guardrails]
      next[index] = { ...next[index], ...updates }
      return { ...prev, guardrails: next }
    })
  }

  const updateDependency = (index: number, updates: Partial<ProjectPlanDependency>) => {
    setForm((prev) => {
      const next = [...prev.dependencies]
      next[index] = { ...next[index], ...updates }
      return { ...prev, dependencies: next }
    })
  }

  const addDependency = () => {
    setForm((prev) => ({ ...prev, dependencies: [...prev.dependencies, { from_item: '', to_item: '', notes: '' }] }))
  }

  const removeDependency = (index: number) => {
    setForm((prev) => ({
      ...prev,
      dependencies: prev.dependencies.filter((_, i) => i !== index)
    }))
  }

  const addGuardrail = () => {
    setForm((prev) => ({ ...prev, guardrails: [...prev.guardrails, { label: '', value: '', unit: '' }] }))
  }

  const removeGuardrail = (index: number) => {
    setForm((prev) => ({
      ...prev,
      guardrails: prev.guardrails.filter((_, i) => i !== index)
    }))
  }

  const validateForm = (): string[] => {
    const errors: string[] = []
    if (!form.title.trim()) errors.push('El nombre del proyecto es obligatorio.')
    if (!form.driUser) errors.push('DRI es obligatorio.')
    if (!form.purpose.trim()) errors.push('El proposito es obligatorio.')
    if (!form.successMetricLabel.trim() || !form.successMetricValue.trim()) {
      errors.push('La metrica de exito debe incluir nombre y valor.')
    }
    const deliverableCount = form.deliverables.filter((d) => d.text.trim()).length
    if (deliverableCount < 3) errors.push('Agrega 3 entregables como minimo.')
    const milestoneCount = form.milestones.filter((m) => m.title.trim()).length
    if (milestoneCount < 1) errors.push('Agrega al menos 1 hito.')
    const milestoneMissing = form.milestones.some((m) => m.title.trim() && (!m.owner || !m.due_date))
    if (milestoneMissing) errors.push('Cada hito requiere dueño y fecha.')
    const subtaskCount = form.subtasks.filter((t) => t.title.trim()).length
    if (subtaskCount < 10) errors.push('Completa las 10 subtareas requeridas.')
    const subtaskMissing = form.subtasks.some((t) => t.title.trim() && (!t.owner || !t.due_date))
    if (subtaskMissing) errors.push('Cada subtarea requiere dueño y fecha.')
    const riskMissing = form.risks.some((r) => (r.risk.trim() || r.missing.trim()) && (!r.owner || !r.due_date))
    if (riskMissing) errors.push('Cada riesgo requiere owner y fecha.')
    const nextAction = form.nextAction
    if (!nextAction.action.trim() || !nextAction.owner || !nextAction.dueDate.trim() || !nextAction.output.trim()) {
      errors.push('La proxima accion requiere accion, dueño, fecha y output.')
    }
    return errors
  }

  const handleSave = async () => {
    const errors = validateForm()
    if (errors.length) {
      setError(errors[0])
      return
    }

    setSaving(true)
    setError('')
    try {
      const payload: ProjectPlanPayload = {
        title: form.title.trim(),
        area: form.area,
        target_audience: form.targetAudience.trim() || undefined,
        meeting_link: form.meetingLink.trim() || undefined,
        dri_user: form.driUser,
        purpose: form.purpose.trim(),
        success_metric_label: form.successMetricLabel.trim(),
        success_metric_value: form.successMetricValue.trim(),
        success_metric_unit: form.successMetricUnit.trim() || undefined,
        contributors: form.contributors.filter((c) => c.user),
        deliverables: form.deliverables.filter((d) => d.text.trim()),
        milestones: form.milestones.filter((m) => m.title.trim()),
        subtasks: form.subtasks.filter((s) => s.title.trim()),
        risks: form.risks.filter((r) => r.risk.trim() || r.missing.trim()),
        dependencies: form.dependencies.filter((d) => d.from_item.trim() || d.to_item.trim()),
        guardrails: form.guardrails.filter((g) => g.label.trim() || g.value.trim()),
        next_action: form.nextAction.action.trim(),
        next_action_owner: form.nextAction.owner,
        next_action_due: form.nextAction.dueDate.trim(),
        next_action_output: form.nextAction.output.trim(),
        replace_tasks: true
      }

      await projectDetailApi.saveProjectPlan(projectId, payload)
      onSaved?.()
      onClose()
    } catch (err) {
      console.error('Failed to save plan', err)
      setError('No se pudo guardar el plan.')
    } finally {
      setSaving(false)
    }
  }

  const renderUserOptions = () => (
    <>
      <option value="">Selecciona</option>
      {users.map((user) => (
        <option key={user.name} value={user.name}>{user.full_name}</option>
      ))}
    </>
  )

  const renderStep = () => {
    if (loading) {
      return <div className="p-6 text-sm text-stone-600">Cargando plan...</div>
    }

    switch (STEP_LABELS[stepIndex]) {
      case 'Base':
        return (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <label className="text-sm text-stone-600">
                Nombre del proyecto
                <input
                  value={form.title}
                  onChange={(e) => updateForm({ title: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
                />
              </label>
              <label className="text-sm text-stone-600">
                Area
                <select
                  value={form.area}
                  onChange={(e) => updateForm({ area: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
                >
                  {AREA_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <label className="text-sm text-stone-600">
                DRI (responsable final)
                <select
                  value={form.driUser}
                  onChange={(e) => updateForm({ driUser: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
                >
                  {renderUserOptions()}
                </select>
              </label>
              <label className="text-sm text-stone-600">
                Link videollamada
                <input
                  value={form.meetingLink}
                  onChange={(e) => updateForm({ meetingLink: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
                />
              </label>
            </div>
            <label className="text-sm text-stone-600">
              Target / audiencia
              <textarea
                value={form.targetAudience}
                onChange={(e) => updateForm({ targetAudience: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900 min-h-[80px]"
              />
            </label>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-stone-700">Contribuidores</h3>
                <button
                  type="button"
                  onClick={addContributor}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-[#1C1917] text-stone-700"
                >
                  <Plus size={12} /> Agregar
                </button>
              </div>
              <div className="space-y-3">
                {form.contributors.map((contributor, index) => (
                  <div key={`${contributor.user}-${index}`} className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_auto] gap-3">
                    <select
                      value={contributor.user}
                      onChange={(e) => updateContributor(index, { user: e.target.value })}
                      className="px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900 text-sm"
                    >
                      {renderUserOptions()}
                    </select>
                    <input
                      value={contributor.role || ''}
                      onChange={(e) => updateContributor(index, { role: e.target.value })}
                      placeholder="Rol"
                      className="px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeContributor(index)}
                      className="px-2 py-2 border border-[#E07A4C] text-[#B85A35]"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {form.contributors.length === 0 && (
                  <p className="text-xs text-stone-500">Agrega al menos un contribuidor.</p>
                )}
              </div>
            </div>
          </div>
        )
      case 'Proposito':
        return (
          <div className="p-6 space-y-4">
            <p className="text-sm text-stone-500">
              Formato: Verbo + resultado + para quien + periodo.
            </p>
            <textarea
              value={form.purpose}
              onChange={(e) => updateForm({ purpose: e.target.value })}
              className="w-full px-3 py-3 border border-[#E8E6E3] bg-white text-stone-900 min-h-[160px]"
            />
          </div>
        )
      case 'Entregable':
        return (
          <div className="p-6 space-y-4">
            <p className="text-sm text-stone-500">
              3 a 5 bullets, validables con si/no.
            </p>
            <div className="space-y-3">
              {form.deliverables.map((item, index) => (
                <div key={`${item.text}-${index}`} className="flex items-center gap-3">
                  <input
                    value={item.text}
                    onChange={(e) => updateDeliverable(index, { text: e.target.value })}
                    className="flex-1 px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
                  />
                  {form.deliverables.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDeliverable(index)}
                      className="px-2 py-2 border border-[#E07A4C] text-[#B85A35]"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addDeliverable}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs border border-[#1C1917] text-stone-700"
              >
                <Plus size={12} /> Agregar entregable
              </button>
            </div>
          </div>
        )
      case 'Metrica':
        return (
          <div className="p-6 space-y-4">
            <label className="text-sm text-stone-600">
              Metrica principal
              <input
                value={form.successMetricLabel}
                onChange={(e) => updateForm({ successMetricLabel: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
              />
            </label>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <label className="text-sm text-stone-600">
                Valor objetivo
                <input
                  value={form.successMetricValue}
                  onChange={(e) => updateForm({ successMetricValue: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
                />
              </label>
              <label className="text-sm text-stone-600">
                Unidad
                <input
                  value={form.successMetricUnit}
                  onChange={(e) => updateForm({ successMetricUnit: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
                />
              </label>
            </div>
          </div>
        )
      case 'Hitos':
        return (
          <div className="p-6 space-y-4">
            <p className="text-sm text-stone-500">Maximo 3 hitos.</p>
            {form.milestones.map((milestone, index) => (
              <div key={`${milestone.title}-${index}`} className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_auto] gap-3">
                <input
                  value={milestone.title}
                  onChange={(e) => updateMilestone(index, { title: e.target.value })}
                  placeholder="Hito"
                  className="px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
                />
                <select
                  value={milestone.owner || ''}
                  onChange={(e) => updateMilestone(index, { owner: e.target.value })}
                  className="px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900 text-sm"
                >
                  {renderUserOptions()}
                </select>
                <input
                  type="date"
                  value={milestone.due_date || ''}
                  onChange={(e) => updateMilestone(index, { due_date: e.target.value })}
                  className="px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
                />
                {form.milestones.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMilestone(index)}
                    className="px-2 py-2 border border-[#E07A4C] text-[#B85A35]"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
            {form.milestones.length < 3 && (
              <button
                type="button"
                onClick={addMilestone}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs border border-[#1C1917] text-stone-700"
              >
                <Plus size={12} /> Agregar hito
              </button>
            )}
          </div>
        )
      case 'Subtareas':
        return (
          <div className="p-6 space-y-4">
            <p className="text-sm text-stone-500">10 tareas con dueño y fecha.</p>
            <div className="space-y-3">
              {form.subtasks.map((task, index) => (
                <div key={`subtask-${index}`} className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr] gap-3">
                  <input
                    value={task.title}
                    onChange={(e) => updateSubtask(index, { title: e.target.value })}
                    placeholder={`Tarea ${index + 1}`}
                    className="px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
                  />
                  <select
                    value={task.owner || ''}
                    onChange={(e) => updateSubtask(index, { owner: e.target.value })}
                    className="px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900 text-sm"
                  >
                    {renderUserOptions()}
                  </select>
                  <input
                    type="date"
                    value={task.due_date || ''}
                    onChange={(e) => updateSubtask(index, { due_date: e.target.value })}
                    className="px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
                  />
                </div>
              ))}
            </div>
          </div>
        )
      case 'Riesgos':
        return (
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              {form.risks.map((risk, index) => (
                <div key={`${risk.risk}-${index}`} className="grid grid-cols-1 lg:grid-cols-[2fr_2fr_1fr_1fr_auto] gap-3">
                  <input
                    value={risk.risk}
                    onChange={(e) => updateRisk(index, { risk: e.target.value })}
                    placeholder="Que pasa"
                    className="px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
                  />
                  <input
                    value={risk.missing}
                    onChange={(e) => updateRisk(index, { missing: e.target.value })}
                    placeholder="Que falta"
                    className="px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
                  />
                  <select
                    value={risk.owner || ''}
                    onChange={(e) => updateRisk(index, { owner: e.target.value })}
                    className="px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900 text-sm"
                  >
                    {renderUserOptions()}
                  </select>
                  <input
                    type="date"
                    value={risk.due_date || ''}
                    onChange={(e) => updateRisk(index, { due_date: e.target.value })}
                    className="px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
                  />
                  {form.risks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRisk(index)}
                      className="px-2 py-2 border border-[#E07A4C] text-[#B85A35]"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addRisk}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs border border-[#1C1917] text-stone-700"
              >
                <Plus size={12} /> Agregar riesgo
              </button>
            </div>
          </div>
        )
      case 'Dependencias':
        return (
          <div className="p-6 space-y-4">
            {form.dependencies.map((dependency, index) => (
              <div key={`${dependency.from_item}-${index}`} className="grid grid-cols-1 lg:grid-cols-[2fr_2fr_1fr_auto] gap-3">
                <input
                  value={dependency.from_item}
                  onChange={(e) => updateDependency(index, { from_item: e.target.value })}
                  placeholder="Bloquea"
                  className="px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
                />
                <input
                  value={dependency.to_item}
                  onChange={(e) => updateDependency(index, { to_item: e.target.value })}
                  placeholder="Depende de"
                  className="px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
                />
                <input
                  value={dependency.notes || ''}
                  onChange={(e) => updateDependency(index, { notes: e.target.value })}
                  placeholder="Notas"
                  className="px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
                />
                {form.dependencies.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDependency(index)}
                    className="px-2 py-2 border border-[#E07A4C] text-[#B85A35]"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addDependency}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs border border-[#1C1917] text-stone-700"
            >
              <Plus size={12} /> Agregar dependencia
            </button>
          </div>
        )
      case 'Guardrails':
        return (
          <div className="p-6 space-y-4">
            {form.guardrails.map((guardrail, index) => (
              <div key={`${guardrail.label}-${index}`} className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_auto] gap-3">
                <input
                  value={guardrail.label}
                  onChange={(e) => updateGuardrail(index, { label: e.target.value })}
                  placeholder="Concepto"
                  className="px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
                />
                <input
                  value={guardrail.value}
                  onChange={(e) => updateGuardrail(index, { value: e.target.value })}
                  placeholder="Valor"
                  className="px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
                />
                <input
                  value={guardrail.unit || ''}
                  onChange={(e) => updateGuardrail(index, { unit: e.target.value })}
                  placeholder="Unidad"
                  className="px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
                />
                {form.guardrails.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeGuardrail(index)}
                    className="px-2 py-2 border border-[#E07A4C] text-[#B85A35]"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addGuardrail}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs border border-[#1C1917] text-stone-700"
            >
              <Plus size={12} /> Agregar guardrail
            </button>
          </div>
        )
      case 'Proxima accion':
        return (
          <div className="p-6 space-y-4">
            <label className="text-sm text-stone-600">
              Accion (24-72h)
              <input
                value={form.nextAction.action}
                onChange={(e) => setForm((prev) => ({
                  ...prev,
                  nextAction: { ...prev.nextAction, action: e.target.value }
                }))}
                className="mt-1 w-full px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
              />
            </label>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <label className="text-sm text-stone-600">
                Dueño
                <select
                  value={form.nextAction.owner}
                  onChange={(e) => setForm((prev) => ({
                    ...prev,
                    nextAction: { ...prev.nextAction, owner: e.target.value }
                  }))}
                  className="mt-1 w-full px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
                >
                  {renderUserOptions()}
                </select>
              </label>
              <label className="text-sm text-stone-600">
                Fecha/hora
                <input
                  type="datetime-local"
                  value={form.nextAction.dueDate}
                  onChange={(e) => setForm((prev) => ({
                    ...prev,
                    nextAction: { ...prev.nextAction, dueDate: e.target.value }
                  }))}
                  className="mt-1 w-full px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900"
                />
              </label>
            </div>
            <label className="text-sm text-stone-600">
              Output (si/no)
              <textarea
                value={form.nextAction.output}
                onChange={(e) => setForm((prev) => ({
                  ...prev,
                  nextAction: { ...prev.nextAction, output: e.target.value }
                }))}
                className="mt-1 w-full px-3 py-2 border border-[#E8E6E3] bg-white text-stone-900 min-h-[80px]"
              />
            </label>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Workshop: ${STEP_LABELS[stepIndex]}`}
      size="xl"
      progress={progress}
    >
      <div className="border-b border-[#E8E6E3] px-6 py-3 bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
        {STEP_LABELS.map((label, index) => (
          <span key={label} className={index === stepIndex ? 'text-stone-900 font-semibold' : ''}>
            {index === stepIndex ? `• ${label}` : label}
            {index < STEP_LABELS.length - 1 ? ' / ' : ''}
          </span>
        ))}
      </div>

      {error && (
        <div className="m-6 p-3 border border-[#E07A4C] bg-[#FFEBEE] text-sm text-[#B85A35]">
          {error}
        </div>
      )}

      {renderStep()}

      <div className="p-6 border-t border-[#E8E6E3] flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
          className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100"
          disabled={stepIndex === 0}
        >
          Atras
        </button>
        <div className="flex items-center gap-3">
          {stepIndex < STEP_LABELS.length - 1 && (
            <button
              type="button"
              onClick={() => setStepIndex((prev) => Math.min(prev + 1, STEP_LABELS.length - 1))}
              className="px-4 py-2 text-sm border border-[#E8E6E3] bg-white text-stone-900"
            >
              Siguiente
            </button>
          )}
          {stepIndex === STEP_LABELS.length - 1 && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm border border-[#E8E6E3] bg-[#F5CE3E] text-stone-900 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar plan'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default ProjectPlanWizard
