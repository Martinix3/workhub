// Saved Filters Sidebar Panel - Neobrutalist style
import { User, AlertTriangle, Calendar, Plus } from 'lucide-react'
import { useSavedFilters, useFilterCounts } from '../../../api'
import type { SavedFilter } from '../../../api/services/saved-filters'

interface SavedFiltersPanelProps {
  activeFilterId?: string | null
  onFilterSelect: (filter: SavedFilter) => void
  onCreateNew: () => void
}

export function SavedFiltersPanel({
  activeFilterId,
  onFilterSelect,
  onCreateNew
}: SavedFiltersPanelProps) {
  const { data: filters, loading } = useSavedFilters('task')
  const { data: counts } = useFilterCounts(30000) // Poll every 30s

  // Separate presets from custom filters
  const presetFilters = filters?.filter(f => f.is_preset) || []
  const customFilters = filters?.filter(f => !f.is_preset) || []

  // Icon mapping for preset filters
  const getPresetIcon = (title: string) => {
    if (title.includes('Mis Tareas')) return <User size={16} />
    if (title.includes('Vencidas')) return <AlertTriangle size={16} />
    if (title.includes('Esta Semana')) return <Calendar size={16} />
    return null
  }

  const renderFilterItem = (filter: SavedFilter, isPreset: boolean = false) => {
    const isActive = activeFilterId === filter.name
    const count = counts?.[filter.name] || 0

    return (
      <button
        key={filter.name}
        data-testid={`filter-item-${filter.name}`}
        onClick={() => onFilterSelect(filter)}
        className={`
          w-full px-3 py-2.5
          flex items-center justify-between gap-2
          border border-neutral-200
          transition-all duration-75
          ${isActive
            ? 'bg-gold'
            : 'bg-white hover:bg-neutral-50 shadow-sm'
          }
        `}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isPreset && (
            <span className={`flex-shrink-0 ${isActive ? 'text-neutral-900' : 'text-neutral-600'}`}>
              {getPresetIcon(filter.title)}
            </span>
          )}
          {!isPreset && filter.icon && (
            <span className="flex-shrink-0 text-base">{filter.icon}</span>
          )}
          <span className={`
            text-sm font-medium truncate
            ${isActive ? 'text-neutral-900' : 'text-neutral-700'}
          `}>
            {filter.title}
          </span>
        </div>

        {count > 0 && (
          <span
            data-testid={`filter-count-${filter.name}`}
            className={`
            px-2 py-0.5
            text-xs font-bold font-mono
            border border-neutral-900
            flex-shrink-0
            ${isActive
              ? 'bg-neutral-900 text-gold'
              : 'bg-neutral-900 text-white'
            }
          `}>
            {count}
          </span>
        )}
      </button>
    )
  }

  if (loading) {
    return (
      <div className="w-64 bg-white border-r border-neutral-200 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-neutral-200 border border-neutral-200" />
          <div className="h-10 bg-neutral-100 border border-neutral-200" />
          <div className="h-10 bg-neutral-100 border border-neutral-200" />
          <div className="h-10 bg-neutral-100 border border-neutral-200" />
        </div>
      </div>
    )
  }

  return (
    <div data-testid="saved-filters-panel" className="w-64 bg-white border-r border-neutral-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
          VISTAS
        </h2>
      </div>

      {/* Scrollable Filters Container */}
      <div data-testid="filters-container" className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Preset Filters Section */}
        {presetFilters.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-1 mb-3">
              Filtros Rápidos
            </h3>
            <div className="space-y-2">
              {presetFilters.map(filter => renderFilterItem(filter, true))}
            </div>
          </div>
        )}

        {/* Custom Filters Section */}
        {customFilters.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-1 mb-3">
              Mis Vistas
            </h3>
            <div className="space-y-2">
              {customFilters.map(filter => renderFilterItem(filter, false))}
            </div>
          </div>
        )}

        {/* Empty State for Custom Filters */}
        {customFilters.length === 0 && (
          <div className="text-center py-8 px-4">
            <p className="text-xs text-neutral-400 leading-relaxed">
              Guarda tus filtros favoritos para acceso rápido
            </p>
          </div>
        )}
      </div>

      {/* New Filter Button */}
      <div className="p-4 border-t border-neutral-200">
        <button
          data-testid="new-filter-button"
          onClick={onCreateNew}
          className="
            w-full px-4 py-3
            flex items-center justify-center gap-2
            bg-gold hover:bg-gold-dark
            text-neutral-900 font-medium text-sm uppercase tracking-wider
            border border-neutral-200
            shadow-sm
            transition-all duration-75
          "
        >
          <Plus size={16} />
          Nueva Vista
        </button>
      </div>
    </div>
  )
}

export default SavedFiltersPanel
