
import React, { useMemo, useState } from 'react';
import { Agency, Deliverable } from '../../../types';
import { useGame } from '../../../contexts/GameContext';
import { AlertTriangle, Flame, Rocket, ArrowRight, Upload, CheckCircle2, Clock, TrendingDown, Wallet, History, X } from 'lucide-react';
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
        // On affiche toujours la dernière crise pour garder l'historique visible, 
        // ou on pourrait filtrer par date si besoin.
        return crisis || null;
    }, [agency.eventLog]);

    // 2. DÉTECTION MISSIONS SPÉCIALES
    const specialDeliverables = useMemo(() => {
        const specials: { del: Deliverable, weekId: string }[] = [];
        Object.values(agency.progress).forEach((week: any) => {
            week.deliverables.forEach((d: Deliverable) => {
                if (d.id.startsWith('d_special_') && (d.status === 'pending' || d.status === 'rejected')) {
                    specials.push({ del: d, weekId: week.id });
                }
            });
        });
        return specials;
    }, [agency.progress]);

    // 3. HISTORIQUE COMPLET (CRISES & MISSIONS)
    const historyEvents = useMemo(() => {
        const events: { type: 'CRISIS' | 'MISSION', date: string, label: string, description: string, id: string }[] = [];
        
        // Crises
        (agency.eventLog || []).forEach(e => {
            if (e.type === 'CRISIS') {
                events.push({ type: 'CRISIS', date: e.date, label: e.label, description: e.description, id: e.id });
            }
        });

        // Missions Passées (Validées ou Ratées)
        Object.entries(agency.progress).forEach(([weekId, weekData]) => {
            weekData.deliverables.forEach(d => {
                if (d.id.startsWith('d_special_') && (d.status === 'validated')) {
                     events.push({ 
                         type: 'MISSION', 
                         date: `Semaine ${weekId}`, 
                         label: d.name, 
                         description: d.feedback || "Mission accomplie.", 
                         id: d.id 
                     });
                }
            });
        });

        return events.reverse();
    }, [agency.eventLog, agency.progress]);

    // --- LOGIQUE UPLOAD ---
    const [uploadTarget, setUploadTarget] = useState<{delId: string, weekId: string} | null>(null);
    const [checks, setChecks] = useState({ naming: false, format: false, resolution: false, audio: false });
    const [selfAssessment, setSelfAssessment] = useState<'A'|'B'|'C'>('B');
    const [nominatedMvp, setNominatedMvp] = useState<string | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const { handleFileUpload, isUploading } = useSubmissionLogic(agency, onUpdateAgency);

    const handleFileSelected = async (file: File) => {
        if (!file || !uploadTarget) return;
        setUploadTarget(null);
        await handleFileUpload(file, uploadTarget.delId, uploadTarget.weekId, selfAssessment, nominatedMvp);
    };

    if (!lastCrisis && specialDeliverables.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-500 mb-8">
            
            {/* CARTE 1 : DERNIÈRE CRISE (Design "Alerte Pro") */}
            {lastCrisis ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative group hover:shadow-md transition-shadow">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>
                    <div className="p-5 flex-1">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2 text-red-600">
                                <AlertTriangle size={20} className="animate-pulse"/>
                                <h3 className="font-bold text-sm uppercase tracking-wide">Dernier Incident</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                    {lastCrisis.date}
                                </span>
                                <button 
                                    onClick={() => setIsHistoryModalOpen(true)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                                    title="Voir l'historique"
                                >
                                    <History size={16} />
                                </button>
                            </div>
                        </div>
                        
                        <h4 className="font-display font-bold text-lg text-slate-900 mb-2 leading-tight">
                            {lastCrisis.label}
                        </h4>
                        
                        <div className="bg-red-50/50 p-3 rounded-xl border border-red-100 mb-4">
                            <p className="text-sm text-slate-700 leading-relaxed italic">
                                "{lastCrisis.description}"
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-auto">
                            {lastCrisis.deltaVE !== 0 && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                    <TrendingDown size={14} className="text-red-500"/>
                                    {lastCrisis.deltaVE > 0 ? '+' : ''}{lastCrisis.deltaVE} VE
                                </span>
                            )}
                            {lastCrisis.deltaBudgetReal !== 0 && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                    <Wallet size={14} className="text-red-500"/>
                                    {lastCrisis.deltaBudgetReal} PiXi
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ) : <div className="hidden md:block"></div>}

            {/* CARTE 2 : MISSIONS COMMANDOS (Design "Opportunité") */}
            {specialDeliverables.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative group hover:shadow-md transition-shadow">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600"></div>
                    <div className="absolute right-0 top-0 p-6 opacity-5 pointer-events-none">
                        <Rocket size={100} className="text-indigo-600"/>
                    </div>

                    <div className="p-5 flex-1 z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2 text-indigo-600">
                                <div className="p-1.5 bg-indigo-100 rounded-lg">
                                    <Rocket size={16}/>
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm uppercase tracking-wide">Missions Spéciales</h3>
                                    <p className="text-[10px] text-slate-400 font-medium">Livrables prioritaires hors-cycle</p>
                                </div>
                            </div>
                            <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm shadow-indigo-200">
                                {specialDeliverables.length} Active{specialDeliverables.length > 1 ? 's' : ''}
                            </span>
                        </div>

                        <div className="space-y-3">
                            {specialDeliverables.slice(0, 2).map((item) => (
                                <div key={item.del.id} className="group/item bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 rounded-xl p-3 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-slate-800 leading-tight mb-1">{item.del.name}</p>
                                        <p className="text-xs text-slate-600 leading-relaxed">{item.del.description}</p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setChecks({ naming: false, format: false, resolution: false, audio: false });
                                            setUploadTarget({ delId: item.del.id, weekId: item.weekId });
                                        }}
                                        className="shrink-0 w-full sm:w-auto px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg text-xs font-bold uppercase shadow-sm hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <Upload size={12}/> Dépôt
                                    </button>
                                </div>
                            ))}
                        </div>

                        {specialDeliverables.length > 2 && (
                            <div className="mt-3 text-center border-t border-slate-100 pt-2">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest cursor-help" title="Voir l'onglet Missions">
                                    + {specialDeliverables.length - 2} autres missions
                                </span>
                            </div>
                        )}
                    </div>
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

            {/* MODAL HISTORIQUE */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <History className="text-indigo-600" />
                                Historique Agence
                            </h2>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-4 bg-slate-50/50">
                            {historyEvents.length > 0 ? (
                                historyEvents.map((event) => (
                                    <div key={event.id} className={`p-4 rounded-xl border shadow-sm ${event.type === 'CRISIS' ? 'bg-white border-red-100' : 'bg-white border-indigo-100'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${event.type === 'CRISIS' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                {event.type === 'CRISIS' ? 'INCIDENT' : 'MISSION'}
                                            </span>
                                            <span className="text-xs text-slate-400 font-medium">{event.date}</span>
                                        </div>
                                        <div className="font-bold text-slate-800 text-sm mb-1">{event.label}</div>
                                        <div className="text-sm text-slate-600 leading-relaxed">{event.description}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-slate-400 py-12 flex flex-col items-center">
                                    <History size={48} className="mb-4 opacity-20" />
                                    <p>Aucun historique disponible.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
