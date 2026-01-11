// WorkLink Suggestions Component
// Displays document suggestions with accept/dismiss actions
import { Check, X, FileText, Package, TrendingUp, DollarSign, Briefcase, Calendar, AlertCircle, Search } from 'lucide-react'
import type { WorkLinkSuggestion } from '../../../api/services/worklink-suggestions'
import type { WorkLinkDocType, WorkLinkDocTypeConfig } from './types'

interface WorkLinkSuggestionsProps {
  suggestions: WorkLinkSuggestion[]
  loading?: boolean
  error?: Error | null
  onAccept: (doctype: string, docId: string, confidence: number) => void
  onDismiss: (doctype: string, docId: string, confidence: number) => void
  onManualSearch?: () => void
  className?: string
}

// Map DocTypes to icons and Spanish labels
export const DOCTYPE_CONFIG: Record<WorkLinkDocType, WorkLinkDocTypeConfig> = {
  'Sales Order': { icon: <DollarSign size={16} />, label: 'Pedido', color: 'text-green-600' },
  'Delivery Note': { icon: <Package size={16} />, label: 'Entrega', color: 'text-blue-600' },
  'Sales Invoice': { icon: <FileText size={16} />, label: 'Factura', color: 'text-purple-600' },
  'Payment Entry': { icon: <DollarSign size={16} />, label: 'Pago', color: 'text-green-600' },
  'Purchase Order': { icon: <Briefcase size={16} />, label: 'Compra', color: 'text-orange-600' },
  'Purchase Receipt': { icon: <Package size={16} />, label: 'Recepción', color: 'text-blue-600' },
  'Purchase Invoice': { icon: <FileText size={16} />, label: 'Factura Compra', color: 'text-purple-600' },
  'Work Order': { icon: <Briefcase size={16} />, label: 'Orden Producción', color: 'text-amber-600' },
  'Stock Entry': { icon: <Package size={16} />, label: 'Movimiento', color: 'text-cyan-600' },
  'Batch': { icon: <Package size={16} />, label: 'Lote', color: 'text-teal-600' },
  'Quality Inspection': { icon: <AlertCircle size={16} />, label: 'Inspección', color: 'text-red-600' },
  'Opportunity': { icon: <TrendingUp size={16} />, label: 'Oportunidad', color: 'text-indigo-600' },
  'Campaign': { icon: <TrendingUp size={16} />, label: 'Campaña', color: 'text-pink-600' },
  'OpsCase': { icon: <AlertCircle size={16} />, label: 'Caso Ops', color: 'text-red-600' },
  'CalendarEvent': { icon: <Calendar size={16} />, label: 'Evento', color: 'text-blue-600' },
  'Account': { icon: <DollarSign size={16} />, label: 'Cuenta', color: 'text-green-600' },
}

// Get config for a DocType with fallback
function getDocTypeConfig(doctype: string): WorkLinkDocTypeConfig {
  return DOCTYPE_CONFIG[doctype as WorkLinkDocType] || {
    icon: <FileText size={16} />,
    label: doctype,
    color: 'text-stone-600'
  }
}

// Get confidence color class
function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'bg-green-500'
  if (confidence >= 0.6) return 'bg-amber-400'
  return 'bg-orange-400'
}

// Get confidence label
function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'Alta'
  if (confidence >= 0.6) return 'Media'
  return 'Baja'
}

export function WorkLinkSuggestions({
  suggestions,
  loading = false,
  error = null,
  onAccept,
  onDismiss,
  onManualSearch,
  className = ''
}: WorkLinkSuggestionsProps) {
  // Don't render if no suggestions and not loading
  if (!loading && suggestions.length === 0 && !error) {
    return null
  }

  return (
    <div className={`bg-white border-2 border-stone-900 shadow-[2px_2px_0_#1c1917] ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2 border-stone-900 bg-cyan-50">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-sm font-bold text-stone-900 uppercase tracking-wider">
            Sugerencias de WorkLink
          </h3>
          {onManualSearch && (
            <button
              onClick={onManualSearch}
              className="
                inline-flex items-center gap-1 px-2 py-1
                text-xs font-medium text-cyan-700 hover:text-cyan-900
                hover:underline
              "
              title="Buscar manualmente"
            >
              <Search size={12} />
              Buscar
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="relative">
              <div className="w-8 h-8 border-3 border-stone-200 border-t-cyan-500 rounded-full animate-spin" />
            </div>
            <p className="ml-3 text-sm text-stone-600">Buscando documentos...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-3 bg-red-50 border-2 border-red-500">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">Error al cargar sugerencias</p>
                <p className="text-xs text-red-600 mt-1">{error.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Suggestions List */}
        {!loading && !error && suggestions.length > 0 && (
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => {
              const config = getDocTypeConfig(suggestion.doctype)
              const confidenceColor = getConfidenceColor(suggestion.confidence)
              const confidenceLabel = getConfidenceLabel(suggestion.confidence)

              return (
                <div
                  key={`${suggestion.doctype}-${suggestion.doc_id}-${index}`}
                  className="
                    border-2 border-stone-900
                    bg-white hover:bg-stone-50
                    transition-colors
                  "
                >
                  <div className="p-3 flex items-start gap-3">
                    {/* Icon */}
                    <div className={`flex-shrink-0 ${config.color} mt-0.5`}>
                      {config.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                          {config.label}
                        </span>
                        {suggestion.boosted && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 uppercase tracking-wider">
                            Frecuente
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium text-stone-900 text-sm">
                        {suggestion.doc_name || suggestion.doc_id}
                      </h4>
                      {suggestion.display_name && suggestion.display_name !== suggestion.doc_name && (
                        <p className="text-xs text-stone-500 mt-0.5">{suggestion.display_name}</p>
                      )}
                      {suggestion.description && (
                        <p className="text-xs text-stone-500 mt-1 truncate">
                          {suggestion.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 ${confidenceColor}`} />
                          <span className="text-[10px] text-stone-500 uppercase tracking-wider">
                            Confianza: {confidenceLabel} ({Math.round(suggestion.confidence * 100)}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => onAccept(suggestion.doctype, suggestion.doc_id, suggestion.confidence)}
                        className="
                          p-2
                          bg-green-500 hover:bg-green-600
                          border-2 border-stone-900
                          text-white
                          transition-colors
                          group
                        "
                        title="Aceptar sugerencia"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => onDismiss(suggestion.doctype, suggestion.doc_id, suggestion.confidence)}
                        className="
                          p-2
                          bg-stone-200 hover:bg-stone-300
                          border-2 border-stone-900
                          text-stone-700
                          transition-colors
                        "
                        title="Descartar sugerencia"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty State (after loading, no suggestions) */}
        {!loading && !error && suggestions.length === 0 && (
          <div className="text-center py-4">
            <FileText size={32} className="mx-auto mb-2 text-stone-300" />
            <p className="text-sm text-stone-500">No se encontraron sugerencias</p>
            {onManualSearch && (
              <button
                onClick={onManualSearch}
                className="
                  mt-2 inline-flex items-center gap-2 px-3 py-1.5
                  text-xs font-medium text-cyan-700 hover:text-cyan-900
                  hover:underline
                "
              >
                <Search size={12} />
                Buscar manualmente
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkLinkSuggestions
