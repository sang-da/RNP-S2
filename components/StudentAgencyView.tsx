
import React, { useState } from 'react';
import { Agency } from '../types';
import { Target, Users, History, Wallet, TrendingUp, HelpCircle, Briefcase, TrendingDown } from 'lucide-react';
import { MarketOverview } from './student/MarketOverview';
import { MissionsView } from './student/MissionsView';
import { TeamView } from './student/TeamView';
import { HistoryView } from './student/HistoryView';
import { MercatoView } from './student/MercatoView';
import { Modal } from './Modal';
import { GAME_RULES } from '../constants';

interface StudentViewProps {
  agency: Agency;
  allAgencies: Agency[];
  onUpdateAgency: (agency: Agency) => void;
}

type TabType = 'MARKET' | 'MISSIONS' | 'TEAM' | 'RECRUITMENT' | 'HISTORY';

export const StudentAgencyView: React.FC<StudentViewProps> = ({ agency, allAgencies, onUpdateAgency }) => {
  const [activeTab, setActiveTab] = useState<TabType>('MARKET');
  const [showVERules, setShowVERules] = useState(false);

  // Calcul du rang pour l'affichage persistant
  const leaderboard = [...allAgencies].filter(a => a.id !== 'unassigned').sort((a, b) => b.ve_current - a.ve_current);
  const myRank = leaderboard.findIndex(a => a.id === agency.id) + 1;

  // Calculs Financiers (Projections)
  const projectedRevenue = GAME_RULES.REVENUE_BASE + (agency.ve_current * GAME_RULES.REVENUE_VE_MULTIPLIER);
  const projectedPayroll = agency.members.reduce((acc, m) => acc + (m.individualScore * GAME_RULES.SALARY_MULTIPLIER), 0);
  const projectedNet = projectedRevenue - projectedPayroll;

  // Helper pour update global (nécessaire pour Mercato)
  
  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)] font-sans">
        
        {/* 1. PERSISTENT HEADER (Top) */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 px-2 mb-6">
            <div>
                <h2 className="text-4xl md:text-5xl font-display font-bold text-slate-900 tracking-tight">{agency.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                    {agency.id !== 'unassigned' && <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">Rang #{myRank}</span>}
                    <span className="text-slate-500 italic">"{agency.tagline}"</span>
                </div>
            </div>
            {agency.id !== 'unassigned' && (
                <div className="flex gap-6 items-end">
                    {/* Financial Summary Widget */}
                    <div className="hidden lg:block text-right border-r border-slate-200 pr-6">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-end items-center gap-1">
                            Projection Hebdo
                        </span>
                        <div className={`text-xl font-bold flex items-center gap-2 justify-end ${projectedNet >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {projectedNet > 0 ? <TrendingUp size={18}/> : <TrendingDown size={18}/>}
                            {projectedNet > 0 ? '+' : ''}{projectedNet} PiXi
                        </div>
                        <p className="text-[10px] text-slate-400">Burn Rate: -{projectedPayroll} PiXi</p>
                    </div>

                    <div className="text-right">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex justify-end items-center gap-1 cursor-help hover:text-indigo-500 transition-colors" onClick={() => setShowVERules(true)}>
                            Valeur Actuelle (VE) <HelpCircle size={14}/>
                        </span>
                        <div 
                            onClick={() => setShowVERules(true)}
                            className={`text-6xl font-display font-bold cursor-pointer transition-transform active:scale-95 ${agency.ve_current >= 60 ? 'text-emerald-500' : agency.ve_current >= 40 ? 'text-amber-500' : 'text-red-500'}`}
                        >
                            {agency.ve_current} <span className="text-xl text-slate-400 font-normal">pts</span>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* 2. DYNAMIC CONTENT AREA (Middle - Takes available space) */}
        <div className="flex-1 mb-24 md:mb-8">
            {activeTab === 'MARKET' && agency.id !== 'unassigned' && <MarketOverview agency={agency} allAgencies={allAgencies} />}
            {activeTab === 'MISSIONS' && agency.id !== 'unassigned' && <MissionsView agency={agency} onUpdateAgency={onUpdateAgency} />}
            {activeTab === 'TEAM' && agency.id !== 'unassigned' && <TeamView agency={agency} onUpdateAgency={onUpdateAgency} />}
            
            {/* Si chômage, on force presque la vue Mercato ou Market */}
            {(activeTab === 'RECRUITMENT' || agency.id === 'unassigned') && (
                <MercatoView 
                    agency={agency} 
                    allAgencies={allAgencies} 
                    onUpdateAgency={onUpdateAgency} 
                    onUpdateAgencies={() => {}} // Placeholder, logic handled via Admin approval mostly
                />
            )}
            
            {activeTab === 'HISTORY' && <HistoryView agency={agency} />}
        </div>

        {/* 3. NAVIGATION BAR (Bottom - Fixed on Mobile, Static on Desktop) */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-2 z-50 md:relative md:bg-transparent md:border-t-0 md:p-0 md:mt-auto">
             <div className="max-w-7xl mx-auto flex md:justify-start gap-2 md:gap-4 overflow-x-auto no-scrollbar snap-x justify-between">
                
                {agency.id !== 'unassigned' && (
                    <>
                        <NavButton 
                            active={activeTab === 'MARKET'} 
                            onClick={() => setActiveTab('MARKET')}
                            icon={<TrendingUp size={20} className={activeTab === 'MARKET' ? "text-yellow-500" : ""} />}
                            label="Marché"
                        />

                        <NavButton 
                            active={activeTab === 'MISSIONS'} 
                            onClick={() => setActiveTab('MISSIONS')}
                            icon={<Target size={20} className={activeTab === 'MISSIONS' ? "text-indigo-500" : ""} />}
                            label="Missions"
                        />

                        <NavButton 
                            active={activeTab === 'TEAM'} 
                            onClick={() => setActiveTab('TEAM')}
                            icon={<Users size={20} className={activeTab === 'TEAM' ? "text-emerald-500" : ""} />}
                            label="Équipe"
                        />
                    </>
                )}

                <NavButton 
                    active={activeTab === 'RECRUITMENT' || agency.id === 'unassigned'} 
                    onClick={() => setActiveTab('RECRUITMENT')}
                    icon={<Briefcase size={20} className={activeTab === 'RECRUITMENT' || agency.id === 'unassigned' ? "text-emerald-500" : ""} />}
                    label={agency.id === 'unassigned' ? "Mon Statut" : "Recrutement"}
                />

                <NavButton 
                    active={activeTab === 'HISTORY'} 
                    onClick={() => setActiveTab('HISTORY')}
                    icon={<History size={20} className={activeTab === 'HISTORY' ? "text-amber-500" : ""} />}
                    label="Journal"
                />
                
                {/* Info Card (Only Desktop or if space permits on mobile scroll) */}
                {agency.id !== 'unassigned' && (
                    <div className="hidden md:flex min-w-[140px] px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 flex-col justify-center gap-0.5 ml-auto opacity-70">
                        <div className="flex items-center gap-2 text-slate-400">
                            <Wallet size={14}/> <span className="text-[10px] font-bold uppercase">Tréso.</span>
                        </div>
                        <span className={`font-bold text-base ${agency.budget_real < 0 ? 'text-red-600' : 'text-slate-900'}`}>{agency.budget_real.toLocaleString()} PiXi</span>
                    </div>
                )}
             </div>
        </div>

        {/* MODAL: Audit VE */}
        <Modal isOpen={showVERules} onClose={() => setShowVERules(false)} title="Audit de Valeur (VE)">
            <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-sm text-slate-600 leading-relaxed">
                        La <strong>VE (Valeur d'Entreprise)</strong> reflète la santé et la productivité de votre agence. 
                        Elle détermine votre classement et votre capacité à lever des fonds.
                    </p>
                </div>

                <div>
                    <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <History size={16} className="text-indigo-500"/> Historique de Calcul
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {/* Mocking the calculation view based on logs */}
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-slate-500 text-sm">Capital de Départ</span>
                            <span className="font-mono font-bold text-slate-700">0 pts</span>
                        </div>
                        {agency.eventLog.filter(e => e.deltaVE).map(event => (
                            <div key={event.id} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                                <span className="text-slate-600 text-sm">{event.label}</span>
                                <span className={`font-mono font-bold ${(event.deltaVE || 0) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {(event.deltaVE || 0) > 0 ? '+' : ''}{event.deltaVE}
                                </span>
                            </div>
                        ))}
                         <div className="flex justify-between items-center py-3 bg-slate-900 text-white rounded-xl px-4 mt-2">
                            <span className="font-bold text-sm uppercase">Total Actuel</span>
                            <span className="font-display font-bold text-xl">{agency.ve_current} pts</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                     <h4 className="font-bold text-slate-900 mb-2 text-sm">Règles du Jeu</h4>
                     <ul className="text-xs text-slate-500 space-y-2">
                        <li className="flex justify-between">
                            <span>Rendu validé (Qualité A)</span>
                            <span className="text-emerald-600 font-bold">+5 à +10 pts</span>
                        </li>
                        <li className="flex justify-between">
                            <span>Rendu validé (Qualité B)</span>
                            <span className="text-emerald-600 font-bold">+2 à +4 pts</span>
                        </li>
                        <li className="flex justify-between">
                            <span>Bonus Trésorerie (Audit Hebdo)</span>
                            <span className="text-emerald-600 font-bold">+2 pts / 1000 PiXi</span>
                        </li>
                        <li className="flex justify-between">
                            <span>Dette (Audit Hebdo)</span>
                            <span className="text-red-600 font-bold">-5 pts / 1000 PiXi de dette</span>
                        </li>
                     </ul>
                </div>
            </div>
        </Modal>
    </div>
  );
};

// Responsive Nav Button
const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick}
        className={`snap-start flex flex-col md:flex-row items-center md:gap-3 p-2 md:p-4 rounded-xl transition-all min-w-[70px] md:min-w-[150px] justify-center md:justify-start ${
            active 
            ? 'bg-slate-100 md:bg-slate-900 md:text-white transform scale-105 shadow-sm' 
            : 'hover:bg-slate-50 text-slate-400 hover:text-slate-600'
        }`}
    >
        <div className={`p-1.5 rounded-full ${active ? 'bg-white shadow-sm md:bg-transparent md:shadow-none' : ''}`}>
            {icon}
        </div>
        <span className={`text-[10px] md:text-base font-bold ${active ? 'text-slate-900 md:text-white' : ''}`}>
            {label}
        </span>
    </button>
);
