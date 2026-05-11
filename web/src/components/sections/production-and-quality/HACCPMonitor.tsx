import type { HACCPMonitorProps, CriticalControlPoint, CCPReading, CCPStatus } from './types'
import { AlertTriangle, CheckCircle, Clock, Shield, Eye, Plus } from 'lucide-react'

const statusConfig: Record<CCPStatus, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  normal: { bg: 'bg-success-light dark:bg-success-dark', border: 'border-success-dark', text: 'text-success-text dark:text-success', icon: <CheckCircle size={16} /> },
  warning: { bg: 'bg-gold-light dark:bg-gold-dark/20', border: 'border-gold-dark', text: 'text-gold-dark dark:text-gold', icon: <AlertTriangle size={16} /> },
  critical: { bg: 'bg-error-light dark:bg-error-dark', border: 'border-error-dark', text: 'text-error-text dark:text-error', icon: <AlertTriangle size={16} /> },
}

const hazardIcons: Record<string, React.ReactNode> = {
  biological: <Shield size={14} />,
  chemical: <span className="text-xs font-bold">Qx</span>,
  physical: <span className="text-xs font-bold">Fx</span>,
}

interface CCPCardProps {
  ccp: CriticalControlPoint
  onRecord?: () => void
}

function CCPCard({ ccp, onRecord }: CCPCardProps) {
  const status = statusConfig[ccp.status]

  return (
    <div className={`
      bg-white dark:bg-neutral-900
      border border-neutral-200 dark:border-neutral-100
      border-l-4 ${status.border}
      p-4
    `}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 flex items-center justify-center ${status.bg} ${status.text}`}>
            {status.icon}
          </div>
          <div>
            <h3 className="font-medium text-neutral-900 dark:text-neutral-100">{ccp.name}</h3>
            <div className="flex items-center gap-1 text-xs text-neutral-500">
              {hazardIcons[ccp.hazardType]}
              <span className="capitalize">{ccp.hazardType}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Limite Critico</div>
          <div className="font-mono text-sm text-neutral-700 dark:text-neutral-300">{ccp.criticalLimit}</div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Valor Actual</div>
            <div className={`font-mono text-2xl font-bold ${status.text}`}>
              {ccp.currentValue || '--'}
            </div>
          </div>
          {ccp.lastReading && (
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-neutral-400 mb-1">Ultima Lectura</div>
              <div className="text-xs text-neutral-500">
                {new Date(ccp.lastReading).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-neutral-500">
          <span className="text-neutral-400">Frecuencia:</span> {ccp.frequency}
        </div>
      </div>

      <button
        onClick={onRecord}
        className="
          mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2
          text-xs uppercase tracking-wider font-medium
          text-neutral-700 dark:text-neutral-300
          border border-neutral-300 dark:border-neutral-600
          hover:bg-neutral-100 dark:hover:bg-neutral-800
          transition-colors
        "
      >
        <Plus size={14} />
        Registrar Lectura
      </button>
    </div>
  )
}

interface AlertRowProps {
  reading: CCPReading
  onAcknowledge?: () => void
}

function AlertRow({ reading, onAcknowledge }: AlertRowProps) {
  const status = statusConfig[reading.status]

  return (
    <div className={`
      p-4 border-l-4 ${status.border} ${status.bg}
      flex items-start justify-between gap-4
    `}>
      <div className="flex items-start gap-3">
        <div className={status.text}>{status.icon}</div>
        <div>
          <div className="font-medium text-neutral-900 dark:text-neutral-100">
            {reading.ccpName}: {reading.value}
          </div>
          <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {reading.correctiveActionTaken || 'Accion correctiva pendiente'}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-neutral-400">
            <Clock size={12} />
            {new Date(reading.timestamp).toLocaleString('es-MX')}
            {reading.lotNumber && (
              <>
                <span>|</span>
                <span className="font-mono">{reading.lotNumber}</span>
              </>
            )}
          </div>
        </div>
      </div>
      {onAcknowledge && (
        <button
          onClick={onAcknowledge}
          className="px-3 py-1.5 text-xs uppercase tracking-wider font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 hover:bg-white dark:hover:bg-neutral-800 transition-colors"
        >
          Atender
        </button>
      )}
    </div>
  )
}

export function HACCPMonitor({
  plans,
  recentReadings: _recentReadings,
  activeAlerts,
  onRecordReading,
  onViewPlan,
  onAcknowledgeAlert
}: HACCPMonitorProps) {
  // Flatten all CCPs from all plans
  const allCCPs = plans.flatMap(plan => plan.ccps)
  const criticalCount = allCCPs.filter(ccp => ccp.status === 'critical').length
  const warningCount = allCCPs.filter(ccp => ccp.status === 'warning').length

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            Monitor HACCP
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Puntos Criticos de Control en tiempo real
          </p>
        </div>

        <div className="flex items-center gap-3">
          {criticalCount > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-error-light dark:bg-error-dark text-error-text dark:text-error">
              <AlertTriangle size={16} />
              <span className="font-mono font-bold">{criticalCount}</span>
              <span className="text-xs uppercase">Critico</span>
            </div>
          )}
          {warningCount > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-gold-light dark:bg-gold-dark text-gold-dark dark:text-gold">
              <AlertTriangle size={16} />
              <span className="font-mono font-bold">{warningCount}</span>
              <span className="text-xs uppercase">Alerta</span>
            </div>
          )}
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="mb-8">
          <h2 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-error" />
            Alertas Activas
          </h2>
          <div className="space-y-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-100">
            {activeAlerts.map((reading) => (
              <AlertRow
                key={reading.id}
                reading={reading}
                onAcknowledge={() => onAcknowledgeAlert?.(reading.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* CCPs Grid by Plan */}
      {plans.map((plan) => (
        <div key={plan.id} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {plan.productName}
              </h2>
              <p className="text-xs text-neutral-500">
                Plan HACCP v{plan.version} | Vigente desde {plan.effectiveDate}
              </p>
            </div>
            <button
              onClick={() => onViewPlan?.(plan.id)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-wider font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <Eye size={14} />
              Ver Plan
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plan.ccps.map((ccp) => (
              <CCPCard
                key={ccp.id}
                ccp={ccp}
                onRecord={() => onRecordReading?.(ccp.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
