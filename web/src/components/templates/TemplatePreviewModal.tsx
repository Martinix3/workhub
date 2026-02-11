import { Modal } from '../ui/Modal'
import { Calendar, ListChecks, Milestone, ArrowRight, Network } from 'lucide-react'
import type {
  Department,
  TemplateTask,
  TemplateMilestone,
  TemplateDependency,
  TemplatePreview
} from '../sections/tasks/types'

// Re-export types for convenience
export type {
  TemplateTask,
  TemplateMilestone,
  TemplateDependency
}

// Alias for backward compatibility
export type TemplatePreviewData = TemplatePreview

interface TemplatePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  templateData: TemplatePreviewData | null
  onUseTemplate: () => void
  loading?: boolean
}

const departmentConfig: Record<Department, { bg: string; text: string; label: string }> = {
  SALES: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Ventas' },
  OPS: { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Operaciones' },
  MKT: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Marketing' },
  PRODUCTION: { bg: 'bg-success-light', text: 'text-success-text', label: 'Producción' },
}

export function TemplatePreviewModal({
  isOpen,
  onClose,
  templateData,
  onUseTemplate,
  loading = false
}: TemplatePreviewModalProps) {
  if (!templateData) return null

  const deptConfig = departmentConfig[templateData.template.department]

  // Group tasks: milestones and regular tasks
  const sortedTasks = [...templateData.tasks].sort((a, b) => a.sequence - b.sequence)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vista Previa de Plantilla"
      size="xl"
    >
      <div className="p-6 space-y-6">
        {/* Template Header */}
        <div>
          <div className="mb-3">
            <span
              className={`
                inline-block px-2.5 py-1
                text-xs font-medium uppercase tracking-wider
                ${deptConfig.bg} ${deptConfig.text}
                dark:opacity-90
              `}
            >
              {deptConfig.label}
            </span>
          </div>

          <h3 className="font-heading text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            {templateData.template.name}
          </h3>

          <div className="w-16 h-0.5 bg-neutral-900 dark:bg-neutral-100 mb-3" />

          {templateData.template.description && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              {templateData.template.description}
            </p>
          )}

          {/* Template Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
            <div className="flex items-center gap-1.5">
              <ListChecks size={16} />
              <span className="font-mono font-medium">
                {templateData.template.task_count} {templateData.template.task_count === 1 ? 'tarea' : 'tareas'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Milestone size={16} />
              <span className="font-mono font-medium">
                {templateData.template.milestone_count} {templateData.template.milestone_count === 1 ? 'hito' : 'hitos'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Calendar size={16} />
              <span className="font-mono font-medium">
                {templateData.template.estimated_duration_days} {templateData.template.estimated_duration_days === 1 ? 'día' : 'días'}
              </span>
            </div>

            {templateData.dependencies.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Network size={16} />
                <span className="font-mono font-medium">
                  {templateData.dependencies.length} {templateData.dependencies.length === 1 ? 'dependencia' : 'dependencias'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Separator */}
        <div className="border-t-2 border-neutral-200 dark:border-neutral-700" />

        {/* Tasks Timeline */}
        <div>
          <h4 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            Cronograma de Tareas
          </h4>

          <div className="space-y-2">
            {sortedTasks.map((task, index) => {
              const hasDependency = task.depends_on_sequence !== null && task.depends_on_sequence !== undefined
              const dependency = hasDependency
                ? templateData.dependencies.find(d => d.to_sequence === task.sequence)
                : null

              return (
                <div
                  key={task.sequence}
                  className={`
                    relative
                    bg-white dark:bg-neutral-800
                    border-2 transition-colors
                    ${
                      task.is_milestone
                        ? 'border-gold dark:border-gold-dark'
                        : 'border-neutral-200 dark:border-neutral-700'
                    }
                    p-3 lg:p-4
                  `}
                >
                  {/* Task Header */}
                  <div className="flex items-start gap-3">
                    {/* Sequence Badge */}
                    <div
                      className={`
                        flex-shrink-0 w-8 h-8 flex items-center justify-center
                        font-mono text-xs font-bold
                        ${
                          task.is_milestone
                            ? 'bg-gold-light dark:bg-gold-dark text-gold-dark dark:text-gold border-2 border-gold dark:border-gold-dark'
                            : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                        }
                      `}
                    >
                      {task.is_milestone ? <Milestone size={16} /> : task.sequence}
                    </div>

                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                        {task.title}
                        {task.is_milestone && (
                          <span className="ml-2 text-xs font-bold uppercase tracking-wider text-gold-dark dark:text-gold">
                            Hito
                          </span>
                        )}
                      </h5>

                      {task.description && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Task Metadata */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                        <span className="font-mono">
                          Inicio: Día {task.offset_days}
                        </span>
                        <span className="font-mono">
                          Duración: {task.duration_days} {task.duration_days === 1 ? 'día' : 'días'}
                        </span>
                        {task.default_assignee_role && (
                          <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                            {task.default_assignee_role}
                          </span>
                        )}
                      </div>

                      {/* Dependency Indicator */}
                      {dependency && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400">
                          <ArrowRight size={12} />
                          <span>Depende de: {dependency.from_title}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Milestones Summary */}
        {templateData.milestones.length > 0 && (
          <>
            <div className="border-t-2 border-neutral-200 dark:border-neutral-700" />

            <div>
              <h4 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
                <Milestone size={20} />
                Hitos Principales
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {templateData.milestones.map((milestone) => (
                  <div
                    key={milestone.sequence}
                    className="
                      bg-gold-light dark:bg-gold-dark/20
                      border-2 border-gold dark:border-gold-dark
                      p-3
                    "
                  >
                    <div className="flex items-start gap-2">
                      <Milestone size={16} className="text-gold-dark dark:text-gold flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-neutral-900 dark:text-neutral-100 text-sm mb-1">
                          {milestone.title}
                        </h5>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">
                          Día {milestone.offset_days}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Action Button */}
        <div className="border-t-2 border-neutral-200 dark:border-neutral-700 pt-6">
          <button
            onClick={onUseTemplate}
            disabled={loading}
            className="
              w-full flex items-center justify-center gap-2
              px-6 py-3
              bg-gold hover:bg-gold-dark
              text-neutral-900 font-medium uppercase tracking-wider
              border border-neutral-200
              shadow-sm
              hover:shadow-md
              transition-all duration-75
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Usar Esta Plantilla
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </Modal>
  )
}
