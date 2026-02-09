
import React from 'react';
import { Clock, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatDateFr } from '../../../../../utils/dateUtils';

interface SubmissionInfoProps {
    deadline?: string;
    submissionDate?: string;
    daysLate: number;
}

export const SubmissionInfo: React.FC<SubmissionInfoProps> = ({ deadline, submissionDate, daysLate }) => {
    
    const isLate = daysLate > 0;
    const isSubmitted = !!submissionDate;

    return (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 relative overflow-hidden">
            {/* Décoration d'arrière-plan conditionnelle */}
            {isLate && (
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <AlertTriangle size={120} className="text-red-500" />
                </div>
            )}

            {/* DEADLINE (DATE CONVENUE) */}
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                    <Calendar size={12}/> Date Convenue (Deadline)
                </span>
                <p className="text-sm font-bold text-slate-700">
                    {deadline ? formatDateFr(deadline) : "Non définie"}
                </p>
            </div>

            {/* DATE DE DÉPÔT */}
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                    <Clock size={12}/> Date de Dépôt Réelle
                </span>
                <div className="flex items-center gap-2">
                    <p className={`text-sm font-bold ${isLate ? 'text-red-600' : isSubmitted ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {submissionDate ? formatDateFr(submissionDate) : "En attente"}
                    </p>
                    {isSubmitted && (
                        isLate ? (
                            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold border border-red-200">
                                +{daysLate}j ouvrables
                            </span>
                        ) : (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 size={10}/> À l'heure
                            </span>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};
