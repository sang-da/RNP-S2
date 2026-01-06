
import React, { useState } from 'react';
import { Agency } from '../types';
import { Save, MapPin, Target, Zap, HelpCircle, PenTool, List } from 'lucide-react';

interface AdminProjectsProps {
  agencies: Agency[];
  onUpdateAgency: (agency: Agency) => void;
  readOnly?: boolean;
}

export const AdminProjects: React.FC<AdminProjectsProps> = ({ agencies, onUpdateAgency, readOnly }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ problem: '', target: '', location: '', gesture: '' });

  const activeAgencies = agencies.filter(a => a.id !== 'unassigned');

  const startEditing = (agency: Agency) => {
    setEditingId(agency.id);
    setFormData(agency.projectDef);
  };

  const handleSave = (agency: Agency) => {
    onUpdateAgency({
        ...agency,
        projectDef: {
            ...agency.projectDef,
            ...formData
        }
    });
    setEditingId(null);
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
         <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-slate-900">Gestion des Projets & Agences</h2>
            <p className="text-slate-500 text-sm">Vue d'ensemble des indicateurs (VE, Budget) et des définitions de projet.</p>
        </div>

        {/* --- TABLEAU RÉCAPITULATIF (DÉPLACÉ DU DASHBOARD) --- */}
        <div className="mb-10">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <List size={20}/> État des Lieux
            </h3>
            
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-100">
                        <tr>
                            <th className="p-4">Agence</th>
                            <th className="p-4 hidden md:table-cell">Statut</th>
                            <th className="p-4 text-right">VE</th>
                            <th className="p-4 text-right hidden md:table-cell">Budget</th>
                            <th className="p-4 text-right">Membres</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {activeAgencies
                            .sort((a,b) => b.ve_current - a.ve_current)
                            .map(agency => (
                            <tr key={agency.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="p-3 pl-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border ${
                                            agency.classId === 'A' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'
                                        }`}>
                                            {agency.name.substring(0,2)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-slate-900">{agency.name}</div>
                                            <div className="text-[10px] text-slate-400">Classe {agency.classId}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-3 hidden md:table-cell">
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                        agency.status === 'stable' ? 'bg-emerald-50 text-emerald-600' : 
                                        agency.status === 'fragile' ? 'bg-amber-50 text-amber-600' : 
                                        'bg-red-50 text-red-600'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                            agency.status === 'stable' ? 'bg-emerald-500' : 
                                            agency.status === 'fragile' ? 'bg-amber-500' : 
                                            'bg-red-500'
                                        }`}></span>
                                        {agency.status}
                                    </span>
                                </td>
                                <td className="p-3 text-right">
                                    <span className="font-display font-bold text-lg text-slate-900">{agency.ve_current}</span>
                                </td>
                                <td className="p-3 text-right hidden md:table-cell">
                                    <span className={`text-xs font-bold ${agency.budget_real < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                                        {agency.budget_real} PiXi
                                    </span>
                                </td>
                                <td className="p-3 text-right">
                                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{agency.members.length}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* --- CARTES PROJETS --- */}
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Zap size={20}/> Détails Projets
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
            {agencies.filter(a => a.id !== 'unassigned').map(agency => (
                <div key={agency.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                    {/* Header */}
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-500 text-xs">
                                {agency.name.substring(0,2)}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 leading-tight">{agency.name}</h3>
                                <p className="text-xs text-slate-400">{agency.members.length} membres</p>
                            </div>
                        </div>
                        {editingId !== agency.id && !readOnly && (
                             <button onClick={() => startEditing(agency)} className="text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold">
                                <PenTool size={14} /> Éditer
                            </button>
                        )}
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1">
                        {editingId === agency.id ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Problème</label>
                                    <textarea 
                                        value={formData.problem} 
                                        onChange={e => setFormData({...formData, problem: e.target.value})}
                                        className="w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-900 min-h-[60px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Cible (Persona)</label>
                                    <textarea 
                                        value={formData.target} 
                                        onChange={e => setFormData({...formData, target: e.target.value})}
                                        className="w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-900 min-h-[60px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Lieu</label>
                                        <input 
                                            type="text" 
                                            value={formData.location} 
                                            onChange={e => setFormData({...formData, location: e.target.value})}
                                            className="w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Geste Archi</label>
                                        <input 
                                            type="text" 
                                            value={formData.gesture} 
                                            onChange={e => setFormData({...formData, gesture: e.target.value})}
                                            className="w-full border border-slate-300 rounded-lg p-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2 border-t border-slate-100 mt-2">
                                    <button 
                                        onClick={() => handleSave(agency)}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2"
                                    >
                                        <Save size={14}/> Sauvegarder
                                    </button>
                                    <button 
                                        onClick={() => setEditingId(null)}
                                        className="px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-bold text-xs"
                                    >
                                        Annuler
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 h-full">
                                {(!agency.projectDef.problem && !agency.projectDef.location) ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 min-h-[150px]">
                                        <HelpCircle size={32} className="mb-2"/>
                                        <p className="text-sm italic">Projet non défini</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex gap-3 items-start">
                                            <Zap size={18} className="text-amber-500 shrink-0 mt-0.5"/>
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Problème</span>
                                                <p className="text-sm font-medium text-slate-800 leading-snug">{agency.projectDef.problem}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-3 items-start">
                                            <Target size={18} className="text-indigo-500 shrink-0 mt-0.5"/>
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Cible</span>
                                                <p className="text-sm font-medium text-slate-800 leading-snug">{agency.projectDef.target}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                                             <div className="flex gap-2 items-center">
                                                <MapPin size={16} className="text-emerald-500 shrink-0"/>
                                                <div className="overflow-hidden">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Lieu</span>
                                                    <p className="text-sm font-bold text-slate-900 truncate" title={agency.projectDef.location}>{agency.projectDef.location}</p>
                                                </div>
                                             </div>
                                             <div>
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Geste Archi</span>
                                                <p className="text-sm font-bold text-slate-900 truncate" title={agency.projectDef.gesture}>{agency.projectDef.gesture || '...'}</p>
                                             </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};
