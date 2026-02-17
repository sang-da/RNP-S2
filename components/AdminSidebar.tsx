
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
  
  // État local pour les sections repliables (Tout ouvert par défaut)
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
        {/* Mobile Overlay */}
        {isOpen && (
            <div 
                className="fixed inset-0 bg-slate-900/50 z-[49] md:hidden backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
        )}

        {/* Sidebar */}
        <div className={`
            fixed left-0 top-0 h-screen w-64 bg-slate-900 text-white flex flex-col z-[50] shadow-2xl
            transition-transform duration-300 ease-in-out
            ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          {/* Brand */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
                <span className="font-display font-bold text-lg tracking-tight">RNP Staff</span>
            </div>
            {/* Mobile Close Button */}
            <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
                <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-4 overflow-y-auto custom-scrollbar">
            
            {ADMIN_MENU_STRUCTURE.map((group, groupIdx) => {
                // Filtrer les items selon les permissions superviseur
                const visibleItems = group.items.filter(item => {
                    if (!isSupervisor) return true; // Admin voit tout
                    
                    // Vérification Config Superviseur
                    if (gameConfig.supervisorPermissions && gameConfig.supervisorPermissions[item.id]) {
                        return gameConfig.supervisorPermissions[item.id].visible;
                    }
                    
                    // Par défaut si pas de config (Legacy)
                    // On cache les items critiques par défaut si pas configuré
                    const defaultHidden = ['SETTINGS', 'ACCESS', 'BLACK_MARKET'];
                    return !defaultHidden.includes(item.id);
                });

                if (visibleItems.length === 0) return null;

                const isExpanded = expandedSections[group.title];

                return (
                    <div key={groupIdx} className="space-y-1">
                        <button 
                            onClick={() => toggleSection(group.title)}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
                        >
                            {group.title}
                            {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                        </button>
                        
                        {isExpanded && (
                            <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                                {visibleItems.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => { onNavigate(item.id as any); onClose(); }}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                                            activeView === item.id 
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 font-bold' 
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                        }`}
                                    >
                                        <item.icon size={18} />
                                        <span className="text-sm">{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}

          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800 shrink-0">
            <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
            >
                <LogOut size={20} />
                <span className="text-sm font-bold">Déconnexion</span>
            </button>
          </div>
        </div>
    </>
  );
};
