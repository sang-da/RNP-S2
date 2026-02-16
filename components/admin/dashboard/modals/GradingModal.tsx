
import React, { useState, useEffect, useMemo } from 'react';
import { Agency, Deliverable, GameEvent, WeekScoringConfig } from '../../../../types';
import { useUI } from '../../../../contexts/UIContext';
import { getAgencyPerformanceMultiplier } from '../../../../constants';
import { calculateBusinessDaysLate } from '../../../../utils/dateUtils';
import { SubmissionInfo } from './grading/SubmissionInfo';
import { FileViewer } from './grading/FileViewer';
import { ExternalLink, AlertTriangle, Target, Check, Crown, X, ArrowLeft } from 'lucide-react';

interface GradingModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: {agencyId: string, weekId: string, deliverable: Deliverable};
    agencies: Agency[];
    onUpdateAgency: (agency: Agency) => void;
}

export const GradingModal: React.FC<GradingModalProps> = ({ isOpen, onClose, item, agencies, onUpdateAgency }) => {
    const { toast } = useUI();
    
    // --- STATE ---
    const [quality, setQuality] = useState<'A' | 'B' | 'C'>('B');
    const [daysLate, setDaysLate] = useState<number>(0);
    const [constraintBroken, setConstraintBroken] = useState<boolean>(false);
    const [feedback, setFeedback] = useState("");
    const [selectedMvpId, setSelectedMvpId] = useState<string | "NONE">("NONE"); 
    const [isSaving, setIsSaving] = useState(false);

    // Escape Key to Close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const agency = agencies.find(a => a.id === item.agencyId);
    
    // Suggestion MVP
    const suggestedMvpMember = useMemo(() => {
        if (!agency || !item.deliverable.nominatedMvpId) return null;
        return agency.members.find(m => m.id === item.deliverable.nominatedMvpId);
    }, [agency, item.deliverable.nominatedMvpId]);

    // Config Scoring
    const scoringConfig: WeekScoringConfig = useMemo(() => {
        if (!agency) return { pointsA: 10, pointsB: 4, penaltyLatePerDay: 5, penaltyConstraint: 10, expectedTargetVE: 10 };
        const weekData = agency.progress[item.weekId];
        if (weekData && weekData.scoring) return weekData.scoring;
        return { pointsA: 10, pointsB: 4, penaltyLatePerDay: 5, penaltyConstraint: 10, expectedTargetVE: 10 };
    }, [agency, item.weekId]);

    // --- DEADLINE LOGIC (CALENDRIER) ---
    // On récupère la date prévue dans le planning si la deadline n'est pas fixée dans le livrable
    const scheduledDeadline = useMemo(() => {
        if (!agency) return undefined;
        const weekData = agency.progress[item.weekId];
        if (!weekData) return undefined;

        const schedule = agency.classId === 'A' ? weekData.schedule.classA : weekData.schedule.classB;
        // On retourne la date du planning (ex: "2024-03-12")
        return schedule?.date;
    }, [agency, item.weekId]);

    // --- AUTO-FILL LOGIC ---
    useEffect(() => {
        if (item.deliverable) {
            setFeedback(item.deliverable.feedback || "Fichier reçu. En attente de validation.");
            
            // Auto-select MVP
            if (item.deliverable.nominatedMvpId && !item.deliverable.grading?.mvpId) {
                setSelectedMvpId(item.deliverable.nominatedMvpId);
            } else if (item.deliverable.grading?.mvpId) {
                setSelectedMvpId(item.deliverable.grading.mvpId);
            }

            // Calcul Automatique du Retard (Jours Ouvrables)
            // On utilise soit la deadline spécifique du livrable, soit la date du calendrier
            const effectiveDeadline = item.deliverable.deadline || scheduledDeadline;

            if (item.deliverable.submissionDate && effectiveDeadline) {
                const late = calculateBusinessDaysLate(effectiveDeadline, item.deliverable.submissionDate);
                setDaysLate(late);
            } else {
                setDaysLate(0);
            }
        }
    }, [item, scheduledDeadline]);

    // --- CALCULATIONS ---
    const calculation = useMemo(() => {
        if (!agency) return { base: 0, penalty: 0, final: 0, multiplier: 1, lucidity: 0 };

        const baseScore = quality === 'A' ? scoringConfig.pointsA : quality === 'B' ? scoringConfig.pointsB : 0;
        const penaltyLate = (daysLate || 0) * scoringConfig.penaltyLatePerDay;
        const penaltyConstraint = constraintBroken ? scoringConfig.penaltyConstraint : 0;
        
        const rawScore = baseScore - penaltyLate - penaltyConstraint;
        const multiplier = getAgencyPerformanceMultiplier(agency);
        let finalDelta = rawScore > 0 ? Math.round(rawScore * multiplier) : rawScore;

        let lucidityBonus = 0;
        const selfEval = item.deliverable.selfAssessment;
        if (selfEval) {
            const map = { 'A': 3, 'B': 2, 'C': 1 };
            const adminVal = map[quality];
            const userVal = map[selfEval];
            if (adminVal === userVal) lucidityBonus = 2; // Exact
            else if (userVal < adminVal) lucidityBonus = 1; // Humble
        }

        return { 
            base: baseScore, 
            penalty: penaltyLate + penaltyConstraint, 
            finalVE: finalDelta, 
            multiplier,
            lucidityBonus
        };
    }, [quality, daysLate, constraintBroken, agency, item.deliverable.selfAssessment, scoringConfig]);

    const handleValidate = async () => {
        if(!agency) return;
        setIsSaving(true);

        try {
            const currentWeek = agency.progress[item.weekId];
            if (!currentWeek) throw new Error("Semaine introuvable");

            const updatedDeliverables = currentWeek.deliverables.map((d): Deliverable => {
                if (d.id === item.deliverable.id) {
                    const gradingPayload: any = { 
                        quality, 
                        daysLate: daysLate || 0, 
                        constraintBroken, 
                        finalDelta: calculation.finalVE,
                    };
                    if (selectedMvpId !== "NONE") gradingPayload.mvpId = selectedMvpId;

                    return { 
                        ...d, 
                        status: quality === 'C' ? 'rejected' : 'validated',
                        feedback: feedback,
                        grading: gradingPayload
                    };
                }
                return d;
            });

            // Impact Membres (Lucidité + MVP)
            let mvpName = "";
            let updatedMembers = agency.members.map(m => {
                let newScore = m.individualScore;
                if (calculation.lucidityBonus !== 0) newScore = Math.min(100, Math.max(0, newScore + calculation.lucidityBonus));
                if (selectedMvpId !== "NONE" && m.id === selectedMvpId) {
                    newScore = Math.min(100, newScore + 5); 
                    mvpName = m.name;
                }
                return { ...m, individualScore: newScore };
            });

            let desc = `Note ${quality} ${daysLate > 0 ? `(-${daysLate}j)` : ''} ${constraintBroken ? '(Contrainte)' : ''}. Lucidité: +${calculation.lucidityBonus} score.`;
            if (mvpName) desc += ` MVP: ${mvpName} (+5).`;

            const newEvent: GameEvent = {
                id: `evt-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                type: 'VE_DELTA',
                label: quality === 'C' ? `Rejet: ${item.deliverable.name}` : `Correction: ${item.deliverable.name}`,
                deltaVE: calculation.finalVE,
                description: desc
            };

            const updatedAgency = {
                ...agency,
                ve_current: Math.max(0, Math.min(100, agency.ve_current + calculation.finalVE)),
                eventLog: [...agency.eventLog, newEvent],
                members: updatedMembers,
                progress: { ...agency.progress, [item.weekId]: { ...currentWeek, deliverables: updatedDeliverables } }
            };

            await onUpdateAgency(updatedAgency);
            toast('success', `Correction enregistrée (${calculation.finalVE > 0 ? '+' : ''}${calculation.finalVE} VE)`);
            onClose();
        } catch (error: any) {
            console.error(error);
            toast('error', `Erreur technique: ${error.message || 'Sauvegarde échouée'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const getButtonClass = (btnQuality: string) => {
        const base = "flex-1 py-4 rounded-xl font-bold border-2 transition-all flex flex-col items-center justify-center gap-1 active:scale-95";
        if (quality === btnQuality) {
            if (btnQuality === 'A') return `${base} bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-200 ring-offset-1 shadow-md`;
            if (btnQuality === 'B') return `${base} bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-200 ring-offset-1 shadow-md`;
            return `${base} bg-red-50 border-red-500 text-red-700 ring-2 ring-red-200 ring-offset-1 shadow-md`;
        }
        return `${base} bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex flex-col md:flex-row bg-slate-900 md:bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
            
            {/* --- GAUCHE : FORMULAIRE (35% width desktop, 100% mobile) --- */}
            <div className="w-full md:w-[400px] lg:w-[450px] bg-white h-full shadow-2xl flex flex-col z-20 border-r border-slate-200">
                
                {/* Header Form */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors flex items-center gap-1 text-sm font-bold">
                        <ArrowLeft size={18}/> Retour
                    </button>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{agency?.name || 'Agence'}</span>
                </div>

                {/* Scrollable Form Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* 1. INFO HEADER */}
                    <div>
                        <h4 className="font-bold text-slate-900 text-xl leading-tight mb-1">{item.deliverable.name}</h4>
                        
                        {item.deliverable.selfAssessment && (
                            <div className="inline-flex items-center gap-2 mt-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Auto-Eval</span>
                                <span className={`text-sm font-black ${
                                    item.deliverable.selfAssessment === 'A' ? 'text-emerald-600' :
                                    item.deliverable.selfAssessment === 'B' ? 'text-amber-600' : 'text-red-600'
                                }`}>
                                    {item.deliverable.selfAssessment}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* 2. DATES & DEADLINES */}
                    <SubmissionInfo 
                        deadline={item.deliverable.deadline || scheduledDeadline}
                        submissionDate={item.deliverable.submissionDate}
                        daysLate={daysLate}
                    />

                    {/* 3. QUALITÉ DU RENDU */}
                    <div>
                        <div className="flex justify-between items-end mb-3">
                            <label className="block text-sm font-bold text-slate-700">Qualité du rendu</label>
                            <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                                {quality === 'A' ? `+${scoringConfig.pointsA}` : quality === 'B' ? `+${scoringConfig.pointsB}` : '0'} VE
                            </span>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setQuality('A')} className={getButtonClass('A')}>
                                <span className="text-xl font-black">A</span>
                                <span className="text-[9px] uppercase opacity-80">Top</span>
                            </button>
                            <button onClick={() => setQuality('B')} className={getButtonClass('B')}>
                                <span className="text-xl font-black">B</span>
                                <span className="text-[9px] uppercase opacity-80">Ok</span>
                            </button>
                            <button onClick={() => setQuality('C')} className={getButtonClass('C')}>
                                <span className="text-xl font-black">C</span>
                                <span className="text-[9px] uppercase opacity-80">Non</span>
                            </button>
                        </div>
                    </div>

                    {/* 4. MVP SELECTION */}
                    {agency && agency.members.length > 0 && (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                            <div className="flex justify-between items-start mb-2">
                                <label className="text-xs font-bold text-amber-900 flex items-center gap-2">
                                    <Crown size={14}/> Validation MVP (+5)
                                </label>
                                {suggestedMvpMember && (
                                    <span className="text-[10px] bg-white border border-amber-200 px-2 py-1 rounded-full text-amber-700 font-medium">
                                        Suggéré : {suggestedMvpMember.name}
                                    </span>
                                )}
                            </div>
                            <select 
                                value={selectedMvpId} 
                                onChange={(e) => setSelectedMvpId(e.target.value)}
                                className="w-full p-2 rounded-lg border border-amber-200 bg-white text-sm font-bold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none"
                            >
                                <option value="NONE">-- Aucun MVP --</option>
                                {agency.members.map(m => (
                                    <option key={m.id} value={m.id}>{m.name} (+5 pts)</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* 5. PÉNALITÉS */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jours Retard</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    min="0"
                                    value={daysLate}
                                    onChange={(e) => setDaysLate(Number(e.target.value))}
                                    className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                {daysLate > 0 && <span className="absolute right-3 top-3.5 text-xs font-bold text-red-500">-{daysLate * scoringConfig.penaltyLatePerDay} pts</span>}
                            </div>
                        </div>
                        <div className="flex items-end">
                            <label className={`w-full p-3 border-2 rounded-xl flex items-center gap-3 cursor-pointer transition-all h-[50px] ${constraintBroken ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${constraintBroken ? 'border-red-600 bg-red-600 text-white' : 'border-slate-300'}`}>
                                    {constraintBroken && <Check size={12}/>}
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={constraintBroken}
                                    onChange={(e) => setConstraintBroken(e.target.checked)}
                                    className="hidden"
                                />
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold leading-none">Contrainte Brisée</span>
                                    {constraintBroken && <span className="text-[9px] leading-none mt-0.5">-{scoringConfig.penaltyConstraint} pts</span>}
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* 6. FEEDBACK */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Commentaire</label>
                        <textarea 
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            className="w-full p-3 border border-slate-200 rounded-xl text-sm min-h-[100px] focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            placeholder="Feedback constructif..."
                        />
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 border-t border-slate-200 bg-white sticky bottom-0">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <div className="text-xs text-slate-400">
                            Multiplicateur: <span className="text-slate-600 font-bold">x{calculation.multiplier.toFixed(2)}</span>
                            {calculation.lucidityBonus > 0 && <span className="text-indigo-500 ml-1 font-bold">(+ Lucidité)</span>}
                        </div>
                        <div className={`text-xl font-black ${calculation.finalVE >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {calculation.finalVE > 0 ? '+' : ''}{calculation.finalVE} VE
                        </div>
                    </div>
                    <button 
                        onClick={handleValidate}
                        disabled={isSaving}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                    >
                        {isSaving ? 'Enregistrement...' : <><Target size={18}/> Valider & Notifier</>}
                    </button>
                </div>
            </div>

            {/* --- DROITE : FILE PREVIEW (65% width) --- */}
            <div className="flex-1 h-full bg-slate-950 relative hidden md:block">
                <div className="absolute top-4 right-4 z-50">
                    <button 
                        onClick={onClose}
                        className="bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md border border-white/10 transition-colors"
                    >
                        <X size={24}/>
                    </button>
                </div>
                
                {/* File Viewer Component */}
                <FileViewer 
                    url={item.deliverable.fileUrl} 
                    type={item.deliverable.type}
                    name={item.deliverable.name}
                />
            </div>
        </div>
    );
};
