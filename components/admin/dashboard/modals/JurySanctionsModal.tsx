import React, { useState, useEffect } from 'react';
import { useGame } from '../../../../contexts/GameContext';
import { useUI } from '../../../../contexts/UIContext';
import { Agency, Deliverable } from '../../../../types';
import { AlertTriangle, Settings, FileX, ArrowRight, ShieldAlert, Plus, Minus } from 'lucide-react';
import { Modal } from '../../../Modal';

interface JurySanctionsModalProps {
    agencies: Agency[];
}

interface AgencySanction {
    id: string;
    name: string;
    missingCount: number;
    adjustedCount: number;
}

export const JurySanctionsModal: React.FC<JurySanctionsModalProps> = ({ agencies }) => {
    const { gameConfig, updateAgency } = useGame();
    const { toast, confirm } = useUI();
    const [isOpen, setIsOpen] = useState(false);
    const [missingDeliverablesCount, setMissingDeliverablesCount] = useState(0);
    const [sanctionsList, setSanctionsList] = useState<AgencySanction[]>([]);

    const isJuryModeActive = gameConfig.isJuryModeActive || (gameConfig.juryDeadline && new Date() > new Date(gameConfig.juryDeadline));
    const penaltyAmount = gameConfig.juryMissingDeliverablePenalty ?? 1000;

    // Check on mount if we should show the modal
    useEffect(() => {
        if (!isJuryModeActive) {
            setIsOpen(false);
            return;
        }

        // Calculate total missing deliverables
        let missing = 0;
        let requiresAction = false;
        const newSanctions: AgencySanction[] = [];

        agencies.forEach(agency => {
            if (agency.id === 'unassigned') return;
            let agencyMissing = 0;

            Object.values(agency.progress || {}).forEach((week: any) => {
                if (week.isVisible) {
                    week.deliverables.forEach((del: Deliverable) => {
                        if (del.status === 'pending') {
                            missing++;
                            agencyMissing++;
                        }
                    });
                }
            });

            const hasBeenSanctioned = agency.eventLog?.some(e => {
                if (e.label !== 'SANCTION JURY') return false;
                if (!gameConfig.juryDeadline) {
                    const today = new Date().toISOString().split('T')[0];
                    return e.date.startsWith(today);
                }
                const deadlineDate = gameConfig.juryDeadline.split('T')[0];
                const eventDate = e.date.split('T')[0];
                return eventDate >= deadlineDate;
            });
            if (agencyMissing > 0 && !hasBeenSanctioned) {
                requiresAction = true;
                newSanctions.push({ id: agency.id, name: agency.name, missingCount: agencyMissing, adjustedCount: agencyMissing });
            }
        });

        setSanctionsList(newSanctions);
        setMissingDeliverablesCount(missing);

        // Auto-open if action required and we are in jury mode
        if (requiresAction && isJuryModeActive && missing > 0) {
            setIsOpen(true);
        }
    }, [isJuryModeActive, agencies, gameConfig.juryDeadline]);

    const handleAdjustCount = (id: string, delta: number) => {
        setSanctionsList(prev => prev.map(s => {
            if (s.id === id) {
                return { ...s, adjustedCount: Math.max(0, s.adjustedCount + delta) };
            }
            return s;
        }));
    };

    const handleApplySanctions = async () => {
        const totalAdjusted = sanctionsList.reduce((acc, s) => acc + s.adjustedCount, 0);
        if (totalAdjusted === 0) {
            toast('info', 'Aucune sanction à appliquer.');
            setIsOpen(false);
            return;
        }

        const confirmed = await confirm({
            title: "Exécuter les sanctions ?",
            message: `Vous êtes sur le point d'appliquer une amende de ${penaltyAmount} PiXi par livrable manquant. Total à retirer : ${totalAdjusted * penaltyAmount} PiXi sur les différentes agences. Confirmez-vous ?`,
            confirmText: "OUI, APPLIQUER LA SENTENCE",
            isDangerous: true
        });

        if (!confirmed) return;

        let totalAgenciesPunished = 0;

        try {
            for (const sanction of sanctionsList) {
                if (sanction.adjustedCount > 0) {
                    const agency = agencies.find(a => a.id === sanction.id);
                    if (!agency) continue;

                    const totalPenalty = sanction.adjustedCount * penaltyAmount;
                    
                    const sanctionEvent = {
                        id: `sanction-jury-${Date.now()}-${agency.id}`,
                        date: new Date().toISOString().split('T')[0],
                        type: 'CRISIS' as any,
                        label: 'SANCTION JURY',
                        deltaBudgetReal: -totalPenalty,
                        description: `Amende de Jury : ${sanction.adjustedCount} livrable(s) manquant(s). (${sanction.adjustedCount} x ${penaltyAmount} PiXi)`
                    };

                    const updatedAgency = {
                        ...agency,
                        budget_real: agency.budget_real - totalPenalty,
                        eventLog: [...(agency.eventLog || []), sanctionEvent]
                    };

                    await updateAgency(updatedAgency);
                    totalAgenciesPunished++;
                }
            }

            toast('success', `Sanctions appliquées avec succès à ${totalAgenciesPunished} agences.`);
            setIsOpen(false);
        } catch (e) {
            console.error(e);
            toast('error', "Une erreur est survenue lors de l'application des peines.");
        }
    };

    if (!isOpen) return null;

    const totalAdjustedMissing = sanctionsList.reduce((acc, s) => acc + s.adjustedCount, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white max-w-2xl w-full rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                <div className="p-6 bg-red-600 flex justify-between items-start text-white shrink-0">
                    <div className="flex gap-4 items-center">
                        <div className="p-3 bg-red-500 rounded-full border border-red-400">
                            <ShieldAlert size={32} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold font-display">VERDICT DU JURY</h2>
                            <p className="text-red-100 text-sm">Mode Jury actif. Des sanctions sont en attente.</p>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="text-red-200 hover:text-white transition-colors">FERMER</button>
                </div>
                
                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
                        <p className="text-slate-600 mb-2 font-medium">Livrables manquants identifiés sur le jeu :</p>
                        <p className="text-5xl font-black text-red-600">{totalAdjustedMissing}</p>
                        <p className="text-xs text-red-400 font-bold mt-2 uppercase tracking-widest">{penaltyAmount} PiXi d'amende par infraction</p>
                    </div>

                    <div className="space-y-3 mt-6">
                        <h3 className="font-bold text-slate-800 border-b pb-2">Détail par agence (Modifiable)</h3>
                        {sanctionsList.length === 0 ? (
                            <p className="text-sm text-slate-500 italic text-center py-4">Toutes les agences sont à jour ou ont déjà été sanctionnées.</p>
                        ) : (
                            <div className="space-y-2">
                                {sanctionsList.map(s => (
                                    <div key={s.id} className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-xl">
                                        <div>
                                            <div className="font-bold text-slate-800">{s.name}</div>
                                            <div className="text-xs text-slate-500">{s.missingCount} détecté(s) manquant(s)</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-red-600 font-bold w-24 text-right">
                                                -{s.adjustedCount * penaltyAmount} PiXi
                                            </div>
                                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1">
                                                <button 
                                                    onClick={() => handleAdjustCount(s.id, -1)}
                                                    disabled={s.adjustedCount <= 0}
                                                    className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 disabled:opacity-30 hover:bg-white rounded transition-colors"
                                                >
                                                    <Minus size={16}/>
                                                </button>
                                                <span className="w-8 text-center font-bold text-slate-800">{s.adjustedCount}</span>
                                                <button 
                                                    onClick={() => handleAdjustCount(s.id, 1)}
                                                    className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-white rounded transition-colors"
                                                >
                                                    <Plus size={16}/>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <p className="text-slate-500 text-xs leading-relaxed text-center">
                        Conseil : Vous pouvez annuler une sanction en réduisant le nombre de fautes à 0 pour une agence spécifique.
                    </p>
                </div>
                
                <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0">
                    <button 
                        onClick={handleApplySanctions}
                        disabled={totalAdjustedMissing === 0}
                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 uppercase tracking-wider flex items-center justify-center gap-2 transition-transform transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                    >
                        <FileX size={20}/>
                        Exécuter la purge (-{totalAdjustedMissing * penaltyAmount} PiXi globaux)
                    </button>
                </div>
            </div>
        </div>
    );
};
