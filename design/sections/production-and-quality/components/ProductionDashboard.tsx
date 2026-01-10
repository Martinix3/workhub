import type { ProductionDashboardProps, ProductionKPIs, ProductionOrder, ProductionLine } from '../types'
import { TrendingUp, TrendingDown, Minus, Play, Pause, AlertTriangle, Wrench, Eye } from 'lucide-react'

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
      bg-white dark:bg-stone-900
      border-2 border-stone-900 dark:border-stone-100
      p-4 lg:p-6
      shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9]
    ">
      <div className="font-mono text-3xl lg:text-4xl font-bold text-stone-900 dark:text-stone-100 mb-1">
        {formatValue(kpi.value)}
      </div>
      <div className="w-12 h-0.5 bg-stone-900 dark:bg-stone-100 mb-2" />
      <div className="font-sans text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
        {kpi.label}
      </div>
      <div className={`
        flex items-center gap-1 font-mono text-sm font-medium
        ${isPositive ? 'text-green-600 dark:text-green-400' : ''}
        ${isNegative ? 'text-red-600 dark:text-red-400' : ''}
        ${!isPositive && !isNegative ? 'text-stone-400' : ''}
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
  scheduled: { bg: 'bg-stone-100 dark:bg-stone-700', text: 'text-stone-600 dark:text-stone-300', label: 'Programada' },
  in_progress: { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-700 dark:text-amber-300', label: 'En Proceso' },
  completed: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300', label: 'Completada' },
  cancelled: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300', label: 'Cancelada' },
}

const lineStatusConfig = {
  running: { icon: Play, color: 'text-green-500', bg: 'bg-green-500', label: 'En Operacion' },
  idle: { icon: Pause, color: 'text-stone-400', bg: 'bg-stone-400', label: 'Inactiva' },
  maintenance: { icon: Wrench, color: 'text-amber-500', bg: 'bg-amber-500', label: 'Mantenimiento' },
  breakdown: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500', label: 'Averia' },
}

interface OrderRowProps {
  order: ProductionOrder
  onView?: () => void
}

function OrderRow({ order, onView }: OrderRowProps) {
  const status = statusConfig[order.status]

  return (
    <tr className="group hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
      <td className="px-4 py-3">
        <div>
          <p className="font-mono text-sm text-stone-900 dark:text-stone-100">
            {order.orderNumber}
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Lote: {order.lotNumber}
          </p>
        </div>
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="text-sm text-stone-900 dark:text-stone-100">{order.productName}</p>
          <p className="text-xs text-stone-500">{order.productCode}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-mono text-sm text-stone-700 dark:text-stone-300">
          {order.qtyProduced}/{order.qtyTarget}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-stone-200 dark:bg-stone-700">
            <div
              className={`h-full transition-all ${
                order.progress >= 100 ? 'bg-green-500' :
                order.progress >= 50 ? 'bg-amber-400' : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(order.progress, 100)}%` }}
            />
          </div>
          <span className="font-mono text-xs text-stone-500 w-8">{order.progress}%</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium ${status.bg} ${status.text}`}>
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-stone-600 dark:text-stone-400">
        {order.lineName}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={onView}
          className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Eye size={16} className="text-stone-500" />
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
        bg-white dark:bg-stone-900
        border-2 border-stone-900 dark:border-stone-100
        p-4
        shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9]
        hover:translate-x-[2px] hover:translate-y-[2px]
        hover:shadow-[2px_2px_0_#1c1917] dark:hover:shadow-[2px_2px_0_#fafaf9]
        transition-all duration-75
      "
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-stone-900 dark:text-stone-100">{line.name}</h3>
        <div className={`flex items-center gap-1.5 ${config.color}`}>
          <Icon size={14} />
          <span className="text-xs uppercase tracking-wider">{config.label}</span>
        </div>
      </div>

      {line.currentOrder && (
        <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
          Orden activa: <span className="font-mono">{line.currentOrder}</span>
        </p>
      )}

      <div className="flex items-center gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-stone-400 mb-0.5">OEE</div>
          <div className="font-mono text-lg font-bold text-stone-900 dark:text-stone-100">{line.oee}%</div>
        </div>
        <div className="w-px h-8 bg-stone-200 dark:bg-stone-700" />
        <div>
          <div className="text-[10px] uppercase tracking-wider text-stone-400 mb-0.5">Uptime</div>
          <div className="font-mono text-lg font-bold text-stone-900 dark:text-stone-100">{line.uptime}%</div>
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

  const activeOrders = orders.filter(o => o.status === 'in_progress' || o.status === 'scheduled')

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-2xl lg:text-3xl font-bold text-stone-900 dark:text-stone-100">
          Produccion
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Estado de planta y ordenes del dia
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiConfig.map(({ key, format }) => (
          <KPICard key={key} kpi={kpis[key]} format={format} />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Orders Table */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 overflow-hidden">
          <div className="px-4 py-3 border-b-2 border-stone-900 dark:border-stone-100">
            <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
              Ordenes Activas
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-700">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-stone-600 dark:text-stone-400">Orden</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-stone-600 dark:text-stone-400">Producto</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-semibold text-stone-600 dark:text-stone-400">Cantidad</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-stone-600 dark:text-stone-400">Progreso</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-stone-600 dark:text-stone-400">Estado</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-stone-600 dark:text-stone-400">Linea</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
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
          <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 mb-4">
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
