
import React, { useState, useMemo } from 'react';
import { Agency, CrisisPreset, GameEvent, CycleAwardDefinition, Student } from '../types';
import { Flame, Target, Send, AlertTriangle, Trophy, Star, Wallet, Gift, Crown, Info, User, UserMinus, UserPlus, Heart, Sparkles, Percent, Banknote, AlertOctagon, Megaphone, Wrench, Ban, HeartHandshake, Clock, XCircle, HelpingHand, Award } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { CYCLE_AWARDS } from '../constants';

interface AdminCrisisProps {
  agencies: Agency[];
  onUpdateAgency: (agency: Agency) => void;
}

interface ExtendedPreset extends CrisisPreset {
    category: 'CRISIS' | 'REWARD' | 'STUDENT_SANCTION' | 'STUDENT_BONUS';
    isPercentage?: boolean;
    targetType?: 'AGENCY' | 'STUDENT';
    deltaScore?: number; // Pour les étudiants
    deltaWallet?: number; // Pour les étudiants
}

export const AdminCrisis: React.FC<AdminCrisisProps> = ({ agencies, onUpdateAgency }) => {
  const { confirm, toast } = useUI();
  
  // --- STATE: AGENCY SIDE (LEFT) ---
  const [agencyTab, setAgencyTab] = useState<'CRISIS' | 'REWARD' | 'CEREMONY'>('CRISIS');
  const [agencyTarget, setAgencyTarget] = useState<'ALL' | 'CLASS_A' | 'CLASS_B' | string>('ALL');
  const [selectedAgencyPreset, setSelectedAgencyPreset] = useState<ExtendedPreset | null>(null);
  const [agencyAwardId, setAgencyAwardId] = useState<string>('');
  
  // --- STATE: STUDENT SIDE (RIGHT) ---
  const [studentTab, setStudentTab] = useState<'SANCTION' | 'BONUS' | 'CEREMONY'>('SANCTION');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedStudentPreset, setSelectedStudentPreset] = useState<ExtendedPreset | null>(null);
  // Manual Override
  const [studentManualScore, setStudentManualScore] = useState<number>(0);
  const [studentManualWallet, setStudentManualWallet] = useState<number>(0);

  const activeAgencies = agencies.filter(a => a.id !== 'unassigned');
  
  // Flatten students for selection
  const allStudents = useMemo(() => {
      const list: {student: Student, agencyName: string}[] = [];
      agencies.forEach(a => {
          a.members.forEach(m => list.push({student: m, agencyName: a.name}));
      });
      return list.sort((a,b) => a.student.name.localeCompare(b.student.name));
  }, [agencies]);

  // --- PRESETS CATALOG ---
  const PRESETS: ExtendedPreset[] = [
    // AGENCY CRISIS
    { label: "Inflation Matériaux", description: "Hausse globale coûts.", deltaVE: 0, deltaBudget: 0.10, isPercentage: true, icon: <Percent/>, category: 'CRISIS', targetType: 'AGENCY' },
    { label: "Taxe Carbone", description: "Sanction écologique.", deltaVE: -5, deltaBudget: 0.05, isPercentage: true, icon: <Banknote/>, category: 'CRISIS', targetType: 'AGENCY' },
    { label: "Krach Boursier", description: "Perte confiance.", deltaVE: -15, deltaBudget: 0, icon: <Flame/>, category: 'CRISIS', targetType: 'AGENCY' },
    { label: "Plagiat", description: "Copie détectée.", deltaVE: -20, deltaBudget: 0, icon: <AlertOctagon/>, category: 'CRISIS', targetType: 'AGENCY' },
    { label: "Bad Buzz", description: "Comms ratée.", deltaVE: -8, deltaBudget: 0, icon: <Megaphone/>, category: 'CRISIS', targetType: 'AGENCY' },
    
    // AGENCY REWARD
    { label: "Rendu Photoréaliste", description: "Qualité exceptionnelle.", deltaVE: +8, deltaBudget: 0, icon: <Star/>, category: 'REWARD', targetType: 'AGENCY' },
    { label: "Innovation", description: "Solution maligne.", deltaVE: +10, deltaBudget: 0, icon: <Trophy/>, category: 'REWARD', targetType: 'AGENCY' },
    { label: "Business Angel", description: "Investissement.", deltaVE: +5, deltaBudget: 1500, icon: <Wallet/>, category: 'REWARD', targetType: 'AGENCY' },
    { label: "Hype Réseaux", description: "Succès viral.", deltaVE: +12, deltaBudget: 0, icon: <Heart/>, category: 'REWARD', targetType: 'AGENCY' },

    // STUDENT SANCTIONS
    { label: "Retard Rendu", description: "Non respect deadline.", deltaScore: -2, deltaWallet: 0, deltaVE: 0, deltaBudget: 0, icon: <Clock/>, category: 'STUDENT_SANCTION', targetType: 'STUDENT' },
    { label: "Absence", description: "Absence injustifiée.", deltaScore: -5, deltaWallet: 0, deltaVE: 0, deltaBudget: 0, icon: <UserMinus/>, category: 'STUDENT_SANCTION', targetType: 'STUDENT' },
    { label: "Comportement", description: "Attitude toxique.", deltaScore: -10, deltaWallet: 0, deltaVE: 0, deltaBudget: 0, icon: <XCircle/>, category: 'STUDENT_SANCTION', targetType: 'STUDENT' },
    
    // STUDENT BONUS
    { label: "MVP Technique", description: "Geste technique clé.", deltaScore: +5, deltaWallet: 200, deltaVE: 0, deltaBudget: 0, icon: <Award/>, category: 'STUDENT_BONUS', targetType: 'STUDENT' },
    { label: "Entraide / Helper", description: "A aidé la classe.", deltaScore: +2, deltaWallet: 100, deltaVE: 0, deltaBudget: 0, icon: <HelpingHand/>, category: 'STUDENT_BONUS', targetType: 'STUDENT' },
    { label: "Initiative", description: "Proactivité.", deltaScore: +3, deltaWallet: 0, deltaVE: 0, deltaBudget: 0, icon: <Sparkles/>, category: 'STUDENT_BONUS', targetType: 'STUDENT' },
  ];

  const filteredAgencyPresets = useMemo(() => PRESETS.filter(p => p.category === agencyTab), [agencyTab]);
  const filteredStudentPresets = useMemo(() => PRESETS.filter(p => 
      (studentTab === 'SANCTION' && p.category === 'STUDENT_SANCTION') || 
      (studentTab === 'BONUS' && p.category === 'STUDENT_BONUS')
  ), [studentTab]);

  // --- ACTIONS: AGENCY ---
  const handleAgencyApply = async () => {
      if(agencyTab === 'CEREMONY') {
          if(!agencyAwardId || agencyTarget === 'ALL' || agencyTarget.startsWith('CLASS')) return;
          const award = CYCLE_AWARDS.find(a => a.id === agencyAwardId);
          const agency = agencies.find(a => a.id === agencyTarget);
          if(!award || !agency) return;

          if(await confirm({title: "Confirmer Grand Prix", message: `Décerner ${award.title} à ${agency.name} ?`, confirmText: "Valider"})) {
              onUpdateAgency({
                  ...agency,
                  ve_current: agency.ve_current + award.veBonus,
                  weeklyRevenueModifier: (agency.weeklyRevenueModifier || 0) + award.weeklyBonus,
                  eventLog: [...agency.eventLog, {id: `gp-${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'VE_DELTA', label: `🏆 ${award.title}`, deltaVE: award.veBonus, description: "Grand Prix remporté."}]
              });
              toast('success', "Prix décerné !");
          }
          return;
      }

      if (!selectedAgencyPreset) return;

      if(await confirm({title: "Appliquer Action Agence", message: `Action: ${selectedAgencyPreset.label}\nCible: ${agencyTarget}`, isDangerous: agencyTab === 'CRISIS'})) {
          agencies.forEach(agency => {
              if (agency.id === 'unassigned') return;
              let shouldApply = (agencyTarget === 'ALL') || 
                                (agencyTarget === 'CLASS_A' && agency.classId === 'A') || 
                                (agencyTarget === 'CLASS_B' && agency.classId === 'B') || 
                                (agencyTarget === agency.id);

              if (shouldApply) {
                  let newBudget = agency.budget_real;
                  let newWeeklyTax = agency.weeklyTax || 0;
                  if (selectedAgencyPreset.isPercentage) newWeeklyTax += selectedAgencyPreset.deltaBudget;
                  else newBudget += selectedAgencyPreset.deltaBudget;

                  const newEvent: GameEvent = {
                      id: `evt-${Date.now()}-${agency.id}`,
                      date: new Date().toISOString().split('T')[0],
                      type: agencyTab === 'CRISIS' ? 'CRISIS' : 'VE_DELTA',
                      label: selectedAgencyPreset.label,
                      description: selectedAgencyPreset.description,
                      deltaVE: selectedAgencyPreset.deltaVE,
                      deltaBudgetReal: selectedAgencyPreset.isPercentage ? 0 : selectedAgencyPreset.deltaBudget
                  };

                  onUpdateAgency({
                      ...agency,
                      budget_real: newBudget,
                      weeklyTax: newWeeklyTax,
                      ve_current: Math.max(0, agency.ve_current + selectedAgencyPreset.deltaVE),
                      eventLog: [...agency.eventLog, newEvent]
                  });
              }
          });
          toast('success', "Action effectuée.");
          setSelectedAgencyPreset(null);
      }
  };

  // --- ACTIONS: STUDENT ---
  const handleStudentApply = async () => {
      if (!selectedStudentId) return;
      let foundAgency: Agency | undefined;
      let foundStudent: Student | undefined;
      agencies.forEach(a => {
          const s = a.members.find(m => m.id === selectedStudentId);
          if (s) { foundAgency = a; foundStudent = s; }
      });
      if (!foundAgency || !foundStudent) return;

      const isSanction = studentTab === 'SANCTION';
      const isCeremony = studentTab === 'CEREMONY';
      
      let scoreChange = 0;
      let walletChange = 0;
      let label = "";
      let desc = "";

      if (isCeremony) {
          label = `🎉 HÉROS : ${foundStudent.name}`;
          desc = "Célébration publique d'excellence.";
          // Ceremonies might imply a manual bonus or just fame, let's say 0 unless typed manually
          scoreChange = studentManualScore;
          walletChange = studentManualWallet;
      } else if (selectedStudentPreset) {
          label = selectedStudentPreset.label;
          desc = selectedStudentPreset.description;
          scoreChange = selectedStudentPreset.deltaScore || 0;
          walletChange = selectedStudentPreset.deltaWallet || 0;
      } else {
          // Manual
          label = isSanction ? "Sanction Admin" : "Bonus Admin";
          scoreChange = isSanction ? -Math.abs(studentManualScore) : Math.abs(studentManualScore);
          walletChange = isSanction ? -Math.abs(studentManualWallet) : Math.abs(studentManualWallet);
          desc = "Ajustement manuel.";
      }

      if(await confirm({
          title: "Confirmation Action Étudiant",
          message: `Étudiant: ${foundStudent.name}\nAction: ${label}\nScore: ${scoreChange > 0 ? '+' : ''}${scoreChange}\nWallet: ${walletChange > 0 ? '+' : ''}${walletChange}`,
          isDangerous: isSanction
      })) {
          const updatedMembers = foundAgency.members.map(m => 
              m.id === foundStudent!.id 
              ? { ...m, individualScore: Math.max(0, Math.min(100, m.individualScore + scoreChange)), wallet: (m.wallet || 0) + walletChange } 
              : m
          );

          const newEvent: GameEvent = {
              id: `ind-${Date.now()}`,
              date: new Date().toISOString().split('T')[0],
              type: isSanction ? 'CRISIS' : 'INFO',
              label: `RH: ${foundStudent.name} (${label})`,
              description: desc
          };

          onUpdateAgency({ ...foundAgency, members: updatedMembers, eventLog: [...foundAgency.eventLog, newEvent] });
          toast('success', "Mise à jour étudiante effectuée.");
          
          // Reset
          setSelectedStudentPreset(null);
          setStudentManualScore(0);
          setStudentManualWallet(0);
      }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
         <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-slate-200 rounded-xl text-slate-700"><Target size={32}/></div>
                Zone d'Intervention
            </h2>
            <p className="text-slate-500 text-sm mt-1">
                Gérez les crises globales (Agences) et les cas particuliers (Étudiants) depuis cette console unifiée.
            </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* ================= LEFT COLUMN: AGENCIES ================= */}
            <div className="flex flex-col gap-6">
                
                {/* 1. SLIDER / TABS (AGENCY) */}
                <div className="bg-white p-1 rounded-2xl border border-slate-200 flex shadow-sm">
                    <button onClick={() => setAgencyTab('CRISIS')} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${agencyTab === 'CRISIS' ? 'bg-red-50 text-red-600 shadow-sm border border-red-100' : 'text-slate-400 hover:bg-slate-50'}`}>
                        <Flame size={18}/> Sanctions
                    </button>
                    <button onClick={() => setAgencyTab('REWARD')} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${agencyTab === 'REWARD' ? 'bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100' : 'text-slate-400 hover:bg-slate-50'}`}>
                        <Gift size={18}/> Bonus
                    </button>
                    <button onClick={() => setAgencyTab('CEREMONY')} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${agencyTab === 'CEREMONY' ? 'bg-yellow-50 text-yellow-600 shadow-sm border border-yellow-100' : 'text-slate-400 hover:bg-slate-50'}`}>
                        <Crown size={18}/> Cérémonie
                    </button>
                </div>

                {/* 2. CONTENT (AGENCY) */}
                <div className={`flex-1 bg-white p-6 rounded-3xl border shadow-sm flex flex-col gap-6 ${agencyTab === 'CRISIS' ? 'border-red-100' : agencyTab === 'CEREMONY' ? 'border-yellow-100' : 'border-emerald-100'}`}>
                    
                    {/* TARGET SELECTOR */}
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Cible (Agence ou Groupe)</label>
                        <select 
                            className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold text-sm outline-none focus:border-indigo-500 transition-colors"
                            value={agencyTarget}
                            onChange={(e) => setAgencyTarget(e.target.value)}
                        >
                            <option value="ALL">Tout le Monde</option>
                            <option value="CLASS_A">Classe A</option>
                            <option value="CLASS_B">Classe B</option>
                            {activeAgencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>

                    {/* DYNAMIC CONTENT BASED ON TAB */}
                    {agencyTab === 'CEREMONY' ? (
                        <div className="space-y-4">
                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-xs text-yellow-800">
                                <strong>Grand Prix :</strong> Bonus permanent de revenus et boost massif de VE.
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {CYCLE_AWARDS.map(award => (
                                    <div 
                                        key={award.id}
                                        onClick={() => setAgencyAwardId(award.id)}
                                        className={`p-3 rounded-xl border-2 cursor-pointer flex items-center gap-3 ${agencyAwardId === award.id ? 'border-yellow-400 bg-yellow-50' : 'border-slate-100 hover:border-yellow-200'}`}
                                    >
                                        <Trophy size={16} className={agencyAwardId === award.id ? 'text-yellow-600' : 'text-slate-300'}/>
                                        <div>
                                            <div className="font-bold text-sm text-slate-800">{award.title}</div>
                                            <div className="text-[10px] text-slate-500">+{award.veBonus} VE | +{award.weeklyBonus} PiXi/sem</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                            {filteredAgencyPresets.map((preset, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => setSelectedAgencyPreset(preset)}
                                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-1 ${
                                        selectedAgencyPreset === preset 
                                        ? (agencyTab === 'CRISIS' ? 'border-red-500 bg-red-50' : 'border-emerald-500 bg-emerald-50')
                                        : 'border-slate-100 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-xs text-slate-800">{preset.label}</span>
                                        {preset.icon}
                                    </div>
                                    <div className="text-[10px] font-bold mt-auto">
                                        {preset.deltaVE !== 0 && <span className={preset.deltaVE > 0 ? 'text-emerald-600' : 'text-red-600'}>{preset.deltaVE > 0 ? '+' : ''}{preset.deltaVE} VE </span>}
                                        {preset.deltaBudget !== 0 && <span className="text-slate-500">| {preset.isPercentage ? '%' : 'PiXi'}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* AGENCY VALIDATION */}
                    <div className="mt-auto pt-6 border-t border-slate-100">
                        <button 
                            onClick={handleAgencyApply}
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 ${
                                agencyTab === 'CRISIS' ? 'bg-red-600 hover:bg-red-700' : 
                                agencyTab === 'CEREMONY' ? 'bg-yellow-500 hover:bg-yellow-600 text-black' :
                                'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                        >
                            <Send size={18}/>
                            {agencyTab === 'CEREMONY' ? 'DÉCERNER LE PRIX' : agencyTab === 'CRISIS' ? 'DÉCLENCHER' : 'ENVOYER'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ================= RIGHT COLUMN: STUDENTS (MIRRORED UI) ================= */}
            <div className="flex flex-col gap-6">
                
                {/* 1. SLIDER / TABS (STUDENT) */}
                <div className="bg-white p-1 rounded-2xl border border-slate-200 flex shadow-sm">
                    <button onClick={() => { setStudentTab('SANCTION'); setSelectedStudentPreset(null); }} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${studentTab === 'SANCTION' ? 'bg-red-50 text-red-600 shadow-sm border border-red-100' : 'text-slate-400 hover:bg-slate-50'}`}>
                        <UserMinus size={18}/> Sanctions
                    </button>
                    <button onClick={() => { setStudentTab('BONUS'); setSelectedStudentPreset(null); }} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${studentTab === 'BONUS' ? 'bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100' : 'text-slate-400 hover:bg-slate-50'}`}>
                        <UserPlus size={18}/> Bonus
                    </button>
                    <button onClick={() => { setStudentTab('CEREMONY'); setSelectedStudentPreset(null); }} className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${studentTab === 'CEREMONY' ? 'bg-purple-50 text-purple-600 shadow-sm border border-purple-100' : 'text-slate-400 hover:bg-slate-50'}`}>
                        <Crown size={18}/> Cérémonie
                    </button>
                </div>

                {/* 2. CONTENT (STUDENT) */}
                <div className={`flex-1 bg-white p-6 rounded-3xl border shadow-sm flex flex-col gap-6 ${studentTab === 'SANCTION' ? 'border-red-100' : studentTab === 'CEREMONY' ? 'border-purple-100' : 'border-emerald-100'}`}>
                    
                    {/* STUDENT SELECTOR */}
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 block">Étudiant Cible</label>
                        <select 
                            className="w-full p-3 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold text-sm outline-none focus:border-indigo-500 transition-colors"
                            value={selectedStudentId}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                        >
                            <option value="">-- Sélectionner --</option>
                            {allStudents.map(item => (
                                <option key={item.student.id} value={item.student.id}>{item.student.name} ({item.agencyName})</option>
                            ))}
                        </select>
                    </div>

                    {/* CONTENT: PRESETS OR MANUAL */}
                    {studentTab === 'CEREMONY' ? (
                        <div className="bg-purple-50 p-6 rounded-2xl border border-purple-200 text-center flex flex-col items-center justify-center h-full">
                            <Sparkles size={48} className="text-purple-400 mb-4"/>
                            <h4 className="font-bold text-purple-900 text-lg">Héros du Jour</h4>
                            <p className="text-sm text-purple-700 mt-2">
                                Met en avant l'étudiant dans le flux d'actualité comme "Héros". 
                                <br/>Optionnel : Ajouter un bonus manuel ci-dessous.
                            </p>
                            <div className="grid grid-cols-2 gap-3 mt-4 w-full">
                                <input type="number" placeholder="Bonus Score" value={studentManualScore || ''} onChange={e => setStudentManualScore(Number(e.target.value))} className="p-2 rounded border border-purple-300 text-center"/>
                                <input type="number" placeholder="Bonus PiXi" value={studentManualWallet || ''} onChange={e => setStudentManualWallet(Number(e.target.value))} className="p-2 rounded border-purple-300 text-center"/>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* STUDENT PRESETS GRID */}
                            <div className="grid grid-cols-2 gap-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                                {filteredStudentPresets.map((preset, idx) => (
                                    <div 
                                        key={idx}
                                        onClick={() => { setSelectedStudentPreset(preset); setStudentManualScore(0); setStudentManualWallet(0); }}
                                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-1 ${
                                            selectedStudentPreset === preset 
                                            ? (studentTab === 'SANCTION' ? 'border-red-500 bg-red-50' : 'border-emerald-500 bg-emerald-50')
                                            : 'border-slate-100 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-xs text-slate-800">{preset.label}</span>
                                            {preset.icon}
                                        </div>
                                        <div className="text-[10px] font-bold mt-auto text-slate-500">
                                            {preset.deltaScore !== 0 && <span>{preset.deltaScore > 0 ? '+' : ''}{preset.deltaScore} Pts </span>}
                                            {preset.deltaWallet !== 0 && <span>| {preset.deltaWallet} $</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* MANUAL OVERRIDE (Only if no preset selected, or to clarify) */}
                            {!selectedStudentPreset && (
                                <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                    <p className="text-[10px] font-bold uppercase text-slate-400 mb-2 text-center">Ou saisie manuelle</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[9px] font-bold text-slate-500 uppercase">Score</label>
                                            <input 
                                                type="number" 
                                                value={studentManualScore}
                                                onChange={e => setStudentManualScore(Number(e.target.value))}
                                                className="w-full p-2 rounded-lg border border-slate-200 font-bold text-center"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-slate-500 uppercase">Wallet</label>
                                            <input 
                                                type="number" 
                                                value={studentManualWallet}
                                                onChange={e => setStudentManualWallet(Number(e.target.value))}
                                                className="w-full p-2 rounded-lg border border-slate-200 font-bold text-center"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* STUDENT VALIDATION */}
                    <div className="mt-auto pt-6 border-t border-slate-100">
                        <button 
                            onClick={handleStudentApply}
                            disabled={!selectedStudentId}
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                                studentTab === 'SANCTION' ? 'bg-red-600 hover:bg-red-700' : 
                                studentTab === 'CEREMONY' ? 'bg-purple-600 hover:bg-purple-700' :
                                'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                        >
                            {studentTab === 'CEREMONY' ? <Sparkles size={18}/> : <User size={18}/>}
                            {studentTab === 'CEREMONY' ? 'CÉLÉBRER LE HÉROS' : 'APPLIQUER LA DÉCISION'}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    </div>
  );
};

const TargetButton: React.FC<any> = ({label, sub, active, onClick}) => (
    <button onClick={onClick} className={`p-3 rounded-xl border-2 text-left transition-all ${active ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:bg-white'}`}>
        <span className={`block font-bold text-sm ${active ? 'text-indigo-900' : 'text-slate-700'}`}>{label}</span>
        <span className="text-[10px] text-slate-400 font-bold uppercase">{sub}</span>
    </button>
);
