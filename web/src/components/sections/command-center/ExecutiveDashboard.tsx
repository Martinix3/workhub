import type { ExecutiveDashboardProps, AreaSummary, PriorityAlert, AreaStatus } from './types'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, ChevronRight, X, DollarSign, Package, Factory, CheckCircle, Megaphone } from 'lucide-react'

const statusColors: Record<AreaStatus, { bg: string; border: string; dot: string }> = {
  green: { bg: 'bg-green-50 dark:bg-green-950', border: 'border-green-500', dot: 'bg-green-500' },
  yellow: { bg: 'bg-amber-50 dark:bg-amber-950', border: 'border-amber-500', dot: 'bg-amber-500' },
  red: { bg: 'bg-red-50 dark:bg-red-950', border: 'border-red-500', dot: 'bg-red-500' },
}

const priorityColors = {
  high: 'border-l-red-500 bg-red-50 dark:bg-red-950',
  medium: 'border-l-amber-500 bg-amber-50 dark:bg-amber-950',
  low: 'border-l-stone-400 bg-stone-50 dark:bg-stone-800',
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
        bg-white dark:bg-stone-900
        border-2 border-stone-900 dark:border-stone-100
        border-l-4 ${status.border}
        p-4 lg:p-6
        shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9]
        hover:translate-x-[2px] hover:translate-y-[2px]
        hover:shadow-[2px_2px_0_#1c1917] dark:hover:shadow-[2px_2px_0_#fafaf9]
        transition-all duration-75
        group
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-stone-400 dark:text-stone-500">
            {areaIcons[area.icon]}
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
              {area.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${status.dot}`} />
              <span className="text-xs text-stone-500 uppercase tracking-wider">
                {area.status === 'green' ? 'OK' : area.status === 'yellow' ? 'Atencion' : 'Critico'}
              </span>
            </div>
          </div>
        </div>
        <ChevronRight size={20} className="text-stone-400 group-hover:text-stone-600 transition-colors" />
      </div>

      <div className="mb-4">
        <div className="font-mono text-3xl font-bold text-stone-900 dark:text-stone-100">
          {formatValue(area.mainKPI.value)}
        </div>
        <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">
          {area.mainKPI.label}
        </div>
        <div className={`
          flex items-center gap-1 font-mono text-sm font-medium mt-2
          ${isPositive ? 'text-green-600 dark:text-green-400' : ''}
          ${isNegative ? 'text-red-600 dark:text-red-400' : ''}
          ${!isPositive && !isNegative ? 'text-stone-400' : ''}
        `}>
          {isPositive && <TrendingUp size={14} />}
          {isNegative && <TrendingDown size={14} />}
          {!isPositive && !isNegative && <Minus size={14} />}
          <span>{isPositive && '+'}{area.mainKPI.change.toFixed(1)}%</span>
        </div>
      </div>

      {area.secondaryKPIs && area.secondaryKPIs.length > 0 && (
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-stone-200 dark:border-stone-700">
          {area.secondaryKPIs.map((kpi, i) => (
            <div key={i}>
              <div className="font-mono text-lg font-bold text-stone-700 dark:text-stone-300">
                {formatValue(kpi.value)}
              </div>
              <div className="text-[10px] text-stone-400 uppercase tracking-wider">
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
      bg-white dark:bg-stone-900
      border-2 border-stone-900 dark:border-stone-100
      border-l-4 ${priorityClass}
      p-4
      shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9]
    `}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider text-stone-500 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5">
              {categoryLabels[alert.category]}
            </span>
            {alert.priority === 'high' && (
              <AlertTriangle size={14} className="text-red-500" />
            )}
          </div>
          <h4 className="font-medium text-stone-900 dark:text-stone-100 mb-1">
            {alert.title}
          </h4>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {alert.description}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <X size={16} className="text-stone-400" />
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
        <h1 className="font-serif text-2xl lg:text-3xl font-bold text-stone-900 dark:text-stone-100">
          Command Center
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Vision ejecutiva consolidada
        </p>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <div className="mb-8 p-4 bg-red-50 dark:bg-red-950 border-2 border-red-500">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={20} className="text-red-500" />
            <h2 className="font-bold text-red-700 dark:text-red-300 uppercase tracking-wider text-sm">
              {criticalAlerts.length} Alerta{criticalAlerts.length > 1 ? 's' : ''} Critica{criticalAlerts.length > 1 ? 's' : ''}
            </h2>
          </div>
          <div className="space-y-2">
            {criticalAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between text-sm">
                <span className="text-stone-900 dark:text-stone-100">{alert.title}</span>
                <button
                  onClick={() => onViewAlert?.(alert.id)}
                  className="text-red-600 dark:text-red-400 hover:underline font-medium"
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
          <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 mb-4">
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
          <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 mb-4">
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
