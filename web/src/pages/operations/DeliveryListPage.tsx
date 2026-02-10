/**
 * Delivery List Page
 * ==================
 * List of delivery notes with filters and SidePanel detail.
 * Pattern: same as OrderListPage + SalesFlowPage.
 */

import { useState, useMemo } from 'react'
import {
  Search, Truck, FileText, RefreshCw,
  CheckCircle, Clock, AlertCircle
} from 'lucide-react'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { DeliveryDetailPanel } from '../../components/sections/operations/DeliveryDetailPanel'
import { useDeliveryNotes } from '../../api/hooks/useLogisticsData'
import logisticsApi from '../../api/services/logistics'
import type { DeliveryFilters } from '../../components/sections/operations/types'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  Draft: { label: 'Borrador', color: 'bg-stone-200 text-stone-700', icon: <FileText size={12} /> },
  'To Bill': { label: 'Pte. Factura', color: 'bg-amber-100 text-amber-700', icon: <Clock size={12} /> },
  Completed: { label: 'Completado', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={12} /> },
  Cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: <AlertCircle size={12} /> },
}

const filterTabs = [
  { id: 'all', label: 'Todos' },
  { id: 'Draft', label: 'Borrador' },
  { id: 'To Bill', label: 'Pte. Factura' },
  { id: 'Completed', label: 'Completado' },
]

export function DeliveryListPage() {
  const [filters] = useState<DeliveryFilters>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const { data: deliveries, loading, error, refetch } = useDeliveryNotes(filters)

  // Filter by tab
  const filteredDeliveries = useMemo(() => {
    if (!deliveries) return []
    let result = deliveries
    if (activeTab !== 'all') {
      result = result.filter(d => d.status === activeTab)
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(d =>
        d.deliveryNumber.toLowerCase().includes(q) ||
        d.customerName.toLowerCase().includes(q)
      )
    }
    return result
  }, [deliveries, activeTab, searchQuery])

  // Tab counts
  const tabCounts = useMemo(() => {
    if (!deliveries) return {}
    return deliveries.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [deliveries])

  const handleRowClick = (id: string) => {
    setSelectedId(id)
    setIsPanelOpen(true)
  }

  const handleDownloadPDF = async (deliveryNoteId: string) => {
    try {
      const result = await logisticsApi.getDeliveryNotePDF(deliveryNoteId)
      if (result.base64) {
        const link = document.createElement('a')
        link.href = `data:application/pdf;base64,${result.base64}`
        link.download = `${deliveryNoteId}.pdf`
        link.click()
      }
    } catch {
      // PDF download failed silently
    }
  }

  if (loading) return <LoadingState message="Cargando entregas..." />
  if (error) return <ErrorState title="Error al cargar entregas" message="No se pudieron cargar los albaranes." error={error} onRetry={refetch} />

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-mono text-2xl font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
            Entregas
          </h1>
          <p className="text-sm text-stone-500 mt-1">Albaranes y notas de entrega</p>
        </div>
        <button
          onClick={refetch}
          className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          title="Actualizar"
        >
          <RefreshCw size={18} className="text-stone-500" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Tab pills */}
        <div className="flex gap-1 bg-stone-100 dark:bg-stone-800 p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {tab.label}
              {tab.id !== 'all' && tabCounts[tab.id] ? (
                <span className="ml-1 text-[10px]">({tabCounts[tab.id]})</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar por albaran o cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border-2 border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:border-amber-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border-2 border-stone-900 dark:border-stone-100 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-stone-100 dark:bg-stone-800 border-b-2 border-stone-900 dark:border-stone-100">
          <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-stone-500">Albaran</div>
          <div className="col-span-3 text-xs font-medium uppercase tracking-wider text-stone-500">Cliente</div>
          <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-stone-500">Fecha</div>
          <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-stone-500">Estado</div>
          <div className="col-span-2 text-xs font-medium uppercase tracking-wider text-stone-500">Transporte</div>
          <div className="col-span-1 text-xs font-medium uppercase tracking-wider text-stone-500 text-right">Total</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-stone-200 dark:divide-stone-700">
          {filteredDeliveries.length > 0 ? (
            filteredDeliveries.map((dn) => {
              const status = statusConfig[dn.status] || statusConfig.Draft
              return (
                <button
                  key={dn.id}
                  onClick={() => handleRowClick(dn.id)}
                  className="w-full grid grid-cols-12 gap-2 px-4 py-3 items-center text-left hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                >
                  <div className="col-span-2">
                    <span className="font-mono text-sm font-medium text-stone-900 dark:text-stone-100">{dn.deliveryNumber}</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-sm text-stone-900 dark:text-stone-100 truncate block">{dn.customerName}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-stone-500">{formatDate(dn.date)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider font-medium ${status.color}`}>
                      {status.icon} {status.label}
                    </span>
                  </div>
                  <div className="col-span-2">
                    {dn.transporterName ? (
                      <div className="flex items-center gap-1">
                        <Truck size={12} className="text-stone-400" />
                        <span className="text-xs text-stone-500 truncate">{dn.transporterName}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-stone-300">-</span>
                    )}
                  </div>
                  <div className="col-span-1 text-right">
                    <span className="font-mono text-sm font-medium text-stone-900 dark:text-stone-100">{formatCurrency(dn.total)}</span>
                  </div>
                </button>
              )
            })
          ) : (
            <div className="px-4 py-12 text-center">
              <Truck size={32} className="mx-auto text-stone-300 dark:text-stone-600 mb-3" />
              <p className="text-sm text-stone-500">No hay albaranes{activeTab !== 'all' ? ` con estado "${filterTabs.find(t => t.id === activeTab)?.label}"` : ''}</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      <DeliveryDetailPanel
        deliveryNoteId={selectedId}
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false)
          setSelectedId(null)
        }}
        onDownloadPDF={handleDownloadPDF}
      />
    </div>
  )
}
