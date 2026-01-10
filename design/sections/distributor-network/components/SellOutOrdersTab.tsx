import { Clock, Truck, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { SellOutOrdersTabProps } from '../types'
import { SellOutOrderCard } from './SellOutOrderCard'

const statConfig = {
  pending: { label: 'Pendientes', icon: Clock, color: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300' },
  inProgress: { label: 'En Camino', icon: Truck, color: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300' },
  delivered: { label: 'Entregados', icon: CheckCircle2, color: 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300' },
  issues: { label: 'Incidencias', icon: AlertTriangle, color: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300' },
}

export function SellOutOrdersTab({ orders, stats, onStartDelivery, onMarkDelivered, onReportIssue }: SellOutOrdersTabProps) {
  const activeOrders = orders.filter(o => o.status === 'Pending' || o.status === 'In Progress' || o.status === 'Issue')
  const completedOrders = orders.filter(o => o.status === 'Delivered')

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(statConfig).map(([key, config]) => {
          const Icon = config.icon
          const value = stats[key as keyof typeof stats]
          return (
            <div key={key} className={`border p-3 ${config.color}`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} />
                <span className="text-xs font-medium uppercase tracking-wider">{config.label}</span>
              </div>
              <p className="font-mono text-2xl font-bold">{value}</p>
            </div>
          )
        })}
      </div>

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <div>
          <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 mb-4">
            Pedidos Activos
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {activeOrders.map(order => (
              <SellOutOrderCard
                key={order.id}
                order={order}
                onStartDelivery={onStartDelivery}
                onMarkDelivered={onMarkDelivered}
                onReportIssue={onReportIssue}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeOrders.length === 0 && (
        <div className="
          text-center py-12
          border-2 border-dashed border-stone-300 dark:border-stone-600
          bg-stone-50 dark:bg-stone-800/50
        ">
          <Truck size={48} className="mx-auto text-stone-400 mb-4" />
          <h3 className="font-serif text-lg font-bold text-stone-700 dark:text-stone-300 mb-2">
            No hay pedidos activos
          </h3>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Los pedidos asignados a ti aparecerán aquí
          </p>
        </div>
      )}

      {/* Completed Orders (collapsed by default, just show count) */}
      {completedOrders.length > 0 && (
        <div>
          <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 mb-4 flex items-center gap-2">
            <CheckCircle2 size={20} className="text-green-600" />
            Entregados este mes ({completedOrders.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2 opacity-75">
            {completedOrders.slice(0, 4).map(order => (
              <SellOutOrderCard
                key={order.id}
                order={order}
              />
            ))}
          </div>
          {completedOrders.length > 4 && (
            <p className="text-center text-sm text-stone-500 mt-4">
              + {completedOrders.length - 4} pedidos más entregados
            </p>
          )}
        </div>
      )}
    </div>
  )
}
