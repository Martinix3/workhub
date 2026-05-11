// Save Filter Modal - Neobrutalist style
import { useState } from 'react'
import { Save, X } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { useSavedFilterMutations } from '../../../api'
import type { FilterCriteria } from '../../../api/services/saved-filters'
import type { TaskStatus, TaskPriority, Department } from './types'

interface SaveFilterModalProps {
  isOpen: boolean
  onClose: () => void
  currentFilters: FilterCriteria
  onSaved?: () => void
}

export function SaveFilterModal({
  isOpen,
  onClose,
  currentFilters,
  onSaved
}: SaveFilterModalProps) {
  const [title, setTitle] = useState('')
  const [isShared, setIsShared] = useState(false)
  const { createFilter, loading, error } = useSavedFilterMutations()

  const handleSave = async () => {
    if (!title.trim()) return

    const result = await createFilter({
      title: title.trim(),
      entity_type: 'task',
      filter_json: currentFilters,
      is_shared: isShared
    })

    if (result) {
      // Reset form
      setTitle('')
      setIsShared(false)
      onSaved?.()
      onClose()
    }
  }

  const handleCancel = () => {
    setTitle('')
    setIsShared(false)
    onClose()
  }

  // Helper to format filter criteria into readable chips
  const getFilterChips = (): Array<{ label: string; value: string }> => {
    const chips: Array<{ label: string; value: string }> = []

    // Status filter
    if (currentFilters.status) {
      const statuses = Array.isArray(currentFilters.status)
        ? currentFilters.status
        : [currentFilters.status]
      chips.push({
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
        label: 'Prioridad',
        value: priorities.join(', ')
      })
    }

    // Department filter
    if (currentFilters.department) {
      const deptLabels: Record<Department, string> = {
        SALES: 'Ventas',
        OPS: 'Operaciones',
        PRODUCTION: 'Producción',
        MKT: 'Marketing'
      }
      chips.push({
        label: 'Departamento',
        value: deptLabels[currentFilters.department]
      })
    }

    // Assigned to filter
    if (currentFilters.assigned_to) {
      chips.push({
        label: 'Asignado a',
        value: currentFilters.assigned_to === '$current_user' ? 'Mi usuario' : currentFilters.assigned_to
      })
    }

    // Project filter
    if (currentFilters.project) {
      chips.push({
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
        label: 'Vencimiento',
        value: `${opLabel} ${valueLabel}`
      })
    }

    // Search filter
    if (currentFilters.search) {
      chips.push({
        label: 'Búsqueda',
        value: currentFilters.search
      })
    }

    return chips
  }

  const filterChips = getFilterChips()

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Guardar Vista" size="md">
      <div data-testid="save-filter-modal" className="p-6 space-y-6">
        {/* Error message */}
        {error && (
          <div data-testid="error-message" className="p-3 bg-error-light border-2 border-error-dark text-error-text text-sm">
            {error.message}
          </div>
        )}

        {/* Title input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-700">
            Nombre de la vista
          </label>
          <input
            data-testid="filter-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Tareas de ventas urgentes"
            className="
              w-full px-3 py-2
              bg-white
              border border-neutral-200
              shadow-sm
              focus:outline-none focus:ring-2 focus:ring-gold
              transition-all duration-75
              font-medium text-neutral-900
            "
            autoFocus
          />
        </div>

        {/* Current filters summary */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-700">
            Filtros a guardar
          </label>
          {filterChips.length > 0 ? (
            <div data-testid="filter-chips" className="flex flex-wrap gap-2">
              {filterChips.map((chip, idx) => (
                <div
                  key={idx}
                  data-testid={`filter-chip-${idx}`}
                  className="
                    inline-flex items-center gap-2
                    px-3 py-1.5
                    bg-neutral-100
                    border border-neutral-200
                  "
                >
                  <span className="text-xs font-bold text-neutral-500 uppercase">
                    {chip.label}:
                  </span>
                  <span className="text-sm font-medium text-neutral-900">
                    {chip.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              data-testid="no-filters-message"
              className="
              p-4
              bg-neutral-50
              border border-neutral-200
              text-center
            ">
              <p className="text-sm text-neutral-500">
                Sin filtros activos
              </p>
            </div>
          )}
        </div>

        {/* Share with team checkbox */}
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              data-testid="share-toggle"
              type="checkbox"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              className="sr-only peer"
            />
            <div className="
              w-11 h-6
              bg-neutral-300
              border border-neutral-200
              peer-focus:ring-2 peer-focus:ring-gold
              peer
              peer-checked:after:translate-x-full
              after:content-['']
              after:absolute
              after:top-[2px]
              after:left-[2px]
              after:bg-white
              after:border
              after:border-neutral-200
              after:h-5
              after:w-5
              after:transition-all
              peer-checked:bg-gold
            "></div>
          </label>
          <label className="text-sm font-medium text-neutral-700 cursor-pointer">
            Compartir con equipo
          </label>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
          <button
            data-testid="cancel-button"
            onClick={handleCancel}
            disabled={loading}
            className="
              px-4 py-2
              bg-white
              text-neutral-700 font-medium text-sm
              border border-neutral-200
              shadow-sm
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-75
            "
          >
            Cancelar
          </button>
          <button
            data-testid="save-button"
            onClick={handleSave}
            disabled={loading || !title.trim()}
            className="
              px-4 py-2
              flex items-center gap-2
              bg-gold hover:bg-gold-dark
              text-neutral-900 font-medium text-sm
              border border-neutral-200
              shadow-sm
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-75
            "
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                Guardando...
              </>
            ) : (
              <>
                <Save size={16} />
                Guardar
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default SaveFilterModal
