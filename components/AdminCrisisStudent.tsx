
import React, { useState, useMemo } from 'react';
import { Agency, CrisisPreset, GameEvent, Student } from '../types';
import { Crown, User, UserMinus, Sparkles, Gavel, Briefcase, FileWarning, ShieldAlert, BadgeCheck, Heart, Medal, Star, TrendingUp, TrendingDown, Coins } from 'lucide-react';
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

  // --- PRESETS CATALOG ---
  const PRESETS: StudentPreset[] = [
    // SANCTIONS
    { label: "Raté de Sprint", defaultReason: "Deadline manquée. Impacte la vélocité de l'équipe.", deltaScore: -2, deltaWallet: -50, deltaVE: 0, deltaBudget: 0, icon: <FileWarning/>, category: 'STUDENT_SANCTION', description: "Retard" },
    { label: "Ghosting / Abandon", defaultReason: "Absence injustifiée à un point de synchronisation.", deltaScore: -5, deltaWallet: -200, deltaVE: 0, deltaBudget: 0, icon: <UserMinus/>, category: 'STUDENT_SANCTION', description: "Absence" },
    { label: "Faute Grave (Toxicité)", defaultReason: "Comportement nuisible à la cohésion du groupe.", deltaScore: -15, deltaWallet: -500, deltaVE: 0, deltaBudget: 0, icon: <ShieldAlert/>, category: 'STUDENT_SANCTION', description: "Comportement" },
    { label: "Négligence Technique", defaultReason: "Fichiers corrompus ou non conformes aux normes.", deltaScore: -3, deltaWallet: -100, deltaVE: 0, deltaBudget: 0, icon: <Briefcase/>, category: 'STUDENT_SANCTION', description: "Qualité" },
    
    // BONUS
    { label: "MVP Technique", defaultReason: "A débloqué une situation technique complexe pour l'équipe.", deltaScore: +5, deltaWallet: 300, deltaVE: 0, deltaBudget: 0, icon: <BadgeCheck/>, category: 'STUDENT_BONUS', description: "Skill" },
    { label: "Esprit de Corps", defaultReason: "A aidé d'autres agences ou soutenu ses collègues.", deltaScore: +3, deltaWallet: 150, deltaVE: 0, deltaBudget: 0, icon: <Heart/>, category: 'STUDENT_BONUS', description: "Soft Skill" },
    { label: "Crunch Hero", defaultReason: "Effort exceptionnel de dernière minute pour sauver le rendu.", deltaScore: +4, deltaWallet: 200, deltaVE: 0, deltaBudget: 0, icon: <Sparkles/>, category: 'STUDENT_BONUS', description: "Effort" },

    // CÉRÉMONIE (LAUREATS S1)
    { label: "🥇 Major de Promo (Or)", defaultReason: "1ère place au classement général du S1.", deltaScore: +15, deltaWallet: 1000, deltaVE: 0, deltaBudget: 0, icon: <Medal/>, category: 'CEREMONY', description: "Top 1 Classe" },
    { label: "🥈 Dauphin (Argent)", defaultReason: "2ème place au classement général du S1.", deltaScore: +10, deltaWallet: 750, deltaVE: 0, deltaBudget: 0, icon: <Medal/>, category: 'CEREMONY', description: "Top 2 Classe" },
    { label: "🥉 Podium (Bronze)", defaultReason: "3ème place au classement général du S1.", deltaScore: +5, deltaWallet: 500, deltaVE: 0, deltaBudget: 0, icon: <Medal/>, category: 'CEREMONY', description: "Top 3 Classe" },
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
      if (!selectedStudentId) {
          toast('error', "Sélectionnez un étudiant.");
          return;
      }
      if(!form.label || !form.reason) {
          toast('error', "Motif obligatoire.");
          return;
      }

      const targetInfo = allStudents.find(s => s.student.id === selectedStudentId);
      if(!targetInfo) return;

      const message = `Étudiant: ${targetInfo.student.name}\nAction: ${form.label}\nScore: ${form.deltaScore > 0 ? '+' : ''}${form.deltaScore} pts\nWallet: ${form.deltaWallet > 0 ? '+' : ''}${form.deltaWallet} PiXi`;

      if(await confirm({title: "Confirmer Action RH", message, isDangerous: presetType === 'SANCTION'})) {
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

          const newEvent: GameEvent = {
              id: `rh-${Date.now()}`,
              date: new Date().toISOString().split('T')[0],
              type: 'INFO',
              label: `RH: ${targetInfo.student.name} (${form.label})`,
              description: `${form.reason} (Score ${form.deltaScore > 0 ? '+' : ''}${form.deltaScore}, Wallet ${form.deltaWallet > 0 ? '+' : ''}${form.deltaWallet})`
          };

          onUpdateAgency({
              ...agency,
              members: updatedMembers,
              eventLog: [...agency.eventLog, newEvent]
          });
          toast('success', "Dossier étudiant mis à jour.");
          setForm({label: "", reason: "", deltaScore: 0, deltaWallet: 0});
      }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* LEFT: DIRECTORY & SELECTION */}
         <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><User size={20}/> Sélectionner l'Étudiant</h3>
                <select 
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    size={10}
                >
                    {allStudents.map(item => (
                        <option key={item.student.id} value={item.student.id} className="py-2 px-2 border-b border-slate-100 last:border-0 hover:bg-indigo-50 cursor-pointer">
                            {item.student.name} ({item.agencyName})
                        </option>
                    ))}
                </select>
            </div>
         </div>

         {/* CENTER: ACTIONS */}
         <div className="lg:col-span-8 space-y-6">
            <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
                <button onClick={() => setPresetType('SANCTION')} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all ${presetType === 'SANCTION' ? 'bg-white shadow text-red-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Gavel size={16}/> Sanctions
                </button>
                <button onClick={() => setPresetType('BONUS')} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all ${presetType === 'BONUS' ? 'bg-white shadow text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Crown size={16}/> Bonus
                </button>
                <button onClick={() => setPresetType('CEREMONY')} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all ${presetType === 'CEREMONY' ? 'bg-white shadow text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Star size={16}/> Cérémonie S1
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPresets.map((preset, idx) => (
                    <div 
                        key={idx}
                        onClick={() => selectPreset(preset)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between min-h-[140px] ${
                            presetType === 'SANCTION' ? 'hover:border-red-300 hover:bg-red-50/50 border-slate-100 bg-white' : 
                            presetType === 'CEREMONY' ? 'hover:border-amber-300 hover:bg-amber-50/50 border-slate-100 bg-white' :
                            'hover:border-emerald-300 hover:bg-emerald-50/50 border-slate-100 bg-white'
                        }`}
                    >
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 rounded-lg shrink-0 ${
                                    presetType === 'SANCTION' ? 'bg-red-100 text-red-500' : 
                                    presetType === 'CEREMONY' ? 'bg-amber-100 text-amber-500' :
                                    'bg-emerald-100 text-emerald-500'
                                }`}>
                                    {preset.icon}
                                </div>
                                <h4 className="font-bold text-slate-900 text-sm leading-tight">{preset.label}</h4>
                            </div>
                            <div className="text-xs text-slate-500 line-clamp-2 italic mb-3">
                                "{preset.defaultReason}"
                            </div>
                        </div>

                        {/* EXPLICIT IMPACT BADGES */}
                        <div className="flex gap-2 mt-auto border-t border-slate-100 pt-2">
                            {(preset.deltaScore !== 0) && (
                                <div className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${preset.deltaScore! > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    {preset.deltaScore! > 0 ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
                                    Note: {preset.deltaScore! > 0 ? '+' : ''}{preset.deltaScore}
                                </div>
                            )}
                            {(preset.deltaWallet !== 0) && (
                                <div className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${preset.deltaWallet! > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                    <Coins size={10}/>
                                    Cash: {preset.deltaWallet! > 0 ? '+' : ''}{preset.deltaWallet}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* MANUAL OVERRIDE PANEL */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-700 text-sm uppercase mb-4">Ajustement Manuel & Validation</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Impact Note Individuelle (/100)</label>
                        <input 
                            type="number" 
                            value={form.deltaScore}
                            onChange={e => setForm({...form, deltaScore: Number(e.target.value)})}
                            className={`w-full p-2 rounded-lg border font-bold text-center ${form.deltaScore < 0 ? 'text-red-500 border-red-300' : 'text-emerald-500 border-emerald-300'}`}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Impact Portefeuille (PiXi)</label>
                        <input 
                            type="number" 
                            value={form.deltaWallet}
                            onChange={e => setForm({...form, deltaWallet: Number(e.target.value)})}
                            className={`w-full p-2 rounded-lg border font-bold text-center ${form.deltaWallet < 0 ? 'text-red-500 border-red-300' : 'text-emerald-500 border-emerald-300'}`}
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Justification (Apparaîtra dans l'historique élève)</label>
                    <input 
                        type="text" 
                        value={form.reason}
                        onChange={e => setForm({...form, reason: e.target.value})}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-white"
                        placeholder="Motif officiel..."
                    />
                </div>

                <button 
                    onClick={handleApply}
                    disabled={!selectedStudentId}
                    className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                        presetType === 'SANCTION' ? 'bg-red-600 hover:bg-red-700' : 
                        presetType === 'CEREMONY' ? 'bg-amber-500 hover:bg-amber-600' :
                        'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                >
                    {presetType === 'SANCTION' ? "APPLIQUER LA SANCTION" : "VALIDER"}
                </button>
            </div>
         </div>
    </div>
  );
};
