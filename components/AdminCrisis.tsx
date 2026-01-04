
import React, { useState, useMemo } from 'react';
import { Agency, CrisisPreset, GameEvent } from '../types';
import { Flame, TrendingDown, Ban, Wallet, Target, Send, ShieldAlert, AlertTriangle, AlertOctagon, Banknote, Megaphone, Wrench, HardDrive, Gift, Trophy, Star, HeartHandshake, Percent } from 'lucide-react';
import { useUI } from '../contexts/UIContext';

interface AdminCrisisProps {
  agencies: Agency[];
  onUpdateAgency: (agency: Agency) => void;
}

// Extension de l'interface locale pour gérer les pourcentages
interface ExtendedPreset extends CrisisPreset {
    category: 'CRISIS' | 'REWARD';
    isPercentage?: boolean; // Si true, deltaBudget est un multiplicateur (ex: 0.10 pour 10%)
}

export const AdminCrisis: React.FC<AdminCrisisProps> = ({ agencies, onUpdateAgency }) => {
  const { confirm, toast } = useUI();
  const [selectedTarget, setSelectedTarget] = useState<'ALL' | 'CLASS_A' | 'CLASS_B' | string>('ALL');
  const [selectedPreset, setSelectedPreset] = useState<ExtendedPreset | null>(null);
  const [activeTab, setActiveTab] = useState<'CRISIS' | 'REWARD'>('CRISIS');
  
  // Custom Form
  const [customTitle, setCustomTitle] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customImpactVE, setCustomImpactVE] = useState(0);
  const [customImpactBudget, setCustomImpactBudget] = useState(0);

  const activeAgencies = agencies.filter(a => a.id !== 'unassigned');

  // --- CATALOGUE DES ÉVÉNEMENTS ---
  const PRESETS: ExtendedPreset[] = [
    // === CRISES & SANCTIONS ===
    { 
        label: "Inflation Matériaux Hebdo", 
        description: "Hausse globale des coûts. Impact proportionnel à la trésorerie.", 
        deltaVE: 0, deltaBudget: 0.10, // 10%
        isPercentage: true,
        icon: <Percent/>, category: 'CRISIS' 
    },
    { 
        label: "Taxe 'Pollueur-Payeur'", 
        description: "Sanction écologique pour les agences à forte consommation.", 
        deltaVE: -5, deltaBudget: 0.05, // 5%
        isPercentage: true,
        icon: <Banknote/>, category: 'CRISIS' 
    },
    { 
        label: "Krach Boursier RNP", 
        description: "Perte de confiance des investisseurs. La VE s'effondre.", 
        deltaVE: -15, deltaBudget: 0, 
        icon: <Flame/>, category: 'CRISIS' 
    },
    { 
        label: "Plagiat / Manque d'Originalité", 
        description: "Une ressemblance frappante est détectée avec un projet existant.", 
        deltaVE: -20, deltaBudget: 0, 
        icon: <AlertOctagon/>, category: 'CRISIS' 
    },
    { 
        label: "Bad Buzz Réseaux", 
        description: "Une communication maladroite devient virale.", 
        deltaVE: -8, deltaBudget: 0, 
        icon: <Megaphone/>, category: 'CRISIS' 
    },
    { 
        label: "Crash Serveur / Perte Data", 
        description: "Perte de données. Frais de récupération technique.", 
        deltaVE: -2, deltaBudget: -500, 
        icon: <HardDrive/>, category: 'CRISIS' 
    },
    { 
        label: "Amende Retard", 
        description: "Pénalités de retard sur le paiement des fournisseurs.", 
        deltaVE: -1, deltaBudget: -250, 
        icon: <Banknote/>, category: 'CRISIS' 
    },

    // === RÉCOMPENSES & BONUS ===
    { 
        label: "Business Angel", 
        description: "Un investisseur croit en votre projet. Injection de capital.", 
        deltaVE: +5, deltaBudget: 1500, 
        icon: <Wallet/>, category: 'REWARD' 
    },
    { 
        label: "Buzz Positif / Viralité", 
        description: "Votre dernier post a explosé les compteurs. La hype monte !", 
        deltaVE: +12, deltaBudget: 0, 
        icon: <Star/>, category: 'REWARD' 
    },
    { 
        label: "Partenariat Marque", 
        description: "Une marque fournit du matériel gratuitement (Budget Valorisé).", 
        deltaVE: +3, deltaBudget: 800, 
        icon: <HeartHandshake/>, category: 'REWARD' 
    },
    { 
        label: "Prix de l'Innovation", 
        description: "Récompense pour une solution technique audacieuse.", 
        deltaVE: +10, deltaBudget: 500, 
        icon: <Trophy/>, category: 'REWARD' 
    },
    { 
        label: "Solidarité Inter-Agence", 
        description: "Bonus pour avoir aidé une autre équipe en difficulté.", 
        deltaVE: +5, deltaBudget: 0, 
        icon: <Gift/>, category: 'REWARD' 
    },
    { 
        label: "Subvention Exceptionnelle", 
        description: "Aide du ministère pour la culture.", 
        deltaVE: +2, deltaBudget: 1000, 
        icon: <Banknote/>, category: 'REWARD' 
    },
  ];

  const filteredPresets = useMemo(() => {
      return PRESETS.filter(p => p.category === activeTab);
  }, [activeTab]);

  const handleApply = async () => {
      // Determine Payload
      const title = selectedPreset ? selectedPreset.label : customTitle;
      const desc = selectedPreset ? selectedPreset.description : customDesc;
      let dVE = selectedPreset ? selectedPreset.deltaVE : customImpactVE;
      
      // Note: dBudget sera calculé par agence si c'est un pourcentage
      const baseBudgetVal = selectedPreset ? selectedPreset.deltaBudget : customImpactBudget;
      const isPercentage = selectedPreset?.isPercentage || false;

      if (!title) {
          toast('warning', "Veuillez sélectionner un événement ou entrer un titre.");
          return;
      }

      // Prepare UI Message
      let impactMsg = `Impact VE: ${dVE > 0 ? '+' : ''}${dVE}`;
      if (isPercentage) {
          impactMsg += `\nImpact Budget: -${baseBudgetVal * 100}% (Calculé sur Trésorerie)`;
      } else {
          impactMsg += `\nImpact Budget: ${baseBudgetVal > 0 ? '+' : ''}${baseBudgetVal} PiXi`;
      }

      const confirmed = await confirm({
          title: activeTab === 'CRISIS' ? "Déclencher une Crise" : "Accorder une Récompense",
          message: `APPLIQUER : ${title}\nCIBLE : ${selectedTarget === 'ALL' ? 'Tout le monde' : selectedTarget === 'CLASS_A' ? 'Classe A' : selectedTarget === 'CLASS_B' ? 'Classe B' : 'Une Agence'}\n\n${impactMsg}`,
          confirmText: activeTab === 'CRISIS' ? "Déclencher" : "Envoyer",
          isDangerous: activeTab === 'CRISIS'
      });
      
      if(!confirmed) return;

      // Apply
      agencies.forEach(agency => {
          if (agency.id === 'unassigned') return;

          let shouldApply = false;
          if (selectedTarget === 'ALL') shouldApply = true;
          else if (selectedTarget === 'CLASS_A' && agency.classId === 'A') shouldApply = true;
          else if (selectedTarget === 'CLASS_B' && agency.classId === 'B') shouldApply = true;
          else if (selectedTarget === agency.id) shouldApply = true;

          if (shouldApply) {
              // Calculate Dynamic Budget Impact
              let appliedBudgetDelta = baseBudgetVal;
              let logDesc = desc;

              if (isPercentage) {
                  // Percentage logic (Inflation is usually negative impact)
                  // If baseBudgetVal is 0.10 (10%), we remove 10% of current budget
                  // Ensure we calculate mostly on positive budget to avoid punishing debt too hard (optional rule)
                  const baseForCalc = Math.max(0, agency.budget_real); 
                  appliedBudgetDelta = -Math.floor(baseForCalc * baseBudgetVal);
                  logDesc = `${desc} (${baseBudgetVal * 100}% de ${baseForCalc} PiXi)`;
              }

              const newEvent: GameEvent = {
                  id: `evt-${Date.now()}-${agency.id}`,
                  date: new Date().toISOString().split('T')[0],
                  type: activeTab === 'CRISIS' ? 'CRISIS' : 'VE_DELTA', // Use VE_DELTA for rewards usually
                  label: title,
                  description: logDesc,
                  deltaVE: dVE,
                  deltaBudgetReal: appliedBudgetDelta
              };

              const newBudget = agency.budget_real + appliedBudgetDelta;
              const newVE = Math.max(0, agency.ve_current + dVE); 

              onUpdateAgency({
                  ...agency,
                  budget_real: newBudget,
                  ve_current: newVE,
                  eventLog: [...agency.eventLog, newEvent]
              });
          }
      });
      
      toast('success', activeTab === 'CRISIS' ? "Crise déclenchée." : "Récompense envoyée.");
      setSelectedPreset(null);
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
         <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                <div className={`p-2 rounded-xl ${activeTab === 'CRISIS' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {activeTab === 'CRISIS' ? <Flame size={32}/> : <Gift size={32}/>}
                </div>
                Zone d'Intervention
            </h2>
            <p className="text-slate-500 text-sm mt-1">
                {activeTab === 'CRISIS' 
                    ? "Déclenchez des crises pour tester la résilience ou sanctionner." 
                    : "Distribuez des bonus pour valoriser l'excellence et l'initiative."}
            </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* LEFT: CONFIGURATION */}
            <div className="xl:col-span-2 space-y-8">
                
                {/* 1. SELECT TARGET */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Target size={20} className="text-indigo-500"/> 1. Choisissez la Cible
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <TargetButton 
                            label="Tout le Monde" 
                            sub="Global"
                            active={selectedTarget === 'ALL'} 
                            onClick={() => setSelectedTarget('ALL')} 
                        />
                        <TargetButton 
                            label="Classe A" 
                            sub="Agences 1-6"
                            active={selectedTarget === 'CLASS_A'} 
                            onClick={() => setSelectedTarget('CLASS_A')} 
                        />
                        <TargetButton 
                            label="Classe B" 
                            sub="Agences 7-12"
                            active={selectedTarget === 'CLASS_B'} 
                            onClick={() => setSelectedTarget('CLASS_B')} 
                        />
                        <select 
                            className={`p-3 rounded-xl border-2 font-bold text-sm outline-none transition-all ${!['ALL', 'CLASS_A', 'CLASS_B'].includes(selectedTarget) ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500'}`}
                            onChange={(e) => setSelectedTarget(e.target.value)}
                            value={['ALL', 'CLASS_A', 'CLASS_B'].includes(selectedTarget) ? '' : selectedTarget}
                        >
                            <option value="" disabled>Agence Spécifique...</option>
                            {activeAgencies.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 2. SELECT EVENT */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            {activeTab === 'CRISIS' ? <AlertTriangle size={20} className="text-amber-500"/> : <Trophy size={20} className="text-emerald-500"/>}
                            2. Type d'Intervention
                        </h3>
                        
                        {/* MODE TABS */}
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button 
                                onClick={() => { setActiveTab('CRISIS'); setSelectedPreset(null); }}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'CRISIS' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Flame size={14}/> Sanctions & Crises
                            </button>
                            <button 
                                onClick={() => { setActiveTab('REWARD'); setSelectedPreset(null); }}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'REWARD' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Gift size={14}/> Récompenses
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {filteredPresets.map((preset, idx) => (
                            <div 
                                key={idx}
                                onClick={() => { setSelectedPreset(preset); setCustomTitle(''); }}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-2 relative overflow-hidden group ${
                                    selectedPreset === preset 
                                    ? (activeTab === 'CRISIS' ? 'border-red-500 bg-red-50 shadow-md scale-[1.02]' : 'border-emerald-500 bg-emerald-50 shadow-md scale-[1.02]')
                                    : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-300'
                                }`}
                            >
                                <div className="flex justify-between items-center relative z-10">
                                    <span className={`font-bold ${
                                        selectedPreset === preset 
                                        ? (activeTab === 'CRISIS' ? 'text-red-700' : 'text-emerald-700') 
                                        : 'text-slate-800'
                                    }`}>{preset.label}</span>
                                    <div className={`${
                                        selectedPreset === preset 
                                        ? (activeTab === 'CRISIS' ? 'text-red-500' : 'text-emerald-500') 
                                        : 'text-slate-400 group-hover:text-slate-600'
                                    }`}>
                                        {preset.icon}
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 relative z-10">{preset.description}</p>
                                
                                <div className="flex gap-2 mt-auto pt-2 relative z-10">
                                    {preset.deltaVE !== 0 && (
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                                            preset.deltaVE < 0 
                                            ? 'bg-red-100 text-red-700 border-red-200' 
                                            : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                        }`}>
                                            {preset.deltaVE > 0 ? '+' : ''}{preset.deltaVE} VE
                                        </span>
                                    )}
                                    {preset.deltaBudget !== 0 && (
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                                            preset.category === 'CRISIS'
                                            ? 'bg-amber-100 text-amber-700 border-amber-200' 
                                            : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                        }`}>
                                            {preset.isPercentage ? `-${preset.deltaBudget * 100}%` : `${preset.deltaBudget > 0 ? '+' : ''}${preset.deltaBudget}`} PiXi
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Custom Form */}
                    <div className={`border-t border-slate-100 pt-6 transition-opacity ${selectedPreset ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                         <h4 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                            <Wrench size={16}/> Ou Créer manuellement
                         </h4>
                         <div className="space-y-4">
                            <input 
                                type="text" 
                                placeholder="Titre de l'événement..."
                                value={customTitle}
                                onChange={e => { setCustomTitle(e.target.value); setSelectedPreset(null); }}
                                className="w-full p-3 border border-slate-300 rounded-xl font-bold bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <textarea 
                                placeholder="Description..."
                                value={customDesc}
                                onChange={e => setCustomDesc(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-xl text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Impact VE</label>
                                    <input type="number" value={customImpactVE} onChange={e => setCustomImpactVE(Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Impact PiXi</label>
                                    <input type="number" value={customImpactBudget} onChange={e => setCustomImpactBudget(Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                                </div>
                            </div>
                         </div>
                    </div>
                </div>

            </div>

            {/* RIGHT: SUMMARY & ACTION */}
            <div className="xl:col-span-1">
                 <div className={`p-6 rounded-3xl sticky top-24 shadow-2xl transition-colors ${
                     activeTab === 'CRISIS' ? 'bg-slate-900 text-white shadow-slate-900/20' : 'bg-emerald-900 text-white shadow-emerald-900/20'
                 }`}>
                    <h3 className="font-display font-bold text-2xl mb-6">Récapitulatif</h3>
                    
                    <div className="space-y-4 mb-8">
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase">Cible</span>
                            <div className={`text-lg font-bold ${activeTab === 'CRISIS' ? 'text-indigo-400' : 'text-emerald-300'}`}>
                                {selectedTarget === 'ALL' ? 'Toutes les Agences' : selectedTarget === 'CLASS_A' ? 'Classe A' : selectedTarget === 'CLASS_B' ? 'Classe B' : 'Une seule agence'}
                            </div>
                        </div>
                        <div>
                            <span className="text-xs font-bold text-slate-400 uppercase">Événement</span>
                            <div className="text-lg font-bold text-white leading-tight">
                                {selectedPreset ? selectedPreset.label : customTitle || '...'}
                            </div>
                        </div>
                        <div className="flex gap-4 pt-4 border-t border-white/10">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase">VE</span>
                                <div className={`text-2xl font-bold ${(selectedPreset?.deltaVE || customImpactVE) < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {(selectedPreset?.deltaVE || customImpactVE) > 0 ? '+' : ''}{selectedPreset?.deltaVE || customImpactVE}
                                </div>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase">PiXi</span>
                                <div className={`text-2xl font-bold ${
                                    (selectedPreset?.category === 'CRISIS' || customImpactBudget < 0) ? 'text-red-400' : 'text-emerald-400'
                                }`}>
                                    {selectedPreset?.isPercentage 
                                     ? `-${(selectedPreset.deltaBudget * 100)}%` 
                                     : `${(selectedPreset?.deltaBudget || customImpactBudget) > 0 ? '+' : ''}${selectedPreset?.deltaBudget || customImpactBudget}`
                                    }
                                </div>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleApply}
                        className={`w-full py-4 font-bold rounded-xl flex items-center justify-center gap-3 transition-colors shadow-lg ${
                            activeTab === 'CRISIS' 
                            ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30' 
                            : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30'
                        }`}
                    >
                        <Send size={20}/>
                        {activeTab === 'CRISIS' ? 'DÉCLENCHER LA CRISE' : 'ENVOYER LA RÉCOMPENSE'}
                    </button>
                    <p className="text-center text-xs text-slate-400 mt-3 opacity-60">Action irréversible. Sera inscrit dans l'historique.</p>
                 </div>
            </div>
        </div>
    </div>
  );
};

const TargetButton: React.FC<{label: string, sub: string, active: boolean, onClick: () => void}> = ({label, sub, active, onClick}) => (
    <button 
        onClick={onClick}
        className={`p-3 rounded-xl border-2 text-left transition-all ${active ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-slate-50 hover:bg-white'}`}
    >
        <span className={`block font-bold text-sm ${active ? 'text-indigo-900' : 'text-slate-700'}`}>{label}</span>
        <span className="text-[10px] text-slate-400 font-bold uppercase">{sub}</span>
    </button>
);
