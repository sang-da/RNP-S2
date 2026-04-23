
import React, { useState } from 'react';
import { MarketGraph } from './MarketGraph';
import { useGame } from '../contexts/GameContext';
import { LoginPage } from './LoginPage';
import { LogIn, Trophy, Medal } from 'lucide-react';
import { Modal } from './Modal';
import { MOCK_AGENCIES } from '../constants';

export const LandingPage: React.FC = () => {
    const { agencies, gameConfig } = useGame();
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    // FIX : On utilise les vraies données si disponibles, sinon le MOCK pour l'effet visuel immédiat.
    // IMPORTANT : On ne filtre pas les propriétés, on passe l'objet Agency complet pour que le graphe ait l'historique.
    const displayAgencies = agencies.length > 0 ? agencies : MOCK_AGENCIES;
    
    const isJuryActive = gameConfig?.isJuryModeActive;

    // Calcul du Podium
    const sortedAgencies = [...displayAgencies]
        .filter(a => a.id !== 'unassigned')
        .sort((a, b) => {
            const valA = (a.budget_real || 0) + (a.budget_valued || 0);
            const valB = (b.budget_real || 0) + (b.budget_valued || 0);
            return valB - valA;
        });

    const podium = sortedAgencies.slice(0, 3);

    return (
        <div className="h-[100dvh] w-full bg-slate-50 flex flex-col overflow-hidden font-sans relative">
            
            {/* 1. HEADER SIMPLE */}
            <header className="px-6 py-4 flex justify-between items-center bg-white border-b border-slate-200 z-10 shrink-0">
                <div>
                    <h1 className="font-display font-bold text-xl text-slate-900 leading-none">
                        RNP Manager
                    </h1>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{isJuryActive ? 'Résultats Finaux' : 'Semestre 2'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-slate-500">Live</span>
                </div>
            </header>

            {/* 2. MAIN VISUAL (CHART OR PODIUM) */}
            <div className="flex-1 w-full relative flex flex-col items-center min-h-0 overflow-y-auto p-4 bg-slate-50">
                 
                 {isJuryActive && podium.length > 0 && (
                     <div className="w-full max-w-4xl relative z-10 animate-in fade-in zoom-in duration-700 mb-8 mt-4">
                         <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center">
                             <div className="flex justify-center mb-4"><Trophy className="text-yellow-500" size={48} /></div>
                             <h2 className="text-3xl font-bold font-display text-slate-900 mb-2">Classement Final</h2>
                             <p className="text-slate-500 mb-8 max-w-lg mx-auto">Le grand jury a rendu son verdict. Voici les agences qui se sont démarquées par leur valorisation globale.</p>
                             
                             <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-6 mt-12">
                                {/* 2nd Place */}
                                {podium[1] && (
                                    <div className="flex flex-col items-center order-2 md:order-1 w-full md:w-1/3">
                                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 shadow-md border border-slate-200 overflow-hidden">
                                            {podium[1].logoUrl ? <img src={podium[1].logoUrl} className="w-full h-full object-cover" alt="Logo" /> : <Medal className="text-slate-400" />}
                                        </div>
                                        <div className="bg-slate-200 w-full rounded-t-2xl p-4 pt-6 relative shadow-inner min-h-[140px] flex flex-col justify-between">
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-300 text-slate-700 font-black w-8 h-8 rounded-full flex items-center justify-center border-2 border-slate-50 outline-none shadow-sm">2</div>
                                            <div className="font-bold text-slate-900 truncate w-full px-2" title={podium[1].name}>{podium[1].name}</div>
                                            <div className="text-sm font-mono font-bold text-emerald-600 mt-2">
                                                {((podium[1].budget_real || 0) + (podium[1].budget_valued || 0)).toLocaleString()} Px
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {/* 1st Place */}
                                {podium[0] && (
                                    <div className="flex flex-col items-center order-1 md:order-2 w-full md:w-1/3 -mt-8 z-10">
                                        <div className="w-20 h-20 rounded-2xl bg-yellow-50 flex items-center justify-center mb-3 shadow-xl border border-yellow-200 overflow-hidden">
                                            {podium[0].logoUrl ? <img src={podium[0].logoUrl} className="w-full h-full object-cover" alt="Logo" /> : <Trophy className="text-yellow-500" size={32}/>}
                                        </div>
                                        <div className="bg-gradient-to-t from-yellow-200 to-yellow-100 w-full rounded-t-2xl p-4 pt-8 relative shadow-lg min-h-[180px] flex flex-col justify-between border-t border-x border-yellow-300/50">
                                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 font-black w-10 h-10 rounded-full flex items-center justify-center border-[3px] border-white shadow-md text-lg">1</div>
                                            <div className="font-bold text-slate-900 truncate w-full px-2 text-lg" title={podium[0].name}>{podium[0].name}</div>
                                            <div className="text-xl font-mono font-black text-emerald-700 mt-2">
                                                {((podium[0].budget_real || 0) + (podium[0].budget_valued || 0)).toLocaleString()} Px
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {/* 3rd Place */}
                                {podium[2] && (
                                    <div className="flex flex-col items-center order-3 w-full md:w-1/3 shrink-0">
                                        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-3 shadow-sm border border-amber-200/50 overflow-hidden">
                                            {podium[2].logoUrl ? <img src={podium[2].logoUrl} className="w-full h-full object-cover" alt="Logo" /> : <Medal className="text-amber-700" />}
                                        </div>
                                        <div className="bg-amber-100/50 w-full rounded-t-2xl p-4 pt-6 relative min-h-[120px] flex flex-col justify-between border-t border-x border-amber-200/50">
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-200 text-amber-800 font-black w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm">3</div>
                                            <div className="font-bold text-slate-800 truncate w-full px-2" title={podium[2].name}>{podium[2].name}</div>
                                            <div className="text-sm font-mono font-bold text-emerald-600 mt-2">
                                                {((podium[2].budget_real || 0) + (podium[2].budget_valued || 0)).toLocaleString()} Px
                                            </div>
                                        </div>
                                    </div>
                                )}
                             </div>
                         </div>
                     </div>
                 )}

                 {/* GRAPH CARD - Centered and constrained */}
                 <div className="w-full max-w-4xl relative z-10 animate-in fade-in zoom-in duration-700">
                    <MarketGraph 
                        agencies={displayAgencies} 
                        title="Tendance du Marché (S2)" 
                        height="400px"
                        isLanding={true} // Special styling for landing
                    />
                 </div>
            </div>

            {/* 3. FOOTER ACTION */}
            <div className="p-6 bg-white border-t border-slate-200 shrink-0 z-20 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)] safe-area-bottom flex flex-col items-center">
                <button 
                    onClick={() => setIsLoginOpen(true)}
                    className="w-full max-w-md py-4 bg-slate-900 text-white font-bold rounded-2xl text-lg hover:bg-indigo-600 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-900/20"
                >
                    <LogIn size={20} />
                    Se connecter
                </button>
                <p className="text-center text-[10px] text-slate-400 mt-4 font-medium">
                    Accès réservé aux étudiants et enseignants RNP.
                </p>
            </div>

            {/* 4. LOGIN MODAL */}
            <Modal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} title="Connexion RNP">
                <LoginPage />
            </Modal>
        </div>
    );
};
