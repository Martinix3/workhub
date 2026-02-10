/**
 * DealCard Component
 *
 * Tarjeta compacta para deals siguiendo patrón TDAH.
 * Muestra: empresa, valor, owner, SLA, etapa, prioridad, alerta stagnant.
 * Prohibido: formularios inline, múltiples botones.
 */

import { Clock, Building2, DollarSign, Star, AlertTriangle, User } from 'lucide-react';
import type { CRMDealCard } from '../../../api/types/crm';
import { formatDealValue, formatSLAHours, getUrgencyLevel, getStageColorClasses } from '../../../api/services/crm';

interface DealCardProps {
    deal: CRMDealCard;
    onClick: (deal: CRMDealCard) => void;
}

export function DealCard({ deal, onClick }: DealCardProps) {
    const urgency = getUrgencyLevel(deal.sla_hours);
    const stageClasses = getStageColorClasses(deal.stage.color);
    const isPriority = deal.is_priority;
    const isStagnant = deal.is_stagnant;
    const ownerName = deal.owner_name;

    const urgencyClasses = {
        urgent: 'border-l-4 border-l-red-500 bg-[#FFEBEE]/50',
        warning: 'border-l-4 border-l-orange-400 bg-orange-50/30',
        normal: 'border-l-4 border-l-gray-200',
    };

    // Priority override - gold border
    const priorityClass = isPriority ? 'ring-2 ring-amber-400 ring-offset-1' : '';
    // Stagnant override - dashed border
    const stagnantClass = isStagnant ? 'border-dashed border-[#E07A4C]' : '';

    return (
        <button
            onClick={() => onClick(deal)}
            className={`
                w-full text-left p-4 rounded-sm border border-[#E8E6E3]
                hover:border-primary-400 hover:shadow-md
                transition-all duration-150 cursor-pointer
                ${urgencyClasses[urgency]}
                ${priorityClass}
                ${stagnantClass}
                neobrutal-card relative
            `}
            aria-label={`Ver detalle de ${deal.organization}`}
        >
            {/* Priority Star */}
            {isPriority && (
                <div className="absolute -top-2 -right-2 bg-[#F5CE3E] rounded-full p-1 border border-[#E5A530] shadow-sm">
                    <Star size={12} className="text-[#B87A1F] fill-current" />
                </div>
            )}

            {/* Stagnant Alert */}
            {isStagnant && (
                <div className="absolute -top-2 -left-2 bg-[#FFEBEE] rounded-full p-1 border border-[#E07A4C] shadow-sm">
                    <AlertTriangle size={12} className="text-[#B85A35]" />
                </div>
            )}

            {/* Header: Empresa + Valor */}
            <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Building2 size={16} className="text-stone-500 flex-shrink-0" />
                    <span className="font-semibold text-stone-900 truncate">
                        {deal.organization}
                    </span>
                </div>
                <div className="flex items-center gap-1 text-stone-700 font-mono text-sm flex-shrink-0">
                    <DollarSign size={14} />
                    {formatDealValue(deal.value)}
                </div>
            </div>

            {/* Owner */}
            {ownerName && (
                <div className="flex items-center gap-1 text-xs text-stone-500 mb-2 pl-6">
                    <User size={10} />
                    <span>{ownerName}</span>
                </div>
            )}

            {/* Footer: SLA + Etapa */}
            <div className="flex items-center justify-between gap-2">
                {/* SLA indicator */}
                <div className={`
                    flex items-center gap-1 text-xs font-medium
                    ${urgency === 'urgent' ? 'text-[#B85A35]' :
                        urgency === 'warning' ? 'text-orange-600' : 'text-stone-500'}
                `}>
                    <Clock size={12} />
                    <span>{formatSLAHours(deal.sla_hours)}</span>
                </div>

                {/* Stage badge */}
                <span className={`
                    px-2 py-0.5 text-xs font-medium rounded border
                    ${stageClasses}
                `}>
                    {deal.stage.label}
                </span>
            </div>
        </button>
    );
}

export default DealCard;
