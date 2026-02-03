
import React from 'react';
import { WeekModule } from '../../../types';
import { Clock, Edit2, Target, TrendingUp, ChevronRight, Eye, EyeOff, Lock, Zap } from 'lucide-react';

interface WeekCardProps {
    week: WeekModule;
    isActive: boolean; // Si c'est la semaine actuelle du jeu
    onEditPlanning: (week: WeekModule) => void;
    onEditContent: (week: WeekModule) => void;
    onToggleVisibility: (week: WeekModule) => void;
    readOnly?: boolean;
}

export const WeekCard: React.FC<WeekCardProps> = ({ week, isActive, onEditPlanning, onEditContent, onToggleVisibility, readOnly }) => {
    
    const getTypeColor = (type: string) => {
        switch (type) {
            case 'FUN/CHILL': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'THÉORIE': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'TECHNIQUE': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'JURY': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    return (
        <div className={`relative pl-8 md:pl-12`}>
            {/* Ligne de temps (Timeline) */}
            <div className={`absolute -left-[20px] top-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-md border-4 border-white z-10 
                ${isActive ? 'bg-yellow-400 text-yellow-900 ring-4 ring-yellow-100' : 'bg-slate-200 text-slate-600'}`}>
                {isActive ? <Zap size={16} className="fill-yellow-900"/> : week.id}
            </div>

            <div className={`rounded-2xl border shadow-sm p-6 group hover:shadow-md transition-all 
                ${!week.isVisible ? 'bg-slate-50 border-slate-200 opacity-80' : 'bg-white border-slate-200'}
                ${isActive ? 'ring-2 ring-yellow-400 border-yellow-400 bg-yellow-50/10' : ''}
            `}>
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-50">
                     <div className="flex-1">
                         <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-slate-900">{week.title}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getTypeColor(week.type)}`}>
                                {week.type}
                            </span>
                            {!week.isVisible && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                    <EyeOff size={10}/> CACHÉ
                                </span>
                            )}
                            {isActive && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded animate-pulse">
                                    ACTIVE
                                </span>
                            )}
                         </div>
                         {week.scoring && (
                             <div className="flex items-center gap-4 mt-2">
                                 <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                     <Target size={14} className="text-indigo-500"/> Objectif: <span className="font-bold text-slate-900">{week.scoring.expectedTargetVE} VE</span>
                                 </div>
                                 <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                     <TrendingUp size={14} className="text-emerald-500"/> Grade A: <span className="font-bold text-emerald-600">+{week.scoring.pointsA}</span>
                                 </div>
                             </div>
                         )}
                     </div>
                     
                     {!readOnly && (
                     <div className="flex gap-2">
                         <button 
                            onClick={() => onToggleVisibility(week)} 
                            className={`p-2 rounded-lg transition-colors ${week.isVisible ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`} 
                            title={week.isVisible ? "Visible par les étudiants" : "Caché aux étudiants"}
                         >
                             {week.isVisible ? <Eye size={18}/> : <EyeOff size={18}/>}
                         </button>
                         <button onClick={() => onEditPlanning(week)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors" title="Planning"><Clock size={18}/></button>
                         <button onClick={() => onEditContent(week)} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-colors">
                             <Edit2 size={14}/> Éditer
                         </button>
                     </div>
                     )}
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                         <h4 className="font-bold text-slate-400 mb-2 text-[10px] uppercase tracking-widest flex items-center gap-2">Missions ({week.deliverables.length})</h4>
                         <div className="space-y-2">
                             {week.deliverables.map((del) => (
                                 <div key={del.id} className="text-sm text-slate-600 flex items-center gap-2">
                                     <ChevronRight size={14} className="text-slate-300"/> {del.name}
                                 </div>
                             ))}
                         </div>
                     </div>
                 </div>
            </div>
        </div>
    );
};
