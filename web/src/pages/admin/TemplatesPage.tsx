// Admin Templates Page - Manage department workflow templates
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Copy, Trash2, Layers } from 'lucide-react'
import { useTemplates, useTemplateMutations } from '../../api'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import type { TemplateCardData } from '../../components/templates/TemplateCard'

export function AdminTemplatesPage() {
  const navigate = useNavigate()
  const { data: templates, loading, error, refetch } = useTemplates()
  const { deleteTemplate, duplicateTemplate } = useTemplateMutations()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)

  const handleEdit = (templateName: string) => {
    navigate(`/admin/templates/${encodeURIComponent(templateName)}/edit`)
  }

  const handleDuplicate = async (templateName: string) => {
    if (duplicatingId || !confirm('¿Duplicar esta plantilla?')) return

    setDuplicatingId(templateName)
    try {
      const result = await duplicateTemplate(templateName)
      alert(`Plantilla duplicada: ${result.template_name}`)
      refetch()
    } catch (err) {
      alert('Error al duplicar plantilla')
    } finally {
      setDuplicatingId(null)
    }
  }

  const handleDelete = async (templateName: string) => {
    if (deletingId || !confirm('¿Estás seguro de eliminar esta plantilla? Esta acción no se puede deshacer.')) return

    setDeletingId(templateName)
    try {
      await deleteTemplate(templateName)
      alert('Plantilla eliminada correctamente')
      refetch()
    } catch (err) {
      alert('Error al eliminar plantilla')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading && !templates) {
    return <LoadingState message="Cargando plantillas..." />
  }

  if (error) {
    return (
      <ErrorState
        title="Error al cargar plantillas"
        message="No se pudieron cargar las plantillas del sistema."
        error={error}
        onRetry={refetch}
      />
    )
  }

  // Transform templates to include action buttons
  const templatesWithActions: TemplateCardData[] = (templates || []).map(template => ({
    name: template.name,
    title: template.name,
    description: template.description,
    department: template.department as any,
    task_count: template.task_count,
    estimated_duration_days: template.estimated_duration_days,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-100">
              <Layers size={24} className="text-neutral-900 dark:text-neutral-100" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Gestión de Plantillas
            </h2>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Administra las plantillas de workflow para los departamentos
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/templates/new')}
          className="
            flex items-center gap-2 px-4 py-2
            bg-neutral-900 dark:bg-neutral-100
            text-neutral-100 dark:text-neutral-900
            border border-neutral-200 dark:border-neutral-100
            transition-all duration-75
            font-medium text-sm
          "
        >
          <Plus size={18} />
          Nueva Plantilla
        </button>
      </div>

      {/* Templates List with Admin Actions */}
      {templatesWithActions.length === 0 ? (
        <div className="
          text-center py-16
          bg-white dark:bg-neutral-900
          border border-neutral-200 dark:border-neutral-100
        ">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-100">
            <Layers size={28} className="text-neutral-400" />
          </div>
          <h3 className="font-heading text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            No hay plantillas disponibles
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
            Crea tu primera plantilla para comenzar
          </p>
          <button
            onClick={() => navigate('/admin/templates/new')}
            className="
              inline-flex items-center gap-2 px-4 py-2
              bg-neutral-900 dark:bg-neutral-100
              text-neutral-100 dark:text-neutral-900
              border border-neutral-200 dark:border-neutral-100
              transition-all duration-75
              font-medium text-sm
            "
          >
            <Plus size={18} />
            Nueva Plantilla
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {templatesWithActions.map((template) => {
            const deptConfig: Record<string, { bg: string; text: string; label: string }> = {
              SALES: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Ventas' },
              OPS: { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Operaciones' },
              MKT: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Marketing' },
              PRODUCTION: { bg: 'bg-success-light', text: 'text-success-text', label: 'Producción' },
            }
            const config = deptConfig[template.department] || deptConfig.SALES

            return (
              <div
                key={template.name}
                className="
                  bg-white dark:bg-neutral-900
                  border border-neutral-200 dark:border-neutral-100
                  p-4 lg:p-6
                  flex flex-col
                "
              >
                {/* Department Badge */}
                <div className="mb-3">
                  <span
                    className={`
                      inline-block px-2.5 py-1
                      text-xs font-medium uppercase tracking-wider
                      ${config.bg} ${config.text}
                      dark:opacity-90
                    `}
                  >
                    {config.label}
                  </span>
                </div>

                {/* Template Name */}
                <h3 className="font-heading text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                  {template.title}
                </h3>

                {/* Separator */}
                <div className="w-12 h-0.5 bg-neutral-900 dark:bg-neutral-100 mb-3" />

                {/* Description */}
                {template.description && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 line-clamp-2 flex-1">
                    {template.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Layers size={16} />
                    <span className="font-mono font-medium">
                      {template.task_count} {template.task_count === 1 ? 'tarea' : 'tareas'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-medium">
                      {template.estimated_duration_days} {template.estimated_duration_days === 1 ? 'día' : 'días'}
                    </span>
                  </div>
                </div>

                {/* Admin Action Buttons */}
                <div className="flex items-center gap-2 pt-4 border-t-2 border-neutral-200 dark:border-neutral-700">
                  <button
                    onClick={() => handleEdit(template.name)}
                    disabled={deletingId === template.name || duplicatingId === template.name}
                    className="
                      flex-1 flex items-center justify-center gap-2 px-3 py-2
                      bg-neutral-100 dark:bg-neutral-800
                      text-neutral-900 dark:text-neutral-100
                      border border-neutral-200 dark:border-neutral-100
                      hover:bg-neutral-900 hover:text-neutral-100
                      dark:hover:bg-neutral-100 dark:hover:text-neutral-900
                      transition-colors duration-75
                      text-sm font-medium
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                    title="Editar plantilla"
                  >
                    <Edit2 size={14} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDuplicate(template.name)}
                    disabled={deletingId === template.name || duplicatingId === template.name}
                    className="
                      flex items-center justify-center px-3 py-2
                      bg-neutral-100 dark:bg-neutral-800
                      text-neutral-900 dark:text-neutral-100
                      border border-neutral-200 dark:border-neutral-100
                      hover:bg-neutral-900 hover:text-neutral-100
                      dark:hover:bg-neutral-100 dark:hover:text-neutral-900
                      transition-colors duration-75
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                    title="Duplicar plantilla"
                  >
                    {duplicatingId === template.name ? (
                      <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(template.name)}
                    disabled={deletingId === template.name || duplicatingId === template.name}
                    className="
                      flex items-center justify-center px-3 py-2
                      bg-neutral-100 dark:bg-neutral-800
                      text-error-dark dark:text-error
                      border border-neutral-200 dark:border-neutral-100
                      hover:bg-error-dark hover:text-neutral-100
                      dark:hover:bg-error dark:hover:text-neutral-900
                      transition-colors duration-75
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                    title="Eliminar plantilla"
                  >
                    {deletingId === template.name ? (
                      <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AdminTemplatesPage
