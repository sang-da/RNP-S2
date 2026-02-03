
import React from 'react';
import { Search, Building2, Layers } from 'lucide-react';
import { Agency } from '../../../types';

interface ReviewFiltersProps {
    searchTerm: string;
    setSearchTerm: (s: string) => void;
    filterClass: 'ALL' | 'A' | 'B';
    setFilterClass: (c: 'ALL' | 'A' | 'B') => void;
    filterWeek: string;
    setFilterWeek: (w: string) => void;
    filterAgencyId: string;
    setFilterAgencyId: (id: string) => void;
    availableWeeks: string[];
    agencies: Agency[];
}

export const ReviewFilters: React.FC<ReviewFiltersProps> = ({ 
    searchTerm, setSearchTerm, 
    filterClass, setFilterClass, 
    filterWeek, setFilterWeek, 
    filterAgencyId, setFilterAgencyId,
    availableWeeks, agencies 
}) => {
    return (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-3 text-slate-400" size={18}/>
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Rechercher un étudiant ou un mot clé..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 w-full md:w-auto">
                    <button onClick={() => setFilterClass('ALL')} className={`flex-1 md:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterClass === 'ALL' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Toutes</button>
                    <button onClick={() => setFilterClass('A')} className={`flex-1 md:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterClass === 'A' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Cl. A</button>
                    <button onClick={() => setFilterClass('B')} className={`flex-1 md:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterClass === 'B' ? 'bg-white shadow text-purple-600' : 'text-slate-500'}`}>Cl. B</button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
                {/* FILTRE AGENCE */}
                <div className="flex-1 flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                    <Building2 size={16} className="text-slate-400"/>
                    <select 
                        value={filterAgencyId}
                        onChange={e => setFilterAgencyId(e.target.value)}
                        className="flex-1 bg-transparent border-none text-xs font-bold text-slate-600 outline-none focus:ring-0 py-2"
                    >
                        <option value="ALL">Tous les studios</option>
                        {agencies
                            .filter(a => filterClass === 'ALL' || a.classId === filterClass)
                            .sort((a,b) => a.name.localeCompare(b.name))
                            .map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                    </select>
                </div>

                {/* FILTRE SEMAINE */}
                <div className="md:w-48 flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                    <Layers size={16} className="text-slate-400"/>
                    <select 
                        value={filterWeek}
                        onChange={e => setFilterWeek(e.target.value)}
                        className="flex-1 bg-transparent border-none text-xs font-bold text-slate-600 outline-none focus:ring-0 py-2"
                    >
                        <option value="ALL">Toutes les semaines</option>
                        {availableWeeks.map(w => (
                            <option key={w} value={w}>Semaine {w}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};
