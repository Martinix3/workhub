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
        onClick={() => onFilterSelect(filter)}
        className={`
          w-full px-3 py-2.5
          flex items-center justify-between gap-2
          border-2 border-stone-900
          transition-all duration-75
          ${isActive
            ? 'bg-amber-400 shadow-[3px_3px_0_#1c1917] translate-x-[1px] translate-y-[1px]'
            : 'bg-white hover:bg-stone-50 shadow-[2px_2px_0_#1c1917] hover:shadow-[3px_3px_0_#1c1917] hover:translate-x-[-1px] hover:translate-y-[-1px]'
          }
        `}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isPreset && (
            <span className={`flex-shrink-0 ${isActive ? 'text-stone-900' : 'text-stone-600'}`}>
              {getPresetIcon(filter.title)}
            </span>
          )}
          {!isPreset && filter.icon && (
            <span className="flex-shrink-0 text-base">{filter.icon}</span>
          )}
          <span className={`
            text-sm font-medium truncate
            ${isActive ? 'text-stone-900' : 'text-stone-700'}
          `}>
            {filter.title}
          </span>
        </div>

        {count > 0 && (
          <span className={`
            px-2 py-0.5
            text-xs font-bold font-mono
            border border-stone-900
            flex-shrink-0
            ${isActive
              ? 'bg-stone-900 text-amber-400'
              : 'bg-stone-900 text-white'
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
      <div className="w-64 bg-white border-r-2 border-stone-900 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-stone-200 border-2 border-stone-900" />
          <div className="h-10 bg-stone-100 border-2 border-stone-900" />
          <div className="h-10 bg-stone-100 border-2 border-stone-900" />
          <div className="h-10 bg-stone-100 border-2 border-stone-900" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 bg-white border-r-2 border-stone-900 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b-2 border-stone-900">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
          VISTAS
        </h2>
      </div>

      {/* Scrollable Filters Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Preset Filters Section */}
        {presetFilters.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-1 mb-3">
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
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-1 mb-3">
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
            <p className="text-xs text-stone-400 leading-relaxed">
              Guarda tus filtros favoritos para acceso rápido
            </p>
          </div>
        )}
      </div>

      {/* New Filter Button */}
      <div className="p-4 border-t-2 border-stone-900">
        <button
          onClick={onCreateNew}
          className="
            w-full px-4 py-3
            flex items-center justify-center gap-2
            bg-amber-400 hover:bg-amber-500
            text-stone-900 font-medium text-sm uppercase tracking-wider
            border-2 border-stone-900
            shadow-[2px_2px_0_#1c1917]
            hover:shadow-[3px_3px_0_#1c1917]
            hover:translate-x-[-1px] hover:translate-y-[-1px]
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
