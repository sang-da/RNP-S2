
import React from 'react';
import { TrendingUp, Target, Users, BookOpen, Briefcase, HelpCircle, Menu, X, LogOut, Settings } from 'lucide-react';
import { Agency } from '../../../types';
import { signOut, auth } from '../../../services/firebase';

type TabType = 'MARKET' | 'MISSIONS' | 'TEAM' | 'RECRUITMENT' | 'RESOURCES' | 'HELP';

interface AgencyNavProps {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
    agency: Agency;
    theme: { bg: string, text: string };
    isMenuOpen: boolean;
    openMenu: () => void;
    closeMenu: () => void;
}

export const AgencyNav: React.FC<AgencyNavProps> = ({ activeTab, setActiveTab, agency, theme, isMenuOpen, openMenu, closeMenu }) => {
    
    return (
        <>
            {/* BOTTOM NAV BAR */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-2 z-40 md:relative md:bg-transparent md:border-t-0 md:p-0 md:mt-auto safe-area-bottom">
                 <div className="max-w-7xl mx-auto flex md:justify-start gap-2 md:gap-4 overflow-x-auto no-scrollbar snap-x justify-between">
                    
                    {/* ESSENTIALS ALWAYS VISIBLE */}
                    <NavButton active={activeTab === 'MARKET' && !isMenuOpen} onClick={() => setActiveTab('MARKET')} icon={<TrendingUp size={20} />} label="Marché" theme={theme} />

                    {agency.id !== 'unassigned' && (
                        <>
                            <NavButton active={activeTab === 'MISSIONS' && !isMenuOpen} onClick={() => setActiveTab('MISSIONS')} icon={<Target size={20} />} label="Missions" theme={theme} />
                            <NavButton active={activeTab === 'TEAM' && !isMenuOpen} onClick={() => setActiveTab('TEAM')} icon={<Users size={20} />} label="Équipe" theme={theme} />
                        </>
                    )}
                    
                    {/* MENU BUTTON */}
                    <NavButton 
                        active={isMenuOpen || ['RECRUITMENT', 'RESOURCES', 'HELP'].includes(activeTab)} 
                        onClick={isMenuOpen ? closeMenu : openMenu} 
                        icon={isMenuOpen ? <X size={20} /> : <Menu size={20} />} 
                        label="Menu" 
                        theme={theme} 
                    />
                 </div>
            </div>

            {/* FULL SCREEN MENU OVERLAY */}
            <div className={`
                fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-50 flex flex-col
                transition-all duration-300 ease-in-out
                ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
            `}>
                <div className="flex justify-between items-center p-6 border-b border-slate-800">
                    <h2 className="text-2xl font-display font-bold text-white">Menu Principal</h2>
                    <button onClick={closeMenu} className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <MenuButton 
                        active={activeTab === 'RECRUITMENT'} 
                        onClick={() => setActiveTab('RECRUITMENT')} 
                        icon={<Briefcase size={24} />} 
                        label={agency.id === 'unassigned' ? "Mon Statut" : "Recrutement & Mercato"} 
                        theme={theme} 
                    />
                    <MenuButton 
                        active={activeTab === 'RESOURCES'} 
                        onClick={() => setActiveTab('RESOURCES')} 
                        icon={<BookOpen size={24} />} 
                        label="Wiki & Ressources" 
                        theme={theme} 
                    />
                    <MenuButton 
                        active={activeTab === 'HELP'} 
                        onClick={() => setActiveTab('HELP')} 
                        icon={<HelpCircle size={24} />} 
                        label="Aide & FAQ" 
                        theme={theme} 
                    />
                </div>

                <div className="p-6 border-t border-slate-800 safe-area-bottom">
                    <button 
                        onClick={() => signOut(auth)}
                        className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors font-bold"
                    >
                        <LogOut size={20} />
                        Déconnexion
                    </button>
                </div>
            </div>
        </>
    );
};

const NavButton: React.FC<any> = ({ active, onClick, icon, label, theme }) => (
    <button onClick={onClick} className={`snap-start flex flex-col md:flex-row items-center md:gap-3 p-2 md:p-4 rounded-xl transition-all min-w-[70px] md:min-w-[150px] justify-center md:justify-start ${active ? `${theme.bg} text-white transform scale-105 shadow-md` : 'hover:bg-slate-50 text-slate-400 hover:text-slate-600'}`}>
        <div className={`p-1.5 rounded-full ${active ? 'bg-white/20' : ''}`}>{React.cloneElement(icon, { className: active ? 'text-white' : '' })}</div>
        <span className={`text-[10px] md:text-base font-bold`}>{label}</span>
    </button>
);

const MenuButton: React.FC<any> = ({ active, onClick, icon, label, theme }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${active ? `${theme.bg} text-white shadow-lg` : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
        <div className={`p-3 rounded-xl ${active ? 'bg-white/20' : 'bg-slate-700'}`}>
            {React.cloneElement(icon, { className: active ? 'text-white' : 'text-slate-400' })}
        </div>
        <span className="text-lg font-bold">{label}</span>
    </button>
);
