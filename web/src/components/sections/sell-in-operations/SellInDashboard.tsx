import type { SellInDashboardProps, KPIs } from './types'
import { KPICard } from './KPICard'
import { MiniBarChart } from './MiniBarChart'
import { ActivityFeed } from './ActivityFeed'
import { CustomKPIGrid } from '../../kpi-builder'
import { useCustomKPIs } from '../../../api'
import { Plus } from 'lucide-react'

export function SellInDashboard({
  kpis,
  recentActivity,
  salesTrends,
  onKpiClick,
  onCreateOrder
}: SellInDashboardProps) {
  const kpiKeys: (keyof KPIs)[] = ['salesThisMonth', 'activeOrders', 'newCustomers', 'avgOrderValue']

  // Fetch custom KPIs for SALES department
  const { data: customKPIs } = useCustomKPIs('SALES', true)

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-bold text-stone-900 dark:text-stone-100">
            Ventas Dashboard
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            SELL IN - Ventas directas de Santa Brisa
          </p>
        </div>

        {/* Quick Actions */}
        <button
          onClick={onCreateOrder}
          className="
            inline-flex items-center gap-2 px-4 py-2
            bg-amber-400 hover:bg-amber-500
            text-stone-900 font-medium text-sm uppercase tracking-wider
            border-2 border-stone-900
            shadow-[4px_4px_0_#1c1917]
            hover:shadow-[2px_2px_0_#1c1917]
            hover:translate-x-[2px] hover:translate-y-[2px]
            transition-all duration-75
          "
        >
          <Plus size={18} />
          Nuevo Pedido
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiKeys.map((key) => (
          <KPICard
            key={key}
            kpi={kpis[key]}
            onClick={() => onKpiClick?.(key)}
          />
        ))}
      </div>

      {/* Custom KPIs Section - Only show if there are custom KPIs */}
      {customKPIs && customKPIs.length > 0 && (
        <div className="mb-8">
          {/* Section Header */}
          <div className="mb-4">
            <h2 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
              KPIs Personalizados
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
              Tus indicadores personalizados de ventas
            </p>
          </div>

          {/* Custom KPI Grid */}
          <CustomKPIGrid
            department="SALES"
            includeShared={true}
          />
        </div>
      )}

      {/* Charts & Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Trend Chart - 2 columns */}
        <div className="lg:col-span-2">
          <MiniBarChart
            data={salesTrends.monthly}
            title="Tendencia de Ventas"
          />
        </div>

        {/* Product Distribution */}
        <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 p-4 lg:p-6">
          <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 mb-4">
            Por Producto
          </h3>

          <div className="space-y-3">
            {salesTrends.byProduct.map((product) => (
              <div key={product.product}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-stone-700 dark:text-stone-300 truncate">
                    {product.product}
                  </span>
                  <span className="font-mono text-stone-500 dark:text-stone-400">
                    {product.percentage}%
                  </span>
                </div>
                <div className="h-2 bg-stone-200 dark:bg-stone-700">
                  <div
                    className="h-full bg-stone-900 dark:bg-stone-100 transition-all duration-500"
                    style={{ width: `${product.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer Type Distribution & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Customer Type Donut Placeholder */}
        <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 p-4 lg:p-6">
          <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 mb-4">
            Por Tipo de Cliente
          </h3>

          <div className="flex items-center gap-4">
            {/* Simple donut visualization */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-stone-200 dark:text-stone-700"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${salesTrends.byCustomerType[0]?.percentage || 0} ${100 - (salesTrends.byCustomerType[0]?.percentage || 0)}`}
                  className="text-amber-400"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-lg font-bold text-stone-900 dark:text-stone-100">
                  {salesTrends.byCustomerType[0]?.percentage || 0}%
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-2">
              {salesTrends.byCustomerType.map((type, index) => (
                <div key={type.type} className="flex items-center gap-2">
                  <div className={`w-3 h-3 ${index === 0 ? 'bg-amber-400' : 'bg-stone-300 dark:bg-stone-600'}`} />
                  <span className="text-sm text-stone-700 dark:text-stone-300">
                    {type.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Feed - 2 columns */}
        <div className="lg:col-span-2">
          <ActivityFeed activities={recentActivity} />
        </div>
      </div>
    </div>
  )
}
