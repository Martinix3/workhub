// New Template Page - Create templates from scratch
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, PlusCircle } from 'lucide-react'
import { TemplateEditor } from '../../components/templates/TemplateEditor'
import type { TemplateEditorData } from '../../components/templates/TemplateEditor'
import { useTemplateMutations } from '../../api'

export function NewTemplatePage() {
  const navigate = useNavigate()
  const { createTemplate, loading } = useTemplateMutations()
  const [error, setError] = useState<string | null>(null)

  const handleSave = async (data: TemplateEditorData) => {
    setError(null)
    try {
      const result = await createTemplate({
        template_name: data.template_name,
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
          depends_on_sequence: task.depends_on_sequence
        }))
      })

      if (result.success) {
        navigate('/admin/templates')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la plantilla')
    }
  }

  const handleCancel = () => {
    navigate('/admin/templates')
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
            <PlusCircle size={24} className="text-neutral-900 dark:text-neutral-100" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Nueva Plantilla
          </h2>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Crea una nueva plantilla de workflow desde cero con tareas personalizadas
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
        onSave={handleSave}
        onCancel={handleCancel}
        loading={loading}
        saveLabel="Crear Plantilla"
      />
    </div>
  )
}

export default NewTemplatePage
