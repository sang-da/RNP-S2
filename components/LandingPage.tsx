
import React, { useState, useMemo } from 'react';
import { MarketOverview } from './student/MarketOverview';
import { useGame } from '../contexts/GameContext';
import { LoginPage } from './LoginPage';
import { LogIn, Loader2, BarChart3 } from 'lucide-react';
import { Modal } from './Modal';
import { MOCK_AGENCIES, MASCOTS } from '../constants';

export const LandingPage: React.FC = () => {
    const { agencies } = useGame();
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    // FIX CLOUDFLARE / LOADING :
    // Utilisation des données réelles ou du Mock si chargement/vide
    const displayAgencies = agencies.length > 0 ? agencies : MOCK_AGENCIES;

    // Calcul du Leader pour l'affichage par défaut (Le "Héro" du graphique)
    const topAgency = useMemo(() => {
        return [...displayAgencies]
            .filter(a => a.id !== 'unassigned')
            .sort((a, b) => b.ve_current - a.ve_current)[0] || displayAgencies[0];
    }, [displayAgencies]);

    return (
        <div className="h-[100dvh] w-full bg-slate-50 flex flex-col overflow-hidden font-sans relative">
            
            {/* 1. HEADER SIMPLE */}
            <header className="px-6 py-4 flex justify-between items-center bg-white border-b border-slate-200 z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center">
                         <img src={MASCOTS.LOGO} alt="RNP Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h1 className="font-display font-bold text-xl text-slate-900 leading-none">
                            RNP Manager
                        </h1>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Dashboard</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-slate-600">Marché en direct</span>
                </div>
            </header>

            {/* 2. MAIN VISUAL (CHART) */}
            <div className="flex-1 w-full relative flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
                 <div className="max-w-7xl mx-auto w-full p-4 md:p-8">
                    {/* On passe l'agence leader et toutes les agences pour générer le graphique réel */}
                    <MarketOverview agency={topAgency} allAgencies={displayAgencies} />
                 </div>
            </div>

            {/* 3. FOOTER ACTION */}
            <div className="p-4 bg-white border-t border-slate-200 shrink-0 z-20 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)] safe-area-bottom">
                <div className="max-w-md mx-auto">
                    <button 
                        onClick={() => setIsLoginOpen(true)}
                        className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl text-lg hover:bg-indigo-600 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-lg shadow-slate-900/20"
                    >
                        <LogIn size={20} />
                        Connexion Étudiant / Enseignant
                    </button>
                    <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">
                        Accès réservé aux membres du cursus RNP. Données temps réel.
                    </p>
                </div>
            </div>

            {/* 4. LOGIN MODAL */}
            <Modal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} title="Connexion RNP">
                <LoginPage />
            </Modal>
        </div>
    );
};
