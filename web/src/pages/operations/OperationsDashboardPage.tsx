/**
 * Operations Dashboard Page
 * =========================
 * Main entry point for the Operations section.
 * Shows KPIs + activity feed + quick actions.
 */

import { useNavigate } from 'react-router-dom'
import {
  Truck, Package, AlertTriangle, TrendingUp, TrendingDown, Minus,
  ArrowRight, BarChart3
} from 'lucide-react'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { useOperationsDashboard } from '../../api/hooks/useLogisticsData'
import type { KPI, OperationsActivity } from '../../components/sections/operations/types'

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M EUR`
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k EUR`
  return `${value} EUR`
}

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })

// KPI Card (reuse pattern from SellInDashboard)
function KPICard({ kpi, icon }: { kpi: KPI; icon: React.ReactNode }) {
  const isPositive = kpi.change > 0
  const isNegative = kpi.change < 0

  return (
    <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 p-5 shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#f5f5f4]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-amber-500">{icon}</span>
        {kpi.change !== 0 && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-stone-400'
          }`}>
            {isPositive ? <TrendingUp size={12} /> : isNegative ? <TrendingDown size={12} /> : <Minus size={12} />}
            <span>{isPositive && '+'}{kpi.change.toFixed(0)}%</span>
          </div>
        )}
      </div>
      <div className="font-mono text-3xl font-bold text-stone-900 dark:text-stone-100 mb-1">
        {typeof kpi.value === 'number' && kpi.label.includes('inventario')
          ? formatCurrency(kpi.value)
          : kpi.value}
      </div>
      <div className="w-12 h-0.5 bg-stone-900 dark:bg-stone-100 mb-2" />
      <div className="text-xs text-stone-500 uppercase tracking-wider">{kpi.label}</div>
    </div>
  )
}

// Activity Feed Item
function ActivityItem({ activity }: { activity: OperationsActivity }) {
  const icon = activity.type === 'delivery'
    ? <Truck size={14} className="text-cyan-500" />
    : activity.type === 'receipt'
    ? <Package size={14} className="text-amber-500" />
    : <AlertTriangle size={14} className="text-red-500" />

  return (
    <div className="flex items-start gap-3 py-3 border-b border-stone-200 dark:border-stone-700 last:border-0">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-900 dark:text-stone-100 truncate">{activity.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-stone-400">{formatDate(activity.timestamp)}</span>
          {activity.amount > 0 && (
            <span className="text-xs font-mono text-stone-500">
              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(activity.amount)}
            </span>
          )}
        </div>
      </div>
      <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium ${
        activity.status === 'Completed' ? 'bg-green-100 text-green-700'
        : activity.status === 'Draft' ? 'bg-stone-200 text-stone-600'
        : 'bg-amber-100 text-amber-700'
      }`}>
        {activity.status}
      </span>
    </div>
  )
}

export function OperationsDashboardPage() {
  const navigate = useNavigate()
  const { kpis, recentActivity, loading, error, refetch } = useOperationsDashboard()

  if (loading) return <LoadingState message="Cargando operaciones..." />
  if (error || !kpis) return <ErrorState title="Error al cargar operaciones" message="No se pudo cargar la informacion." error={error} onRetry={refetch} />

  const kpiIcons = [
    <Truck size={20} />,
    <Package size={20} />,
    <BarChart3 size={20} />,
    <AlertTriangle size={20} />,
  ]

  const kpiKeys = ['pendingDeliveries', 'receiptsThisMonth', 'inventoryValue', 'lowStockAlerts'] as const

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-mono text-2xl font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
          Operaciones
        </h1>
        <p className="text-sm text-stone-500 mt-1">Dashboard de entregas, recepciones e inventario</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiKeys.map((key, i) => (
          <KPICard key={key} kpi={kpis[key]} icon={kpiIcons[i]} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 border-2 border-stone-900 dark:border-stone-100 bg-white dark:bg-stone-900">
          <div className="px-4 py-3 bg-stone-50 dark:bg-stone-800 border-b-2 border-stone-900 dark:border-stone-100">
            <h2 className="font-medium text-stone-900 dark:text-stone-100 uppercase text-sm tracking-wider">
              Actividad Reciente
            </h2>
          </div>
          <div className="px-4 py-2">
            {recentActivity && recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))
            ) : (
              <p className="text-sm text-stone-400 py-8 text-center">Sin actividad reciente</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          {[
            { label: 'Entregas', desc: 'Ver albaranes y entregas', href: '/operaciones/entregas', icon: <Truck size={20} /> },
            { label: 'Recepciones', desc: 'Recepciones de proveedor', href: '/operaciones/recepciones', icon: <Package size={20} /> },
            { label: 'Inventario', desc: 'Control de stock y lotes', href: '/operaciones/inventario', icon: <BarChart3 size={20} /> },
          ].map((action) => (
            <button
              key={action.href}
              onClick={() => navigate(action.href)}
              className="w-full flex items-center gap-4 p-4 bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#f5f5f4] hover:shadow-[2px_2px_0_#1c1917] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-75 text-left"
            >
              <span className="text-amber-500">{action.icon}</span>
              <div className="flex-1">
                <p className="font-medium text-stone-900 dark:text-stone-100 uppercase text-sm tracking-wider">{action.label}</p>
                <p className="text-xs text-stone-500">{action.desc}</p>
              </div>
              <ArrowRight size={16} className="text-stone-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
