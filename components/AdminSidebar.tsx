
import React, { useState, useEffect } from 'react';
import { LogOut, X, ChevronDown, ChevronRight } from 'lucide-react';
import { ADMIN_MENU_STRUCTURE } from '../config/adminMenu';
import { useGame } from '../contexts/GameContext';

interface AdminSidebarProps {
  activeView: string;
  onNavigate: (view: any) => void;
  onLogout: () => void;
  isOpen: boolean; // Mobile state
  onClose: () => void; // Mobile action
  role?: string; // Role de l'utilisateur
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeView, onNavigate, onLogout, isOpen, onClose, role }) => {
  const { gameConfig } = useGame();
  const isSupervisor = role === 'supervisor';
  
  // État local pour les sections repliables (Tout ouvert par défaut sur desktop, mais on peut les fermer)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
      "Pilotage & Simulation": true,
      "Gestion Projets": true,
      "Finance & RH": true,
      "Système & Outils": true
  });

  const toggleSection = (title: string) => {
      setExpandedSections(prev => ({...prev, [title]: !prev[title]}));
  };

  return (
    <>
        {/* Sidebar / Full-Screen Mobile Menu */}
        <div className={`
            fixed top-0 left-0 h-screen bg-slate-900 text-white flex flex-col z-[60] shadow-2xl
            transition-all duration-300 ease-in-out
            
            w-full md:w-64
            ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none md:pointer-events-auto md:translate-y-0 md:opacity-100'}
        `}>
          {/* Brand & Mobile Close */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
                <span className="font-display font-bold text-lg tracking-tight">RNP Staff</span>
            </div>
            {/* Mobile Close Button */}
            <button onClick={onClose} className="md:hidden p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 md:p-3 space-y-6 md:space-y-4 overflow-y-auto custom-scrollbar pb-24 md:pb-4">
            
            {ADMIN_MENU_STRUCTURE.map((group, groupIdx) => {
                // Filtrer les items selon les permissions superviseur
                const visibleItems = group.items.filter(item => {
                    if (!isSupervisor) return true; // Admin voit tout
                    
                    // Vérification Config Superviseur
                    if (gameConfig.supervisorPermissions && gameConfig.supervisorPermissions[item.id]) {
                        return gameConfig.supervisorPermissions[item.id].visible;
                    }
                    
                    // Par défaut si pas de config (Legacy)
                    const defaultHidden = ['SETTINGS', 'ACCESS', 'BLACK_MARKET'];
                    return !defaultHidden.includes(item.id);
                });

                if (visibleItems.length === 0) return null;

                const isExpanded = expandedSections[group.title];

                return (
                    <div key={groupIdx} className="space-y-2 md:space-y-1">
                        <button 
                            onClick={() => toggleSection(group.title)}
                            className="w-full flex items-center justify-between px-2 md:px-3 py-2 text-sm md:text-xs font-bold text-slate-400 md:text-slate-500 uppercase tracking-wider hover:text-slate-200 md:hover:text-slate-300 transition-colors"
                        >
                            {group.title}
                            <div className={`p-1 rounded-md bg-slate-800 md:bg-transparent transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                <ChevronDown size={16}/>
                            </div>
                        </button>
                        
                        {isExpanded && (
                            <div className="space-y-1.5 md:space-y-1 animate-in slide-in-from-top-2 duration-200">
                                {visibleItems.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => { onNavigate(item.id as any); onClose(); }}
                                        className={`w-full flex items-center gap-4 md:gap-3 px-4 py-3 md:py-2.5 rounded-xl transition-all ${
                                            activeView === item.id 
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 font-bold' 
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                        }`}
                                    >
                                        <item.icon size={20} className="md:w-[18px] md:h-[18px]" />
                                        <span className="text-base md:text-sm">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}

          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800 shrink-0 pb-8 md:pb-4">
            <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center md:justify-start gap-3 px-4 py-4 md:py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
            >
                <LogOut size={22} className="md:w-[20px] md:h-[20px]" />
                <span className="text-base md:text-sm font-bold">Déconnexion</span>
            </button>
          </div>
        </div>
    </>
  );
};
