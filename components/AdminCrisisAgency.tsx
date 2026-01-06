
import React, { useState } from 'react';
import { Agency, CrisisPreset, GameEvent } from '../types';
import { Flame, Target, Send, Trophy, Wallet, Percent, Banknote, Megaphone, AlertOctagon, Heart, Zap, Medal, Compass, Mic, Eye, Crown } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { getAgencyPerformanceMultiplier } from '../constants';

interface AdminCrisisAgencyProps {
  agencies: Agency[];
  onUpdateAgency: (agency: Agency) => void;
  readOnly?: boolean;
}

interface AgencyPreset extends CrisisPreset {
    category: 'AGENCY_CRISIS' | 'AGENCY_REWARD' | 'CEREMONY';
    isPercentage?: boolean; 
    defaultReason: string;
}

export const AdminCrisisAgency: React.FC<AdminCrisisAgencyProps> = ({ agencies, onUpdateAgency, readOnly }) => {
  const { confirm, toast } = useUI();
  
  const [agencyTarget, setAgencyTarget] = useState<'ALL' | 'CLASS_A' | 'CLASS_B' | string>('ALL');
  const [presetType, setPresetType] = useState<'CRISIS' | 'REWARD' | 'CEREMONY'>('CEREMONY');
  
  const [form, setForm] = useState({
      label: "",
      reason: "",
      deltaVE: 0,
      deltaBudget: 0,
      isPercentage: false
  });

  const activeAgencies = agencies.filter(a => a.id !== 'unassigned');

  // --- PRESETS CATALOG ---
  const PRESETS: AgencyPreset[] = [
    // CRISES
    { label: "Inflation Matériaux", defaultReason: "Hausse globale des coûts des matières premières (-10% Budget).", deltaVE: 0, deltaBudget: -10, isPercentage: true, icon: <Percent/>, category: 'AGENCY_CRISIS', description: "Impact financier pur" },
    { label: "Taxe Carbone", defaultReason: "Non-respect des normes écologiques.", deltaVE: -5, deltaBudget: -5, isPercentage: true, icon: <Banknote/>, category: 'AGENCY_CRISIS', description: "Sanction Eco" },
    { label: "Krach Réputation", defaultReason: "Perte de confiance du marché suite à une polémique.", deltaVE: -15, deltaBudget: 0, icon: <Flame/>, category: 'AGENCY_CRISIS', description: "Chute de VE" },
    { label: "Plagiat Avéré", defaultReason: "Copie substantielle détectée. Tolérance zéro.", deltaVE: -25, deltaBudget: -1000, isPercentage: false, icon: <AlertOctagon/>, category: 'AGENCY_CRISIS', description: "Sanction Lourde" },
    { label: "Bad Buzz", defaultReason: "Communication désastreuse sur les réseaux.", deltaVE: -8, deltaBudget: 0, icon: <Megaphone/>, category: 'AGENCY_CRISIS', description: "Impact Image" },
    
    // REWARDS (AGENCE S2)
    { label: "Rendu Photoréaliste", defaultReason: "Qualité technique exceptionnelle du rendu.", deltaVE: +8, deltaBudget: 500, isPercentage: false, icon: <Zap/>, category: 'AGENCY_REWARD', description: "Bonus Qualité" },
    { label: "Innovation Disruptive", defaultReason: "Solution créative jamais vue auparavant.", deltaVE: +10, deltaBudget: 1000, isPercentage: false, icon: <Trophy/>, category: 'AGENCY_REWARD', description: "Bonus Créa" },
    { label: "Business Angel", defaultReason: "Investissement externe suite au pitch.", deltaVE: +5, deltaBudget: 2500, isPercentage: false, icon: <Wallet/>, category: 'AGENCY_REWARD', description: "Cash Injection" },
    { label: "Viralité Positive", defaultReason: "Engouement massif sur les réseaux.", deltaVE: +12, deltaBudget: 0, isPercentage: false, icon: <Heart/>, category: 'AGENCY_REWARD', description: "Hype" },

    // CEREMONY (GRANDS PRIX CYCLES)
    { label: "🏆 Golden Brief (C1)", defaultReason: "Vainqueur du Cycle 1 : Stratégie & Cohérence.", deltaVE: +15, deltaBudget: 1000, isPercentage: false, icon: <Compass/>, category: 'CEREMONY', description: "Grand Prix Cycle 1" },
    { label: "🏆 Prix Narration (C2)", defaultReason: "Vainqueur du Cycle 2 : Storytelling & IA.", deltaVE: +20, deltaBudget: 1500, isPercentage: false, icon: <Mic/>, category: 'CEREMONY', description: "Grand Prix Cycle 2" },
    { label: "🏆 Prix Vision (C3)", defaultReason: "Vainqueur du Cycle 3 : Direction Artistique.", deltaVE: +25, deltaBudget: 2000, isPercentage: false, icon: <Eye/>, category: 'CEREMONY', description: "Grand Prix Cycle 3" },
    { label: "🏆 Prix Signature (C4)", defaultReason: "Vainqueur du Cycle 4 : Packaging Final.", deltaVE: +40, deltaBudget: 3000, isPercentage: false, icon: <Crown/>, category: 'CEREMONY', description: "Grand Prix Final" },
  ];

  const filteredPresets = PRESETS.filter(p => 
      (presetType === 'CRISIS' && p.category === 'AGENCY_CRISIS') ||
      (presetType === 'REWARD' && p.category === 'AGENCY_REWARD') ||
      (presetType === 'CEREMONY' && p.category === 'CEREMONY')
  );

  const selectPreset = (preset: AgencyPreset) => {
      setForm({
          label: preset.label,
          reason: preset.defaultReason,
          deltaVE: preset.deltaVE,
          deltaBudget: preset.deltaBudget,
          isPercentage: preset.isPercentage || false
      });
  };

  const handleApply = async () => {
      if(readOnly) return;
      if(!form.label || !form.reason) {
          toast('error', "Veuillez remplir le motif de l'action.");
          return;
      }

      const message = `Action: ${form.label}\nCible: ${agencyTarget}\nImpact: ${form.deltaVE} VE | ${form.deltaBudget} ${form.isPercentage ? '%' : 'PiXi'}`;
      
      if(await confirm({title: "Confirmer Action Agence", message, isDangerous: presetType === 'CRISIS'})) {
          agencies.forEach(agency => {
              if (agency.id === 'unassigned') return;
              const shouldApply = (agencyTarget === 'ALL') || 
                                (agencyTarget === 'CLASS_A' && agency.classId === 'A') || 
                                (agencyTarget === 'CLASS_B' && agency.classId === 'B') || 
                                (agencyTarget === agency.id);

              if (shouldApply) {
                  let budgetDeltaReal = 0;
                  if (form.isPercentage) {
                      budgetDeltaReal = Math.floor(agency.budget_real * (form.deltaBudget / 100));
                  } else {
                      budgetDeltaReal = form.deltaBudget;
                  }

                  // PERFORMANCE MULTIPLIER APPLICATION
                  // Only apply if the delta is positive (gains). Penalties remain fixed.
                  const multiplier = getAgencyPerformanceMultiplier(agency);
                  const finalVEDelta = form.deltaVE > 0 ? Math.round(form.deltaVE * multiplier) : form.deltaVE;
                  const perfPercent = Math.round(multiplier * 100);

                  const description = form.deltaVE > 0 
                    ? `${form.reason} (Gain VE ajusté perf. ${perfPercent}%)` 
                    : form.reason;

                  const newEvent: GameEvent = {
                      id: `evt-${Date.now()}-${agency.id}`,
                      date: new Date().toISOString().split('T')[0],
                      type: presetType === 'CRISIS' ? 'CRISIS' : 'VE_DELTA',
                      label: form.label,
                      description: description,
                      deltaVE: finalVEDelta,
                      deltaBudgetReal: budgetDeltaReal
                  };

                  onUpdateAgency({
                      ...agency,
                      budget_real: agency.budget_real + budgetDeltaReal,
                      ve_current: Math.max(0, agency.ve_current + finalVEDelta),
                      eventLog: [...agency.eventLog, newEvent]
                  });
              }
          });
          toast('success', "Action globale appliquée.");
          setForm(prev => ({...prev, deltaVE: 0, deltaBudget: 0}));
      }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT: PRESETS */}
        <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
                <button onClick={() => setPresetType('CRISIS')} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all ${presetType === 'CRISIS' ? 'bg-white shadow text-red-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Flame size={16}/> Crises
                </button>
                <button onClick={() => setPresetType('REWARD')} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all ${presetType === 'REWARD' ? 'bg-white shadow text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Trophy size={16}/> Bonus
                </button>
                <button onClick={() => setPresetType('CEREMONY')} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all ${presetType === 'CEREMONY' ? 'bg-white shadow text-amber-600' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Medal size={16}/> Prix
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                {filteredPresets.map((preset, idx) => (
                    <div 
                        key={idx}
                        onClick={() => selectPreset(preset)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] flex items-center justify-between ${
                            presetType === 'CRISIS' ? 'hover:border-red-300 hover:bg-red-50/50 border-slate-100 bg-white' : 
                            presetType === 'CEREMONY' ? 'hover:border-amber-300 hover:bg-amber-50/50 border-slate-100 bg-white' :
                            'hover:border-emerald-300 hover:bg-emerald-50/50 border-slate-100 bg-white'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${
                                presetType === 'CRISIS' ? 'bg-red-100 text-red-500' : 
                                presetType === 'CEREMONY' ? 'bg-amber-100 text-amber-500' :
                                'bg-emerald-100 text-emerald-500'
                            }`}>
                                {preset.icon}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-sm">{preset.label}</h4>
                                <p className="text-xs text-slate-500">{preset.description}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`font-bold text-sm ${preset.deltaVE < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {preset.deltaVE > 0 ? '+' : ''}{preset.deltaVE} VE
                            </div>
                            {preset.deltaBudget !== 0 && (
                                <div className="text-xs font-bold text-slate-400">
                                    {preset.deltaBudget > 0 ? '+' : ''}{preset.deltaBudget} {preset.isPercentage ? '%' : 'PiXi'}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* RIGHT: CONFIGURATION */}
        <div className="lg:col-span-7">
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 sticky top-6">
                <div className="mb-6 pb-6 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Configuration de l'Événement</h3>
                    
                    <div className="mb-4">
                        <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Cible Affectée</label>
                        <select 
                            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            value={agencyTarget}
                            onChange={(e) => setAgencyTarget(e.target.value)}
                        >
                            <option value="ALL">🌍 TOUTES LES AGENCES</option>
                            <option value="CLASS_A">🎓 CLASSE A UNIQUEMENT</option>
                            <option value="CLASS_B">🎓 CLASSE B UNIQUEMENT</option>
                            <option disabled>──────────</option>
                            {activeAgencies.map(a => <option key={a.id} value={a.id}>🏢 {a.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 gap-4 mb-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Titre (Public)</label>
                            <input 
                                type="text" 
                                value={form.label}
                                onChange={(e) => setForm({...form, label: e.target.value})}
                                className="w-full p-3 rounded-xl border border-slate-200 font-bold text-slate-900"
                                placeholder="Ex: Taxe Exceptionnelle"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Justification (Historique)</label>
                            <textarea 
                                value={form.reason}
                                onChange={(e) => setForm({...form, reason: e.target.value})}
                                className="w-full p-3 rounded-xl border border-slate-200 text-sm min-h-[80px]"
                                placeholder="Explication affichée aux étudiants..."
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <label className="text-[10px] font-bold uppercase text-slate-400 mb-2 flex items-center gap-2">
                            <Target size={14}/> Impact VE (Points)
                        </label>
                        <input 
                            type="number" 
                            value={form.deltaVE}
                            onChange={(e) => setForm({...form, deltaVE: Number(e.target.value)})}
                            className={`w-full bg-white p-2 rounded-lg text-xl font-bold text-center border ${form.deltaVE < 0 ? 'text-red-500 border-red-200' : 'text-emerald-500 border-emerald-200'}`}
                        />
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-2">
                                <Wallet size={14}/> Impact Budget
                            </label>
                            <button 
                                onClick={() => setForm({...form, isPercentage: !form.isPercentage})}
                                className="text-[10px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm hover:bg-indigo-50"
                            >
                                {form.isPercentage ? '% Pourcentage' : '# Fixe (PiXi)'}
                            </button>
                        </div>
                        <div className="relative">
                            <input 
                                type="number" 
                                value={form.deltaBudget}
                                onChange={(e) => setForm({...form, deltaBudget: Number(e.target.value)})}
                                className={`w-full bg-white p-2 rounded-lg text-xl font-bold text-center border ${form.deltaBudget < 0 ? 'text-red-500 border-red-200' : 'text-emerald-500 border-emerald-200'}`}
                            />
                            <span className="absolute right-3 top-3 text-slate-300 font-bold">{form.isPercentage ? '%' : 'PX'}</span>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleApply}
                    className={`w-full py-4 rounded-xl font-bold text-white shadow-xl shadow-slate-300/50 flex items-center justify-center gap-3 transition-transform active:scale-95 ${
                        presetType === 'CRISIS' ? 'bg-red-600 hover:bg-red-700' : 
                        presetType === 'CEREMONY' ? 'bg-amber-500 hover:bg-amber-600' :
                        'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                >
                    {presetType === 'CRISIS' ? <Flame size={20}/> : <Send size={20}/>}
                    {presetType === 'CRISIS' ? "DÉCLENCHER LA CRISE" : "ENVOYER LA RÉCOMPENSE"}
                </button>
            </div>
        </div>
    </div>
  );
};
