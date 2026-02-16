
import React, { useState } from 'react';
import { Agency, AuditResult } from '../types';
import { Save, MapPin, Target, Zap, HelpCircle, PenTool, List, Trash2, Settings2, Compass, BookOpen, Bot, BrainCircuit, CheckCircle2, Play } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { useGame } from '../contexts/GameContext';
import { calculateVECap } from '../constants';
import { ProjectAuditModal } from './admin/projects/ProjectAuditModal';
import { askGroq } from '../services/groqService';
import { doc, updateDoc, db } from '../services/firebase';

interface AdminProjectsProps {
  agencies: Agency[];
  onUpdateAgency: (agency: Agency) => void;
  readOnly?: boolean;
}

export const AdminProjects: React.FC<AdminProjectsProps> = ({ agencies, onUpdateAgency, readOnly }) => {
  const { confirm, toast } = useUI();
  const { deleteAgency } = useGame();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [auditAgency, setAuditAgency] = useState<Agency | null>(null);
  const [formData, setFormData] = useState({ 
      problem: '', target: '', location: '', gesture: '',
      theme: '', context: '', direction: ''
  });
  const [veCapOverride, setVeCapOverride] = useState<number | ''>('');
  const [isGlobalAuditing, setIsGlobalAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);

  const activeAgencies = agencies.filter(a => a.id !== 'unassigned');

  // --- GLOBAL AUDIT LOGIC ---
  const handleGlobalAudit = async () => {
      if (readOnly) return;
      
      const confirmed = await confirm({
          title: "Lancer un Audit Global ?",
          message: `Cela va scanner les ${activeAgencies.length} agences une par une.\nCette opération peut prendre plusieurs minutes.\n\nLes résultats seront sauvegardés dans les fiches agences.`,
          confirmText: "Lancer le Scan"
      });

      if (!confirmed) return;

      setIsGlobalAuditing(true);
      setAuditProgress(0);
      let processed = 0;

      for (const agency of activeAgencies) {
          try {
              // --- COPIE LOGIQUE MODALE (PROMPT DOUBLE) ---
              // Idéalement, extraire cette logique dans un service, mais pour l'instant duplication pour isoler le batch
              const promptScore = `Agis comme un algorithme de notation stricte. Note ce projet (0-100) sur Concept et Viabilité. Thème: ${agency.projectDef.theme}, Problème: ${agency.projectDef.problem}. Sortie JSON: { "concept_score": int, "viability_score": int }`;
              const promptText = `Directeur Créatif impitoyable. Analyse courte pour ${agency.name}. Thème: ${agency.projectDef.theme}. Sortie JSON: { "strengths": [], "weaknesses": [], "verdict": "string", "pivot_idea": "string", "roast": "string" }`;

              const [scoreRes, textRes] = await Promise.all([
                  askGroq(promptScore, {}, "Tu es un auditeur strict. JSON."),
                  askGroq(promptText, {}, "Tu es un expert créatif. JSON.")
              ]);

              const jsonScore = JSON.parse(scoreRes.substring(scoreRes.indexOf('{'), scoreRes.lastIndexOf('}') + 1));
              const jsonText = JSON.parse(textRes.substring(textRes.indexOf('{'), textRes.lastIndexOf('}') + 1));

              const result: AuditResult = {
                  concept_score: jsonScore.concept_score,
                  viability_score: jsonScore.viability_score,
                  strengths: jsonText.strengths,
                  weaknesses: jsonText.weaknesses,
                  verdict: jsonText.verdict,
                  pivot_idea: jsonText.pivot_idea,
                  roast: jsonText.roast,
                  date: new Date().toISOString()
              };

              await updateDoc(doc(db, "agencies", agency.id), { aiAudit: result });
              
          } catch (e) {
              console.error(`Error auditing ${agency.name}`, e);
          }
          processed++;
          setAuditProgress(processed);
      }

      setIsGlobalAuditing(false);
      toast('success', "Audit Global Terminé !");
  };

  const startEditing = (agency: Agency) => {
    setEditingId(agency.id);
    setFormData({
        problem: agency.projectDef.problem || '',
        target: agency.projectDef.target || '',
        location: agency.projectDef.location || '',
        gesture: agency.projectDef.gesture || '',
        theme: agency.projectDef.theme || '',
        context: agency.projectDef.context || '',
        direction: agency.projectDef.direction || ''
    });
    setVeCapOverride(agency.veCapOverride !== undefined ? agency.veCapOverride : '');
  };

  const handleSave = (agency: Agency) => {
    onUpdateAgency({
        ...agency,
        veCapOverride: veCapOverride === '' ? undefined : Number(veCapOverride),
        projectDef: {
            ...agency.projectDef,
            ...formData
        }
    });
    setEditingId(null);
    toast('success', 'Agence mise à jour');
  };

  const handleDelete = async (agency: Agency) => {
      if(readOnly) return;
      if(await confirm({ title: `Supprimer ${agency.name} ?`, message: "Irréversible.", confirmText: "Supprimer", isDangerous: true })) {
          await deleteAgency(agency.id);
      }
  };

  const getScoreColor = (score: number) => {
      if (score >= 80) return 'text-emerald-600 bg-emerald-50';
      if (score >= 50) return 'text-amber-600 bg-amber-50';
      return 'text-red-600 bg-red-50';
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
         <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-3xl font-display font-bold text-slate-900">Gestion des Projets</h2>
                <p className="text-slate-500 text-sm">Pilotage des briefs et audits IA.</p>
            </div>
            
            {!readOnly && (
                <button 
                    onClick={handleGlobalAudit}
                    disabled={isGlobalAuditing}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-3 shadow-lg shadow-indigo-200 transition-all disabled:opacity-70"
                >
                    {isGlobalAuditing ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                            Audit en cours ({auditProgress}/{activeAgencies.length})
                        </>
                    ) : (
                        <>
                            <BrainCircuit size={18}/> Lancer Audit Global (IA)
                        </>
                    )}
                </button>
            )}
        </div>

        {/* --- TABLEAU --- */}
        <div className="mb-10 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                <List size={20} className="text-slate-400"/> 
                <h3 className="text-sm font-bold text-slate-700">Vue d'ensemble</h3>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-100">
                        <tr>
                            <th className="p-4">Agence</th>
                            <th className="p-4 text-center">Score IA (Concept)</th>
                            <th className="p-4 text-center">Score IA (Viabilité)</th>
                            <th className="p-4 text-right">VE Actuelle</th>
                            <th className="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {activeAgencies.sort((a,b) => b.ve_current - a.ve_current).map(agency => (
                            <tr key={agency.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 pl-4">
                                    <div className="font-bold text-sm text-slate-900">{agency.name}</div>
                                    <div className="text-[10px] text-slate-400">Classe {agency.classId}</div>
                                </td>
                                <td className="p-3 text-center">
                                    {agency.aiAudit ? (
                                        <span className={`inline-block px-2 py-1 rounded font-bold text-xs ${getScoreColor(agency.aiAudit.concept_score)}`}>
                                            {agency.aiAudit.concept_score}/100
                                        </span>
                                    ) : <span className="text-slate-300 text-xs">-</span>}
                                </td>
                                <td className="p-3 text-center">
                                    {agency.aiAudit ? (
                                        <span className={`inline-block px-2 py-1 rounded font-bold text-xs ${getScoreColor(agency.aiAudit.viability_score)}`}>
                                            {agency.aiAudit.viability_score}/100
                                        </span>
                                    ) : <span className="text-slate-300 text-xs">-</span>}
                                </td>
                                <td className="p-3 text-right font-display font-bold text-slate-900">
                                    {agency.ve_current}
                                </td>
                                <td className="p-3 text-right">
                                    <div className="flex justify-end gap-1">
                                        <button onClick={() => setAuditAgency(agency)} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors" title="Détail Audit">
                                            <Bot size={16}/>
                                        </button>
                                        {!readOnly && (
                                            <button onClick={() => handleDelete(agency)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors">
                                                <Trash2 size={16}/>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* --- CARTES DETAILS (Inchangées, juste refresh) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
            {activeAgencies.map(agency => (
                <div key={agency.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
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
                        <div className="flex gap-1">
                            {!readOnly && editingId !== agency.id && (
                                <button onClick={() => startEditing(agency)} className="text-slate-500 p-2 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold">
                                    <PenTool size={14} /> Éditer
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-5 flex-1">
                        {editingId === agency.id ? (
                            <div className="space-y-4">
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                    <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase">
                                        <Settings2 size={14}/> Paramètres "Maître du Jeu"
                                    </div>
                                    <div className="flex justify-between items-center gap-4">
                                        <label className="text-xs font-bold text-slate-700">Plafond VE (Manuel)</label>
                                        <input 
                                            type="number"
                                            value={veCapOverride}
                                            onChange={(e) => setVeCapOverride(e.target.value === '' ? '' : Number(e.target.value))}
                                            placeholder="Auto"
                                            className="w-24 p-2 text-right border border-slate-300 rounded-lg text-sm font-bold"
                                        />
                                    </div>
                                </div>
                                {/* Form fields... (Similaire version précédente) */}
                                <div className="grid grid-cols-1 gap-3">
                                    <input type="text" value={formData.theme} onChange={e => setFormData({...formData, theme: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="Thème"/>
                                    <textarea value={formData.problem} onChange={e => setFormData({...formData, problem: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="Problème"/>
                                    {/* ... autres champs ... */}
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={() => handleSave(agency)} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold text-xs"><Save size={14}/> Sauvegarder</button>
                                    <button onClick={() => setEditingId(null)} className="px-3 py-2 text-slate-500 font-bold text-xs">Annuler</button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 h-full">
                                <div className="flex gap-3 items-start border-b border-slate-50 pb-3">
                                    <Compass size={18} className="text-indigo-500 shrink-0 mt-0.5"/>
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Thème</span>
                                        <p className="text-sm font-bold text-slate-900 leading-snug">{agency.projectDef.theme || "Non défini"}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 items-start">
                                    <Zap size={18} className="text-amber-500 shrink-0 mt-0.5"/>
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Problème</span>
                                        <p className="text-sm font-medium text-slate-800 leading-snug">{agency.projectDef.problem || "Non défini"}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>

        {/* PROJECT AUDIT MODAL */}
        {auditAgency && (
            <ProjectAuditModal 
                isOpen={!!auditAgency} 
                onClose={() => setAuditAgency(null)} 
                agency={auditAgency} 
            />
        )}
    </div>
  );
};
