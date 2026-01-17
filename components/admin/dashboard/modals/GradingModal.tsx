
import React, { useState, useEffect, useMemo } from 'react';
import { Agency, Deliverable, GameEvent } from '../../../../types';
import { Modal } from '../../../Modal';
import { useUI } from '../../../../contexts/UIContext';
import { getAgencyPerformanceMultiplier } from '../../../../constants';
import { ExternalLink, AlertTriangle, Target, Calculator, Check } from 'lucide-react';

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
    const [isSaving, setIsSaving] = useState(false);

    const agency = agencies.find(a => a.id === item.agencyId);

    // --- AUTO-FILL LOGIC (Retard) ---
    useEffect(() => {
        if (item.deliverable) {
            setFeedback(item.deliverable.feedback || "Fichier reçu. En attente de validation.");
            
            // Calcul automatique du retard
            if (item.deliverable.submissionDate && item.deliverable.deadline) {
                const submission = new Date(item.deliverable.submissionDate);
                const deadline = new Date(item.deliverable.deadline);
                
                // On ajoute une marge de tolérance de 15 min
                const tolerance = 15 * 60 * 1000; 
                
                if (submission.getTime() > (deadline.getTime() + tolerance)) {
                    const diffTime = Math.abs(submission.getTime() - deadline.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    setDaysLate(diffDays);
                } else {
                    setDaysLate(0);
                }
            }
        }
    }, [item]);

    // --- CALCULATIONS ---
    const calculation = useMemo(() => {
        if (!agency) return { base: 0, penalty: 0, final: 0, multiplier: 1, lucidity: 0 };

        const baseScore = quality === 'A' ? 10 : quality === 'B' ? 4 : 0;
        const penaltyLate = (daysLate || 0) * 5;
        const penaltyConstraint = constraintBroken ? 10 : 0;
        
        const rawScore = baseScore - penaltyLate - penaltyConstraint;
        
        // Multiplicateur de performance d'agence
        const multiplier = getAgencyPerformanceMultiplier(agency);
        
        // Le multiplicateur ne s'applique que sur les gains positifs
        let finalDelta = rawScore > 0 ? Math.round(rawScore * multiplier) : rawScore;

        // Bonus Lucidité (Calculé mais affiché séparément ou intégré au final ?)
        // Pour rester fidèle à la "Note", on l'ajoute au score individuel des membres, pas forcément à la VE directement
        // SAUF si on veut gamifier la VE. Ici on va calculer le bonus pour affichage.
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
    }, [quality, daysLate, constraintBroken, agency, item.deliverable.selfAssessment]);

    const handleValidate = async () => {
        if(!agency) return;
        setIsSaving(true);

        try {
            const currentWeek = agency.progress[item.weekId];
            const updatedDeliverables = currentWeek.deliverables.map((d): Deliverable => {
                if (d.id === item.deliverable.id) {
                    return { 
                        ...d, 
                        status: quality === 'C' ? 'rejected' : 'validated',
                        feedback: feedback,
                        grading: { 
                            quality, 
                            daysLate: daysLate || 0, 
                            constraintBroken, 
                            finalDelta: calculation.finalVE,
                            mvpId: undefined 
                        }
                    };
                }
                return d;
            });

            // Impact sur les membres (Score individuel + Lucidité)
            let updatedMembers = agency.members.map(m => {
                let newScore = m.individualScore;
                if (calculation.lucidityBonus !== 0) {
                    newScore = Math.min(100, Math.max(0, newScore + calculation.lucidityBonus));
                }
                return { ...m, individualScore: newScore };
            });

            const newEvent: GameEvent = {
                id: `evt-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                type: 'VE_DELTA',
                label: quality === 'C' ? `Rejet: ${item.deliverable.name}` : `Correction: ${item.deliverable.name}`,
                deltaVE: calculation.finalVE,
                description: `Note ${quality} ${daysLate > 0 ? `(-${daysLate}j)` : ''} ${constraintBroken ? '(Contrainte)' : ''}. Lucidité: +${calculation.lucidityBonus} score.`
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
        } catch (error) {
            toast('error', "Erreur technique.");
        } finally {
            setIsSaving(false);
        }
    };

    const getButtonClass = (btnQuality: string) => {
        const base = "flex-1 py-4 rounded-xl font-bold border-2 transition-all flex flex-col items-center justify-center gap-1";
        if (quality === btnQuality) {
            if (btnQuality === 'A') return `${base} bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-200 ring-offset-1`;
            if (btnQuality === 'B') return `${base} bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-200 ring-offset-1`;
            return `${base} bg-red-50 border-red-500 text-red-700 ring-2 ring-red-200 ring-offset-1`;
        }
        return `${base} bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50`;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Correction de Livrable">
            <div className="space-y-6">
                
                {/* FICHIER + LUCIDITÉ */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div>
                        <h4 className="font-bold text-slate-900 text-lg">{item.deliverable.name}</h4>
                        {item.deliverable.fileUrl ? (
                            <a href={item.deliverable.fileUrl} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold text-sm hover:underline flex items-center gap-1">
                                Voir le fichier rendu <ExternalLink size={12}/>
                            </a>
                        ) : (
                            <span className="text-red-500 text-sm font-bold flex items-center gap-1"><AlertTriangle size={12}/> Pas de fichier</span>
                        )}
                    </div>
                    {item.deliverable.selfAssessment && (
                        <div className="text-right">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Auto-Eval</span>
                            <span className={`text-lg font-black px-3 py-1 rounded-lg border ${
                                item.deliverable.selfAssessment === 'A' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                item.deliverable.selfAssessment === 'B' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                'bg-red-100 text-red-700 border-red-200'
                            }`}>
                                {item.deliverable.selfAssessment}
                            </span>
                        </div>
                    )}
                </div>

                {/* QUALITÉ DU RENDU */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3">Qualité du rendu</label>
                    <div className="flex gap-3">
                        <button onClick={() => setQuality('A')} className={getButtonClass('A')}>
                            <span className="text-lg">A</span>
                            <span className="text-[10px] uppercase opacity-80">(Excellence)</span>
                        </button>
                        <button onClick={() => setQuality('B')} className={getButtonClass('B')}>
                            <span className="text-lg">B</span>
                            <span className="text-[10px] uppercase opacity-80">(Standard)</span>
                        </button>
                        <button onClick={() => setQuality('C')} className={getButtonClass('C')}>
                            <span className="text-lg">C</span>
                            <span className="text-[10px] uppercase opacity-80">(Rejet)</span>
                        </button>
                    </div>
                </div>

                {/* PENALITÉS */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Jours de Retard</label>
                        <input 
                            type="number" 
                            min="0"
                            value={daysLate}
                            onChange={(e) => setDaysLate(Number(e.target.value))}
                            className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div className="flex items-end">
                        <label className={`w-full p-3 border-2 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${constraintBroken ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${constraintBroken ? 'border-red-600 bg-red-600 text-white' : 'border-slate-300'}`}>
                                {constraintBroken && <Check size={12}/>}
                            </div>
                            <input 
                                type="checkbox" 
                                checked={constraintBroken}
                                onChange={(e) => setConstraintBroken(e.target.checked)}
                                className="hidden"
                            />
                            <span className="text-sm font-bold">Contrainte non respectée</span>
                        </label>
                    </div>
                </div>

                {/* COMMENTAIRE */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Commentaire</label>
                    <textarea 
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="w-full p-3 border border-slate-200 rounded-xl text-sm min-h-[80px] focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                        placeholder="Feedback constructif..."
                    />
                </div>

                {/* FOOTER & CALCUL */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            Impact VE Brut: 
                            <span className={`text-xl ${calculation.finalVE >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {calculation.finalVE > 0 ? '+' : ''}{calculation.finalVE}
                            </span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                            Multiplicateur Perf: x{calculation.multiplier.toFixed(2)}
                            {calculation.lucidityBonus > 0 && <span className="text-indigo-500 ml-1"> | Lucidité +{calculation.lucidityBonus}</span>}
                        </p>
                    </div>

                    <button 
                        onClick={handleValidate}
                        disabled={isSaving}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95"
                    >
                        {isSaving ? 'Enregistrement...' : <><Target size={18}/> Valider & Notifier</>}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
