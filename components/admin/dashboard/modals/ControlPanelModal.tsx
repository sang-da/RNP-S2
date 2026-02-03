
import React from 'react';
import { useGame } from '../../../../contexts/GameContext';
import { Modal } from '../../../Modal';
import { Wallet, Zap, Calendar, RefreshCw, ShieldCheck } from 'lucide-react';

interface ControlPanelModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ControlPanelModal: React.FC<ControlPanelModalProps> = ({ isOpen, onClose }) => {
    const { gameConfig, updateGameConfig, processFinance, processPerformance } = useGame();

    const handleToggleAuto = () => {
        updateGameConfig({ autoPilot: !gameConfig.autoPilot });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Moteur de Jeu & Auto-Pilote">
            <div className="space-y-6">
                {/* AUTO-PILOT SETTING */}
                <div className={`p-5 rounded-2xl border-2 transition-all ${gameConfig.autoPilot ? 'bg-indigo-900 border-indigo-500 text-white shadow-xl' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${gameConfig.autoPilot ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                                <RefreshCw size={20} className={gameConfig.autoPilot ? 'animate-spin-slow' : ''}/>
                            </div>
                            <div>
                                <h4 className="font-bold text-sm">Gestionnaire Automatique</h4>
                                <p className={`text-[10px] uppercase font-bold tracking-widest ${gameConfig.autoPilot ? 'text-indigo-300' : 'text-slate-400'}`}>
                                    {gameConfig.autoPilot ? 'Système Opérationnel' : 'Mode Manuel Uniquement'}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={handleToggleAuto}
                            className={`px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 ${gameConfig.autoPilot ? 'bg-white text-indigo-900' : 'bg-slate-900 text-white'}`}
                        >
                            {gameConfig.autoPilot ? 'DÉSACTIVER' : 'ACTIVER'}
                        </button>
                    </div>

                    {gameConfig.autoPilot && (
                        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10">
                            <div className="flex items-center gap-2 text-[11px]">
                                <Calendar size={14} className="text-emerald-400"/>
                                <span>Lundi : Salaires & Loyers</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px]">
                                <Calendar size={14} className="text-amber-400"/>
                                <span>Vendredi : Bilan VE</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* MANUAL OVERRIDES */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Actions Manuelles de Secours</h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => processFinance('ALL' as any)}
                            className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50 group transition-all text-left"
                        >
                            <Wallet className="text-slate-300 group-hover:text-indigo-500 mb-2" size={24}/>
                            <span className="block font-bold text-slate-900 text-xs">Forcer Finance</span>
                            <span className="text-[10px] text-slate-400">Payer tout le monde maintenant</span>
                        </button>

                        <button 
                            onClick={() => processPerformance('ALL' as any)}
                            className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-emerald-300 hover:bg-emerald-50 group transition-all text-left"
                        >
                            <Zap className="text-slate-300 group-hover:text-emerald-500 mb-2" size={24}/>
                            <span className="block font-bold text-slate-900 text-xs">Forcer Bilan</span>
                            <span className="text-[10px] text-slate-400">Recalculer les VE & Scores</span>
                        </button>
                    </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 items-start">
                    <ShieldCheck className="text-amber-600 shrink-0 mt-0.5" size={16}/>
                    <p className="text-[11px] text-amber-800 leading-relaxed italic">
                        <strong>Note :</strong> L'auto-pilote vérifie les dates de dernière exécution. Il ne relancera pas deux fois la finance la même semaine, sauf si vous cliquez sur "Forcer".
                    </p>
                </div>
            </div>
        </Modal>
    );
};
