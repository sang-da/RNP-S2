
import React, { useState } from 'react';
import { MarketOverview } from './student/MarketOverview';
import { useGame } from '../contexts/GameContext';
import { LoginPage } from './LoginPage';
import { LogIn, Loader2 } from 'lucide-react';
import { Modal } from './Modal';

export const LandingPage: React.FC = () => {
    const { agencies } = useGame();
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    // Simulation visuelle "Semaine 0" : Tout le monde démarre à 0 ou à son capital de départ.
    const startAgencies = agencies.map(a => ({
        ...a,
        ve_current: 0 // On force à 0 pour l'affichage public pré-connexion
    }));

    // SECURITY CHECK: Si les données ne sont pas encore chargées, on affiche un loader pour éviter le crash (startAgencies[0] undefined)
    if (agencies.length === 0) {
        return (
            <div className="h-[100dvh] w-full bg-slate-50 flex flex-col items-center justify-center font-sans">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                <p className="text-slate-400 text-sm font-bold animate-pulse">Connexion au marché...</p>
            </div>
        );
    }

    return (
        <div className="h-[100dvh] w-full bg-slate-50 flex flex-col overflow-hidden font-sans">
            {/* 1. HEADER SIMPLE */}
            <header className="px-6 py-4 flex justify-between items-center bg-white border-b border-slate-200 z-10 shrink-0">
                <div>
                    <h1 className="font-display font-bold text-xl text-slate-900 leading-none">
                        RNP Manager
                    </h1>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Semestre 2</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-slate-500">Live</span>
                </div>
            </header>

            {/* 2. MAIN VISUAL (CHART) - Flexible Space */}
            <div className="flex-1 w-full relative flex flex-col justify-center items-center min-h-0 overflow-y-auto p-4">
                 <div className="w-full max-w-2xl opacity-90 pointer-events-none">
                    {/* MarketOverview gère sa propre "Card", pas besoin de wrapper supplémentaire ici */}
                    <MarketOverview agency={startAgencies[0]} allAgencies={startAgencies} />
                 </div>
            </div>

            {/* 3. FOOTER ACTION - Fixed Bottom */}
            <div className="p-4 bg-white border-t border-slate-200 shrink-0 z-20 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)] safe-area-bottom">
                <button 
                    onClick={() => setIsLoginOpen(true)}
                    className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl text-lg hover:bg-indigo-600 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-lg shadow-slate-900/20"
                >
                    <LogIn size={20} />
                    Se connecter
                </button>
                <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">
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
