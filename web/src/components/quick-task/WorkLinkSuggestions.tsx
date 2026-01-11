// WorkLink Suggestions Component
// Displays clickable chips with ERP document suggestions for WorkLink creation

import { Link2, Loader2, AlertCircle } from 'lucide-react'
import type { WorkLinkSuggestion, WorkLinkSuggestionsProps } from './types'

export function WorkLinkSuggestions({
  suggestions,
  loading = false,
  error = null,
  onSelect,
  selectedDoctype,
  selectedDocId
}: WorkLinkSuggestionsProps) {
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <Loader2 size={16} className="animate-spin" />
        <span>Cargando sugerencias...</span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
        <AlertCircle size={16} />
        <span>Error al cargar sugerencias</span>
      </div>
    )
  }

  // Empty state
  if (suggestions.length === 0) {
    return (
      <div className="p-3 bg-stone-50 border border-stone-200 text-stone-500 text-sm">
        No hay documentos ERP recientes para vincular
      </div>
    )
  }

  // Suggestions list
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-stone-700">
        <Link2 size={16} />
        <span>Vincular con documento ERP:</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => {
          const isSelected =
            selectedDoctype === suggestion.source_doctype &&
            selectedDocId === suggestion.source_id

          return (
            <button
              key={`${suggestion.source_doctype}-${suggestion.source_id}`}
              type="button"
              onClick={() => onSelect?.(suggestion)}
              className={`
                relative px-3 py-2 text-sm font-medium border-2 transition-all
                ${
                  isSelected
                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                    : 'bg-white border-stone-300 hover:border-stone-400 text-stone-700'
                }
                hover:shadow-[2px_2px_0_#1c1917]
                active:translate-x-[1px] active:translate-y-[1px]
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {/* Document info */}
              <div className="flex flex-col items-start gap-0.5">
                <span className="font-mono text-xs text-stone-500">
                  {suggestion.source_doctype}
                </span>
                <span>{suggestion.display_name}</span>
              </div>

              {/* Already has WorkLink badge */}
              {suggestion.has_worklink && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 border border-stone-900 rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend for badge */}
      {suggestions.some((s) => s.has_worklink) && (
        <p className="text-xs text-stone-500 mt-2">
          <span className="inline-block w-2 h-2 bg-amber-400 border border-stone-900 rounded-full mr-1" />
          Ya tiene tareas vinculadas
        </p>
      )}
    </div>
  )
}

export default WorkLinkSuggestions
