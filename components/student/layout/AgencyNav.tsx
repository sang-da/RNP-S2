
import React from 'react';
import { TrendingUp, Target, Users, BookOpen, Briefcase, HelpCircle } from 'lucide-react';
import { Agency } from '../../../types';

type TabType = 'MARKET' | 'MISSIONS' | 'TEAM' | 'RECRUITMENT' | 'RESOURCES' | 'HELP';

interface AgencyNavProps {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
    agency: Agency;
    theme: { bg: string, text: string };
}

export const AgencyNav: React.FC<AgencyNavProps> = ({ activeTab, setActiveTab, agency, theme }) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-2 z-50 md:relative md:bg-transparent md:border-t-0 md:p-0 md:mt-auto safe-area-bottom">
             <div className="max-w-7xl mx-auto flex md:justify-start gap-2 md:gap-4 overflow-x-auto no-scrollbar snap-x justify-between">
                
                {/* MARKET TOUJOURS VISIBLE */}
                <NavButton active={activeTab === 'MARKET'} onClick={() => setActiveTab('MARKET')} icon={<TrendingUp size={20} />} label="Marché" theme={theme} />

                {agency.id !== 'unassigned' && (
                    <>
                        <NavButton active={activeTab === 'MISSIONS'} onClick={() => setActiveTab('MISSIONS')} icon={<Target size={20} />} label="Missions" theme={theme} />
                        <NavButton active={activeTab === 'TEAM'} onClick={() => setActiveTab('TEAM')} icon={<Users size={20} />} label="Équipe" theme={theme} />
                    </>
                )}
                
                <NavButton active={activeTab === 'RECRUITMENT' || (activeTab === 'MARKET' && agency.id === 'unassigned' && false)} onClick={() => setActiveTab('RECRUITMENT')} icon={<Briefcase size={20} />} label={agency.id === 'unassigned' ? "Mon Statut" : "Recrutement"} theme={theme} />
                <NavButton active={activeTab === 'RESOURCES'} onClick={() => setActiveTab('RESOURCES')} icon={<BookOpen size={20} />} label="Wiki" theme={theme} />
                <NavButton active={activeTab === 'HELP'} onClick={() => setActiveTab('HELP')} icon={<HelpCircle size={20} />} label="Aide" theme={theme} />
             </div>
        </div>
    );
};

const NavButton: React.FC<any> = ({ active, onClick, icon, label, theme }) => (
    <button onClick={onClick} className={`snap-start flex flex-col md:flex-row items-center md:gap-3 p-2 md:p-4 rounded-xl transition-all min-w-[70px] md:min-w-[150px] justify-center md:justify-start ${active ? `${theme.bg} text-white transform scale-105 shadow-md` : 'hover:bg-slate-50 text-slate-400 hover:text-slate-600'}`}>
        <div className={`p-1.5 rounded-full ${active ? 'bg-white/20' : ''}`}>{React.cloneElement(icon, { className: active ? 'text-white' : '' })}</div>
        <span className={`text-[10px] md:text-base font-bold`}>{label}</span>
    </button>
);
