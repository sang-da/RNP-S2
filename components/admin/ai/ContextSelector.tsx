
import React, { useMemo } from 'react';
import { Agency, Deliverable } from '../../../types';
import { CheckSquare, FileText, Calendar } from 'lucide-react';

interface ContextSelectorProps {
    agencyId: string;
    agencies: Agency[];
    selectedDeliverableIds: string[];
    onToggleDeliverable: (id: string) => void;
}

export const ContextSelector: React.FC<ContextSelectorProps> = ({ agencyId, agencies, selectedDeliverableIds, onToggleDeliverable }) => {
    
    const agency = agencies.find(a => a.id === agencyId);

    const deliverables = useMemo(() => {
        if (!agency) return [];
        const all: (Deliverable & { weekId: string })[] = [];
        Object.values(agency.progress).forEach((week: any) => {
            week.deliverables.forEach((d: Deliverable) => {
                // On ne propose que les livrables soumis ou notés
                if (d.status !== 'pending') {
                    all.push({ ...d, weekId: week.id });
                }
            });
        });
        // Tri du plus récent au plus ancien
        return all.sort((a,b) => new Date(b.submissionDate || '').getTime() - new Date(a.submissionDate || '').getTime()).slice(0, 5);
    }, [agency]);

    if (!agency || deliverables.length === 0) return (
        <div className="p-4 text-center text-xs text-slate-400 italic">Aucun livrable disponible pour l'analyse.</div>
    );

    return (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 mb-4">
            <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-2 flex items-center gap-2">
                <FileText size={12}/> Ajouter au contexte IA
            </h4>
            <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                {deliverables.map(d => {
                    const isSelected = selectedDeliverableIds.includes(d.id);
                    return (
                        <div 
                            key={d.id}
                            onClick={() => onToggleDeliverable(d.id)}
                            className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${
                                isSelected ? 'bg-indigo-100 border-indigo-300' : 'bg-white border-slate-200 hover:border-indigo-200'
                            }`}
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                                {isSelected && <CheckSquare size={10} className="text-white"/>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{d.name}</p>
                                <div className="flex items-center gap-2 text-[9px] opacity-70">
                                    <span className="flex items-center gap-1"><Calendar size={8}/> Sem {d.weekId}</span>
                                    <span>• {d.type}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
