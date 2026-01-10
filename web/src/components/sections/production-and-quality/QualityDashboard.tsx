import type { QualityDashboardProps, NonConformance, Inspection, WeeklyTrendPoint } from './types'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Clock, CheckCircle, XCircle, Eye } from 'lucide-react'

interface KPICardProps {
  kpi: { value: number; previousValue: number; change: number; label: string }
  format?: 'number' | 'percent' | 'days'
  invertTrend?: boolean
}

function KPICard({ kpi, format = 'number', invertTrend = false }: KPICardProps) {
  const rawPositive = kpi.change > 0
  const rawNegative = kpi.change < 0
  const isPositive = invertTrend ? rawNegative : rawPositive
  const isNegative = invertTrend ? rawPositive : rawNegative

  const formatValue = (value: number) => {
    if (format === 'percent') return `${value}%`
    if (format === 'days') return `${value}d`
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
        {rawPositive && <TrendingUp size={14} />}
        {rawNegative && <TrendingDown size={14} />}
        {!rawPositive && !rawNegative && <Minus size={14} />}
        <span>{rawPositive && '+'}{kpi.change.toFixed(1)}%</span>
      </div>
    </div>
  )
}

const severityConfig = {
  minor: { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-400' },
  major: { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-400' },
  critical: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300', border: 'border-red-400' },
}

const statusLabels = {
  open: 'Abierta',
  investigation: 'Investigacion',
  action: 'Accion Correctiva',
  closed: 'Cerrada',
}

const resultConfig = {
  approved: { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', label: 'Aprobado' },
  rejected: { icon: XCircle, color: 'text-red-600 dark:text-red-400', label: 'Rechazado' },
  held: { icon: Clock, color: 'text-amber-600 dark:text-amber-400', label: 'Retenido' },
}

interface NCCardProps {
  nc: NonConformance
  onView?: () => void
}

function NCCard({ nc, onView }: NCCardProps) {
  const severity = severityConfig[nc.severity]

  return (
    <button
      onClick={onView}
      className={`
        w-full text-left
        bg-white dark:bg-stone-900
        border-2 border-stone-900 dark:border-stone-100
        border-l-4 ${severity.border}
        p-4
        shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9]
        hover:translate-x-[2px] hover:translate-y-[2px]
        hover:shadow-[2px_2px_0_#1c1917] dark:hover:shadow-[2px_2px_0_#fafaf9]
        transition-all duration-75
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="font-mono text-sm font-bold text-stone-900 dark:text-stone-100">
            {nc.ncNumber}
          </span>
          <span className={`ml-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${severity.bg} ${severity.text}`}>
            {nc.severity}
          </span>
        </div>
        <div className="flex items-center gap-1 text-stone-500">
          <Clock size={12} />
          <span className="text-xs">{nc.daysOpen}d</span>
        </div>
      </div>

      <p className="text-sm text-stone-700 dark:text-stone-300 mb-2 line-clamp-2">
        {nc.description}
      </p>

      <div className="flex items-center justify-between text-xs text-stone-500">
        <span>{statusLabels[nc.status]}</span>
        <span>{nc.responsible}</span>
      </div>
    </button>
  )
}

interface InspectionRowProps {
  inspection: Inspection
  onView?: () => void
}

function InspectionRow({ inspection, onView }: InspectionRowProps) {
  const result = resultConfig[inspection.result]
  const ResultIcon = result.icon

  return (
    <tr className="group hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
      <td className="px-4 py-3">
        <span className="font-mono text-sm text-stone-900 dark:text-stone-100">
          {inspection.lotNumber}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-stone-700 dark:text-stone-300">
        {inspection.productName}
      </td>
      <td className="px-4 py-3">
        <div className={`flex items-center gap-1.5 ${result.color}`}>
          <ResultIcon size={14} />
          <span className="text-xs uppercase tracking-wider">{result.label}</span>
        </div>
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

interface TrendChartProps {
  data: WeeklyTrendPoint[]
}

function TrendChart({ data }: TrendChartProps) {
  const maxValue = Math.max(...data.map(d => d.approved + d.rejected))

  return (
    <div className="h-32">
      <div className="flex items-end justify-between h-full gap-2">
        {data.map((point, i) => {
          const approvedHeight = maxValue > 0 ? (point.approved / maxValue) * 100 : 0
          const rejectedHeight = maxValue > 0 ? (point.rejected / maxValue) * 100 : 0

          return (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col justify-end h-24 gap-0.5">
                {rejectedHeight > 0 && (
                  <div
                    className="w-full bg-red-500"
                    style={{ height: `${rejectedHeight}%` }}
                  />
                )}
                <div
                  className="w-full bg-green-500"
                  style={{ height: `${approvedHeight}%` }}
                />
              </div>
              <span className="text-[10px] text-stone-400 mt-1">{point.day}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function QualityDashboard({
  kpis,
  pendingInspections,
  openNCs,
  weeklyTrend,
  onViewInspection,
  onViewNC
}: QualityDashboardProps) {
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-2xl lg:text-3xl font-bold text-stone-900 dark:text-stone-100">
          Control de Calidad
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Inspecciones, no-conformidades y metricas de calidad
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard kpi={kpis.approvalRate} format="percent" />
        <KPICard kpi={kpis.openNCs} invertTrend />
        <KPICard kpi={kpis.pendingInspections} invertTrend />
        <KPICard kpi={kpis.avgCloseTime} format="days" invertTrend />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Weekly Trend + Pending Inspections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trend Chart */}
          <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 p-4 shadow-[4px_4px_0_#1c1917] dark:shadow-[4px_4px_0_#fafaf9]">
            <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100 mb-4">
              Tendencia Semanal
            </h2>
            <TrendChart data={weeklyTrend} />
            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500" />
                <span className="text-stone-500">Aprobados</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500" />
                <span className="text-stone-500">Rechazados</span>
              </div>
            </div>
          </div>

          {/* Pending Inspections */}
          <div className="bg-white dark:bg-stone-900 border-2 border-stone-900 dark:border-stone-100 overflow-hidden">
            <div className="px-4 py-3 border-b-2 border-stone-900 dark:border-stone-100">
              <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
                Inspecciones Recientes
              </h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-700">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-stone-600 dark:text-stone-400">Lote</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-stone-600 dark:text-stone-400">Producto</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold text-stone-600 dark:text-stone-400">Resultado</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                {pendingInspections.map((inspection) => (
                  <InspectionRow
                    key={inspection.id}
                    inspection={inspection}
                    onView={() => onViewInspection?.(inspection.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Open NCs */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={20} className="text-amber-500" />
            <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
              No-Conformidades Abiertas
            </h2>
          </div>
          <div className="space-y-4">
            {openNCs.map((nc) => (
              <NCCard
                key={nc.id}
                nc={nc}
                onView={() => onViewNC?.(nc.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
