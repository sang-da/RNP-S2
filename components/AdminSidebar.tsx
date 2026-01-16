
import React from 'react';
import { LayoutDashboard, Users, Briefcase, Settings, LogOut, Flame, CalendarRange, KeyRound, FolderOpen, MonitorPlay, X, Bot, TrendingUp, PieChart } from 'lucide-react';

interface AdminSidebarProps {
  activeView: string;
  onNavigate: (view: any) => void;
  onLogout: () => void;
  isOpen: boolean; // Mobile state
  onClose: () => void; // Mobile action
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeView, onNavigate, onLogout, isOpen, onClose }) => {
  const menuItems = [
    { id: 'OVERVIEW', label: 'Vue Globale', icon: <LayoutDashboard size={20} /> },
    { id: 'ANALYTICS', label: 'Analytics & Data', icon: <PieChart size={20} /> }, // NOUVEAU
    { id: 'MARKET', label: 'Marché Live', icon: <TrendingUp size={20} /> },
    { id: 'AI_ASSISTANT', label: 'Co-Pilote IA', icon: <Bot size={20} /> },
    { id: 'ACCESS', label: 'Accès & Comptes', icon: <KeyRound size={20} /> },
    { id: 'SCHEDULE', label: 'Calendrier', icon: <CalendarRange size={20} /> },
    { id: 'MERCATO', label: 'Mercato RH', icon: <Users size={20} /> },
    { id: 'PROJECTS', label: 'Gestion Projets', icon: <Briefcase size={20} /> },
    { id: 'CRISIS', label: 'Zone de Crise', icon: <Flame size={20} /> },
  ];

  const secondaryItems = [
    { id: 'RESOURCES', label: 'Ressources', icon: <FolderOpen size={20} /> },
    { id: 'VIEWS', label: 'Vues & Simulation', icon: <MonitorPlay size={20} /> },
    { id: 'SETTINGS', label: 'Paramètres', icon: <Settings size={20} /> },
  ];

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
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
                <span className="font-display font-bold text-lg tracking-tight">RNP Admin</span>
            </div>
            {/* Mobile Close Button */}
            <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
                <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-8 overflow-y-auto custom-scrollbar">
            
            {/* Main Section */}
            <div className="space-y-2">
                <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gestion</p>
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => { onNavigate(item.id as any); onClose(); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                            activeView === item.id 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 font-bold' 
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        {item.icon}
                        <span className="text-sm">{item.label}</span>
                    </button>
                ))}
            </div>

            {/* Secondary Section */}
            <div className="space-y-2">
                <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Outils</p>
                {secondaryItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => { onNavigate(item.id as any); onClose(); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                            activeView === item.id 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 font-bold' 
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        {item.icon}
                        <span className="text-sm">{item.label}</span>
                    </button>
                ))}
            </div>

          </nav>

          {/* Footer (Simplified as Logout is in Settings now, or keep just quick logout) */}
          <div className="p-4 border-t border-slate-800">
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
