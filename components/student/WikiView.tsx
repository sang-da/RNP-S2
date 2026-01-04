
import React, { useState } from 'react';
import { Agency } from '../../types';
import { useGame } from '../../contexts/GameContext';
import { BookOpen, Search, FileText, Video, Box, Link, ExternalLink } from 'lucide-react';

interface WikiViewProps {
  agency: Agency;
}

export const WikiView: React.FC<WikiViewProps> = ({ agency }) => {
  const { resources } = useGame();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PDF' | 'VIDEO' | 'ASSET' | 'LINK'>('ALL');

  const filteredResources = resources.filter(r => {
      const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = r.targetClass === 'ALL' || r.targetClass === agency.classId;
      const matchesType = filterType === 'ALL' || r.type === filterType;
      return matchesSearch && matchesClass && matchesType;
  });

  const getIcon = (type: string) => {
      switch(type) {
          case 'PDF': return <FileText size={24}/>;
          case 'VIDEO': return <Video size={24}/>;
          case 'ASSET': return <Box size={24}/>;
          default: return <Link size={24}/>;
      }
  };

  const getColor = (type: string) => {
      switch(type) {
          case 'PDF': return 'bg-red-50 text-red-500';
          case 'VIDEO': return 'bg-purple-50 text-purple-500';
          case 'ASSET': return 'bg-amber-50 text-amber-500';
          default: return 'bg-blue-50 text-blue-500';
      }
  };

  return (
    <div className="animate-in slide-in-from-right-4 duration-500 pb-20">
        <div className="mb-6">
            <h3 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="text-indigo-500" size={28}/> Wiki & Ressources
            </h3>
            <p className="text-slate-500 text-sm">Documents de cours, tutoriels et assets pour la Classe {agency.classId}.</p>
        </div>

        {/* FILTERS */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-slate-400" size={20}/>
                <input 
                    type="text" 
                    placeholder="Rechercher..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {['ALL', 'PDF', 'VIDEO', 'ASSET', 'LINK'].map(type => (
                    <button 
                        key={type}
                        onClick={() => setFilterType(type as any)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                            filterType === type 
                            ? 'bg-slate-900 text-white' 
                            : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                    >
                        {type}
                    </button>
                ))}
            </div>
        </div>

        {/* LIST */}
        {filteredResources.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <BookOpen size={32} className="mx-auto text-slate-300 mb-2"/>
                <p className="text-slate-400 font-bold text-sm">Aucune ressource trouvée.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredResources.map(res => (
                    <a 
                        key={res.id} 
                        href={res.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md hover:border-indigo-300 transition-all group"
                    >
                        <div className={`p-3 rounded-xl shrink-0 ${getColor(res.type)}`}>
                            {getIcon(res.type)}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <h4 className="font-bold text-slate-900 text-sm truncate group-hover:text-indigo-600 transition-colors">{res.title}</h4>
                            <div className="flex gap-2 mt-1">
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 rounded">{res.type}</span>
                                <span className="text-[10px] text-slate-400">{res.date}</span>
                            </div>
                        </div>
                        <ExternalLink size={18} className="text-slate-300 group-hover:text-indigo-500"/>
                    </a>
                ))}
            </div>
        )}
    </div>
  );
};
