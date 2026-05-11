import type { DistributorDashboardProps, Distributor, NetworkKPIs } from './types'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Eye, Send } from 'lucide-react'
import { ExportKPIsButton } from '../../ui'

const alertLabels: Record<string, string> = {
  stock_alto: 'Stock Alto',
  sin_reporte: 'Sin Reporte',
  baja_rotacion: 'Baja Rotacion',
  inactivo: 'Inactivo',
}

interface KPICardProps {
  kpi: { value: number; previousValue: number; change: number; label: string }
  format?: 'currency' | 'percent' | 'number'
}

function KPICard({ kpi, format = 'number' }: KPICardProps) {
  const isPositive = kpi.change > 0
  const isNegative = kpi.change < 0

  const formatValue = (value: number) => {
    if (format === 'currency') {
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
      if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
      return `$${value}`
    }
    if (format === 'percent') return `${value}%`
    return value.toString()
  }

  return (
    <div className="
      bg-white dark:bg-neutral-900
      border border-neutral-200 dark:border-neutral-100
      p-4 lg:p-6
    ">
      <div className="font-mono text-3xl lg:text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
        {formatValue(kpi.value)}
      </div>
      <div className="w-12 h-0.5 bg-neutral-900 dark:bg-neutral-100 mb-2" />
      <div className="font-sans text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
        {kpi.label}
      </div>
      <div className={`
        flex items-center gap-1 font-mono text-sm font-medium
        ${isPositive ? 'text-success-dark dark:text-success' : ''}
        ${isNegative ? 'text-error-dark dark:text-error' : ''}
        ${!isPositive && !isNegative ? 'text-neutral-400' : ''}
      `}>
        {isPositive && <TrendingUp size={14} />}
        {isNegative && <TrendingDown size={14} />}
        {!isPositive && !isNegative && <Minus size={14} />}
        <span>{isPositive && '+'}{kpi.change.toFixed(1)}%</span>
      </div>
    </div>
  )
}

interface DistributorRowProps {
  distributor: Distributor
  onView?: () => void
  onSendAlert?: () => void
}

function DistributorRow({ distributor, onView, onSendAlert }: DistributorRowProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
    return `$${value}`
  }

  return (
    <tr className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${
            distributor.status === 'active' ? 'bg-success' :
            distributor.status === 'warning' ? 'bg-gold-dark' : 'bg-neutral-400'
          }`} />
          <div>
            <p className="font-medium text-neutral-900 dark:text-neutral-100">
              {distributor.name}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {distributor.zone}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-sm text-neutral-700 dark:text-neutral-300">
          {formatCurrency(distributor.sellInTotal)}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-sm text-neutral-700 dark:text-neutral-300">
          {formatCurrency(distributor.sellOutTotal)}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-neutral-200 dark:bg-neutral-700">
            <div
              className={`h-full transition-all ${
                distributor.rotation >= 80 ? 'bg-success' :
                distributor.rotation >= 60 ? 'bg-gold' : 'bg-error'
              }`}
              style={{ width: `${distributor.rotation}%` }}
            />
          </div>
          <span className="font-mono text-xs text-neutral-500 w-8">{distributor.rotation}%</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs ${
          distributor.daysWithoutReport > 7 ? 'text-error-dark dark:text-error font-medium' :
          distributor.daysWithoutReport > 3 ? 'text-gold-dark dark:text-gold' :
          'text-neutral-500 dark:text-neutral-400'
        }`}>
          {distributor.daysWithoutReport === 0 ? 'Hoy' :
           distributor.daysWithoutReport === 1 ? 'Ayer' :
           `hace ${distributor.daysWithoutReport}d`}
        </span>
      </td>
      <td className="px-4 py-3">
        {distributor.alerts.length > 0 && (
          <div className="flex items-center gap-1">
            {distributor.alerts.slice(0, 2).map((alert) => (
              <span
                key={alert}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] uppercase tracking-wider bg-gold-light text-gold-dark dark:bg-gold-dark dark:text-gold"
              >
                <AlertTriangle size={10} />
                {alertLabels[alert]}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onView}
            className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title="Ver detalle"
          >
            <Eye size={16} className="text-neutral-500 dark:text-neutral-400" />
          </button>
          <button
            onClick={onSendAlert}
            className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title="Enviar mensaje"
          >
            <Send size={16} className="text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export function DistributorDashboard({
  kpis,
  distributors,
  onViewDistributor,
  onSendAlert,
  onExport
}: DistributorDashboardProps) {
  const kpiConfig: { key: keyof NetworkKPIs; format: 'currency' | 'percent' | 'number' }[] = [
    { key: 'totalSellIn', format: 'currency' },
    { key: 'totalSellOut', format: 'currency' },
    { key: 'avgRotation', format: 'percent' },
    { key: 'activeDistributors', format: 'number' },
  ]

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            Red de Distribuidores
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            SELL IN a distribuidores + SELL OUT reportado
          </p>
        </div>

        {onExport && <ExportKPIsButton onExport={onExport} />}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiConfig.map(({ key, format }) => (
          <KPICard key={key} kpi={kpis[key]} format={format} />
        ))}
      </div>

      {/* Distributors Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-100">
          <h2 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Distribuidores
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700">
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                  Distribuidor
                </th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                  SELL IN
                </th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                  SELL OUT
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                  Rotacion
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                  Ultimo Reporte
                </th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                  Alertas
                </th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {distributors.map((distributor) => (
                <DistributorRow
                  key={distributor.id}
                  distributor={distributor}
                  onView={() => onViewDistributor?.(distributor.id)}
                  onSendAlert={() => onSendAlert?.(distributor.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
