// Filter Bar - Horizontal bar showing active filters with chips
import { X, Eraser, Save } from 'lucide-react'
import type { FilterCriteria } from '../../../api/services/saved-filters'
import type { TaskStatus, TaskPriority, Department } from './types'

interface FilterBarProps {
  currentFilters: FilterCriteria
  onFilterChange: (filters: FilterCriteria) => void
  onSaveClick: () => void
}

export function FilterBar({
  currentFilters,
  onFilterChange,
  onSaveClick
}: FilterBarProps) {
  // Helper to remove a specific filter
  const removeFilter = (key: keyof FilterCriteria) => {
    const newFilters = { ...currentFilters }
    if (key === 'due_date_op' || key === 'due_date_value') {
      // Remove both date-related fields
      delete newFilters.due_date_op
      delete newFilters.due_date_value
    } else {
      delete newFilters[key]
    }
    onFilterChange(newFilters)
  }

  // Clear all filters
  const clearAll = () => {
    onFilterChange({})
  }

  // Check if any filters are active
  const hasFilters = Object.keys(currentFilters).some(key => {
    const value = currentFilters[key as keyof FilterCriteria]
    return value !== null && value !== undefined && value !== ''
  })

  // Generate filter chips
  const getFilterChips = (): Array<{ key: keyof FilterCriteria; label: string; value: string }> => {
    const chips: Array<{ key: keyof FilterCriteria; label: string; value: string }> = []

    // Status filter
    if (currentFilters.status) {
      const statuses = Array.isArray(currentFilters.status)
        ? currentFilters.status
        : [currentFilters.status]
      chips.push({
        key: 'status',
        label: 'Estado',
        value: statuses.join(', ')
      })
    }

    // Priority filter
    if (currentFilters.priority) {
      const priorities = Array.isArray(currentFilters.priority)
        ? currentFilters.priority
        : [currentFilters.priority]
      chips.push({
        key: 'priority',
        label: 'Prioridad',
        value: priorities.join(', ')
      })
    }

    // Department filter
    if (currentFilters.department) {
      const deptLabels: Record<Department, string> = {
        SALES: 'Ventas',
        OPS: 'Operaciones',
        MKT: 'Marketing'
      }
      chips.push({
        key: 'department',
        label: 'Departamento',
        value: deptLabels[currentFilters.department]
      })
    }

    // Assigned to filter
    if (currentFilters.assigned_to) {
      chips.push({
        key: 'assigned_to',
        label: 'Asignado a',
        value: currentFilters.assigned_to === '$current_user' ? 'Mi usuario' : currentFilters.assigned_to
      })
    }

    // Project filter
    if (currentFilters.project) {
      chips.push({
        key: 'project',
        label: 'Proyecto',
        value: currentFilters.project
      })
    }

    // Due date filter
    if (currentFilters.due_date_op && currentFilters.due_date_value) {
      const opLabels: Record<string, string> = {
        '<': 'Antes de',
        '>': 'Después de',
        'between': 'Entre',
        'in_range': 'En'
      }
      const valueLabels: Record<string, string> = {
        '$today': 'Hoy',
        '$this_week': 'Esta semana',
        '$this_month': 'Este mes'
      }
      const opLabel = opLabels[currentFilters.due_date_op] || currentFilters.due_date_op
      const valueLabel = valueLabels[currentFilters.due_date_value] || currentFilters.due_date_value
      chips.push({
        key: 'due_date_op', // We'll handle removing both date fields
        label: 'Vencimiento',
        value: `${opLabel} ${valueLabel}`
      })
    }

    // Search filter
    if (currentFilters.search) {
      chips.push({
        key: 'search',
        label: 'Búsqueda',
        value: `"${currentFilters.search}"`
      })
    }

    return chips
  }

  const filterChips = getFilterChips()

  // Don't render if no filters
  if (!hasFilters) {
    return null
  }

  return (
    <div className="
      bg-white
      border-b border-neutral-200
      px-4 lg:px-8 py-3
    ">
      <div className="max-w-full mx-auto flex items-center justify-between gap-4">
        {/* Filter Chips */}
        <div className="flex-1 flex items-center gap-2 flex-wrap min-w-0">
          {filterChips.map((chip) => (
            <div
              key={chip.key}
              className="
                inline-flex items-center gap-2
                px-3 py-1.5
                bg-neutral-100
                border border-neutral-200
                transition-all duration-75
              "
            >
              <span className="text-xs font-bold text-neutral-500 uppercase">
                {chip.label}:
              </span>
              <span className="text-sm font-medium text-neutral-900">
                {chip.value}
              </span>
              <button
                onClick={() => removeFilter(chip.key)}
                className="
                  ml-1 p-0.5
                  text-neutral-500 hover:text-error
                  transition-colors
                "
                title={`Eliminar filtro de ${chip.label}`}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Clear All Button */}
          <button
            onClick={clearAll}
            className="
              px-3 py-1.5
              flex items-center gap-2
              bg-white hover:bg-neutral-50
              text-neutral-700 font-medium text-sm
              border border-neutral-200
              shadow-sm
              transition-all duration-75
            "
            title="Limpiar todos los filtros"
          >
            <Eraser size={14} />
            Limpiar
          </button>

          {/* Save Filter Button */}
          <button
            onClick={onSaveClick}
            className="
              px-3 py-1.5
              flex items-center gap-2
              bg-gold hover:bg-gold-dark
              text-neutral-900 font-medium text-sm
              border border-neutral-200
              shadow-sm
              transition-all duration-75
            "
            title="Guardar vista actual"
          >
            <Save size={14} />
            Guardar vista
          </button>
        </div>
      </div>
    </div>
  )
}

export default FilterBar
