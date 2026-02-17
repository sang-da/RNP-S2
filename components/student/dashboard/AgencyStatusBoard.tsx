
import React, { useMemo, useState } from 'react';
import { Agency, Deliverable } from '../../../types';
import { useGame } from '../../../contexts/GameContext';
import { AlertTriangle, Flame, Rocket, ArrowRight, Upload, CheckCircle2, Clock } from 'lucide-react';
import { UploadModal } from '../missions/UploadModal';
import { useSubmissionLogic } from '../missions/useSubmissionLogic';
import { useUI } from '../../../contexts/UIContext';

interface AgencyStatusBoardProps {
    agency: Agency;
    onUpdateAgency: (agency: Agency) => void;
}

export const AgencyStatusBoard: React.FC<AgencyStatusBoardProps> = ({ agency, onUpdateAgency }) => {
    const { getCurrentGameWeek } = useGame();
    const { toast } = useUI();
    const currentWeek = getCurrentGameWeek();

    // 1. DÉTECTION DERNIÈRE CRISE
    const lastCrisis = useMemo(() => {
        if (!agency.eventLog || agency.eventLog.length === 0) return null;
        const crisis = [...agency.eventLog].reverse().find(e => e.type === 'CRISIS');
        
        // On ne montre que si c'est "récent" (ex: même semaine ou moins de 7j). 
        // Ici on simplifie : si c'est la dernière entrée majeure.
        if (crisis) return crisis;
        return null;
    }, [agency.eventLog]);

    // 2. DÉTECTION MISSIONS SPÉCIALES (Challenges acceptés ou livrables dynamiques)
    const specialDeliverables = useMemo(() => {
        const specials: { del: Deliverable, weekId: string }[] = [];
        // On scanne les semaines actives pour trouver les livrables "spéciaux" (ceux dont l'ID commence par d_special_)
        Object.values(agency.progress).forEach((week: any) => {
            week.deliverables.forEach((d: Deliverable) => {
                // Condition : C'est une mission spéciale, elle est en attente ou rejetée
                if (d.id.startsWith('d_special_') && (d.status === 'pending' || d.status === 'rejected')) {
                    specials.push({ del: d, weekId: week.id });
                }
            });
        });
        return specials;
    }, [agency.progress]);

    // --- LOGIQUE UPLOAD ---
    const [uploadTarget, setUploadTarget] = useState<{delId: string, weekId: string} | null>(null);
    const [checks, setChecks] = useState({ naming: false, format: false, resolution: false, audio: false });
    const [selfAssessment, setSelfAssessment] = useState<'A'|'B'|'C'>('B');
    const [nominatedMvp, setNominatedMvp] = useState<string | null>(null);

    const { handleFileUpload, isUploading } = useSubmissionLogic(agency, onUpdateAgency);

    const handleFileSelected = async (file: File) => {
        if (!file || !uploadTarget) return;
        setUploadTarget(null); // Close modal immediately
        await handleFileUpload(file, uploadTarget.delId, uploadTarget.weekId, selfAssessment, nominatedMvp);
    };

    if (!lastCrisis && specialDeliverables.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-500">
            
            {/* BLOC 1 : DERNIÈRE CRISE (Si active) */}
            {lastCrisis ? (
                <div className="bg-red-600 text-white rounded-3xl p-6 shadow-xl shadow-red-900/20 relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute -right-6 -top-6 opacity-10">
                        <Flame size={120} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="bg-white/20 backdrop-blur px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border border-white/20">
                                <AlertTriangle size={10} className="fill-white text-red-600"/> Alerte
                            </span>
                            <span className="text-xs font-bold text-red-100 opacity-80">{lastCrisis.date}</span>
                        </div>
                        <h3 className="text-xl font-display font-bold leading-tight mb-2">{lastCrisis.label}</h3>
                        <p className="text-sm text-red-50 leading-relaxed font-medium bg-red-800/30 p-3 rounded-xl border border-red-500/30">
                            {lastCrisis.description}
                        </p>
                    </div>
                    {/* Impact Summary */}
                    <div className="mt-4 flex gap-3 text-xs font-bold">
                        {lastCrisis.deltaVE !== 0 && (
                            <span className="bg-white text-red-600 px-2 py-1 rounded shadow-sm">{lastCrisis.deltaVE} VE</span>
                        )}
                        {lastCrisis.deltaBudgetReal !== 0 && (
                            <span className="bg-red-800 text-white px-2 py-1 rounded shadow-sm border border-red-700">
                                {lastCrisis.deltaBudgetReal} PiXi
                            </span>
                        )}
                    </div>
                </div>
            ) : (
                // Placeholder invisible pour garder la grille (optionnel, ici on laisse null si pas de crise)
                <div className="hidden md:block"></div> 
            )}

            {/* BLOC 2 : MISSIONS SPÉCIALES (Commandos) */}
            {specialDeliverables.length > 0 && (
                <div className="bg-indigo-600 text-white rounded-3xl p-6 shadow-xl shadow-indigo-900/20 relative overflow-hidden flex flex-col">
                    <div className="absolute -right-6 -top-6 opacity-10">
                        <Rocket size={120} />
                    </div>
                    
                    <div className="relative z-10 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-white/20 backdrop-blur px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1 border border-white/20">
                                <Rocket size={10} className="fill-white text-indigo-600"/> Opérations Spéciales
                            </span>
                        </div>
                        <h3 className="text-xl font-display font-bold leading-tight">Missions Prioritaires</h3>
                    </div>

                    <div className="space-y-3 relative z-10 flex-1">
                        {specialDeliverables.slice(0, 2).map((item) => (
                            <div key={item.del.id} className="bg-white/10 border border-white/10 rounded-xl p-3 flex justify-between items-center hover:bg-white/20 transition-colors group">
                                <div className="flex-1 min-w-0 pr-2">
                                    <p className="font-bold text-sm truncate">{item.del.name}</p>
                                    <p className="text-[10px] text-indigo-200 line-clamp-1 opacity-80">{item.del.description}</p>
                                </div>
                                <button 
                                    onClick={() => {
                                        setChecks({ naming: false, format: false, resolution: false, audio: false });
                                        setUploadTarget({ delId: item.del.id, weekId: item.weekId });
                                    }}
                                    className="bg-white text-indigo-700 p-2 rounded-lg shadow-sm hover:scale-105 transition-all flex items-center gap-1 text-[10px] font-bold uppercase"
                                >
                                    <Upload size={14}/> Dépôt
                                </button>
                            </div>
                        ))}
                    </div>
                    
                    {specialDeliverables.length > 2 && (
                        <p className="text-center text-[10px] opacity-60 mt-2 font-bold uppercase">
                            + {specialDeliverables.length - 2} autres missions dans l'onglet Missions
                        </p>
                    )}
                </div>
            )}

            {/* UPLOAD MODAL (Reused) */}
            <UploadModal 
                isOpen={!!uploadTarget} 
                onClose={() => setUploadTarget(null)} 
                onFileSelect={handleFileSelected} 
                checks={checks} 
                setChecks={setChecks} 
                selfAssessment={selfAssessment} 
                setSelfAssessment={setSelfAssessment} 
                members={agency.members} 
                nominatedMvp={nominatedMvp} 
                setNominatedMvp={setNominatedMvp} 
            />
        </div>
    );
};
