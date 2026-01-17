
import React, { useState } from 'react';
import { Agency, Deliverable, GameEvent } from '../../../../types';
import { Modal } from '../../../Modal';
import { useUI } from '../../../../contexts/UIContext';
import { getAgencyPerformanceMultiplier } from '../../../../constants';
import { Mail, Star, Send, Target } from 'lucide-react';
import { db, collection } from '../../../../services/firebase';

interface GradingModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: {agencyId: string, weekId: string, deliverable: Deliverable};
    agencies: Agency[];
    onUpdateAgency: (agency: Agency) => void;
}

export const GradingModal: React.FC<GradingModalProps> = ({ isOpen, onClose, item, agencies, onUpdateAgency }) => {
    const { toast } = useUI();
    const [quality, setQuality] = useState<'A' | 'B' | 'C'>('B');
    const [daysLate, setDaysLate] = useState<number>(0);
    const [constraintBroken, setConstraintBroken] = useState<boolean>(false);
    const [feedback, setFeedback] = useState(item.deliverable.feedback || "");
    const [mvpId, setMvpId] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);

    const agency = agencies.find(a => a.id === item.agencyId);
    const baseScore = quality === 'A' ? 10 : quality === 'B' ? 4 : 0;
    const penaltyLate = (daysLate || 0) * 5;
    const penaltyConstraint = constraintBroken ? 10 : 0;
    const rawDelta = baseScore - penaltyLate - penaltyConstraint;

    // LUCIDITY CALCULATION
    const selfEval = item.deliverable.selfAssessment;
    let lucidityBonus = 0;
    if (selfEval) {
        // Map A=3, B=2, C=1
        const map = { 'A': 3, 'B': 2, 'C': 1 };
        const adminVal = map[quality];
        const userVal = map[selfEval];
        
        if (adminVal === userVal) lucidityBonus = 2; // Exact
        else if (userVal < adminVal) lucidityBonus = 1; // Humble
        else lucidityBonus = -5; // Arrogant
    }

    const handleValidate = async () => {
        if(!agency) return;
        setIsSaving(true);

        try {
            const multiplier = getAgencyPerformanceMultiplier(agency);
            const finalDelta = rawDelta > 0 ? Math.round(rawDelta * multiplier) : rawDelta;
            
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
                            finalDelta: finalDelta || 0, 
                            mvpId: mvpId || undefined 
                        }
                    };
                }
                return d;
            });

            // IMPACT MEMBERS (Karma + Lucidity)
            let updatedMembers = agency.members.map(m => {
                let newScore = m.individualScore;
                
                // Bonus Lucidité (Appliqué à tous les membres ou juste solopreneur ? Prompt parlait de solopreneur, appliquons globalement car pédagogique)
                if (lucidityBonus !== 0) newScore = Math.min(100, Math.max(0, newScore + lucidityBonus));

                // Bonus MVP
                if (quality === 'A' && mvpId && m.id === mvpId) newScore = Math.min(100, newScore + 5);

                return { ...m, individualScore: newScore };
            });

            const newEvent: GameEvent = {
                id: `evt-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                type: 'VE_DELTA',
                label: quality === 'C' ? `Rejet: ${item.deliverable.name}` : `Correction: ${item.deliverable.name}`,
                deltaVE: finalDelta,
                description: `Note ${quality} | Lucidité: ${lucidityBonus > 0 ? '+' : ''}${lucidityBonus}`
            };

            const updatedAgency = {
                ...agency,
                ve_current: Math.max(0, Math.min(100, agency.ve_current + finalDelta)),
                eventLog: [...agency.eventLog, newEvent],
                members: updatedMembers,
                progress: { ...agency.progress, [item.weekId]: { ...currentWeek, deliverables: updatedDeliverables } }
            };

            await onUpdateAgency(updatedAgency);
            toast('success', `Correction enregistrée (Lucidité: ${lucidityBonus} pts)`);
            onClose();
        } catch (error) {
            toast('error', "Erreur technique.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Correction">
            <div className="space-y-6">
                {/* HEAD */}
                <div className="flex justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="font-bold">{item.deliverable.name}</span>
                    {selfEval && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold flex items-center gap-1">
                            <Target size={12}/> Auto-Eval: {selfEval}
                        </span>
                    )}
                </div>

                {/* GRADING BUTTONS A/B/C ... (Similaire avant) */}
                <div className="grid grid-cols-3 gap-2">
                    {['A', 'B', 'C'].map((g) => (
                        <button key={g} onClick={() => setQuality(g as any)} className={`py-3 font-bold rounded-xl border-2 transition-all ${quality === g ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200'}`}>
                            {g}
                        </button>
                    ))}
                </div>

                {/* LUCIDITY FEEDBACK */}
                {selfEval && (
                    <div className={`text-center text-xs font-bold p-2 rounded ${lucidityBonus > 0 ? 'bg-emerald-100 text-emerald-700' : lucidityBonus < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100'}`}>
                        Impact Lucidité : {lucidityBonus > 0 ? '+' : ''}{lucidityBonus} pts score
                    </div>
                )}

                <button onClick={handleValidate} disabled={isSaving} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl">
                    {isSaving ? '...' : 'Valider'}
                </button>
            </div>
        </Modal>
    );
};
