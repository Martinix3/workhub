import { useState } from 'react'
import type { DistributorPortalProps } from './types'
import { Package, Upload, BarChart3, ShoppingBag, Download, AlertTriangle } from 'lucide-react'

const tabs = [
  { id: 'orders', label: 'Mis Pedidos', icon: ShoppingBag },
  { id: 'upload', label: 'Subir SELL OUT', icon: Upload },
  { id: 'inventory', label: 'Mi Inventario', icon: Package },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
] as const

type TabId = typeof tabs[number]['id']

const inventoryStatusConfig: Record<string, { label: string; color: string }> = {
  normal: { label: 'Normal', color: 'bg-success-light text-success-text dark:bg-success-dark dark:text-success' },
  low: { label: 'Stock Bajo', color: 'bg-gold-light text-gold-dark dark:bg-gold-dark dark:text-gold' },
  slow: { label: 'Lento', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300' },
  stagnant: { label: 'Estancado', color: 'bg-error-light text-error-text dark:bg-error-dark dark:text-error' },
}

function MiniSparkline({ data }: { data: number[] }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = 100 - ((value - min) / range) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <svg viewBox="0 0 100 100" className="w-16 h-6" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="text-neutral-400 dark:text-neutral-500"
      />
    </svg>
  )
}

export function DistributorPortal({
  orders,
  inventory,
  sellOutRecords,
  analytics,
  onViewOrder,
  onSubmitSellOut: _onSubmitSellOut,
  onUploadCSV,
  onExportInventory
}: DistributorPortalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('orders')

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
          Portal de Distribuidor
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Distribuciones Noreste SA
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-gold-light dark:bg-gold-dark/20 border border-gold dark:border-gold-dark p-3">
          <p className="font-mono text-2xl font-bold text-gold-dark dark:text-gold">
            {formatCurrency(analytics.sellOutThisMonth)}
          </p>
          <p className="text-xs text-gold-dark dark:text-gold-dark uppercase tracking-wider">SELL OUT Mes</p>
        </div>
        <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 p-3">
          <p className="font-mono text-2xl font-bold text-cyan-700 dark:text-cyan-400">
            {analytics.rotationPercent}%
          </p>
          <p className="text-xs text-cyan-600 dark:text-cyan-500 uppercase tracking-wider">Rotacion</p>
        </div>
        <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 p-3">
          <p className="font-mono text-2xl font-bold text-violet-700 dark:text-violet-400">
            {analytics.daysOfStockAvg}
          </p>
          <p className="text-xs text-violet-600 dark:text-violet-500 uppercase tracking-wider">Dias Stock</p>
        </div>
        <div className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-3">
          <p className="font-mono text-lg font-bold text-neutral-700 dark:text-neutral-300 truncate">
            {analytics.topProduct.name}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Top Producto</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-100 mb-6 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium uppercase tracking-wider
                border-b-2 -mb-[2px] transition-colors whitespace-nowrap
                ${isActive
                  ? 'border-gold text-neutral-900 dark:text-neutral-100'
                  : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                }
              `}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-100">
        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="p-4 lg:p-6">
            <h2 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Mis Pedidos de Santa Brisa
            </h2>
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                  onClick={() => onViewOrder?.(order.id)}
                >
                  <div>
                    <p className="font-mono text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {order.deliveryNumber}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {formatDate(order.deliveryDate)} • {order.items.length} productos
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {formatCurrency(order.total)}
                    </p>
                    <span className={`
                      text-xs uppercase tracking-wider
                      ${order.invoiceStatus === 'paid' ? 'text-success-dark' :
                        order.invoiceStatus === 'invoiced' ? 'text-violet-600' : 'text-gold-dark'}
                    `}>
                      {order.invoiceStatus === 'paid' ? 'Pagado' :
                       order.invoiceStatus === 'invoiced' ? 'Facturado' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload SELL OUT Tab */}
        {activeTab === 'upload' && (
          <div className="p-4 lg:p-6">
            <h2 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Reportar SELL OUT
            </h2>

            {/* Upload Area */}
            <div
              className="
                border-2 border-dashed border-neutral-300 dark:border-neutral-600
                p-8 text-center mb-6
                hover:border-gold hover:bg-gold-light dark:hover:bg-gold-dark/10
                transition-colors cursor-pointer
              "
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = '.csv'
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) onUploadCSV?.(file)
                }
                input.click()
              }}
            >
              <Upload size={32} className="mx-auto mb-3 text-neutral-400" />
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                Arrastra un archivo CSV aqui
              </p>
              <p className="text-xs text-neutral-400">
                o haz click para seleccionar
              </p>
            </div>

            {/* Recent Records */}
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-3">
              Registros Recientes
            </h3>
            <div className="space-y-2">
              {sellOutRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-800"
                >
                  <div>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">
                      {formatDate(record.date)}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {record.items.length} productos • {record.totalUnits} unidades
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-wider text-success-dark">
                    Confirmado
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Mi Inventario
              </h2>
              <button
                onClick={onExportInventory}
                className="
                  inline-flex items-center gap-2 px-3 py-1.5
                  text-xs uppercase tracking-wider
                  border border-neutral-300 dark:border-neutral-600
                  text-neutral-600 dark:text-neutral-400
                  hover:bg-neutral-100 dark:hover:bg-neutral-800
                  transition-colors
                "
              >
                <Download size={14} />
                Exportar
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                      Producto
                    </th>
                    <th className="px-3 py-2 text-right text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                      SELL IN
                    </th>
                    <th className="px-3 py-2 text-right text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                      SELL OUT
                    </th>
                    <th className="px-3 py-2 text-right text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                      Stock
                    </th>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                      Rotacion
                    </th>
                    <th className="px-3 py-2 text-right text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                      Dias
                    </th>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                      Tendencia
                    </th>
                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wider font-semibold text-neutral-600 dark:text-neutral-400">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {inventory.map((item) => (
                    <tr key={item.itemCode} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <td className="px-3 py-2">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {item.itemName}
                        </p>
                        <p className="text-xs text-neutral-500 font-mono">{item.itemCode}</p>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-sm text-neutral-700 dark:text-neutral-300">
                        {item.sellIn}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-sm text-neutral-700 dark:text-neutral-300">
                        {item.sellOut}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {item.stockActual}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-neutral-200 dark:bg-neutral-700">
                            <div
                              className={`h-full ${
                                item.rotation >= 80 ? 'bg-success' :
                                item.rotation >= 60 ? 'bg-gold' : 'bg-error'
                              }`}
                              style={{ width: `${item.rotation}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs text-neutral-500">{item.rotation}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={`font-mono text-sm ${
                          item.daysOfStock < 7 ? 'text-gold-dark font-medium' :
                          item.daysOfStock > 60 ? 'text-error-dark' :
                          'text-neutral-700 dark:text-neutral-300'
                        }`}>
                          {item.daysOfStock}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <MiniSparkline data={item.trend} />
                      </td>
                      <td className="px-3 py-2">
                        <span className={`
                          inline-flex items-center gap-1 px-2 py-0.5 text-xs uppercase tracking-wider
                          ${inventoryStatusConfig[item.status]?.color}
                        `}>
                          {item.status === 'low' && <AlertTriangle size={10} />}
                          {inventoryStatusConfig[item.status]?.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="p-4 lg:p-6">
            <h2 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Analytics
            </h2>

            {/* Monthly Trend Chart */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-3">
                Tendencia Mensual
              </h3>
              <div className="flex items-end gap-2 h-40">
                {analytics.monthlyTrend.map((point) => {
                  const maxValue = Math.max(...analytics.monthlyTrend.map(p => Math.max(p.sellIn, p.sellOut)))
                  const sellInHeight = (point.sellIn / maxValue) * 100
                  const sellOutHeight = (point.sellOut / maxValue) * 100

                  return (
                    <div key={point.period} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex items-end gap-0.5 h-32">
                        <div
                          className="flex-1 bg-neutral-300 dark:bg-neutral-600 transition-all"
                          style={{ height: `${sellInHeight}%` }}
                          title={`SELL IN: $${point.sellIn.toLocaleString()}`}
                        />
                        <div
                          className="flex-1 bg-gold transition-all"
                          style={{ height: `${sellOutHeight}%` }}
                          title={`SELL OUT: $${point.sellOut.toLocaleString()}`}
                        />
                      </div>
                      <span className="font-mono text-xs text-neutral-500">{point.period}</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center justify-center gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-neutral-300 dark:bg-neutral-600" />
                  <span className="text-xs text-neutral-500">SELL IN</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gold" />
                  <span className="text-xs text-neutral-500">SELL OUT</span>
                </div>
              </div>
            </div>

            {/* Top Product */}
            <div className="bg-neutral-50 dark:bg-neutral-800 p-4">
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2">
                Producto Mas Vendido
              </h3>
              <p className="font-heading text-xl font-bold text-neutral-900 dark:text-neutral-100">
                {analytics.topProduct.name}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {analytics.topProduct.units} unidades ({analytics.topProduct.percentage}% del total)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
