/**
 * Sales Flow Page - Flujo Completo de Venta Directa
 * ==================================================
 *
 * Gestión del flujo completo: Pedido → Entrega → Factura → Cobro
 * Ahora incluye vista unificada de Pedidos + Facturación
 *
 * Principios TDAH aplicados:
 * - Timeline visual del estado de cada pedido
 * - Filtros por etapa del flujo (pills un clic)
 * - Acciones rápidas contextuales
 * - Indicador de "todo completado" cuando no hay pendientes
 * - Colores semánticos claros por etapa
 */

import { useState, useMemo, useEffect } from 'react'
import {
  Search,
  Package,
  Truck,
  FileText,
  CreditCard,
  CheckCircle,
  ChevronRight,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Filter,
  Plus,
  Receipt,
  AlertCircle,
  Clock,
  TrendingUp,
  Download,
  Send,
} from 'lucide-react'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { useOrders } from '../../api/hooks/useSalesData'
import { OrderDetailPanel } from '../../components/sections/sell-in-operations/OrderDetailPanel'
import { CreateOrderWizard } from '../../components/sections/sell-in-operations/CreateOrderWizard'
import { PaymentModal } from '../../components/modals/PaymentModal'
import { InvoiceDetailDrawer } from './components/InvoiceDetailDrawer'
import { salesApi } from '../../api/services/sales'
import type { SalesOrder } from '../../components/sections/sell-in-operations/types'
import type { Invoice, InvoiceKPIs, InvoiceDetail } from '../../api/services/sales'

// ============ VIEW MODES ============
type ViewMode = 'orders' | 'invoices'

// ============ ORDER FLOW CONFIGURATION ============
const flowStages = [
  {
    id: 'draft',
    label: 'Borradores',
    shortLabel: 'Borrador',
    icon: <FileText size={14} />,
    color: '#78716C',
    bgColor: '#F5F4F2',
    description: 'Pedidos sin confirmar',
  },
  {
    id: 'pending_delivery',
    label: 'Pendiente Entrega',
    shortLabel: 'Entrega',
    icon: <Truck size={14} />,
    color: '#E5A530',
    bgColor: '#FFF8E1',
    description: 'Pedidos confirmados esperando albarán',
  },
  {
    id: 'pending_invoice',
    label: 'Pendiente Factura',
    shortLabel: 'Factura',
    icon: <FileText size={14} />,
    color: '#5BBFBF',
    bgColor: '#E0F7F7',
    description: 'Entregados, pendiente facturar',
  },
  {
    id: 'pending_payment',
    label: 'Pendiente Cobro',
    shortLabel: 'Cobro',
    icon: <CreditCard size={14} />,
    color: '#9575CD',
    bgColor: '#EDE7F6',
    description: 'Facturados, pendiente cobrar',
  },
  {
    id: 'completed',
    label: 'Completados',
    shortLabel: 'Pagado',
    icon: <CheckCircle size={14} />,
    color: '#4CAF7A',
    bgColor: '#E8F5EE',
    description: 'Flujo completo finalizado',
  },
]

// Order status to flow stage mapping
function getFlowStage(order: SalesOrder): string {
  if (order.status === 'cancelled') return 'cancelled'
  if (order.status === 'paid') return 'completed'
  if (order.status === 'invoiced' || order.invoiceProgress >= 100) return 'pending_payment'
  if (order.status === 'delivered' || order.deliveryProgress >= 100) return 'pending_invoice'
  if (['confirmed', 'in_transit'].includes(order.status)) return 'pending_delivery'
  return 'draft'
}

// Status configuration for orders
const orderStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Borrador', color: '#78716C', bgColor: '#F5F4F2' },
  confirmed: { label: 'Confirmado', color: '#2196F3', bgColor: '#E3F2FD' },
  in_transit: { label: 'En Tránsito', color: '#E5A530', bgColor: '#FFF8E1' },
  delivered: { label: 'Entregado', color: '#5BBFBF', bgColor: '#E0F7F7' },
  invoiced: { label: 'Facturado', color: '#9575CD', bgColor: '#EDE7F6' },
  paid: { label: 'Pagado', color: '#4CAF7A', bgColor: '#E8F5EE' },
  cancelled: { label: 'Cancelado', color: '#A8A29E', bgColor: '#F5F4F2' },
}

// ============ INVOICE STATUS CONFIGURATION ============
const invoiceStatusConfig: Record<string, {
  label: string
  color: string
  bgColor: string
  borderColor: string
  icon: React.ReactNode
  priority: number
}> = {
  overdue: {
    label: 'Vencida',
    color: '#E07A4C',
    bgColor: '#FFEBEE',
    borderColor: '#E07A4C',
    icon: <AlertCircle size={14} />,
    priority: 1
  },
  unpaid: {
    label: 'Pendiente',
    color: '#E5A530',
    bgColor: '#FFF8E1',
    borderColor: '#E5A530',
    icon: <Clock size={14} />,
    priority: 2
  },
  draft: {
    label: 'Borrador',
    color: '#78716C',
    bgColor: '#F5F4F2',
    borderColor: '#D4D1CC',
    icon: <FileText size={14} />,
    priority: 3
  },
  paid: {
    label: 'Pagada',
    color: '#4CAF7A',
    bgColor: '#E8F5EE',
    borderColor: '#4CAF7A',
    icon: <CheckCircle size={14} />,
    priority: 4
  },
  cancelled: {
    label: 'Cancelada',
    color: '#A8A29E',
    bgColor: '#F5F4F2',
    borderColor: '#D4D1CC',
    icon: <AlertCircle size={14} />,
    priority: 5
  },
}

// ============ UTILITY FUNCTIONS ============
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

const formatDateLong = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ============ PROGRESS TIMELINE COMPONENT ============
function FlowTimeline({ order }: { order: SalesOrder }) {
  const stages = [
    { id: 'order', label: 'Pedido', done: true },
    { id: 'delivery', label: 'Entrega', done: order.deliveryProgress >= 100 },
    { id: 'invoice', label: 'Factura', done: order.invoiceProgress >= 100 },
    { id: 'payment', label: 'Cobro', done: order.status === 'paid' },
  ]

  return (
    <div className="flex items-center gap-1">
      {stages.map((stage, index) => (
        <div key={stage.id} className="flex items-center">
          <div
            className={`
              w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium
              ${stage.done
                ? 'bg-[#4CAF7A] text-white'
                : 'bg-[#E8E6E3] text-[#78716C]'
              }
            `}
            title={stage.label}
          >
            {stage.done ? <CheckCircle size={12} /> : index + 1}
          </div>
          {index < stages.length - 1 && (
            <div
              className={`
                w-4 h-0.5 mx-0.5
                ${stage.done ? 'bg-[#4CAF7A]' : 'bg-[#E8E6E3]'}
              `}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ============ MAIN COMPONENT ============
export function SalesFlowPage() {
  // View mode: orders or invoices
  const [viewMode, setViewMode] = useState<ViewMode>('orders')

  // ========== ORDERS STATE ==========
  const { data: orders, loading: ordersLoading, error: ordersError, refetch: refetchOrders } = useOrders()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStage, setFilterStage] = useState<string>('all')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false)

  // ========== INVOICES STATE ==========
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invoiceKpis, setInvoiceKpis] = useState<InvoiceKPIs | null>(null)
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [invoicesError, setInvoicesError] = useState<string | null>(null)
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('')
  const [filterInvoiceStatus, setFilterInvoiceStatus] = useState<string>('all')
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null)
  const [isInvoiceDrawerOpen, setIsInvoiceDrawerOpen] = useState(false)
  const [isLoadingInvoiceDetail, setIsLoadingInvoiceDetail] = useState(false)
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

  // Load invoices when switching to invoice view
  useEffect(() => {
    if (viewMode === 'invoices' && invoices.length === 0) {
      loadInvoices()
    }
  }, [viewMode])

  async function loadInvoices() {
    setInvoicesLoading(true)
    try {
      const [fetchedInvoices, fetchedKPIs] = await Promise.all([
        salesApi.getInvoices({ status: 'all' }),
        salesApi.getInvoiceKPIs()
      ])
      setInvoices(fetchedInvoices)
      setInvoiceKpis(fetchedKPIs)
      setInvoicesError(null)
    } catch (err: any) {
      console.error('Error loading invoices:', err)
      setInvoicesError(err.message || 'Error al cargar facturas')
    } finally {
      setInvoicesLoading(false)
    }
  }

  // ========== ORDERS COMPUTED VALUES ==========
  const flowOrders = useMemo(() => {
    if (!orders) return []
    return orders.filter(order => {
      const stage = getFlowStage(order)
      return stage !== 'cancelled'
    })
  }, [orders])

  const filteredOrders = useMemo(() => {
    let result = [...flowOrders]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(order =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query)
      )
    }

    if (filterStage !== 'all') {
      result = result.filter(order => getFlowStage(order) === filterStage)
    }

    const stagePriority: Record<string, number> = {
      draft: 0,
      pending_delivery: 1,
      pending_invoice: 2,
      pending_payment: 3,
      completed: 4,
    }
    result.sort((a, b) => {
      const priorityA = stagePriority[getFlowStage(a)] || 99
      const priorityB = stagePriority[getFlowStage(b)] || 99
      if (priorityA !== priorityB) return priorityA - priorityB
      return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
    })

    return result
  }, [flowOrders, searchQuery, filterStage])

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: flowOrders.length }
    flowOrders.forEach(order => {
      const stage = getFlowStage(order)
      counts[stage] = (counts[stage] || 0) + 1
    })
    return counts
  }, [flowOrders])

  const stageTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    flowOrders.forEach(order => {
      const stage = getFlowStage(order)
      totals[stage] = (totals[stage] || 0) + order.total
    })
    return totals
  }, [flowOrders])

  const allOrdersComplete = useMemo(() => {
    return flowOrders.length > 0 &&
           (stageCounts.draft || 0) === 0 &&
           (stageCounts.pending_delivery || 0) === 0 &&
           (stageCounts.pending_invoice || 0) === 0 &&
           (stageCounts.pending_payment || 0) === 0
  }, [flowOrders, stageCounts])

  // ========== INVOICES COMPUTED VALUES ==========
  const filteredInvoices = useMemo(() => {
    let result = [...invoices]

    if (invoiceSearchQuery.trim()) {
      const query = invoiceSearchQuery.toLowerCase()
      result = result.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(query) ||
        inv.customerName.toLowerCase().includes(query)
      )
    }

    if (filterInvoiceStatus !== 'all') {
      result = result.filter(inv => inv.status === filterInvoiceStatus)
    }

    result.sort((a, b) => {
      const priorityA = invoiceStatusConfig[a.status]?.priority || 99
      const priorityB = invoiceStatusConfig[b.status]?.priority || 99
      if (priorityA !== priorityB) return priorityA - priorityB
      return new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
    })

    return result
  }, [invoices, invoiceSearchQuery, filterInvoiceStatus])

  const invoiceStatusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: invoices.length }
    invoices.forEach(inv => {
      counts[inv.status] = (counts[inv.status] || 0) + 1
    })
    return counts
  }, [invoices])

  const hasUrgentInvoices = useMemo(() => {
    return invoices.some(inv => inv.status === 'overdue')
  }, [invoices])

  // ========== EVENT HANDLERS ==========
  const handleOrderClick = (orderId: string) => {
    setSelectedOrderId(orderId)
    setIsDetailOpen(true)
  }

  const handleWorkflowComplete = () => {
    refetchOrders()
    loadInvoices() // Refresh invoices too
  }

  const handleOrderCreated = () => {
    setIsCreateOrderOpen(false)
    refetchOrders()
  }

  const handleInvoiceClick = async (invoice: Invoice) => {
    setIsInvoiceDrawerOpen(true)
    setIsLoadingInvoiceDetail(true)
    setSelectedInvoice(null)

    try {
      const detail = await salesApi.getInvoiceDetail(invoice.id)
      setSelectedInvoice(detail)
    } catch (err: any) {
      console.error('Error loading invoice detail:', err)
      setSelectedInvoice({
        ...invoice,
        customerAddress: '',
        subtotal: invoice.total / 1.21,
        tax: invoice.total - (invoice.total / 1.21),
        items: [],
        payments: [],
        notes: '',
        createdAt: invoice.invoiceDate,
      })
    } finally {
      setIsLoadingInvoiceDetail(false)
    }
  }

  const handleRegisterPayment = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId)
    if (invoice) {
      setPaymentInvoice(invoice)
      setIsPaymentModalOpen(true)
    }
  }

  const handlePaymentSubmit = async (data: {
    invoiceId: string
    amount: number
    paymentDate: string
    paymentMethod: string
    reference?: string
  }): Promise<boolean> => {
    try {
      // Call real API to create Payment Entry in ERPNext
      const response = await salesApi.createPaymentEntry(data.invoiceId)

      if (response.success) {
        // Refresh data from server
        setIsPaymentModalOpen(false)
        setPaymentInvoice(null)
        refetchOrders()
        loadInvoices()
        return true
      }
      return false
    } catch (err) {
      console.error('Error creating payment entry:', err)
      return false
    }
  }

  const downloadBase64PDF = (base64: string, filename: string) => {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'application/pdf' })

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleDownloadPDF = async (invoiceId: string) => {
    try {
      const response = await salesApi.getInvoicePDF(invoiceId)
      if (response.success && response.pdf_base64) {
        downloadBase64PDF(response.pdf_base64, response.filename || `${invoiceId}.pdf`)
      } else {
        alert('No se pudo generar el PDF de la factura. Verifica que el formato de impresion existe en ERPNext.')
      }
    } catch (err) {
      console.error('Error downloading invoice PDF:', err)
      alert('Error al descargar la factura. Contacta al administrador.')
    }
  }

  const handleDownloadDeliveryNote = async (deliveryNoteId: string) => {
    try {
      const response = await salesApi.getDeliveryNotePDF(deliveryNoteId)
      if (response.success && response.pdf_base64) {
        downloadBase64PDF(response.pdf_base64, response.filename || `${deliveryNoteId}.pdf`)
      } else {
        alert('No se pudo generar el PDF del albaran. Verifica que el formato de impresion existe en ERPNext.')
      }
    } catch (err) {
      console.error('Error downloading delivery note PDF:', err)
      alert('Error al descargar el albaran. Contacta al administrador.')
    }
  }

  const handleRefresh = () => {
    refetchOrders()
    if (viewMode === 'invoices') {
      loadInvoices()
    }
  }

  // ========== LOADING / ERROR STATES ==========
  const loading = viewMode === 'orders' ? ordersLoading : invoicesLoading
  const error = viewMode === 'orders' ? ordersError : invoicesError

  if (loading && (viewMode === 'orders' ? !orders : invoices.length === 0)) {
    return <LoadingState message={viewMode === 'orders' ? 'Cargando flujo de ventas...' : 'Cargando facturas...'} />
  }

  if (error) {
    return (
      <ErrorState
        title={viewMode === 'orders' ? 'Error al cargar pedidos' : 'Error al cargar facturas'}
        message={typeof error === 'string' ? error : error.message}
        onRetry={handleRefresh}
      />
    )
  }

  // ========== RENDER ==========
  return (
    <div className="min-h-screen bg-[#FFFDF7]">
      {/* ========== HEADER ========== */}
      <div className="border-b border-[#E8E6E3] bg-white px-4 md:px-8 py-5">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-['Playfair_Display',Georgia,serif] text-2xl md:text-3xl font-semibold text-[#292524]">
                Flujo de Ventas
              </h1>
              <p className="text-[#78716C] mt-1 text-[11px] uppercase tracking-[0.1em]">
                Gestión completa: Pedido → Entrega → Factura → Cobro
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Create Order Button (only in orders view) */}
              {viewMode === 'orders' && (
                <button
                  onClick={() => setIsCreateOrderOpen(true)}
                  className="
                    flex items-center gap-2
                    px-4 py-2
                    bg-[#E5A530] text-white
                    text-sm font-medium
                    rounded-sm
                    hover:bg-[#d4962c]
                    transition-colors
                    shadow-sm
                  "
                >
                  <Plus size={16} />
                  Nuevo Pedido
                </button>
              )}

              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
                <input
                  type="text"
                  placeholder={viewMode === 'orders' ? 'Buscar pedido o cliente...' : 'Buscar factura o cliente...'}
                  value={viewMode === 'orders' ? searchQuery : invoiceSearchQuery}
                  onChange={(e) => viewMode === 'orders' ? setSearchQuery(e.target.value) : setInvoiceSearchQuery(e.target.value)}
                  className="
                    pl-9 pr-4 py-2 w-56
                    text-sm
                    border border-[#E8E6E3] rounded-sm
                    bg-white
                    focus:outline-none focus:border-[#5BBFBF]
                    placeholder:text-[#A8A29E]
                  "
                />
              </div>

              {/* Refresh */}
              <button
                onClick={handleRefresh}
                className="
                  p-2
                  border border-[#E8E6E3] rounded-sm
                  bg-white text-[#78716C]
                  hover:bg-[#F5F4F2] hover:border-[#D4D1CC]
                  transition-colors
                "
                title="Actualizar"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* ========== VIEW MODE TABS ========== */}
          <div className="mt-4 flex items-center gap-1 border-b border-[#E8E6E3]">
            <button
              onClick={() => setViewMode('orders')}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                border-b-2 -mb-[1px] transition-colors
                ${viewMode === 'orders'
                  ? 'border-[#5BBFBF] text-[#44403C]'
                  : 'border-transparent text-[#78716C] hover:text-[#44403C]'
                }
              `}
            >
              <Package size={16} />
              Pedidos
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${viewMode === 'orders' ? 'bg-[#5BBFBF]/10 text-[#5BBFBF]' : 'bg-[#F5F4F2] text-[#78716C]'}`}>
                {flowOrders.length}
              </span>
            </button>
            <button
              onClick={() => setViewMode('invoices')}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                border-b-2 -mb-[1px] transition-colors
                ${viewMode === 'invoices'
                  ? 'border-[#5BBFBF] text-[#44403C]'
                  : 'border-transparent text-[#78716C] hover:text-[#44403C]'
                }
              `}
            >
              <Receipt size={16} />
              Facturación
              {invoiceKpis && invoiceKpis.overdueCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#E07A4C] text-white">
                  {invoiceKpis.overdueCount}
                </span>
              )}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${viewMode === 'invoices' ? 'bg-[#5BBFBF]/10 text-[#5BBFBF]' : 'bg-[#F5F4F2] text-[#78716C]'}`}>
                {invoices.length}
              </span>
            </button>
          </div>

          {/* ========== KPIs - CONDITIONAL BASED ON VIEW ========== */}
          {viewMode === 'orders' ? (
            <>
              {/* Order Flow KPIs */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                {flowStages.map((stage) => {
                  const count = stageCounts[stage.id] || 0
                  const total = stageTotals[stage.id] || 0
                  const isActive = filterStage === stage.id
                  const isPending = stage.id !== 'completed'

                  return (
                    <button
                      key={stage.id}
                      onClick={() => setFilterStage(isActive ? 'all' : stage.id)}
                      className={`
                        p-4 bg-white border rounded-sm text-left transition-all
                        ${isActive
                          ? 'border-[#44403C] ring-2 ring-[#44403C]/20'
                          : 'border-[#E8E6E3] hover:border-[#D4D1CC]'
                        }
                      `}
                      style={{ borderTopColor: stage.color, borderTopWidth: '3px' }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ color: stage.color }}>{stage.icon}</span>
                        <span className="text-[10px] text-[#78716C] uppercase tracking-wide">
                          {stage.shortLabel}
                        </span>
                      </div>
                      <p className="font-['Playfair_Display'] text-xl md:text-2xl font-semibold" style={{ color: count > 0 && isPending ? stage.color : '#44403C' }}>
                        {count}
                      </p>
                      <p className="text-xs text-[#78716C] mt-0.5">
                        {formatCurrency(total)}
                      </p>
                    </button>
                  )
                })}
              </div>

              {/* All Complete Indicator */}
              {allOrdersComplete && (
                <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-[#E8F5EE] border border-[#4CAF7A]/30 rounded-sm">
                  <Sparkles size={16} className="text-[#4CAF7A]" />
                  <span className="text-sm text-[#4CAF7A] font-medium">
                    ¡Excelente! Todos los pedidos han completado el flujo
                  </span>
                </div>
              )}

              {/* Stage Filter Pills */}
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <Filter size={14} className="text-[#A8A29E]" />
                <button
                  onClick={() => setFilterStage('all')}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5
                    text-xs font-medium rounded-full border transition-all
                    ${filterStage === 'all'
                      ? 'bg-[#44403C] text-white border-[#44403C]'
                      : 'bg-white border-[#E8E6E3] text-[#78716C] hover:border-[#D4D1CC]'
                    }
                  `}
                >
                  Todos
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${filterStage === 'all' ? 'bg-white/20' : 'bg-[#F5F4F2]'}`}>
                    {stageCounts.all || 0}
                  </span>
                </button>

                {flowStages.map((stage) => {
                  const count = stageCounts[stage.id] || 0
                  const isActive = filterStage === stage.id

                  return (
                    <button
                      key={stage.id}
                      onClick={() => setFilterStage(isActive ? 'all' : stage.id)}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5
                        text-xs font-medium rounded-full border transition-all
                        ${isActive
                          ? 'text-white'
                          : 'bg-white text-[#78716C] hover:border-[#D4D1CC]'
                        }
                      `}
                      style={{
                        backgroundColor: isActive ? stage.color : undefined,
                        borderColor: isActive ? stage.color : '#E8E6E3',
                      }}
                    >
                      {stage.icon}
                      {stage.shortLabel}
                      <span
                        className="ml-1 px-1.5 py-0.5 rounded-full text-[10px]"
                        style={{
                          backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#F5F4F2',
                        }}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              {/* Invoice KPIs */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white border border-[#E8E6E3] rounded-sm" style={{ borderTopColor: '#5BBFBF', borderTopWidth: '3px' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Receipt size={14} className="text-[#5BBFBF]" />
                    <span className="text-[10px] text-[#78716C] uppercase tracking-wide">Facturado</span>
                  </div>
                  <p className="font-['Playfair_Display'] text-xl md:text-2xl font-semibold text-[#44403C]">
                    {formatCurrency(invoiceKpis?.invoicedThisMonth || 0)}
                  </p>
                  <p className="text-xs text-[#78716C] mt-0.5">este mes</p>
                </div>

                <div className="p-4 bg-white border border-[#E8E6E3] rounded-sm" style={{ borderTopColor: '#4CAF7A', borderTopWidth: '3px' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={14} className="text-[#4CAF7A]" />
                    <span className="text-[10px] text-[#78716C] uppercase tracking-wide">Cobrado</span>
                  </div>
                  <p className="font-['Playfair_Display'] text-xl md:text-2xl font-semibold text-[#4CAF7A]">
                    {formatCurrency(invoiceKpis?.collectedThisMonth || 0)}
                  </p>
                  <p className="text-xs text-[#78716C] mt-0.5">este mes</p>
                </div>

                <div className="p-4 bg-white border border-[#E8E6E3] rounded-sm" style={{ borderTopColor: '#E5A530', borderTopWidth: '3px' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={14} className="text-[#E5A530]" />
                    <span className="text-[10px] text-[#78716C] uppercase tracking-wide">Por cobrar</span>
                  </div>
                  <p className="font-['Playfair_Display'] text-xl md:text-2xl font-semibold text-[#44403C]">
                    {formatCurrency(invoiceKpis?.totalOutstanding || 0)}
                  </p>
                  <p className="text-xs text-[#78716C] mt-0.5">total pendiente</p>
                </div>

                <div
                  className={`
                    p-4 bg-white border rounded-sm relative
                    ${(invoiceKpis?.overdueCount || 0) > 0
                      ? 'border-[#E07A4C] ring-2 ring-[#E07A4C]/20'
                      : 'border-[#E8E6E3]'
                    }
                  `}
                  style={{ borderTopColor: '#E07A4C', borderTopWidth: '3px' }}
                >
                  {(invoiceKpis?.overdueCount || 0) === 0 && (
                    <div className="absolute top-2 right-2">
                      <Sparkles size={14} className="text-[#4CAF7A]" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle size={14} className="text-[#E07A4C]" />
                    <span className="text-[10px] text-[#78716C] uppercase tracking-wide">Vencidas</span>
                  </div>
                  <p className={`font-['Playfair_Display'] text-xl md:text-2xl font-semibold ${(invoiceKpis?.overdueCount || 0) > 0 ? 'text-[#E07A4C]' : 'text-[#4CAF7A]'}`}>
                    {(invoiceKpis?.overdueCount || 0) > 0
                      ? `${invoiceKpis?.overdueCount} (${formatCurrency(invoiceKpis?.overdueAmount || 0)})`
                      : 'Ninguna'
                    }
                  </p>
                  <p className="text-xs text-[#78716C] mt-0.5">
                    {(invoiceKpis?.overdueCount || 0) > 0 ? 'requieren atención' : 'todo al día'}
                  </p>
                </div>
              </div>

              {/* All OK Indicator */}
              {!hasUrgentInvoices && invoices.length > 0 && (
                <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-[#E8F5EE] border border-[#4CAF7A]/30 rounded-sm">
                  <CheckCircle size={16} className="text-[#4CAF7A]" />
                  <span className="text-sm text-[#4CAF7A] font-medium">
                    Todo en orden - No hay facturas vencidas que requieran atención urgente
                  </span>
                </div>
              )}

              {/* Invoice Status Filter Pills */}
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <Filter size={14} className="text-[#A8A29E]" />
                <button
                  onClick={() => setFilterInvoiceStatus('all')}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5
                    text-xs font-medium rounded-full border transition-all
                    ${filterInvoiceStatus === 'all'
                      ? 'bg-[#44403C] text-white border-[#44403C]'
                      : 'bg-white border-[#E8E6E3] text-[#78716C] hover:border-[#D4D1CC]'
                    }
                  `}
                >
                  Todas
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${filterInvoiceStatus === 'all' ? 'bg-white/20' : 'bg-[#F5F4F2]'}`}>
                    {invoiceStatusCounts.all || 0}
                  </span>
                </button>

                {Object.entries(invoiceStatusConfig).map(([status, config]) => {
                  const count = invoiceStatusCounts[status] || 0
                  if (count === 0 && status !== 'overdue') return null

                  const isActive = filterInvoiceStatus === status

                  return (
                    <button
                      key={status}
                      onClick={() => setFilterInvoiceStatus(status)}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5
                        text-xs font-medium rounded-full border transition-all
                        ${isActive
                          ? 'text-white'
                          : 'bg-white text-[#78716C] hover:border-[#D4D1CC]'
                        }
                      `}
                      style={{
                        backgroundColor: isActive ? config.color : undefined,
                        borderColor: isActive ? config.color : '#E8E6E3',
                      }}
                    >
                      {config.icon}
                      {config.label}
                      <span
                        className="ml-1 px-1.5 py-0.5 rounded-full text-[10px]"
                        style={{
                          backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#F5F4F2',
                        }}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========== CONTENT AREA ========== */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6">
        {viewMode === 'orders' ? (
          // ========== ORDERS LIST ==========
          filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto text-[#D4D1CC] mb-4" />
              <p className="text-[#78716C]">
                {searchQuery || filterStage !== 'all'
                  ? 'No hay pedidos que coincidan con los filtros'
                  : 'No hay pedidos en el flujo de ventas'
                }
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[#E8E6E3] rounded-sm overflow-hidden">
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-[#F5F4F2] border-b border-[#E8E6E3] text-[10px] text-[#78716C] uppercase tracking-wide font-medium">
                <div className="col-span-2">Pedido</div>
                <div className="col-span-3">Cliente</div>
                <div className="col-span-2">Progreso</div>
                <div className="col-span-1 text-right">Total</div>
                <div className="col-span-2">Estado</div>
                <div className="col-span-2 text-right">Siguiente Paso</div>
              </div>

              {/* Table Rows */}
              {filteredOrders.map((order, index) => {
                const stage = getFlowStage(order)
                const stageConfig = flowStages.find(s => s.id === stage) || flowStages[0]
                const config = orderStatusConfig[order.status] || orderStatusConfig.draft

                let nextAction = null
                if (order.status === 'draft') {
                  nextAction = { label: 'Confirmar Pedido', icon: <CheckCircle size={12} /> }
                } else if (order.deliveryProgress < 100) {
                  nextAction = { label: 'Crear Entrega', icon: <Truck size={12} /> }
                } else if (order.invoiceProgress < 100) {
                  nextAction = { label: 'Crear Factura', icon: <FileText size={12} /> }
                } else if (order.status !== 'paid') {
                  nextAction = { label: 'Registrar Cobro', icon: <CreditCard size={12} /> }
                }

                return (
                  <div
                    key={order.id}
                    onClick={() => handleOrderClick(order.id)}
                    className={`
                      grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4
                      px-4 py-4 md:py-3
                      border-b border-[#E8E6E3] last:border-b-0
                      cursor-pointer
                      hover:bg-[#FAF9F7]
                      transition-colors
                      ${index % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF8]'}
                    `}
                    style={{
                      borderLeftWidth: stage !== 'completed' ? '4px' : '0',
                      borderLeftColor: stageConfig.color,
                    }}
                  >
                    <div className="col-span-2 flex items-center gap-2">
                      <Package size={16} className="text-[#A8A29E] hidden md:block" />
                      <div>
                        <p className="font-mono text-sm font-medium text-[#44403C]">{order.orderNumber}</p>
                        <p className="text-[10px] text-[#A8A29E]">{formatDate(order.orderDate)}</p>
                      </div>
                    </div>

                    <div className="col-span-3">
                      <p className="text-sm text-[#44403C] font-medium truncate">{order.customerName}</p>
                      <p className="text-[10px] text-[#A8A29E]">
                        Entrega: {formatDate(order.deliveryDate)}
                      </p>
                    </div>

                    <div className="col-span-2 flex items-center">
                      <FlowTimeline order={order} />
                    </div>

                    <div className="col-span-1 text-right">
                      <p className="text-sm font-medium text-[#44403C]">{formatCurrency(order.total)}</p>
                    </div>

                    <div className="col-span-2">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded-sm"
                        style={{
                          backgroundColor: config.bgColor,
                          color: config.color,
                        }}
                      >
                        {config.label}
                      </span>
                      <p className="text-[10px] text-[#A8A29E] mt-0.5">
                        {stageConfig.description}
                      </p>
                    </div>

                    <div className="col-span-2 flex items-center justify-end gap-2">
                      {nextAction ? (
                        <span
                          className="
                            flex items-center gap-1
                            px-2 py-1
                            text-xs font-medium
                            rounded-sm
                            transition-colors
                          "
                          style={{
                            backgroundColor: stageConfig.bgColor,
                            color: stageConfig.color,
                          }}
                        >
                          {nextAction.icon}
                          {nextAction.label}
                          <ArrowRight size={10} />
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-[#4CAF7A]">
                          <CheckCircle size={12} />
                          Completado
                        </span>
                      )}
                      <ChevronRight size={16} className="text-[#D4D1CC]" />
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          // ========== INVOICES LIST ==========
          filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <Receipt size={48} className="mx-auto text-[#D4D1CC] mb-4" />
              <p className="text-[#78716C]">No hay facturas que coincidan con los filtros</p>
            </div>
          ) : (
            <div className="bg-white border border-[#E8E6E3] rounded-sm overflow-hidden">
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-[#F5F4F2] border-b border-[#E8E6E3] text-[10px] text-[#78716C] uppercase tracking-wide font-medium">
                <div className="col-span-2">Factura</div>
                <div className="col-span-3">Cliente</div>
                <div className="col-span-2">Fecha</div>
                <div className="col-span-1 text-right">Total</div>
                <div className="col-span-1 text-right">Pendiente</div>
                <div className="col-span-1">Estado</div>
                <div className="col-span-2 text-right">Acciones</div>
              </div>

              {/* Table Rows */}
              {filteredInvoices.map((invoice, index) => {
                const config = invoiceStatusConfig[invoice.status]
                const isOverdue = invoice.status === 'overdue'

                return (
                  <div
                    key={invoice.id}
                    onClick={() => handleInvoiceClick(invoice)}
                    className={`
                      grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4
                      px-4 py-4 md:py-3
                      border-b border-[#E8E6E3] last:border-b-0
                      cursor-pointer
                      hover:bg-[#FAF9F7]
                      transition-colors
                      ${isOverdue ? 'bg-[#FFEBEE]/30' : index % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF8]'}
                    `}
                    style={{
                      borderLeftWidth: isOverdue ? '4px' : '0',
                      borderLeftColor: isOverdue ? '#E07A4C' : 'transparent',
                    }}
                  >
                    <div className="col-span-2 flex items-center gap-2">
                      <Receipt size={16} className="text-[#A8A29E] hidden md:block" />
                      <div>
                        <p className="font-mono text-sm font-medium text-[#44403C]">{invoice.invoiceNumber}</p>
                        <p className="text-[10px] text-[#A8A29E] md:hidden">{invoice.zone}</p>
                      </div>
                    </div>

                    <div className="col-span-3">
                      <p className="text-sm text-[#44403C] font-medium truncate">{invoice.customerName}</p>
                      <p className="text-[10px] text-[#A8A29E] hidden md:block">{invoice.zone}</p>
                    </div>

                    <div className="col-span-2 text-sm">
                      <p className="text-[#44403C]">{formatDateLong(invoice.invoiceDate)}</p>
                      <p className={`text-[10px] ${isOverdue ? 'text-[#E07A4C] font-medium' : 'text-[#A8A29E]'}`}>
                        Vence: {formatDate(invoice.dueDate)}
                        {isOverdue && ` (${invoice.daysOverdue}d)`}
                      </p>
                    </div>

                    <div className="col-span-1 text-right">
                      <p className="text-sm font-medium text-[#44403C]">{formatCurrency(invoice.total)}</p>
                    </div>

                    <div className="col-span-1 text-right">
                      <p className={`text-sm font-medium ${invoice.outstanding > 0 ? 'text-[#E5A530]' : 'text-[#4CAF7A]'}`}>
                        {invoice.outstanding > 0 ? formatCurrency(invoice.outstanding) : '-'}
                      </p>
                    </div>

                    <div className="col-span-1">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded-sm"
                        style={{
                          backgroundColor: config.bgColor,
                          color: config.color,
                        }}
                      >
                        {config.icon}
                        {config.label}
                      </span>
                    </div>

                    <div className="col-span-2 flex items-center justify-end gap-2">
                      {(invoice.status === 'unpaid' || invoice.status === 'overdue') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRegisterPayment(invoice.id)
                          }}
                          className="
                            flex items-center gap-1
                            px-2 py-1
                            text-xs font-medium
                            bg-[#4CAF7A] text-white
                            rounded-sm
                            hover:bg-[#3d9c66]
                            transition-colors
                          "
                        >
                          <CreditCard size={12} />
                          Cobrar
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownloadPDF(invoice.id)
                        }}
                        className="
                          p-1.5
                          text-[#78716C]
                          hover:text-[#44403C] hover:bg-[#F5F4F2]
                          rounded-sm
                          transition-colors
                        "
                        title="Descargar PDF"
                      >
                        <Download size={14} />
                      </button>

                      <ChevronRight size={16} className="text-[#D4D1CC]" />
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>

      {/* ========== ORDER DETAIL PANEL ========== */}
      <OrderDetailPanel
        orderId={selectedOrderId}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedOrderId(null)
        }}
        onWorkflowComplete={handleWorkflowComplete}
      />

      {/* ========== CREATE ORDER WIZARD ========== */}
      <CreateOrderWizard
        isOpen={isCreateOrderOpen}
        onClose={() => setIsCreateOrderOpen(false)}
        onSuccess={handleOrderCreated}
      />

      {/* ========== INVOICE DETAIL DRAWER (Unified - SSOT) ========== */}
      <InvoiceDetailDrawer
        isOpen={isInvoiceDrawerOpen}
        onClose={() => {
          setIsInvoiceDrawerOpen(false)
          setSelectedInvoice(null)
        }}
        invoice={selectedInvoice}
        isLoading={isLoadingInvoiceDetail}
        onDownloadPDF={handleDownloadPDF}
        onDownloadDeliveryNote={handleDownloadDeliveryNote}
        onRegisterPayment={handleRegisterPayment}
      />

      {/* ========== PAYMENT MODAL ========== */}
      {paymentInvoice && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false)
            setPaymentInvoice(null)
          }}
          onSubmit={handlePaymentSubmit}
          invoice={{
            id: paymentInvoice.id,
            invoiceNumber: paymentInvoice.invoiceNumber,
            customerName: paymentInvoice.customerName,
            total: paymentInvoice.total,
            outstanding: paymentInvoice.outstanding,
            currency: paymentInvoice.currency,
          }}
        />
      )}
    </div>
  )
}

export default SalesFlowPage
