/**
 * LeadCard Component
 * 
 * Tarjeta compacta para leads siguiendo patrón TDAH.
 * Muestra: nombre, organización, temperatura y fuente.
 */

import { User, Building2 } from 'lucide-react';
import type { CRMLeadCard } from '../../../api/types/crm';
import { getTemperatureColor } from '../../../api/services/crm';

interface LeadCardProps {
    lead: CRMLeadCard;
    onClick: (lead: CRMLeadCard) => void;
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
    const tempClasses = getTemperatureColor(lead.temperature);

    const tempLabels = {
        hot: '🔥 Caliente',
        warm: '🔸 Tibio',
        cold: '❄️ Frío',
    };

    return (
        <button
            onClick={() => onClick(lead)}
            className="
        w-full text-left p-4 rounded-sm border border-[#E8E6E3]
        hover:border-primary-400 hover:shadow-md
        transition-all duration-150 cursor-pointer
        bg-white neobrutal-card
      "
            aria-label={`Ver detalle de lead ${lead.name}`}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <User size={16} className="text-stone-500 flex-shrink-0" />
                    <span className="font-semibold text-stone-900 truncate">
                        {lead.name}
                    </span>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${tempClasses}`}>
                    {tempLabels[lead.temperature]}
                </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-stone-600 mb-1">
                <Building2 size={14} className="flex-shrink-0" />
                <span className="truncate">{lead.organization || 'Individual'}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-stone-500 mt-3">
                <span>{lead.source || 'Sin fuente'}</span>
                <span>{lead.created ? new Date(lead.created).toLocaleDateString() : ''}</span>
            </div>
        </button>
    );
}

export default LeadCard;
