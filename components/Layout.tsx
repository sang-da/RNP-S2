
import React from 'react';
import { LayoutDashboard, LogOut, Moon, Sun, Menu } from 'lucide-react';
import { MASCOTS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  role: 'admin' | 'student';
  switchRole: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, role, switchRole }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20 md:pb-0">
      
      {/* Mobile/Desktop Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
                {/* LOGO IMAGE REPLACEMENT */}
                <div className="w-10 h-10 flex items-center justify-center">
                     <img src={MASCOTS.LOGO} alt="RNP Logo" className="w-full h-full object-contain" />
                </div>
                <h1 className="text-xl font-display font-bold tracking-tight text-slate-900 leading-none">
                  RNP<span className="text-slate-400">Manager</span>
                </h1>
            </div>

            <div className="flex items-center gap-4">
                <button 
                  onClick={switchRole}
                  className={`text-xs font-bold px-4 py-2 rounded-full border transition-all ${
                    role === 'admin' 
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' 
                    : 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100'
                  }`}
                >
                  {role === 'admin' ? 'Enseignant' : 'Étudiant'}
                </button>
                <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                    <LogOut size={20} />
                </button>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
};
