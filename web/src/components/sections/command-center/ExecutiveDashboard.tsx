import type { ExecutiveDashboardProps, AreaSummary, PriorityAlert, AreaStatus } from './types'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, ChevronRight, X, DollarSign, Package, Factory, CheckCircle, Megaphone } from 'lucide-react'

const statusColors: Record<AreaStatus, { bg: string; border: string; dot: string }> = {
  green: { bg: 'bg-success-light dark:bg-success-dark', border: 'border-success-dark', dot: 'bg-success' },
  yellow: { bg: 'bg-gold-light dark:bg-gold-dark/20', border: 'border-gold-dark', dot: 'bg-gold-dark' },
  red: { bg: 'bg-error-light dark:bg-error-dark', border: 'border-error-dark', dot: 'bg-error' },
}

const priorityColors = {
  high: 'border-l-error-dark bg-error-light dark:bg-error-dark',
  medium: 'border-l-gold-dark bg-gold-light dark:bg-gold-dark/20',
  low: 'border-l-neutral-400 bg-neutral-50 dark:bg-neutral-800',
}

const categoryLabels = {
  sales: 'Ventas',
  operations: 'Operaciones',
  production: 'Produccion',
  quality: 'Calidad',
  finance: 'Finanzas',
  marketing: 'Marketing',
}

const areaIcons: Record<string, React.ReactNode> = {
  TrendingUp: <TrendingUp size={24} />,
  Package: <Package size={24} />,
  Factory: <Factory size={24} />,
  CheckCircle: <CheckCircle size={24} />,
  DollarSign: <DollarSign size={24} />,
  Megaphone: <Megaphone size={24} />,
}

interface AreaCardProps {
  area: AreaSummary
  onClick?: () => void
}

function AreaCard({ area, onClick }: AreaCardProps) {
  const status = statusColors[area.status]
  const isPositive = area.mainKPI.change > 0
  const isNegative = area.mainKPI.change < 0

  const formatValue = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return value.toLocaleString()
    return value.toString()
  }

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left
        bg-white dark:bg-neutral-900
        border border-neutral-200 dark:border-neutral-100
        border-l-4 ${status.border}
        p-4 lg:p-6
        transition-all duration-75
        group
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-neutral-400 dark:text-neutral-500">
            {areaIcons[area.icon]}
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {area.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${status.dot}`} />
              <span className="text-xs text-neutral-500 uppercase tracking-wider">
                {area.status === 'green' ? 'OK' : area.status === 'yellow' ? 'Atencion' : 'Critico'}
              </span>
            </div>
          </div>
        </div>
        <ChevronRight size={20} className="text-neutral-400 group-hover:text-neutral-600 transition-colors" />
      </div>

      <div className="mb-4">
        <div className="font-mono text-3xl font-bold text-neutral-900 dark:text-neutral-100">
          {formatValue(area.mainKPI.value)}
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          {area.mainKPI.label}
        </div>
        <div className={`
          flex items-center gap-1 font-mono text-sm font-medium mt-2
          ${isPositive ? 'text-success-dark dark:text-success' : ''}
          ${isNegative ? 'text-error-dark dark:text-error' : ''}
          ${!isPositive && !isNegative ? 'text-neutral-400' : ''}
        `}>
          {isPositive && <TrendingUp size={14} />}
          {isNegative && <TrendingDown size={14} />}
          {!isPositive && !isNegative && <Minus size={14} />}
          <span>{isPositive && '+'}{area.mainKPI.change.toFixed(1)}%</span>
        </div>
      </div>

      {area.secondaryKPIs && area.secondaryKPIs.length > 0 && (
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          {area.secondaryKPIs.map((kpi, i) => (
            <div key={i}>
              <div className="font-mono text-lg font-bold text-neutral-700 dark:text-neutral-300">
                {formatValue(kpi.value)}
              </div>
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider">
                {kpi.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </button>
  )
}

interface AlertCardProps {
  alert: PriorityAlert
  onView?: () => void
  onDismiss?: () => void
}

function AlertCard({ alert, onView, onDismiss }: AlertCardProps) {
  const priorityClass = priorityColors[alert.priority]

  return (
    <div className={`
      bg-white dark:bg-neutral-900
      border border-neutral-200 dark:border-neutral-100
      border-l-4 ${priorityClass}
      p-4
    `}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5">
              {categoryLabels[alert.category]}
            </span>
            {alert.priority === 'high' && (
              <AlertTriangle size={14} className="text-error" />
            )}
          </div>
          <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">
            {alert.title}
          </h4>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {alert.description}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X size={16} className="text-neutral-400" />
        </button>
      </div>
      {alert.actionUrl && (
        <button
          onClick={onView}
          className="mt-3 text-xs uppercase tracking-wider font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
        >
          Ver Detalle
        </button>
      )}
    </div>
  )
}

export function ExecutiveDashboard({
  areas,
  alerts,
  onNavigateToArea,
  onDismissAlert,
  onViewAlert
}: ExecutiveDashboardProps) {
  const criticalAlerts = alerts.filter(a => a.priority === 'high')
  const otherAlerts = alerts.filter(a => a.priority !== 'high')

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
          Command Center
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Vision ejecutiva consolidada
        </p>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <div className="mb-8 p-4 bg-error-light dark:bg-error-dark border-2 border-error-dark">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={20} className="text-error" />
            <h2 className="font-bold text-error-text dark:text-error uppercase tracking-wider text-sm">
              {criticalAlerts.length} Alerta{criticalAlerts.length > 1 ? 's' : ''} Critica{criticalAlerts.length > 1 ? 's' : ''}
            </h2>
          </div>
          <div className="space-y-2">
            {criticalAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between text-sm">
                <span className="text-neutral-900 dark:text-neutral-100">{alert.title}</span>
                <button
                  onClick={() => onViewAlert?.(alert.id)}
                  className="text-error-dark dark:text-error hover:underline font-medium"
                >
                  Atender
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Area Cards Grid */}
        <div className="lg:col-span-2">
          <h2 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            Estado por Area
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {areas.map((area) => (
              <AreaCard
                key={area.id}
                area={area}
                onClick={() => onNavigateToArea?.(area.id)}
              />
            ))}
          </div>
        </div>

        {/* Alerts Panel */}
        <div>
          <h2 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            Alertas Pendientes
          </h2>
          <div className="space-y-4">
            {otherAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onView={() => onViewAlert?.(alert.id)}
                onDismiss={() => onDismissAlert?.(alert.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
