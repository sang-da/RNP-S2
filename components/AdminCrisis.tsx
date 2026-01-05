
import React, { useState } from 'react';
import { Agency } from '../types';
import { Target, User, Gavel } from 'lucide-react';
import { AdminCrisisAgency } from './AdminCrisisAgency';
import { AdminCrisisStudent } from './AdminCrisisStudent';

interface AdminCrisisProps {
  agencies: Agency[];
  onUpdateAgency: (agency: Agency) => void;
  readOnly?: boolean;
}

export const AdminCrisis: React.FC<AdminCrisisProps> = ({ agencies, onUpdateAgency, readOnly }) => {
  const [viewMode, setViewMode] = useState<'AGENCY' | 'STUDENT'>('AGENCY');

  return (
    <div className="animate-in fade-in duration-500 pb-20">
         <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-slate-900 text-white rounded-xl"><Gavel size={32}/></div>
                Gestion de Crise & Arbitrage
            </h2>
            <p className="text-slate-500 text-sm mt-1">
                Console de "Dieu" : Déclenchez des événements globaux ou gérez les cas individuels.
            </p>
        </div>

        {/* --- VIEW SWITCHER --- */}
        <div className="flex p-1 bg-slate-200 rounded-2xl mb-8 w-full md:w-fit">
            <button 
                onClick={() => setViewMode('AGENCY')}
                className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${viewMode === 'AGENCY' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Target size={18}/> Agences (Macro)
            </button>
            <button 
                onClick={() => setViewMode('STUDENT')}
                className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${viewMode === 'STUDENT' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <User size={18}/> Cas Particuliers (RH)
            </button>
        </div>

        {/* ======================= RENDER VIEW ======================= */}
        {viewMode === 'AGENCY' && (
            <AdminCrisisAgency 
                agencies={agencies} 
                onUpdateAgency={onUpdateAgency} 
                readOnly={readOnly} 
            />
        )}

        {viewMode === 'STUDENT' && (
            <AdminCrisisStudent 
                agencies={agencies} 
                onUpdateAgency={onUpdateAgency} 
                readOnly={readOnly} 
            />
        )}
    </div>
  );
};
