
import React from 'react';
import { useGame } from '../../../../contexts/GameContext';
import { Modal } from '../../../Modal';
import { Wallet, Zap } from 'lucide-react';

interface ControlPanelModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ControlPanelModal: React.FC<ControlPanelModalProps> = ({ isOpen, onClose }) => {
    const { isAutoMode, toggleAutoMode, processFinance, processPerformance } = useGame();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Centre de Contrôle Hebdo">
            <div className="space-y-6">
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${isAutoMode ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                        <div>
                            <p className="font-bold text-slate-900 text-sm">Mode Automatique</p>
                            <p className="text-xs text-slate-500">Exécution programmée selon calendrier</p>
                        </div>
                    </div>
                    <button 
                      onClick={toggleAutoMode}
                      className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${isAutoMode ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                    >
                        {isAutoMode ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* CLASSE A */}
                    <div className="p-4 border-2 border-blue-100 rounded-xl bg-blue-50/30">
                        <h4 className="font-bold text-blue-800 mb-3 text-center border-b border-blue-200 pb-2">CLASSE A</h4>
                        <div className="space-y-2">
                            <button 
                              onClick={() => processFinance('A')}
                              className="w-full py-3 bg-white border border-blue-200 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors"
                            >
                                <Wallet size={14}/> Traiter Finance
                            </button>
                            <button 
                              onClick={() => processPerformance('A')}
                              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors"
                            >
                                <Zap size={14}/> Traiter Performance
                            </button>
                        </div>
                    </div>

                    {/* CLASSE B */}
                    <div className="p-4 border-2 border-purple-100 rounded-xl bg-purple-50/30">
                        <h4 className="font-bold text-purple-800 mb-3 text-center border-b border-purple-200 pb-2">CLASSE B</h4>
                        <div className="space-y-2">
                            <button 
                              onClick={() => processFinance('B')}
                              className="w-full py-3 bg-white border border-purple-200 hover:bg-purple-100 text-purple-700 font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors"
                            >
                                <Wallet size={14}/> Traiter Finance
                            </button>
                            <button 
                              onClick={() => processPerformance('B')}
                              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors"
                            >
                                <Zap size={14}/> Traiter Performance
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="text-center text-[10px] text-slate-400 italic">
                    Attention : Ces actions sont irréversibles et impactent immédiatement les budgets et notes.
                </div>
            </div>
        </Modal>
    );
};
