
import React, { useState } from 'react';
import { Agency } from '../types';
import { Save, MapPin, Target, Zap, HelpCircle, PenTool } from 'lucide-react';

interface AdminProjectsProps {
  agencies: Agency[];
  onUpdateAgency: (agency: Agency) => void;
}

export const AdminProjects: React.FC<AdminProjectsProps> = ({ agencies, onUpdateAgency }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ problem: '', target: '', location: '', gesture: '' });

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
    <div className="animate-in fade-in duration-500">
         <div className="mb-6">
            <h2 className="text-3xl font-display font-bold text-slate-900">Définition des Projets</h2>
            <p className="text-slate-500 text-sm">Consultez et affinez les projets soumis par les étudiants.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
            {agencies.map(agency => (
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
                        {editingId !== agency.id && (
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
