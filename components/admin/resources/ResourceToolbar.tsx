
import React from 'react';
import { Search, FolderOpen, BookOpen } from 'lucide-react';

interface ResourceToolbarProps {
    viewMode: 'UPLOADS' | 'WIKI';
    setViewMode: (v: 'UPLOADS' | 'WIKI') => void;
    searchTerm: string;
    setSearchTerm: (s: string) => void;
    filterClass: 'ALL' | 'A' | 'B';
    setFilterClass: (c: 'ALL' | 'A' | 'B') => void;
    filterStatus: 'ALL' | 'PENDING' | 'GRADED';
    setFilterStatus: (s: 'ALL' | 'PENDING' | 'GRADED') => void;
}

export const ResourceToolbar: React.FC<ResourceToolbarProps> = ({ 
    viewMode, setViewMode, 
    searchTerm, setSearchTerm, 
    filterClass, setFilterClass, 
    filterStatus, setFilterStatus 
}) => {
    return (
        <>
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-cyan-100 rounded-xl text-cyan-600"><FolderOpen size={32}/></div>
                        Inbox & Ressources
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Gérez les rendus étudiants et la bibliothèque pédagogique.</p>
                </div>
                
                {/* TOGGLE VIEW */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setViewMode('UPLOADS')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'UPLOADS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                    >
                        <FolderOpen size={14}/> Corrections
                    </button>
                    <button 
                        onClick={() => setViewMode('WIKI')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'WIKI' ? 'bg-white text-cyan-700 shadow-sm' : 'text-slate-400'}`}
                    >
                        <BookOpen size={14}/> Wiki Pédago
                    </button>
                </div>
            </div>

            {/* TOOLBAR */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-slate-400" size={20}/>
                    <input 
                        type="text" 
                        placeholder="Rechercher une agence ou un fichier..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                </div>
                
                {viewMode === 'UPLOADS' && (
                    <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                        <button onClick={() => setFilterStatus('PENDING')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterStatus === 'PENDING' ? 'bg-white text-slate-900 shadow' : 'text-slate-400'}`}>À Corriger</button>
                        <button onClick={() => setFilterStatus('GRADED')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterStatus === 'GRADED' ? 'bg-white text-slate-900 shadow' : 'text-slate-400'}`}>Historique</button>
                    </div>
                )}

                <div className="flex gap-2">
                    {['ALL', 'A', 'B'].map((cls) => (
                        <button 
                            key={cls}
                            onClick={() => setFilterClass(cls as any)}
                            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                filterClass === cls 
                                ? 'bg-slate-800 text-white' 
                                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            {cls === 'ALL' ? 'Tout' : `CL ${cls}`}
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
};
