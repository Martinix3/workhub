// Edit Template Page - Edit existing templates
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit } from 'lucide-react'
import { TemplateEditor } from '../../components/templates/TemplateEditor'
import type { TemplateEditorData } from '../../components/templates/TemplateEditor'
import { useTemplatePreview, useTemplateMutations } from '../../api'
import { LoadingState, ErrorState } from '../../components/ui'

export function EditTemplatePage() {
  const navigate = useNavigate()
  const { id: templateId } = useParams<{ id: string }>()
  const { data: preview, loading: fetchLoading, error: fetchError } = useTemplatePreview(templateId || null)
  const { updateTemplate, loading: saveLoading } = useTemplateMutations()
  const [error, setError] = useState<string | null>(null)

  // Map template preview data to editor format
  const [initialData, setInitialData] = useState<TemplateEditorData | null>(null)

  useEffect(() => {
    if (preview) {
      setInitialData({
        template_name: preview.template.name,
        description: preview.template.description || '',
        department: preview.template.department,
        default_duration_days: preview.template.estimated_duration_days,
        tasks: preview.tasks.map((task, index) => ({
          id: `task-${index}`,
          sequence: task.sequence,
          title: task.title,
          description: task.description || '',
          offset_days: task.offset_days,
          duration_days: task.duration_days,
          default_assignee_role: task.default_assignee_role || '',
          is_milestone: task.is_milestone,
          depends_on_sequence: task.depends_on_sequence || undefined
        }))
      })
    }
  }, [preview])

  const handleSave = async (data: TemplateEditorData) => {
    if (!templateId) return

    setError(null)
    try {
      const result = await updateTemplate(templateId, {
        description: data.description,
        department: data.department,
        default_duration_days: data.default_duration_days,
        tasks: data.tasks.map(task => ({
          sequence: task.sequence,
          title: task.title,
          description: task.description,
          offset_days: task.offset_days,
          duration_days: task.duration_days,
          default_assignee_role: task.default_assignee_role,
          is_milestone: task.is_milestone,
          depends_on_sequence: task.depends_on_sequence || null
        }))
      })

      if (result.success) {
        navigate('/admin/templates')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la plantilla')
    }
  }

  const handleCancel = () => {
    navigate('/admin/templates')
  }

  // Loading state
  if (fetchLoading) {
    return <LoadingState message="Cargando plantilla..." />
  }

  // Error state
  if (fetchError || !templateId) {
    return (
      <ErrorState
        title="Error al cargar plantilla"
        message={fetchError?.message || 'ID de plantilla no válido'}
      />
    )
  }

  // No data state
  if (!initialData) {
    return <LoadingState message="Preparando editor..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/admin/templates')}
          className="
            flex items-center gap-2 mb-4
            text-neutral-500 dark:text-neutral-400
            hover:text-neutral-900 dark:hover:text-neutral-100
            transition-colors
          "
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Volver a plantillas</span>
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-100">
            <Edit size={24} className="text-neutral-900 dark:text-neutral-100" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Editar Plantilla
          </h2>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Modifica la plantilla "{initialData.template_name}" y sus tareas
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-error-light dark:bg-error-dark/20 border border-error-dark text-error-text dark:text-error">
          {error}
        </div>
      )}

      {/* Template Editor */}
      <TemplateEditor
        initialData={initialData}
        onSave={handleSave}
        onCancel={handleCancel}
        loading={saveLoading}
        saveLabel="Guardar Cambios"
      />
    </div>
  )
}

export default EditTemplatePage
