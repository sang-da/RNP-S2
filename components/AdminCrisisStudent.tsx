
import React, { useState, useMemo } from 'react';
import { Agency, CrisisPreset, GameEvent, Student } from '../types';
import { Crown, User, UserMinus, Sparkles, Gavel, Briefcase, FileWarning, ShieldAlert, BadgeCheck, Heart, Medal, Star, TrendingUp, TrendingDown, Coins, Plus, Minus, Send } from 'lucide-react';
import { useUI } from '../contexts/UIContext';

interface AdminCrisisStudentProps {
  agencies: Agency[];
  onUpdateAgency: (agency: Agency) => void;
  readOnly?: boolean;
}

interface StudentPreset extends CrisisPreset {
    category: 'STUDENT_SANCTION' | 'STUDENT_BONUS' | 'CEREMONY';
    deltaScore?: number;
    deltaWallet?: number;
    defaultReason: string;
}

export const AdminCrisisStudent: React.FC<AdminCrisisStudentProps> = ({ agencies, onUpdateAgency, readOnly }) => {
  const { confirm, toast } = useUI();

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [presetType, setPresetType] = useState<'SANCTION' | 'BONUS' | 'CEREMONY'>('BONUS');
  
  const [form, setForm] = useState({
      label: "",
      reason: "",
      deltaScore: 0,
      deltaWallet: 0
  });

  const allStudents = useMemo(() => {
      const list: {student: Student, agencyName: string, agencyId: string}[] = [];
      agencies.forEach(a => {
          a.members.forEach(m => list.push({student: m, agencyName: a.name, agencyId: a.id}));
      });
      return list.sort((a,b) => a.student.name.localeCompare(b.student.name));
  }, [agencies]);

  const PRESETS: StudentPreset[] = [
    { label: "Raté de Sprint", defaultReason: "Deadline manquée.", deltaScore: -2, deltaWallet: -50, deltaVE: 0, deltaBudget: 0, icon: <FileWarning/>, category: 'STUDENT_SANCTION', description: "Retard" },
    { label: "Ghosting / Abandon", defaultReason: "Absence injustifiée.", deltaScore: -5, deltaWallet: -200, deltaVE: 0, deltaBudget: 0, icon: <UserMinus/>, category: 'STUDENT_SANCTION', description: "Absence" },
    { label: "Faute Grave", defaultReason: "Comportement nuisible.", deltaScore: -15, deltaWallet: -500, deltaVE: 0, deltaBudget: 0, icon: <ShieldAlert/>, category: 'STUDENT_SANCTION', description: "Comportement" },
    
    { label: "MVP Technique", defaultReason: "A débloqué une situation complexe.", deltaScore: +5, deltaWallet: 300, deltaVE: 0, deltaBudget: 0, icon: <BadgeCheck/>, category: 'STUDENT_BONUS', description: "Skill" },
    { label: "Esprit de Corps", defaultReason: "A soutenu ses collègues.", deltaScore: +3, deltaWallet: 150, deltaVE: 0, deltaBudget: 0, icon: <Heart/>, category: 'STUDENT_BONUS', description: "Soft Skill" },
    { label: "Crunch Hero", defaultReason: "Effort exceptionnel.", deltaScore: +4, deltaWallet: 200, deltaVE: 0, deltaBudget: 0, icon: <Sparkles/>, category: 'STUDENT_BONUS', description: "Effort" },

    { label: "🥇 Major de Promo", defaultReason: "1ère place au classement général du S1.", deltaScore: +15, deltaWallet: 1000, deltaVE: 0, deltaBudget: 0, icon: <Medal/>, category: 'CEREMONY', description: "Top 1 Classe" },
    { label: "🥈 Dauphin", defaultReason: "2ème place au classement général du S1.", deltaScore: +10, deltaWallet: 750, deltaVE: 0, deltaBudget: 0, icon: <Medal/>, category: 'CEREMONY', description: "Top 2 Classe" },
    { label: "🥉 Podium", defaultReason: "3ème place au classement général du S1.", deltaScore: +5, deltaWallet: 500, deltaVE: 0, deltaBudget: 0, icon: <Medal/>, category: 'CEREMONY', description: "Top 3 Classe" },
  ];

  const filteredPresets = PRESETS.filter(p => 
      (presetType === 'SANCTION' && p.category === 'STUDENT_SANCTION') ||
      (presetType === 'BONUS' && p.category === 'STUDENT_BONUS') ||
      (presetType === 'CEREMONY' && p.category === 'CEREMONY')
  );

  const selectPreset = (preset: StudentPreset) => {
      setForm({
          label: preset.label,
          reason: preset.defaultReason,
          deltaScore: preset.deltaScore || 0,
          deltaWallet: preset.deltaWallet || 0
      });
  };

  const handleApply = async () => {
      if(readOnly) return;
      if (!selectedStudentId) { toast('error', "Sélectionnez un étudiant."); return; }
      if(!form.label || !form.reason) { toast('error', "Motif obligatoire."); return; }

      const targetInfo = allStudents.find(s => s.student.id === selectedStudentId);
      if(!targetInfo) return;

      const confirmed = await confirm({
          title: "Confirmer l'Arbitrage RH",
          message: `Donner/Prendre à ${targetInfo.student.name}:\n${form.deltaScore > 0 ? '+' : ''}${form.deltaScore} pts de Score\n${form.deltaWallet > 0 ? '+' : ''}${form.deltaWallet} PiXi\n\nMotif: ${form.label}`,
          confirmText: "Appliquer les Changements",
          isDangerous: form.deltaScore < 0 || form.deltaWallet < 0
      });

      if(confirmed) {
          const agency = agencies.find(a => a.id === targetInfo.agencyId);
          if(!agency) return;

          const updatedMembers = agency.members.map(m => 
              m.id === selectedStudentId 
              ? { 
                  ...m, 
                  individualScore: Math.max(0, Math.min(100, m.individualScore + form.deltaScore)),
                  wallet: (m.wallet || 0) + form.deltaWallet
                } 
              : m
          );

          onUpdateAgency({
              ...agency,
              members: updatedMembers,
              eventLog: [...agency.eventLog, {
                  id: `rh-${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'INFO',
                  label: `Arbitrage RH: ${targetInfo.student.name}`,
                  description: `${form.label}: ${form.reason} (Score: ${form.deltaScore}, PiXi: ${form.deltaWallet})`
              }]
          });
          toast('success', "Arbitrage appliqué.");
          setForm({label: "", reason: "", deltaScore: 0, deltaWallet: 0});
      }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><User size={20}/> Étudiant Cible</h3>
                <select 
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    size={12}
                >
                    {allStudents.map(item => (
                        <option key={item.student.id} value={item.student.id} className="py-2 px-2 border-b border-slate-100 last:border-0 hover:bg-indigo-50 cursor-pointer">
                            {item.student.name} ({item.agencyName})
                        </option>
                    ))}
                </select>
            </div>
         </div>

         <div className="lg:col-span-8 space-y-6">
            <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
                <button onClick={() => setPresetType('SANCTION')} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase transition-all ${presetType === 'SANCTION' ? 'bg-white shadow text-red-600' : 'text-slate-400'}`}>Sanctions</button>
                <button onClick={() => setPresetType('BONUS')} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase transition-all ${presetType === 'BONUS' ? 'bg-white shadow text-emerald-600' : 'text-slate-400'}`}>Bonus</button>
                <button onClick={() => setPresetType('CEREMONY')} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase transition-all ${presetType === 'CEREMONY' ? 'bg-white shadow text-amber-600' : 'text-slate-400'}`}>Cérémonie S1</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPresets.map((preset, idx) => (
                    <div key={idx} onClick={() => selectPreset(preset)} className="p-4 rounded-xl border-2 border-white bg-white hover:border-indigo-300 cursor-pointer transition-all shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-slate-50 rounded-lg">{preset.icon}</div>
                            <h4 className="font-bold text-slate-900 text-sm">{preset.label}</h4>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${preset.deltaScore! > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>Score {preset.deltaScore! > 0 ? '+' : ''}{preset.deltaScore}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${preset.deltaWallet! > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>PiXi {preset.deltaWallet! > 0 ? '+' : ''}{preset.deltaWallet}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-6">
                <h4 className="font-bold text-indigo-300 text-sm uppercase tracking-widest flex items-center gap-2"><Gavel size={18}/> Console d'Arbitrage Libre</h4>
                
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1"><TrendingUp size={12}/> Ajustement Note / 100</label>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setForm({...form, deltaScore: form.deltaScore - 1})} className="p-2 bg-white/10 rounded-lg hover:bg-red-500"><Minus size={16}/></button>
                            <input type="number" value={form.deltaScore} onChange={e => setForm({...form, deltaScore: Number(e.target.value)})} className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-center text-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                            <button onClick={() => setForm({...form, deltaScore: form.deltaScore + 1})} className="p-2 bg-white/10 rounded-lg hover:bg-emerald-500"><Plus size={16}/></button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1"><Coins size={12}/> Don / Amende (PiXi)</label>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setForm({...form, deltaWallet: form.deltaWallet - 100})} className="p-2 bg-white/10 rounded-lg hover:bg-red-500"><Minus size={16}/></button>
                            <input type="number" value={form.deltaWallet} onChange={e => setForm({...form, deltaWallet: Number(e.target.value)})} className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-center text-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                            <button onClick={() => setForm({...form, deltaWallet: form.deltaWallet + 100})} className="p-2 bg-white/10 rounded-lg hover:bg-emerald-500"><Plus size={16}/></button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Libellé de l'action</label>
                        <input type="text" value={form.label} onChange={e => setForm({...form, label: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold" placeholder="Ex: Don Exceptionnel" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Détails (Optionnel)</label>
                        <input type="text" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm" placeholder="Justification pédagogique..." />
                    </div>
                </div>

                <button 
                    onClick={handleApply}
                    disabled={!selectedStudentId || readOnly}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-900/50 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    <Send size={20}/> Appliquer la Décision RH
                </button>
            </div>
         </div>
    </div>
  );
};
