import type { ProductionDashboardProps, ProductionKPIs, ProductionOrder, ProductionLine } from './types'
import { TrendingUp, TrendingDown, Minus, Play, Pause, AlertTriangle, Wrench, Eye } from 'lucide-react'
import { CustomKPIGrid } from '../../kpi-builder'
import { useCustomKPIs } from '../../../api'

interface KPICardProps {
  kpi: { value: number; previousValue: number; change: number; label: string }
  format?: 'number' | 'percent'
}

function KPICard({ kpi, format = 'number' }: KPICardProps) {
  const isPositive = kpi.change > 0
  const isNegative = kpi.change < 0

  const formatValue = (value: number) => {
    if (format === 'percent') return `${value}%`
    if (value >= 1000) return value.toLocaleString()
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

const statusConfig = {
  scheduled: { bg: 'bg-neutral-100 dark:bg-neutral-700', text: 'text-neutral-600 dark:text-neutral-300', label: 'Programada' },
  in_progress: { bg: 'bg-gold-light dark:bg-gold-dark', text: 'text-gold-dark dark:text-gold', label: 'En Proceso' },
  completed: { bg: 'bg-success-light dark:bg-success-dark', text: 'text-success-text dark:text-success', label: 'Completada' },
  cancelled: { bg: 'bg-error-light dark:bg-error-dark', text: 'text-error-text dark:text-error', label: 'Cancelada' },
}

const lineStatusConfig = {
  running: { icon: Play, color: 'text-success', bg: 'bg-success', label: 'En Operacion' },
  idle: { icon: Pause, color: 'text-neutral-400', bg: 'bg-neutral-400', label: 'Inactiva' },
  maintenance: { icon: Wrench, color: 'text-gold-dark', bg: 'bg-gold-dark', label: 'Mantenimiento' },
  breakdown: { icon: AlertTriangle, color: 'text-error', bg: 'bg-error', label: 'Averia' },
}

interface OrderRowProps {
  order: ProductionOrder
  onView?: () => void
}

function OrderRow({ order, onView }: OrderRowProps) {
  const status = statusConfig[order.status]

  return (
    <tr className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
      <td className="px-4 py-3">
        <div>
          <p className="font-mono text-sm text-neutral-900 dark:text-neutral-100">
            {order.orderNumber}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Lote: {order.lotNumber}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="text-sm text-neutral-900 dark:text-neutral-100">{order.productName}</p>
          <p className="text-xs text-neutral-500">{order.productCode}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-sm text-neutral-700 dark:text-neutral-300">
          {order.qtyProduced}/{order.qtyTarget}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-neutral-200 dark:bg-neutral-700">
            <div
              className={`h-full transition-all ${
                order.progress >= 100 ? 'bg-success' :
                order.progress >= 50 ? 'bg-gold' : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(order.progress, 100)}%` }}
            />
          </div>
          <span className="font-mono text-xs text-neutral-500 w-8">{order.progress}%</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium ${status.bg} ${status.text}`}>
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
        {order.lineName}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={onView}
          className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Eye size={16} className="text-neutral-500" />
        </button>
      </td>
    </tr>
  )
}

interface LineCardProps {
  line: ProductionLine
  onView?: () => void
}

function LineCard({ line, onView }: LineCardProps) {
  const config = lineStatusConfig[line.status]
  const Icon = config.icon

  return (
    <button
      onClick={onView}
      className="
        w-full text-left
        bg-white dark:bg-neutral-900
        border border-neutral-200 dark:border-neutral-100
        p-4
        transition-all duration-75
      "
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-neutral-900 dark:text-neutral-100">{line.name}</h3>
        <div className={`flex items-center gap-1.5 ${config.color}`}>
          <Icon size={14} />
          <span className="text-xs uppercase tracking-wider">{config.label}</span>
        </div>
      </div>

      {line.currentOrder && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
          Orden activa: <span className="font-mono">{line.currentOrder}</span>
        </p>
      )}

      <div className="flex items-center gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-0.5">OEE</div>
          <div className="font-mono text-lg font-bold text-neutral-900 dark:text-neutral-100">{line.oee}%</div>
        </div>
        <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700" />
        <div>
          <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-0.5">Uptime</div>
          <div className="font-mono text-lg font-bold text-neutral-900 dark:text-neutral-100">{line.uptime}%</div>
        </div>
      </div>
    </button>
  )
}

export function ProductionDashboard({
  kpis,
  orders,
  lines,
  onViewOrder,
  onViewLine
}: ProductionDashboardProps) {
  const kpiConfig: { key: keyof ProductionKPIs; format: 'number' | 'percent' }[] = [
    { key: 'activeOrders', format: 'number' },
    { key: 'oeePercent', format: 'percent' },
    { key: 'completedToday', format: 'number' },
    { key: 'unitsProduced', format: 'number' },
  ]

  // Fetch custom KPIs for OPS department
  const { data: customKPIs } = useCustomKPIs('OPS', true)

  const activeOrders = orders.filter(o => o.status === 'in_progress' || o.status === 'scheduled')

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
          Produccion
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Estado de planta y ordenes del dia
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiConfig.map(({ key, format }) => (
          <KPICard key={key} kpi={kpis[key]} format={format} />
        ))}
      </div>

      {/* Custom KPIs Section - Only show if there are custom KPIs */}
      {customKPIs && customKPIs.length > 0 && (
        <div className="mb-8">
          {/* Section Header */}
          <div className="mb-4">
            <h2 className="font-heading text-xl font-bold text-neutral-900 dark:text-neutral-100">
              KPIs Personalizados
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Tus indicadores personalizados de produccion
            </p>
          </div>

          {/* Custom KPI Grid */}
          <CustomKPIGrid
            department="OPS"
            includeShared={true}
          />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Orders Table */}
        <div className="lg:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-100">
            <h2 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Ordenes Activas
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">Orden</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">Producto</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">Cantidad</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">Progreso</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">Estado</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">Linea</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {activeOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onView={() => onViewOrder?.(order.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lines Status */}
        <div>
          <h2 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            Estado de Lineas
          </h2>
          <div className="space-y-4">
            {lines.map((line) => (
              <LineCard
                key={line.id}
                line={line}
                onView={() => onViewLine?.(line.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
