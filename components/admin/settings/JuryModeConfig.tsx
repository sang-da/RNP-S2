import React, { useState, useEffect } from 'react';
import { useGame } from '../../../contexts/GameContext';
import { useUI } from '../../../contexts/UIContext';
import { ShieldAlert, Calendar } from 'lucide-react';

export const JuryModeConfig: React.FC = () => {
    const { gameConfig, updateGameConfig } = useGame();
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

    return (
        <div className="bg-pink-50 p-6 rounded-2xl border border-pink-200">
            <h3 className="font-bold text-pink-900 mb-4 flex items-center gap-2">
                <ShieldAlert size={20}/> Mode Jury (Verrouillage Global)
            </h3>
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
        </div>
    );
};
