
import React from 'react';
import { Search, Calendar, Filter } from 'lucide-react';

interface ReviewFiltersProps {
    searchTerm: string;
    setSearchTerm: (s: string) => void;
    filterClass: 'ALL' | 'A' | 'B';
    setFilterClass: (c: 'ALL' | 'A' | 'B') => void;
    filterWeek: string;
    setFilterWeek: (w: string) => void;
    availableWeeks: string[];
}

export const ReviewFilters: React.FC<ReviewFiltersProps> = ({ searchTerm, setSearchTerm, filterClass, setFilterClass, filterWeek, setFilterWeek, availableWeeks }) => {
    return (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-3 text-slate-400" size={18}/>
                <input 
                    type="text" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Rechercher un étudiant ou une agence..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
            </div>

            <div className="flex gap-2 w-full md:w-auto">
                <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                    <button onClick={() => setFilterClass('ALL')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterClass === 'ALL' ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}>Toutes</button>
                    <button onClick={() => setFilterClass('A')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterClass === 'A' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>Cl. A</button>
                    <button onClick={() => setFilterClass('B')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterClass === 'B' ? 'bg-white shadow text-purple-600' : 'text-slate-400'}`}>Cl. B</button>
                </div>

                <select 
                    value={filterWeek}
                    onChange={e => setFilterWeek(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-rose-500"
                >
                    <option value="ALL">Toutes les semaines</option>
                    {availableWeeks.map(w => (
                        <option key={w} value={w}>Semaine {w}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};
