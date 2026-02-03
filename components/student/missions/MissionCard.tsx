
import React from 'react';
import { Deliverable } from '../../../types';
import { Clock } from 'lucide-react';
import { MissionHeader } from './card/MissionHeader';
import { MissionGrading } from './card/MissionGrading';
import { MissionActions } from './card/MissionActions';

interface MissionCardProps {
    deliverable: Deliverable;
    isUploading: boolean;
    onAction: (id: string) => void;
}

export const MissionCard: React.FC<MissionCardProps> = ({ deliverable, isUploading, onAction }) => {
    const isGraded = deliverable.status === 'validated' || deliverable.status === 'rejected';

    return (
        <div className={`rounded-2xl p-5 border transition-all group ${
            deliverable.status === 'validated' ? 'bg-white border-emerald-200 shadow-sm' :
            deliverable.status === 'rejected' ? 'bg-white border-red-200 shadow-sm' :
            'bg-slate-50 border-slate-200 hover:border-slate-300'
        }`}>
            <div className="flex flex-col gap-3">
                
                {/* HEADER */}
                <MissionHeader deliverable={deliverable} />

                {/* GRADING */}
                {isGraded && <MissionGrading deliverable={deliverable} />}

                {/* DEADLINE (PENDING ONLY) */}
                {deliverable.deadline && deliverable.status === 'pending' && (
                     <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">
                        <Clock size={12}/> Deadline: {new Date(deliverable.deadline).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})}
                     </div>
                )}

                {/* ACTIONS */}
                <MissionActions deliverable={deliverable} isUploading={isUploading} onAction={onAction} />
            </div>
        </div>
    );
};
