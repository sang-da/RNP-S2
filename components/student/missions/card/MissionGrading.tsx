
import React from 'react';
import { Deliverable } from '../../../../types';
import { TrendingUp, Clock, XCircle, Trophy, MessageSquare } from 'lucide-react';

interface MissionGradingProps {
    deliverable: Deliverable;
}

export const MissionGrading: React.FC<MissionGradingProps> = ({ deliverable }) => {
    if (!deliverable.grading) return null;

    const { grading, feedback } = deliverable;

    return (
        <div className={`mt-3 p-4 rounded-xl border ${
            deliverable.status === 'validated' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'
        }`}>
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-3 pb-3 border-b border-black/5">
                
                {/* GRADE DISPLAY */}
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 flex items-center justify-center rounded-xl font-display font-black text-2xl border-2 ${
                        grading.quality === 'A' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' :
                        grading.quality === 'B' ? 'bg-amber-100 text-amber-600 border-amber-200' :
                        'bg-red-100 text-red-600 border-red-200'
                    }`}>
                        {grading.quality}
                    </div>
                    <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-widest">Note Finale</span>
                        <div className="flex items-center gap-1 font-bold text-slate-700">
                            <TrendingUp size={14} className={grading.finalDelta >= 0 ? 'text-emerald-500' : 'text-red-500'}/>
                            {grading.finalDelta > 0 ? '+' : ''}{grading.finalDelta} VE
                        </div>
                    </div>
                </div>

                {/* DETAILS PENALTIES */}
                <div className="flex flex-wrap gap-2">
                    {grading.daysLate > 0 && (
                        <span className="text-[10px] font-bold px-2 py-1 bg-red-100 text-red-700 rounded-lg flex items-center gap-1">
                            <Clock size={10}/> Retard -{grading.daysLate}j
                        </span>
                    )}
                    {grading.constraintBroken && (
                        <span className="text-[10px] font-bold px-2 py-1 bg-red-100 text-red-700 rounded-lg flex items-center gap-1">
                            <XCircle size={10}/> Contrainte Brisée
                        </span>
                    )}
                    {grading.mvpId && (
                        <span className="text-[10px] font-bold px-2 py-1 bg-amber-100 text-amber-700 rounded-lg flex items-center gap-1 border border-amber-200">
                            <Trophy size={10}/> MVP Bonus
                        </span>
                    )}
                </div>
            </div>

            {/* FEEDBACK TEXT */}
            <div className="flex gap-3">
                <MessageSquare size={16} className="shrink-0 mt-0.5 opacity-40 text-slate-600"/>
                <div className="text-sm italic text-slate-700">
                    <span className="block text-[10px] font-bold uppercase opacity-50 mb-1 not-italic">Feedback Enseignant</span>
                    "{feedback || "Aucun commentaire."}"
                </div>
            </div>
        </div>
    );
};
