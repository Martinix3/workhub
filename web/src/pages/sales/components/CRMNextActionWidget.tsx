/**
 * CRMNextActionWidget - Componente para mostrar la acción recomendada en un Deal o Lead.
 * Mantiene la estética Neobrutalista del sistema Stone & Ink.
 */

import { Zap } from 'lucide-react';
import type { CRMNextAction } from '../../../api/types/crm';

interface CRMNextActionWidgetProps {
    nextAction: CRMNextAction | null;
    loading?: boolean;
}

export function CRMNextActionWidget({ nextAction, loading }: CRMNextActionWidgetProps) {
    if (loading) {
        return (
            <div className="bg-[#FFF8E1] border border-[#E8E6E3] shadow-sm p-4 animate-pulse">
                <div className="h-4 w-24 bg-[#F5CE3E] mb-2" />
                <div className="h-6 w-full bg-[#F5CE3E]" />
            </div>
        );
    }

    if (!nextAction) {
        return (
            <div className="bg-stone-50 border border-[#E8E6E3] p-4 text-center rounded-sm">
                <p className="text-stone-500 text-sm">✨ Todo al día.</p>
            </div>
        );
    }

    return (
        <div className="
      bg-[#FFF8E1] border border-[#E8E6E3]
      shadow-sm
      p-4 transition-all duration-75
    ">
            <div className="flex items-center gap-2 mb-2">
                <Zap size={16} className="text-stone-900" fill="currentColor" />
                <span className="text-xs font-bold uppercase tracking-wider text-stone-900">
                    ¿Qué hago ahora?
                </span>
            </div>

            <h3 className="font-serif font-bold text-stone-900 text-lg">
                {nextAction.action}
            </h3>

            {nextAction.priority === 'high' && (
                <span className="inline-block mt-2 px-2 py-0.5 bg-[#C96A3F] text-white text-[10px] uppercase font-bold tracking-tight">
                    Alta Prioridad
                </span>
            )}
        </div>
    );
}

export default CRMNextActionWidget;
