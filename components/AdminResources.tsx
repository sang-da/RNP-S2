
import React, { useMemo, useState } from 'react';
import { Agency } from '../types';
import { FileText, Download, FolderOpen, ExternalLink, Search } from 'lucide-react';

interface AdminResourcesProps {
  agencies: Agency[];
}

export const AdminResources: React.FC<AdminResourcesProps> = ({ agencies }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState<'ALL' | 'A' | 'B'>('ALL');

  const allFiles = useMemo(() => {
      const files: any[] = [];
      agencies.forEach(agency => {
          if (agency.id === 'unassigned') return;
          if (filterClass !== 'ALL' && agency.classId !== filterClass) return;

          Object.values(agency.progress).forEach(week => {
              week.deliverables.forEach(del => {
                  if (del.fileUrl && del.fileUrl !== '#' && del.status !== 'pending') {
                      // Simple check to exclude CVs or dummy links
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
      return files.reverse(); // Newest first (roughly)
  }, [agencies, filterClass]);

  const filteredFiles = allFiles.filter(f => 
      f.agencyName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      f.deliverableName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-500 pb-20">
        <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-cyan-100 rounded-xl text-cyan-600"><FolderOpen size={32}/></div>
                Ressources & Livrables
            </h2>
            <p className="text-slate-500 text-sm mt-1">Consultez et téléchargez les fichiers soumis par les agences.</p>
        </div>

        {/* TOOLBAR */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-slate-400" size={20}/>
                <input 
                    type="text" 
                    placeholder="Rechercher un fichier, une agence..." 
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

        {/* FILES TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {filteredFiles.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                    <FolderOpen size={48} className="mx-auto mb-3 opacity-20"/>
                    <p className="font-bold">Aucun fichier trouvé.</p>
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
                                        <a 
                                            href={file.url} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:border-cyan-400 hover:text-cyan-600 rounded-lg text-xs font-bold text-slate-600 transition-all"
                                        >
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
    </div>
  );
};
