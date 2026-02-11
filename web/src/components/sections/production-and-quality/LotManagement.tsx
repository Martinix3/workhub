import type { LotManagementProps, Lot, LotStatus } from './types'
import { Package, MapPin, Calendar, Clock, Eye, CheckCircle, AlertTriangle, Pause } from 'lucide-react'

const statusConfig: Record<LotStatus, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
  in_production: { bg: 'bg-cyan-100 dark:bg-cyan-900', text: 'text-cyan-700 dark:text-cyan-300', label: 'En Produccion', icon: <Clock size={12} /> },
  pending_inspection: { bg: 'bg-gold-light dark:bg-gold-dark', text: 'text-gold-dark dark:text-gold', label: 'Pendiente Inspeccion', icon: <Clock size={12} /> },
  released: { bg: 'bg-success-light dark:bg-success-dark', text: 'text-success-text dark:text-success', label: 'Liberado', icon: <CheckCircle size={12} /> },
  held: { bg: 'bg-error-light dark:bg-error-dark', text: 'text-error-text dark:text-error', label: 'Retenido', icon: <Pause size={12} /> },
  rejected: { bg: 'bg-neutral-100 dark:bg-neutral-700', text: 'text-neutral-600 dark:text-neutral-300', label: 'Rechazado', icon: <AlertTriangle size={12} /> },
}

interface LotCardProps {
  lot: Lot
  onView?: () => void
  onRelease?: () => void
  onHold?: () => void
}

function LotCard({ lot, onView, onRelease, onHold }: LotCardProps) {
  const status = statusConfig[lot.status]
  const daysUntilExpiry = Math.ceil((new Date(lot.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return (
    <div className="
      bg-white dark:bg-neutral-900
      border border-neutral-200 dark:border-neutral-100
      overflow-hidden
    ">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-mono text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {lot.lotNumber}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {lot.productName}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-wider ${status.bg} ${status.text}`}>
            {status.icon}
            {status.label}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Package size={14} className="text-neutral-400" />
            <div>
              <div className="text-xs text-neutral-400">Cantidad</div>
              <div className="font-mono text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {lot.qtyProduced} {lot.uom}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-neutral-400" />
            <div>
              <div className="text-xs text-neutral-400">Ubicacion</div>
              <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                {lot.location}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-neutral-400" />
            <div>
              <div className="text-xs text-neutral-400">Vence en</div>
              <div className={`font-mono text-sm font-medium ${
                daysUntilExpiry < 30 ? 'text-error-dark' :
                daysUntilExpiry < 90 ? 'text-gold-dark' :
                'text-neutral-900 dark:text-neutral-100'
              }`}>
                {daysUntilExpiry}d
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Materials */}
      <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50">
        <div className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
          Materias Primas ({lot.materials?.length ?? 0})
        </div>
        <div className="space-y-1">
          {(lot.materials ?? []).slice(0, 2).map((material) => (
            <div key={material.itemCode} className="flex items-center justify-between text-sm">
              <span className="text-neutral-700 dark:text-neutral-300 truncate">
                {material.itemName}
              </span>
              <span className="font-mono text-neutral-500 text-xs">
                {material.lotNumber}
              </span>
            </div>
          ))}
          {(lot.materials?.length ?? 0) > 2 && (
            <div className="text-xs text-neutral-400">
              +{(lot.materials?.length ?? 0) - 2} mas
            </div>
          )}
        </div>
      </div>

      {/* Timeline Preview */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">
        <div className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
          Ultimo Evento
        </div>
        {(lot.events?.length ?? 0) > 0 && (
          <div className="text-sm text-neutral-700 dark:text-neutral-300">
            {lot.events[lot.events.length - 1].description}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 flex items-center gap-2">
        <button
          onClick={onView}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs uppercase tracking-wider font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <Eye size={14} />
          Ver Detalle
        </button>
        {lot.status === 'pending_inspection' && (
          <>
            <button
              onClick={onRelease}
              className="px-3 py-2 text-xs uppercase tracking-wider font-medium text-success-text dark:text-success border border-success-dark hover:bg-success-light dark:hover:bg-success-dark/30 transition-colors"
            >
              Liberar
            </button>
            <button
              onClick={onHold}
              className="px-3 py-2 text-xs uppercase tracking-wider font-medium text-error-text dark:text-error border border-error-dark hover:bg-error-light dark:hover:bg-error-dark/30 transition-colors"
            >
              Retener
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export function LotManagement({ lots, onViewLot, onReleaseLot, onHoldLot }: LotManagementProps) {
  const statusCounts = lots.reduce((acc, lot) => {
    acc[lot.status] = (acc[lot.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
          Gestion de Lotes
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Trazabilidad completa desde materias primas hasta producto terminado
        </p>
      </div>

      {/* Status Summary */}
      <div className="flex flex-wrap gap-3 mb-8">
        {Object.entries(statusConfig).map(([key, config]) => (
          <div
            key={key}
            className={`inline-flex items-center gap-2 px-3 py-2 ${config.bg} ${config.text}`}
          >
            {config.icon}
            <span className="font-mono font-bold">{statusCounts[key] || 0}</span>
            <span className="text-xs uppercase tracking-wider">{config.label}</span>
          </div>
        ))}
      </div>

      {/* Lots Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lots.map((lot) => (
          <LotCard
            key={lot.id}
            lot={lot}
            onView={() => onViewLot?.(lot.id)}
            onRelease={() => onReleaseLot?.(lot.id)}
            onHold={() => onHoldLot?.(lot.id)}
          />
        ))}
      </div>
    </div>
  )
}
