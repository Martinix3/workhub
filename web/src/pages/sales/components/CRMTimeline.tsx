/**
 * CRMTimeline Component
 * 
 * Timeline reducida de actividades CRM (máx 5 items).
 * Siguiendo principio de reducción de carga cognitiva TDAH.
 */

import { Phone, Mail, FileText, Users, ArrowRightLeft } from 'lucide-react';
import type { CRMActivity } from '../../../api/types/crm';

interface CRMTimelineProps {
    activities: CRMActivity[];
}

const activityIcons = {
    call: <Phone size={14} />,
    email: <Mail size={14} />,
    note: <FileText size={14} />,
    meeting: <Users size={14} />,
    stage_change: <ArrowRightLeft size={14} />,
};

const activityColors = {
    call: 'bg-[#E0F4F4] text-[#3D8B8B]',
    email: 'bg-[#FFF8E1] text-[#B8860B]',
    note: 'bg-[#FFF8E1] text-[#B87A1F]',
    meeting: 'bg-emerald-100 text-emerald-600',
    stage_change: 'bg-[#F5F4F2] text-stone-600',
};

export function CRMTimeline({ activities }: CRMTimelineProps) {
    if (activities.length === 0) {
        return (
            <div className="text-center py-6 text-stone-500 text-sm border border-dashed border-[#E8E6E3] rounded-sm">
                Sin actividad reciente
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {activities.map((activity, index) => (
                <div key={activity.id} className="flex gap-3">
                    {/* Connector line */}
                    <div className="flex flex-col items-center">
                        <div className={`p-2 rounded-full ${activityColors[activity.type] || activityColors.note}`}>
                            {activityIcons[activity.type] || activityIcons.note}
                        </div>
                        {index < activities.length - 1 && (
                            <div className="w-0.5 h-full bg-[#F5F4F2] mt-2"></div>
                        )}
                    </div>

                    <div className="flex-1 pb-4">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-medium text-stone-400">
                                {new Date(activity.timestamp).toLocaleString('es-MX', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                            <span className="text-xs text-stone-400 capitalize">{activity.user}</span>
                        </div>
                        <p className="text-sm text-stone-700 leading-snug">
                            {activity.summary}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default CRMTimeline;
