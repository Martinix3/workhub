import { Calendar, ListChecks } from 'lucide-react'
import type { Department } from '../sections/tasks/types'

export interface TemplateCardData {
  name: string
  title: string
  description?: string
  department: Department | 'PRODUCTION'
  task_count: number
  estimated_duration_days: number
}

interface TemplateCardProps {
  template: TemplateCardData
  onClick?: () => void
}

const departmentConfig: Record<Department | 'PRODUCTION', { bg: string; text: string; label: string }> = {
  SALES: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Ventas' },
  OPS: { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Operaciones' },
  MKT: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Marketing' },
  PRODUCTION: { bg: 'bg-green-100', text: 'text-green-700', label: 'Producción' },
}

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  const deptConfig = departmentConfig[template.department]

  return (
    <button
      onClick={onClick}
      className="
        w-full text-left bg-white dark:bg-stone-900
        border-2 border-stone-900 dark:border-stone-100
        shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9]
        hover:shadow-[2px_2px_0_#1c1917] dark:hover:shadow-[2px_2px_0_#fafaf9]
        hover:translate-x-[2px] hover:translate-y-[2px]
        transition-all duration-75
        p-4 lg:p-6
        group
      "
    >
      {/* Department Badge */}
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

      {/* Template Name */}
      <h3 className="font-serif text-xl lg:text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2 group-hover:underline">
        {template.title}
      </h3>

      {/* Separator */}
      <div className="w-12 h-0.5 bg-stone-900 dark:bg-stone-100 mb-3" />

      {/* Description */}
      {template.description && (
        <p className="text-sm text-stone-600 dark:text-stone-400 mb-4 line-clamp-2">
          {template.description}
        </p>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-4 text-sm text-stone-500 dark:text-stone-400">
        {/* Task Count */}
        <div className="flex items-center gap-1.5">
          <ListChecks size={16} />
          <span className="font-mono font-medium">
            {template.task_count} {template.task_count === 1 ? 'tarea' : 'tareas'}
          </span>
        </div>

        {/* Duration Estimate */}
        <div className="flex items-center gap-1.5">
          <Calendar size={16} />
          <span className="font-mono font-medium">
            {template.estimated_duration_days} {template.estimated_duration_days === 1 ? 'día' : 'días'}
          </span>
        </div>
      </div>
    </button>
  )
}
