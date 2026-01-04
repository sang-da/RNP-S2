
import React, { useMemo, useState } from 'react';
import { Agency, WikiResource } from '../types';
import { FileText, Download, FolderOpen, ExternalLink, Search, FileQuestion, BookOpen, Trash2, Link, Video, Box, Plus } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { useUI } from '../contexts/UIContext';

interface AdminResourcesProps {
  agencies: Agency[];
}

export const AdminResources: React.FC<AdminResourcesProps> = ({ agencies }) => {
  const { resources, addResource, deleteResource } = useGame();
  const { confirm } = useUI();
  const [viewMode, setViewMode] = useState<'UPLOADS' | 'WIKI'>('UPLOADS');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState<'ALL' | 'A' | 'B'>('ALL');

  // Wiki Form State
  const [wikiForm, setWikiForm] = useState<{title: string, url: string, type: 'PDF' | 'VIDEO' | 'LINK' | 'ASSET', targetClass: 'ALL' | 'A' | 'B'}>({
      title: '', url: '', type: 'PDF', targetClass: 'ALL'
  });

  // --- UPLOADS LOGIC ---
  const allFiles = useMemo(() => {
      const files: any[] = [];
      agencies.forEach(agency => {
          if (agency.id === 'unassigned') return;
          if (filterClass !== 'ALL' && agency.classId !== filterClass) return;

          Object.values(agency.progress).forEach(week => {
              week.deliverables.forEach(del => {
                  if (del.fileUrl && del.fileUrl !== '#' && del.status !== 'pending') {
                      if (del.name.toLowerCase().includes('cv')) return; 

                      files.push({
                          id: `${agency.id}-${week.id}-${del.id}`,
                          agencyName: agency.name,
                          agencyClass: agency.classId,
                          weekId: week.id,
                          weekTitle: week.title,
                          deliverableName: del.name,
                          url: del.fileUrl,
                          status: del.status,
                          date: del.submissionDate || 'N/A'
                      });
                  }
              });
          });
      });
      return files.reverse();
  }, [agencies, filterClass]);

  const filteredFiles = allFiles.filter(f => 
      f.agencyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      f.deliverableName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- WIKI LOGIC ---
  const handleAddWiki = async () => {
      if(!wikiForm.title || !wikiForm.url) return;
      const newRes: WikiResource = {
          id: `wiki-${Date.now()}`,
          title: wikiForm.title,
          url: wikiForm.url,
          type: wikiForm.type,
          targetClass: wikiForm.targetClass,
          date: new Date().toISOString().split('T')[0]
      };
      await addResource(newRes);
      setWikiForm({ title: '', url: '', type: 'PDF', targetClass: 'ALL' });
  };

  const handleDeleteWiki = async (id: string) => {
      if (await confirm({ title: 'Supprimer ?', message: 'Cette ressource sera retirée pour tous les étudiants.', confirmText: 'Supprimer', isDangerous: true })) {
          await deleteResource(id);
      }
  };

  const filteredResources = resources.filter(r => 
      (filterClass === 'ALL' || r.targetClass === 'ALL' || r.targetClass === filterClass) &&
      r.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-500 pb-20">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-cyan-100 rounded-xl text-cyan-600"><FolderOpen size={32}/></div>
                    Ressources & Livrables
                </h2>
                <p className="text-slate-500 text-sm mt-1">Gérez les rendus étudiants et la bibliothèque pédagogique.</p>
            </div>
            
            {/* TOGGLE VIEW */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
                <button 
                    onClick={() => setViewMode('UPLOADS')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'UPLOADS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >
                    <FolderOpen size={14}/> Livrables
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
                    placeholder="Rechercher un fichier..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
            </div>
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
                        {cls === 'ALL' ? 'Tout' : `Classe ${cls}`}
                    </button>
                ))}
            </div>
        </div>

        {viewMode === 'UPLOADS' ? (
            /* FILES TABLE */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[300px]">
                {filteredFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="bg-slate-50 p-6 rounded-full mb-4">
                            <FileQuestion size={48} className="text-slate-300"/>
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">Aucun fichier trouvé</h3>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-100">
                                <tr>
                                    <th className="p-4">Livrable</th>
                                    <th className="p-4">Agence</th>
                                    <th className="p-4">Semaine</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredFiles.map(file => (
                                    <tr key={file.id} className="hover:bg-cyan-50/30 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-100 text-slate-500 rounded-lg">
                                                    <FileText size={20}/>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-sm">{file.deliverableName}</div>
                                                    <div className={`text-[10px] font-bold uppercase inline-block px-1.5 rounded ${
                                                        file.status === 'validated' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                                    }`}>
                                                        {file.status === 'validated' ? 'Validé' : 'En attente'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-bold text-slate-700 block">{file.agencyName}</span>
                                            <span className={`text-[10px] font-bold px-1.5 rounded text-white ${file.agencyClass === 'A' ? 'bg-blue-400' : 'bg-purple-400'}`}>
                                                CLASSE {file.agencyClass}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                                                SEM {file.weekId}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <a href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:border-cyan-400 hover:text-cyan-600 rounded-lg text-xs font-bold text-slate-600 transition-all">
                                                <Download size={14}/> Ouvrir
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        ) : (
            /* WIKI MANAGEMENT */
            <div className="space-y-6">
                {/* ADD FORM */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Plus size={20} className="text-cyan-600"/> Ajouter une ressource</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-1">
                            <label className="text-[10px] font-bold uppercase text-slate-400">Titre</label>
                            <input value={wikiForm.title} onChange={e => setWikiForm({...wikiForm, title: e.target.value})} className="w-full p-2 border rounded-lg text-sm" placeholder="Ex: Cours Lighting"/>
                        </div>
                        <div className="md:col-span-1">
                            <label className="text-[10px] font-bold uppercase text-slate-400">URL</label>
                            <input value={wikiForm.url} onChange={e => setWikiForm({...wikiForm, url: e.target.value})} className="w-full p-2 border rounded-lg text-sm" placeholder="https://..."/>
                        </div>
                        <div className="md:col-span-1 flex gap-2">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold uppercase text-slate-400">Type</label>
                                <select value={wikiForm.type} onChange={e => setWikiForm({...wikiForm, type: e.target.value as any})} className="w-full p-2 border rounded-lg text-sm bg-white">
                                    <option value="PDF">PDF</option>
                                    <option value="VIDEO">Vidéo</option>
                                    <option value="LINK">Lien</option>
                                    <option value="ASSET">Asset 3D</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-bold uppercase text-slate-400">Cible</label>
                                <select value={wikiForm.targetClass} onChange={e => setWikiForm({...wikiForm, targetClass: e.target.value as any})} className="w-full p-2 border rounded-lg text-sm bg-white">
                                    <option value="ALL">Tous</option>
                                    <option value="A">Classe A</option>
                                    <option value="B">Classe B</option>
                                </select>
                            </div>
                        </div>
                        <div className="md:col-span-1">
                            <button onClick={handleAddWiki} className="w-full py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-cyan-600 transition-colors">Ajouter</button>
                        </div>
                    </div>
                </div>

                {/* LIST */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredResources.map(res => (
                        <div key={res.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 relative group hover:border-cyan-300 transition-all">
                            <div className={`p-3 rounded-lg ${
                                res.type === 'PDF' ? 'bg-red-50 text-red-500' :
                                res.type === 'VIDEO' ? 'bg-purple-50 text-purple-500' :
                                res.type === 'ASSET' ? 'bg-amber-50 text-amber-500' :
                                'bg-blue-50 text-blue-500'
                            }`}>
                                {res.type === 'PDF' ? <FileText size={24}/> :
                                 res.type === 'VIDEO' ? <Video size={24}/> :
                                 res.type === 'ASSET' ? <Box size={24}/> :
                                 <Link size={24}/>}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <h4 className="font-bold text-slate-800 text-sm truncate">{res.title}</h4>
                                <div className="flex gap-2 mt-1">
                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 rounded">{res.type}</span>
                                    <span className={`text-[10px] font-bold px-1.5 rounded text-white ${res.targetClass === 'A' ? 'bg-blue-400' : res.targetClass === 'B' ? 'bg-purple-400' : 'bg-slate-400'}`}>
                                        {res.targetClass === 'ALL' ? 'TOUS' : `CLASSE ${res.targetClass}`}
                                    </span>
                                </div>
                            </div>
                            <a href={res.url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-cyan-600"><ExternalLink size={18}/></a>
                            <button onClick={() => handleDeleteWiki(res.id)} className="absolute -top-2 -right-2 bg-red-100 text-red-500 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-500 hover:text-white">
                                <Trash2 size={14}/>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};
