
import React from 'react';
import { Deliverable, WeekModule } from '../../../types';
import { MissionCard } from './MissionCard';
import { Lock, CalendarClock } from 'lucide-react';

interface MissionListProps {
    deliverables: Deliverable[];
    weekDef: WeekModule;
    agencyClassId: string;
    isUploading: string | null;
    onFileClick: (id: string) => void;
    getDynamicDeadline: (week: WeekModule, classId: string) => string | undefined;
    isLocked: boolean; // NOUVEAU
}

export const MissionList: React.FC<MissionListProps> = ({ deliverables, weekDef, agencyClassId, isUploading, onFileClick, getDynamicDeadline, isLocked }) => {
    
    if (deliverables.length === 0) {
        return <div className="text-center text-slate-400 italic py-8">Aucune mission pour cette semaine.</div>;
    }

    return (
        <div className="relative">
            {/* OVERLAY SI VERROUILLÉ */}
            {isLocked && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-2xl border-2 border-dashed border-slate-300">
                    <div className="bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 text-center animate-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock size={32} className="text-slate-400"/>
                        </div>
                        <h4 className="text-xl font-bold text-slate-900 mb-2">Accès Restreint</h4>
                        <p className="text-sm text-slate-500 mb-4 max-w-xs">
                            Le détail de ces missions sera révélé par l'intervenant en temps voulu.
                        </p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl text-xs font-bold text-slate-600 border border-slate-200">
                            <CalendarClock size={14}/>
                            <span>Attente déblocage administrateur</span>
                        </div>
                    </div>
                </div>
            )}

            {/* CONTENU (FLOUTÉ OU CLAIR) */}
            <div className={`space-y-6 transition-all duration-500 ${isLocked ? 'blur-sm opacity-50 grayscale pointer-events-none select-none' : ''}`}>
                {deliverables.map((deliverable) => {
                    const dynDeadline = getDynamicDeadline(weekDef, agencyClassId);
                    const finalDeliverable = { ...deliverable, deadline: deliverable.deadline || dynDeadline };
                    return (
                        <MissionCard 
                            key={deliverable.id} 
                            deliverable={finalDeliverable} 
                            isUploading={isUploading === deliverable.id}
                            onAction={onFileClick}
                        />
                    );
                })}
            </div>
        </div>
    );
};
