import React, { useState, useEffect } from 'react';
import { useGame } from '../../../contexts/GameContext';
import { useUI } from '../../../contexts/UIContext';
import { ShieldAlert, Calendar, Play, X, AlertTriangle, AlertOctagon } from 'lucide-react';
import { Agency } from '../../../types';

export const JuryModeConfig: React.FC = () => {
    const { agencies, updateAgency, gameConfig, updateGameConfig } = useGame();
    const { toast, confirm } = useUI();
    const [isSaving, setIsSaving] = useState(false);

    const [isJuryModeActive, setIsJuryModeActive] = useState(gameConfig.isJuryModeActive || false);
    const [juryDeadline, setJuryDeadline] = useState(gameConfig.juryDeadline || '');
    const [penaltyAmount, setPenaltyAmount] = useState(gameConfig.juryMissingDeliverablePenalty || 1000);

    // Sync with global state
    useEffect(() => {
        setIsJuryModeActive(gameConfig.isJuryModeActive || false);
        setJuryDeadline(gameConfig.juryDeadline || '');
        setPenaltyAmount(gameConfig.juryMissingDeliverablePenalty || 1000);
    }, [gameConfig.isJuryModeActive, gameConfig.juryDeadline, gameConfig.juryMissingDeliverablePenalty]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateGameConfig({
                isJuryModeActive,
                juryDeadline: juryDeadline || null,
                juryMissingDeliverablePenalty: Number(penaltyAmount)
            });
            toast('success', 'Configuration du mode Jury enregistrée');
        } catch (e) {
            toast('error', 'Erreur lors de la sauvegarde');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleJuryMode = async (checked: boolean) => {
        if (checked) {
            const confirmed = await confirm({
                title: "Activer le Mode Jury ?",
                message: "L'activation bloquera immédiatement toutes les transactions et tous les dépôts de livrables pour les étudiants (sauf administrateurs et jury).",
                confirmText: "Activer le verrouillage",
                isDangerous: true
            });
            if (!confirmed) return;
        }
        setIsJuryModeActive(checked);
    };

    const [showLaunchModal, setShowLaunchModal] = useState(false);

    const agenciesAtRisk = agencies.filter(a => a.id !== 'unassigned' && !a.isBankrupt && a.budget_real < 0);
    const bankruptAgencies = agencies.filter(a => a.id !== 'unassigned' && a.isBankrupt);

    const handleDeclareBankruptcy = async (agency: Agency) => {
        if (await confirm({
            title: `Déclarer ${agency.name} en faillite ?`,
            message: `Cette action empêchera tout investissement futur et affichera un statut de faillite pour le jury. L'historique d'évaluation restera préservé.`,
            confirmText: "Oui, déclarer en faillite",
            isDangerous: true
        })) {
            try {
                const updatedEventLog = [...(agency.eventLog || []), {
                    id: `FAILLITE-${Date.now()}`,
                    date: new Date().toISOString(),
                    type: 'CRISIS' as const,
                    label: `🚨 FAILLITE DÉCLARÉE`,
                    description: `L'agence a été déclarée en faillite.`
                }];
                await updateAgency(agency.id, { isBankrupt: true, eventLog: updatedEventLog });
                toast('success', `${agency.name} a été déclarée en faillite.`);
            } catch (e) {
                toast('error', `Erreur lors de la déclaration de faillite.`);
            }
        }
    };

    const handleProceedLaunch = async () => {
        try {
            await updateGameConfig({ isJuryModeActive: true });
            setIsJuryModeActive(true);
            setShowLaunchModal(false);
            toast('success', 'Le mode Jury a été lancé avec succès !');
        } catch (e) {
            toast('error', 'Erreur lors du lancement');
        }
    };

    return (
        <div className="bg-pink-50 p-6 rounded-2xl border border-pink-200">
            <h3 className="font-bold text-pink-900 mb-4 flex items-center gap-2">
                <ShieldAlert size={20}/> Mode Jury (Verrouillage Global)
            </h3>
            
            <div className="mb-8">
                <button 
                    onClick={() => setShowLaunchModal(true)}
                    className="w-full relative overflow-hidden group bg-gradient-to-br from-pink-600 to-rose-700 hover:from-pink-500 hover:to-rose-600 p-6 rounded-2xl shadow-xl transition-all hover:-translate-y-1"
                >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                    <div className="relative flex items-center justify-between">
                        <div className="flex flex-col text-left">
                            <span className="text-pink-200 font-bold tracking-widest text-sm mb-1 uppercase">Dernière étape</span>
                            <span className="text-white font-display text-3xl font-black flex items-center gap-3">
                                <Play fill="white" size={28} /> DÉMARRER LE JURY
                            </span>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner group-hover:scale-110 transition-transform">
                            <AlertTriangle className="text-white" size={24} />
                        </div>
                    </div>
                </button>
            </div>

            <p className="text-sm text-pink-800/80 mb-6 max-w-xl">
                Configurez le comportement de la plateforme pendant le grand jury. Lorsqu'actif ou si la deadline est dépassée, les étudiants ne peuvent plus déposer de livrables ni effectuer de transactions financières.
            </p>

            <div className="space-y-6">
                {/* Toggle Activer Mode Jury */}
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-pink-100 shadow-sm">
                    <div>
                        <div className="font-bold text-slate-800">Forcer le Verrouillage Jury</div>
                        <div className="text-xs text-slate-500">Bloque immédiatement tout, indépendamment de la deadline.</div>
                    </div>
                    <div
                        onClick={() => handleToggleJuryMode(!isJuryModeActive)}
                        className={`cursor-pointer ${
                            isJuryModeActive ? 'bg-pink-600' : 'bg-slate-200'
                        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                    >
                        <span
                            className={`${
                                isJuryModeActive ? 'translate-x-6' : 'translate-x-1'
                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Deadline */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Calendar size={14}/> Deadline Livrables & Transactions</label>
                        <input 
                            type="datetime-local" 
                            className="w-full p-2.5 rounded-xl border border-pink-200 focus:ring-2 focus:ring-pink-500 text-sm bg-white"
                            value={juryDeadline}
                            onChange={(e) => setJuryDeadline(e.target.value)}
                        />
                    </div>
                    {/* Montant Pénalité */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Sanction Livrable Manquant (PiXi)</label>
                        <input 
                            type="number" 
                            className="w-full p-2.5 rounded-xl border border-pink-200 focus:ring-2 focus:ring-pink-500 text-sm bg-white font-mono"
                            value={penaltyAmount}
                            onChange={(e) => setPenaltyAmount(Number(e.target.value))}
                            min={0}
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full px-4 py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl shadow-sm transition-colors"
                    >
                        {isSaving ? 'Enregistrement...' : 'Sauvegarder la configuration Jury'}
                    </button>
                </div>
            </div>

            {/* Launch Modal */}
            {showLaunchModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 bg-pink-600 text-white flex items-center justify-between shrink-0">
                            <h2 className="text-2xl font-bold font-display flex items-center gap-3">
                                <Play fill="white" size={24}/> Check-list avant Lancement
                            </h2>
                            <button onClick={() => setShowLaunchModal(false)} className="hover:bg-pink-700 p-2 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800">
                                <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                                <div className="text-sm">
                                    <strong>Attention :</strong> Lancer le jury va immédiatement verrouiller tous les dépôts de livrables et figer le marché pour les étudiants. Assurez-vous d'avoir réglé tous les contentieux en attente.
                                </div>
                            </div>

                            {agenciesAtRisk.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                        <AlertOctagon className="text-red-500" size={18}/> Agences en Déni (Budget Négatif)
                                    </h3>
                                    <div className="space-y-2">
                                        {agenciesAtRisk.map(agency => (
                                            <div key={agency.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                                <div>
                                                    <div className="font-bold text-slate-900">{agency.name}</div>
                                                    <div className="text-xs font-mono text-red-600">{agency.budget_real.toLocaleString()} PiXi</div>
                                                </div>
                                                <button 
                                                    onClick={() => handleDeclareBankruptcy(agency)}
                                                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg transition-colors"
                                                >
                                                    Mettre en faillite
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {bankruptAgencies.length > 0 && (
                                <div>
                                    <h3 className="font-bold text-slate-800 mb-3 text-sm text-slate-400">Agences déjà en faillite</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {bankruptAgencies.map(a => (
                                            <span key={a.id} className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 text-xs rounded-full line-through">
                                                {a.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(agenciesAtRisk.length === 0 && bankruptAgencies.length === 0) && (
                                <div className="text-center p-6 text-slate-500">
                                    Aucune agence critique détectée. Tout semble en ordre.
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                            <button 
                                onClick={() => setShowLaunchModal(false)}
                                className="px-6 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                Annuler
                            </button>
                            <button 
                                onClick={handleProceedLaunch}
                                className="px-8 py-3 bg-pink-600 text-white font-bold rounded-xl shadow-lg shadow-pink-500/30 hover:bg-pink-700 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                            >
                                <Play fill="white" size={18}/> Confirmer le Lancement
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
