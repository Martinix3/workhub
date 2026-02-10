// Sales Dashboard Page - Santa Brisa Elegante
// Vista boxes-centric con pipeline intelligence + Client Fit Score
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Users,
  Package,
  AlertTriangle,
  Clock,
  ChevronRight,
  ExternalLink,
  Bell,
  DollarSign,
  ShoppingCart,
  Store,
  Globe,
  Coffee,
  BarChart3,
  Award,
  FileWarning,
  Building2,
  User,
  Mail,
  Flame,
  Heart,
  Archive,
  Zap,
  XCircle,
  Truck,
} from 'lucide-react'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { useDashboardSummary, useSalesAlerts, useSalesTasks, useRecentActivity } from '../../api'
import type { SalesAlert, OrderEmail } from '../../api/services/sales'
import { EmailOrderInbox } from '../../components/sections/sell-in-operations/EmailOrderInbox'
import { EmailOrderReviewModal } from '../../components/sections/sell-in-operations/EmailOrderReviewModal'

// ============ TYPES ============
type TimePeriod = 'month' | 'quarter' | 'year'

interface ActivityItem {
  id: string
  type: 'order' | 'payment' | 'alert' | 'visit' | 'activation'
  title: string
  description: string
  timestamp: string
  severity?: 'info' | 'warning' | 'error'
  relatedId?: string
}

// Channel icons & colors for sales_channel from Momentum
const channelIcons: Record<string, React.ReactNode> = {
  'Horeca': <Coffee size={16} />,
  'Retail': <Store size={16} />,
  'Online': <Globe size={16} />,
  'Catering': <ShoppingCart size={16} />,
  'Hotel': <Building2 size={16} />,
  'Distribuidor': <Building2 size={16} />,
  'Privada': <User size={16} />,
  'Sin canal': <Package size={16} />,
}

const channelColors: Record<string, string> = {
  'Horeca': '#5BBFBF',
  'Retail': '#F5CE3E',
  'Online': '#E07A4C',
  'Catering': '#A78BFA',
  'Hotel': '#B8860B',
  'Distribuidor': '#4CAF7A',
  'Privada': '#78716C',
  'Sin canal': '#A8A29E',
}

// Pipeline column config
const COLUMN_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  Backlog: { icon: <Archive size={14} />, color: '#A8A29E', label: 'Backlog' },
  Pipeline: { icon: <Zap size={14} />, color: '#5BBFBF', label: 'Pipeline' },
  Hot: { icon: <Flame size={14} />, color: '#E5A530', label: 'Hot' },
  Won: { icon: <Award size={14} />, color: '#4CAF7A', label: 'Won' },
  Lost: { icon: <XCircle size={14} />, color: '#E07A4C', label: 'Lost' },
  Loyalty: { icon: <Heart size={14} />, color: '#A78BFA', label: 'Loyalty' },
}

// Client Fit tier config
const TIER_CONFIG: Record<string, { color: string; bgColor: string; borderColor: string }> = {
  A: { color: '#15803D', bgColor: '#DCFCE7', borderColor: '#22C55E' },
  B: { color: '#1D4ED8', bgColor: '#DBEAFE', borderColor: '#3B82F6' },
  C: { color: '#B45309', bgColor: '#FEF3C7', borderColor: '#F59E0B' },
  D: { color: '#6B7280', bgColor: '#F3F4F6', borderColor: '#D1D5DB' },
  'Sin clasificar': { color: '#78716C', bgColor: '#F5F4F2', borderColor: '#D6D3D1' },
}

// ============ MAIN COMPONENT ============
export function SalesDashboardPage() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<TimePeriod>('month')

  // Email Order Hub state
  const [selectedEmail, setSelectedEmail] = useState<OrderEmail | null>(null)
  const [showEmailReviewModal, setShowEmailReviewModal] = useState(false)
  const [showEmailInbox, setShowEmailInbox] = useState(false)

  const handleSelectEmail = (email: OrderEmail) => {
    setSelectedEmail(email)
    setShowEmailReviewModal(true)
  }

  const handleOrderCreated = (orderId: string) => {
    console.log('Order created from email:', orderId)
  }

  // Primary data — single endpoint with period filter
  const { data: summary, loading: summaryLoading, error: summaryError, refetch } = useDashboardSummary(period)

  // Separate hooks for non-period-filtered data
  const { data: salesAlerts } = useSalesAlerts()
  const { data: salesTasks } = useSalesTasks()
  const { data: recentActivity } = useRecentActivity()

  // Transform recent activity
  const activities: ActivityItem[] = useMemo(() => {
    if (!recentActivity) return []
    return recentActivity.map(act => {
      const typeMap: Record<string, ActivityItem['type']> = {
        'order_created': 'order',
        'payment_received': 'payment',
        'delivery_completed': 'order',
        'opportunity_moved': 'alert',
        'customer_created': 'visit'
      }
      return {
        id: act.id,
        type: typeMap[act.type] || 'alert',
        title: act.description.split(' - ')[0] || act.type,
        description: act.description,
        timestamp: act.timestamp,
        severity: 'info' as const,
        relatedId: undefined
      }
    })
  }, [recentActivity])

  const handleAlertClick = (alert: SalesAlert) => {
    if (alert.relatedId) {
      if (alert.type === 'overdue_order' || alert.type === 'unbilled_order') {
        navigate(`/ventas/pedidos/${alert.relatedId}`)
      } else if (alert.type === 'overdue_invoice') {
        navigate(`/ventas/cobros/${alert.relatedId}`)
      }
    }
  }

  const handleActivityClick = (activity: ActivityItem) => {
    if (activity.relatedId) {
      if (activity.type === 'order') {
        navigate(`/ventas/pedidos/${activity.relatedId}`)
      } else if (activity.type === 'payment') {
        navigate(`/ventas/cobros/${activity.relatedId}`)
      }
    }
  }

  if (summaryLoading) {
    return <LoadingState message="Cargando dashboard de ventas..." />
  }

  if (summaryError) {
    return (
      <ErrorState
        title="Error al cargar ventas"
        message="No se pudo cargar el dashboard de ventas."
        error={summaryError}
        onRetry={refetch}
      />
    )
  }

  const periodLabels: Record<TimePeriod, string> = {
    month: 'Este Mes',
    quarter: 'Este Trimestre',
    year: 'Este Ano',
  }

  const kpis = summary?.kpis
  const boxesTrend = kpis && kpis.boxes_prev_period > 0
    ? Math.round(((kpis.boxes_this_period - kpis.boxes_prev_period) / kpis.boxes_prev_period) * 100)
    : 0

  return (
    <div className="min-h-screen bg-[#FFFDF7]">
      {/* Header */}
      <div className="border-b border-[#E8E6E3] bg-white px-4 md:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-['Playfair_Display',Georgia,serif] text-2xl md:text-3xl font-semibold text-[#292524]">
                Dashboard de Ventas
              </h1>
              <p className="text-[#78716C] mt-1 text-[11px] uppercase tracking-[0.1em]">
                Vista por Cajas
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Email Hub Toggle */}
              <button
                onClick={() => setShowEmailInbox(!showEmailInbox)}
                className={`
                  inline-flex items-center gap-2 px-4 py-2
                  font-medium text-xs uppercase tracking-[0.05em]
                  border rounded-sm transition-all duration-100
                  ${showEmailInbox
                    ? 'bg-[#FFF8E1] text-[#E5A530] border-[#E5A530]'
                    : 'bg-white hover:bg-stone-50 text-stone-600 border-[#E8E6E3]'
                  }
                `}
              >
                <Mail size={16} />
                Email Hub
              </button>

              {/* Period Selector — NOW FUNCTIONAL */}
              <div className="flex items-center gap-1 p-1 bg-[#F5F4F2] border border-[#E8E6E3] rounded-sm">
              {(['month', 'quarter', 'year'] as TimePeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`
                    px-4 py-2 text-xs font-medium uppercase tracking-[0.05em]
                    rounded-sm transition-all duration-100
                    ${period === p
                      ? 'bg-[#44403C] text-white'
                      : 'text-[#78716C] hover:bg-white'
                    }
                  `}
                >
                  {p === 'month' ? 'Mes' : p === 'quarter' ? 'Trimestre' : 'Ano'}
                </button>
              ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* KPIs Row — boxes-centric */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
          {/* Cajas del Periodo */}
          <KPICard
            label="Cajas del Periodo"
            value={`${Math.round(kpis?.boxes_this_period || 0)}`}
            subtitle={`SI: ${Math.round(kpis?.sell_in_boxes || 0)} · SO: ${Math.round(kpis?.sell_out_boxes || 0)}`}
            trend={boxesTrend}
            period={periodLabels[period]}
          />

          {/* Cuentas Activas */}
          <KPICard
            label="Cuentas Activas"
            value={`${kpis?.active_accounts || 0}`}
            subtitle={`de ${kpis?.total_accounts || 0} totales`}
            period={periodLabels[period]}
          />

          {/* Tasa de Conversion */}
          <KPICard
            label="Tasa de Conversion"
            value={`${kpis?.conversion_rate || 0}%`}
            subtitle="Won + Loyalty / Pipeline total"
            period={periodLabels[period]}
          />

          {/* Client Fit Medio */}
          <KPICard
            label="Client Fit Medio"
            value={`${Math.round(kpis?.avg_client_fit || 0)}`}
            subtitle="Score 0-100 (cuentas activas)"
            period={periodLabels[period]}
          />
        </div>

        {/* Email Order Hub — Collapsible Panel */}
        {showEmailInbox && (
          <div className="mb-6">
            <EmailOrderInbox
              onSelectEmail={handleSelectEmail}
              className="rounded-sm"
            />
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">

            {/* Boxes Evolution — stacked bars Sell In + Sell Out */}
            <div className="bg-white border border-[#E8E6E3] rounded-sm p-5 md:p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-['Playfair_Display',Georgia,serif] text-lg font-semibold text-[#292524] flex items-center gap-2">
                  <BarChart3 size={18} className="text-[#5BBFBF]" />
                  Evolucion de Cajas
                </h2>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-[#5BBFBF] rounded-sm" />
                    Sell In
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-[#F5CE3E] rounded-sm" />
                    Sell Out
                  </span>
                </div>
              </div>

              {summary?.boxes_evolution && summary.boxes_evolution.length > 0 ? (
                <div className="h-48 flex items-end justify-between gap-1.5">
                  {summary.boxes_evolution.map((data, i) => {
                    const maxTotal = Math.max(...summary.boxes_evolution.map(d => Math.max(d.total, 0.1)))
                    const siHeight = maxTotal > 0 ? (Math.max(data.sell_in, 0) / maxTotal) * 100 : 0
                    const soHeight = maxTotal > 0 ? (Math.max(data.sell_out, 0) / maxTotal) * 100 : 0
                    const isLast = i === summary.boxes_evolution.length - 1
                    const monthLabel = data.period.split('-')[1]

                    return (
                      <div key={data.period} className="flex-1 flex flex-col items-center gap-1" title={`${data.period}: SI=${Math.round(data.sell_in)} SO=${Math.round(data.sell_out)}`}>
                        <div className="w-full flex flex-col items-stretch justify-end h-40">
                          {/* Sell Out (top) */}
                          <div
                            className={`w-full bg-[#F5CE3E] rounded-t-sm transition-all duration-500 ${isLast ? 'opacity-100' : 'opacity-70'}`}
                            style={{ height: `${soHeight}%`, minHeight: soHeight > 0 ? '2px' : 0 }}
                          />
                          {/* Sell In (bottom) */}
                          <div
                            className={`w-full bg-[#5BBFBF] transition-all duration-500 ${isLast ? 'opacity-100' : 'opacity-70'} ${soHeight === 0 ? 'rounded-t-sm' : ''}`}
                            style={{ height: `${siHeight}%`, minHeight: siHeight > 0 ? '2px' : 0 }}
                          />
                        </div>
                        <span className={`text-[10px] font-medium ${isLast ? 'text-[#44403C]' : 'text-[#A8A29E]'}`}>
                          {monthLabel}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-sm text-[#A8A29E]">
                  Sin datos de evolucion disponibles
                </div>
              )}
            </div>

            {/* Pipeline Funnel */}
            <div className="bg-white border border-[#E8E6E3] rounded-sm p-5 md:p-6">
              <h2 className="font-['Playfair_Display',Georgia,serif] text-lg font-semibold text-[#292524] mb-4 flex items-center gap-2">
                <Zap size={18} className="text-[#5BBFBF]" />
                Pipeline
              </h2>

              {summary?.pipeline_funnel ? (
                <div className="space-y-2.5">
                  {['Backlog', 'Pipeline', 'Hot', 'Won', 'Loyalty', 'Lost'].map((col) => {
                    const count = summary.pipeline_funnel[col as keyof typeof summary.pipeline_funnel] || 0
                    const maxCount = Math.max(...Object.values(summary.pipeline_funnel), 1)
                    const barWidth = (count / maxCount) * 100
                    const cfg = COLUMN_CONFIG[col]
                    const isLost = col === 'Lost'

                    return (
                      <div key={col} className={`flex items-center gap-3 ${isLost ? 'mt-3 pt-3 border-t border-[#F5F4F2]' : ''}`}>
                        <div className="flex items-center gap-1.5 w-20 flex-shrink-0">
                          <span style={{ color: cfg.color }}>{cfg.icon}</span>
                          <span className={`text-xs font-medium ${isLost ? 'text-[#A8A29E]' : 'text-[#44403C]'}`}>{cfg.label}</span>
                        </div>
                        <div className="flex-1 h-5 bg-[#F5F4F2] rounded-sm overflow-hidden">
                          <div
                            className="h-full rounded-sm transition-all duration-500"
                            style={{ width: `${barWidth}%`, backgroundColor: cfg.color, opacity: isLost ? 0.5 : 0.8 }}
                          />
                        </div>
                        <span className={`text-sm font-semibold w-10 text-right ${isLost ? 'text-[#A8A29E]' : 'text-[#44403C]'}`}>
                          {count}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-[#A8A29E]">Sin datos de pipeline</div>
              )}
            </div>

            {/* Client Fit Distribution */}
            <div className="bg-white border border-[#E8E6E3] rounded-sm p-5 md:p-6">
              <h2 className="font-['Playfair_Display',Georgia,serif] text-lg font-semibold text-[#292524] mb-1 flex items-center gap-2">
                <Target size={18} className="text-[#4CAF7A]" />
                Clasificacion de Cuentas
              </h2>
              <p className="text-[10px] text-[#A8A29E] mb-4">Score combina ventas (60%) + perfil Google (40%)</p>

              {summary?.client_fit_distribution && summary.client_fit_distribution.length > 0 ? (
                <div className="space-y-2.5">
                  {summary.client_fit_distribution.map((item) => {
                    const maxCount = Math.max(...summary.client_fit_distribution.map(d => d.count), 1)
                    const barWidth = (item.count / maxCount) * 100
                    const cfg = TIER_CONFIG[item.tier] || TIER_CONFIG['Sin clasificar']

                    return (
                      <div key={item.tier} className="flex items-center gap-3">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-sm border w-20 text-center flex-shrink-0"
                          style={{ backgroundColor: cfg.bgColor, color: cfg.color, borderColor: cfg.borderColor }}
                        >
                          {item.tier === 'Sin clasificar' ? 'N/A' : `Tier ${item.tier}`}
                        </span>
                        <div className="flex-1 h-5 bg-[#F5F4F2] rounded-sm overflow-hidden">
                          <div
                            className="h-full rounded-sm transition-all duration-500"
                            style={{ width: `${barWidth}%`, backgroundColor: cfg.color, opacity: 0.6 }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-[#44403C] w-10 text-right">{item.count}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-[#A8A29E]">Sin datos de clasificacion</div>
              )}
            </div>

            {/* Channel Mix — from sales_channel (boxes) */}
            <div className="bg-white border border-[#E8E6E3] rounded-sm p-5 md:p-6">
              <h2 className="font-['Playfair_Display',Georgia,serif] text-lg font-semibold text-[#292524] mb-5 flex items-center gap-2">
                <ShoppingCart size={18} className="text-[#F5CE3E]" />
                Mix Comercial
              </h2>

              {summary?.channel_mix && summary.channel_mix.length > 0 ? (
                <div className="space-y-4">
                  {summary.channel_mix.map((channel) => (
                    <div key={channel.channel}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span style={{ color: channelColors[channel.channel] || '#78716C' }}>
                            {channelIcons[channel.channel] || <Store size={16} />}
                          </span>
                          <span className="text-sm font-medium text-[#44403C]">{channel.channel}</span>
                          <span className="text-[10px] text-[#A8A29E]">{channel.accounts} cuentas</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-[#78716C]">
                            {Math.round(channel.boxes)} cajas
                          </span>
                          <span className="font-['Playfair_Display',Georgia,serif] font-semibold text-[#44403C]">
                            {channel.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-[#F5F4F2] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${channel.percentage}%`, backgroundColor: channelColors[channel.channel] || '#78716C' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-[#A8A29E]">
                  Sin datos de mix comercial
                </div>
              )}
            </div>

            {/* Top Sell Out (Distributor → Clients) */}
            <div className="bg-white border border-[#E8E6E3] rounded-sm p-5 md:p-6">
              <h2 className="font-['Playfair_Display',Georgia,serif] text-lg font-semibold text-[#292524] mb-4 flex items-center gap-2">
                <Truck size={18} className="text-[#C2410C]" />
                Top Sell Out
              </h2>
              <p className="text-[11px] text-[#A8A29E] -mt-3 mb-3">Clientes de distribuidores por cajas vendidas</p>

              {summary?.top_sell_out && summary.top_sell_out.length > 0 ? (
                <div className="space-y-2">
                  {summary.top_sell_out.map((item, i) => (
                    <div key={item.customer} className="flex items-center gap-3 p-2.5 bg-[#FFF7ED] rounded-sm hover:bg-[#FFEDD5] transition-colors">
                      <span className="text-xs font-bold text-[#A8A29E] w-5 text-center">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#44403C] truncate">{item.customer}</p>
                        <p className="text-[10px] text-[#A8A29E]">{item.order_count} pedidos{item.last_date ? ` · último ${item.last_date}` : ''}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-[#C2410C]">{Math.round(item.boxes)} cajas</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-[#A8A29E]">Sin datos de sell out</div>
              )}
            </div>

            {/* Top Sell In (Direct Sales) */}
            <div className="bg-white border border-[#E8E6E3] rounded-sm p-5 md:p-6">
              <h2 className="font-['Playfair_Display',Georgia,serif] text-lg font-semibold text-[#292524] mb-4 flex items-center gap-2">
                <Award size={18} className="text-[#6D28D9]" />
                Top Sell In
              </h2>
              <p className="text-[11px] text-[#A8A29E] -mt-3 mb-3">Clientes directos por importe facturado</p>

              {summary?.top_sell_in && summary.top_sell_in.length > 0 ? (
                <div className="space-y-2">
                  {summary.top_sell_in.map((item, i) => (
                    <div key={item.customer} className="flex items-center gap-3 p-2.5 bg-[#EDE9FE] rounded-sm hover:bg-[#DDD6FE] transition-colors">
                      <span className="text-xs font-bold text-[#A8A29E] w-5 text-center">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#44403C] truncate">{item.customer}</p>
                        <p className="text-[10px] text-[#A8A29E]">{item.order_count} facturas{item.last_date ? ` · última ${item.last_date}` : ''}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-[#6D28D9]">{Math.round(item.amount).toLocaleString('es-ES')} €</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-[#A8A29E]">Sin datos de sell in</div>
              )}
            </div>

            {/* Sales Tasks */}
            <div className="bg-white border border-[#E8E6E3] rounded-sm p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-['Playfair_Display',Georgia,serif] text-lg font-semibold text-[#292524] flex items-center gap-2">
                  <Target size={18} className="text-[#E5A530]" />
                  Tareas del Equipo
                </h2>
                <button
                  onClick={() => navigate('/tareas/kanban?department=SALES')}
                  className="text-xs text-[#5BBFBF] hover:text-[#4AA3A3] font-medium flex items-center gap-1"
                >
                  Ver todas
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="space-y-2">
                {salesTasks && salesTasks.length > 0 ? (
                  salesTasks.map((task) => {
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date()
                    const isDueSoon = task.due_date && !isOverdue &&
                      Math.ceil((new Date(task.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 3

                    return (
                      <div
                        key={task.name}
                        className="p-3 bg-[#F5F4F2] border border-[#E8E6E3] hover:border-[#D4D1CC] hover:shadow-sm transition-all duration-100 rounded-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {task.priority === 'P0' && <span className="w-2 h-2 bg-[#E07A4C] rounded-full" />}
                            {task.priority === 'P1' && <span className="w-2 h-2 bg-[#E5A530] rounded-full" />}
                            <span className="font-medium text-[#44403C] text-sm">{task.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isOverdue && <AlertTriangle size={14} className="text-[#E07A4C]" />}
                            {isDueSoon && !isOverdue && <Bell size={14} className="text-[#E5A530]" />}
                            <span className={`text-xs ${isOverdue ? 'text-[#E07A4C]' : 'text-[#A8A29E]'}`}>
                              {task.due_date && new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="py-4 text-center text-sm text-[#A8A29E]">
                    Sin tareas pendientes para el equipo SALES
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-4 md:space-y-6">
            {/* Alerts */}
            {salesAlerts && salesAlerts.length > 0 && (
              <div className="bg-[#FFEBEE] border border-[#E07A4C]/30 rounded-sm p-5">
                <h2 className="font-['Playfair_Display',Georgia,serif] text-lg font-semibold text-[#B94A2C] mb-4 flex items-center gap-2">
                  <FileWarning size={18} className="text-[#E07A4C]" />
                  Alertas ({salesAlerts.length})
                </h2>

                <div className="space-y-2">
                  {salesAlerts.slice(0, 5).map((alert) => (
                    <button
                      key={alert.id}
                      onClick={() => handleAlertClick(alert)}
                      className="w-full text-left p-3 bg-white border border-[#E07A4C]/20 hover:border-[#E07A4C]/40 transition-all duration-100 rounded-sm"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        {alert.severity === 'error' ? (
                          <AlertTriangle size={12} className="text-[#E07A4C]" />
                        ) : (
                          <Bell size={12} className="text-[#E5A530]" />
                        )}
                        <p className="text-sm font-medium text-[#B94A2C]">{alert.title}</p>
                      </div>
                      <p className="text-xs text-[#E07A4C] pl-5">{alert.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Products Top by Boxes */}
            <div className="bg-white border border-[#E8E6E3] rounded-sm p-5">
              <h2 className="font-['Playfair_Display',Georgia,serif] text-lg font-semibold text-[#292524] mb-4 flex items-center gap-2">
                <Package size={18} className="text-[#5BBFBF]" />
                Productos Top
              </h2>

              <div className="space-y-3">
                {summary?.products_top_boxes && summary.products_top_boxes.length > 0 ? (
                  summary.products_top_boxes.map((product, i) => {
                    const maxVal = summary.products_top_boxes[0]?.boxes || 1
                    const barWidth = (product.boxes / maxVal) * 100
                    return (
                      <div key={product.product}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-[#44403C] truncate flex-1 mr-2">
                            {i + 1}. {product.product}
                          </span>
                          <span className="text-xs font-medium text-[#78716C]">
                            {Math.round(product.boxes)} cajas
                          </span>
                        </div>
                        <div className="h-1.5 bg-[#F5F4F2] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#5BBFBF] rounded-full transition-all duration-500"
                            style={{ width: `${barWidth}%`, opacity: 1 - (i * 0.15) }}
                          />
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="py-4 text-center text-sm text-[#A8A29E]">
                    Sin datos de productos
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white border border-[#E8E6E3] rounded-sm p-5">
              <h2 className="font-['Playfair_Display',Georgia,serif] text-lg font-semibold text-[#292524] mb-4 flex items-center gap-2">
                <Clock size={18} className="text-[#A8A29E]" />
                Actividad Reciente
              </h2>

              <div className="space-y-3">
                {activities.slice(0, 5).map((activity) => {
                  const iconMap = {
                    order: <ShoppingCart size={14} />,
                    payment: <DollarSign size={14} />,
                    alert: <AlertTriangle size={14} />,
                    visit: <Users size={14} />,
                    activation: <Package size={14} />,
                  }
                  const colorMap = {
                    info: 'text-[#5BBFBF]',
                    warning: 'text-[#E5A530]',
                    error: 'text-[#E07A4C]',
                  }

                  return (
                    <button
                      key={activity.id}
                      onClick={() => handleActivityClick(activity)}
                      className="w-full text-left flex items-start gap-3 p-2 -mx-2 hover:bg-[#F5F4F2] rounded-sm transition-colors"
                    >
                      <div className={`mt-0.5 ${colorMap[activity.severity || 'info']}`}>
                        {iconMap[activity.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#44403C] truncate">{activity.title}</p>
                        <p className="text-xs text-[#78716C] truncate">{activity.description}</p>
                        <p className="text-[10px] text-[#A8A29E] mt-0.5">
                          {formatRelativeTime(activity.timestamp)}
                        </p>
                      </div>
                      {activity.relatedId && (
                        <ExternalLink size={12} className="text-[#D4D1CC] mt-1" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Email Order Review Modal */}
      <EmailOrderReviewModal
        email={selectedEmail}
        isOpen={showEmailReviewModal}
        onClose={() => {
          setShowEmailReviewModal(false)
          setSelectedEmail(null)
        }}
        onOrderCreated={handleOrderCreated}
      />
    </div>
  )
}

// ============ KPI CARD COMPONENT ============
interface KPICardProps {
  label: string
  value: string
  subtitle?: string
  trend?: number
  period: string
}

function KPICard({ label, value, subtitle, trend, period }: KPICardProps) {
  const hasTrend = trend !== undefined && trend !== 0
  const trendColor = trend && trend > 0 ? 'text-[#4CAF7A]' : trend && trend < 0 ? 'text-[#E07A4C]' : 'text-[#78716C]'
  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus

  return (
    <div className="bg-white border border-[#E8E6E3] rounded-sm p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] md:text-[11px] text-[#78716C] uppercase tracking-[0.1em]">
          {label}
        </p>
        {hasTrend && (
          <span className={`flex items-center gap-1 text-xs ${trendColor}`}>
            <TrendIcon size={12} />
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>

      <p className="font-['Playfair_Display',Georgia,serif] text-2xl md:text-3xl font-semibold text-[#44403C]">
        {value}
      </p>

      {subtitle && (
        <p className="text-[10px] text-[#A8A29E] mt-1">{subtitle}</p>
      )}

      <p className="text-[10px] text-[#A8A29E] mt-1">{period}</p>
    </div>
  )
}

// ============ HELPERS ============
function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const date = new Date(timestamp)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `Hace ${diffMins} min`
  if (diffHours < 24) return `Hace ${diffHours}h`
  if (diffDays === 1) return 'Ayer'
  return `Hace ${diffDays} dias`
}

export default SalesDashboardPage
