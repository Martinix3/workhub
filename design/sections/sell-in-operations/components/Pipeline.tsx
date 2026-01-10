import type { PipelineProps, Opportunity, OpportunityStage } from '../types'
import { Plus, Clock, User, DollarSign } from 'lucide-react'

const stageConfig: Record<OpportunityStage, { label: string; color: string }> = {
  new: { label: 'Nuevo', color: 'border-t-stone-400' },
  contacted: { label: 'Contactado', color: 'border-t-cyan-400' },
  proposal: { label: 'Propuesta', color: 'border-t-amber-400' },
  negotiation: { label: 'Negociacion', color: 'border-t-orange-400' },
  won: { label: 'Ganado', color: 'border-t-green-500' },
  lost: { label: 'Perdido', color: 'border-t-red-500' },
}

const stages: OpportunityStage[] = ['new', 'contacted', 'proposal', 'negotiation', 'won', 'lost']

interface OpportunityCardProps {
  opportunity: Opportunity
  onView?: () => void
  onEdit?: () => void
}

function OpportunityCard({ opportunity, onView, onEdit }: OpportunityCardProps) {
  const isUrgent = opportunity.daysInStage > 7 && !['won', 'lost'].includes(opportunity.stage)

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
    return `$${value}`
  }

  return (
    <div
      onClick={onView}
      className={`
        bg-white dark:bg-stone-800 p-3
        border-2 border-stone-900 dark:border-stone-100
        ${isUrgent ? 'border-l-4 border-l-orange-500' : ''}
        shadow-[2px_2px_0_#1c1917] dark:shadow-[2px_2px_0_#fafaf9]
        hover:shadow-[1px_1px_0_#1c1917] dark:hover:shadow-[1px_1px_0_#fafaf9]
        hover:translate-x-[1px] hover:translate-y-[1px]
        transition-all duration-75 cursor-pointer
      `}
    >
      {/* Title */}
      <h4 className="font-medium text-sm text-stone-900 dark:text-stone-100 mb-2 line-clamp-2">
        {opportunity.title}
      </h4>

      {/* Customer */}
      <p className="text-xs text-stone-500 dark:text-stone-400 mb-3 truncate">
        {opportunity.customerName}
      </p>

      {/* Meta */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-stone-500 dark:text-stone-400">
          <DollarSign size={12} />
          <span className="font-mono">{formatCurrency(opportunity.value)}</span>
        </div>

        <div className="flex items-center gap-2">
          {isUrgent && (
            <div className="flex items-center gap-1 text-orange-500">
              <Clock size={12} />
              <span>{opportunity.daysInStage}d</span>
            </div>
          )}
          <div className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-600 flex items-center justify-center">
            <span className="text-[10px] font-medium text-stone-600 dark:text-stone-300">
              {opportunity.assignee.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Pipeline({
  opportunities,
  onMoveOpportunity,
  onViewOpportunity,
  onCreateOpportunity,
  onEditOpportunity
}: PipelineProps) {
  const opportunitiesByStage = stages.reduce((acc, stage) => {
    acc[stage] = opportunities.filter(o => o.stage === stage)
    return acc
  }, {} as Record<OpportunityStage, Opportunity[]>)

  const getStageTotal = (stage: OpportunityStage) => {
    return opportunitiesByStage[stage].reduce((sum, o) => sum + o.value, 0)
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
    return `$${value}`
  }

  return (
    <div className="p-4 lg:p-8 h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-bold text-stone-900 dark:text-stone-100">
            Pipeline
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            Oportunidades comerciales
          </p>
        </div>

        <button
          onClick={onCreateOpportunity}
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
          Nueva Oportunidad
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <div
            key={stage}
            className={`
              flex-shrink-0 w-72
              bg-stone-100 dark:bg-stone-800/50
              border-t-4 ${stageConfig[stage].color}
            `}
          >
            {/* Column Header */}
            <div className="p-3 border-b border-stone-200 dark:border-stone-700">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  {stageConfig[stage].label}
                </h3>
                <span className="font-mono text-xs text-stone-500 dark:text-stone-400 bg-stone-200 dark:bg-stone-700 px-2 py-0.5">
                  {opportunitiesByStage[stage].length}
                </span>
              </div>
              <p className="font-mono text-xs text-stone-500 dark:text-stone-400 mt-1">
                {formatCurrency(getStageTotal(stage))}
              </p>
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 min-h-[200px]">
              {opportunitiesByStage[stage].map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onView={() => onViewOpportunity?.(opportunity.id)}
                  onEdit={() => onEditOpportunity?.(opportunity.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
