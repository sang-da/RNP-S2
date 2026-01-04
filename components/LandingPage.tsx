
import React, { useState } from 'react';
import { MarketOverview } from './student/MarketOverview';
import { useGame } from '../contexts/GameContext';
import { LoginPage } from './LoginPage';
import { LogIn, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { MOCK_AGENCIES, MASCOTS } from '../constants';

export const LandingPage: React.FC = () => {
    const { agencies } = useGame();
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    // FIX CLOUDFLARE / LOADING :
    // Si Firebase est vide ou inaccessible au démarrage, on charge immédiatement 
    // les données fictives (MOCK) pour que la page s'affiche instantanément.
    const displayAgencies = agencies.length > 0 ? agencies : MOCK_AGENCIES;

    // Simulation visuelle "Semaine 0" pour le graphique d'accueil
    const startAgencies = displayAgencies.map(a => ({
        ...a,
        ve_current: a.ve_current 
    }));

    return (
        <div className="h-[100dvh] w-full bg-slate-50 flex flex-col overflow-hidden font-sans relative">
            
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

            {/* 2. MAIN VISUAL (CHART) */}
            <div className="flex-1 w-full relative flex flex-col justify-center items-center min-h-0 overflow-y-auto p-4">
                 
                 {/* MASCOTTE HERO */}
                 <div className="absolute top-10 left-10 md:left-20 z-0 opacity-10 md:opacity-100 pointer-events-none transition-opacity">
                     <img src={MASCOTS.LANDING_HERO} className="w-32 md:w-48 animate-bounce-slow" />
                 </div>

                 <div className="w-full max-w-2xl opacity-90 pointer-events-none relative z-10">
                    <MarketOverview agency={startAgencies[0]} allAgencies={startAgencies} />
                 </div>
            </div>

            {/* 3. FOOTER ACTION */}
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
