import { useState, useMemo } from 'react'
import { Search, LayoutGrid, List } from 'lucide-react'
import { TemplateCard, TemplateCardData } from './TemplateCard'
import type { Department } from '../sections/tasks/types'

type ViewMode = 'grid' | 'list'
type DepartmentFilter = Department | 'ALL'

export interface TemplateGalleryProps {
  templates: TemplateCardData[]
  onTemplateClick?: (template: TemplateCardData) => void
}

const departmentFilters: { value: DepartmentFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'SALES', label: 'Ventas' },
  { value: 'OPS', label: 'Operaciones' },
  { value: 'MKT', label: 'Marketing' },
  { value: 'PRODUCTION', label: 'Producción' },
]

export function TemplateGallery({ templates, onTemplateClick }: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState<DepartmentFilter>('ALL')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // Filter templates based on search and department
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      // Department filter
      if (departmentFilter !== 'ALL' && template.department !== departmentFilter) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = template.title.toLowerCase().includes(query)
        const matchesDescription = template.description?.toLowerCase().includes(query)
        if (!matchesTitle && !matchesDescription) {
          return false
        }
      }

      return true
    })
  }, [templates, searchQuery, departmentFilter])

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar plantillas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="
              w-full pl-9 pr-4 py-2
              bg-white dark:bg-stone-800
              border-2 border-stone-900 dark:border-stone-100
              text-sm text-stone-900 dark:text-stone-100
              placeholder:text-stone-400
              focus:outline-none focus:ring-0
            "
          />
        </div>

        {/* Department Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {departmentFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setDepartmentFilter(filter.value)}
              className={`
                px-3 py-1.5 text-xs uppercase tracking-wider whitespace-nowrap
                border-2 transition-all
                ${
                  departmentFilter === filter.value
                    ? 'bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 border-stone-900 dark:border-stone-100 font-semibold'
                    : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-700'
                }
              `}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 border-2 border-stone-900 dark:border-stone-100 bg-white dark:bg-stone-900">
          <button
            onClick={() => setViewMode('grid')}
            className={`
              p-2 transition-colors
              ${
                viewMode === 'grid'
                  ? 'bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              }
            `}
            title="Vista en cuadrícula"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`
              p-2 transition-colors
              ${
                viewMode === 'list'
                  ? 'bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              }
            `}
            title="Vista en lista"
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-stone-600 dark:text-stone-400">
        {filteredTemplates.length === templates.length ? (
          <span>
            {templates.length} {templates.length === 1 ? 'plantilla' : 'plantillas'}
          </span>
        ) : (
          <span>
            {filteredTemplates.length} de {templates.length}{' '}
            {templates.length === 1 ? 'plantilla' : 'plantillas'}
          </span>
        )}
      </div>

      {/* Templates Grid/List */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-stone-100 dark:bg-stone-800 border-2 border-stone-900 dark:border-stone-100">
            <Search size={24} className="text-stone-400" />
          </div>
          <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">
            No se encontraron plantillas
          </h3>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {searchQuery
              ? 'Intenta con una búsqueda diferente'
              : 'No hay plantillas disponibles para este departamento'}
          </p>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6'
              : 'space-y-4'
          }
        >
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.name}
              template={template}
              onClick={() => onTemplateClick?.(template)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
