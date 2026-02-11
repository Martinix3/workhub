import { GripVertical, Trash2, User } from 'lucide-react'
import type { TemplateTaskData } from './TemplateEditor'

export interface TemplateTaskRowProps {
  task: TemplateTaskData
  index: number
  isDragging: boolean
  isDragOver: boolean
  loading?: boolean
  onUpdate: (taskId: string, updates: Partial<TemplateTaskData>) => void
  onRemove: (taskId: string) => void
  onDragStart: (task: TemplateTaskData) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDragLeave: () => void
  onDrop: (index: number) => void
}

export function TemplateTaskRow({
  task,
  index,
  isDragging,
  isDragOver,
  loading = false,
  onUpdate,
  onRemove,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop
}: TemplateTaskRowProps) {
  return (
    <div
      draggable={!loading}
      onDragStart={() => onDragStart(task)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, index)}
      onDragLeave={onDragLeave}
      onDrop={() => onDrop(index)}
      className={`
        border-2 border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800
        transition-all duration-75
        ${isDragging
          ? 'opacity-50 rotate-1'
          : ''
        }
        ${isDragOver && !isDragging
          ? 'border-gold shadow-sm'
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
            className="cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            disabled={loading}
          >
            <GripVertical size={18} />
          </button>
          <span className="inline-flex items-center justify-center w-6 h-6 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold font-mono">
            {task.sequence}
          </span>
        </div>

        {/* Task Fields */}
        <div className="flex-1 space-y-3">
          {/* Title */}
          <input
            type="text"
            value={task.title}
            onChange={(e) => onUpdate(task.id, { title: e.target.value })}
            placeholder="Título de la tarea"
            className="w-full px-3 py-2 border-2 border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:border-neutral-900 dark:focus:border-neutral-100 focus:outline-none text-sm font-medium"
            disabled={loading}
          />

          {/* Description */}
          <textarea
            value={task.description}
            onChange={(e) => onUpdate(task.id, { description: e.target.value })}
            placeholder="Descripción de la tarea (opcional)"
            rows={2}
            className="w-full px-3 py-2 border-2 border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:border-neutral-900 dark:focus:border-neutral-100 focus:outline-none text-sm resize-none"
            disabled={loading}
          />

          {/* Metadata Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Offset Days */}
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Inicio (día)
              </label>
              <input
                type="number"
                min="0"
                value={task.offset_days}
                onChange={(e) => onUpdate(task.id, { offset_days: parseInt(e.target.value) || 0 })}
                className="w-full px-2 py-1.5 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-mono text-sm focus:border-neutral-900 dark:focus:border-neutral-100 focus:outline-none"
                disabled={loading}
              />
            </div>

            {/* Duration Days */}
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Duración (días)
              </label>
              <input
                type="number"
                min="1"
                value={task.duration_days}
                onChange={(e) => onUpdate(task.id, { duration_days: parseInt(e.target.value) || 1 })}
                className="w-full px-2 py-1.5 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-mono text-sm focus:border-neutral-900 dark:focus:border-neutral-100 focus:outline-none"
                disabled={loading}
              />
            </div>

            {/* Default Assignee Role */}
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Rol Asignado
              </label>
              <div className="relative">
                <User size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={task.default_assignee_role}
                  onChange={(e) => onUpdate(task.id, { default_assignee_role: e.target.value })}
                  placeholder="Ej: Manager"
                  className="w-full pl-7 pr-2 py-1.5 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm focus:border-neutral-900 dark:focus:border-neutral-100 focus:outline-none"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Depends On */}
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Depende de #
              </label>
              <input
                type="number"
                min="0"
                max={task.sequence - 1}
                value={task.depends_on_sequence || ''}
                onChange={(e) => onUpdate(task.id, {
                  depends_on_sequence: e.target.value ? parseInt(e.target.value) : undefined
                })}
                placeholder="0"
                className="w-full px-2 py-1.5 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-mono text-sm focus:border-neutral-900 dark:focus:border-neutral-100 focus:outline-none"
                disabled={loading}
              />
            </div>
          </div>

          {/* Milestone Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={task.is_milestone}
              onChange={(e) => onUpdate(task.id, { is_milestone: e.target.checked })}
              className="w-4 h-4 border border-neutral-200 checked:bg-gold"
              disabled={loading}
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              Marcar como hito
            </span>
          </label>
        </div>

        {/* Delete Button */}
        <button
          type="button"
          onClick={() => onRemove(task.id)}
          className="p-2 text-neutral-400 hover:text-error hover:bg-error-light dark:hover:bg-error-dark/20 transition-colors mt-2"
          disabled={loading}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  )
}
