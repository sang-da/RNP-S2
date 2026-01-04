
import React, { useState, useMemo } from 'react';
import { Agency, CrisisPreset, GameEvent, CycleAwardDefinition } from '../types';
import { Flame, TrendingDown, Ban, Wallet, Target, Send, ShieldAlert, AlertTriangle, AlertOctagon, Banknote, Megaphone, Wrench, HardDrive, Gift, Trophy, Star, HeartHandshake, Percent, Ruler, Crown, Compass, Mic, Eye, Info } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { CYCLE_AWARDS } from '../constants';

interface AdminCrisisProps {
  agencies: Agency[];
  onUpdateAgency: (agency: Agency) => void;
}

// Extension de l'interface locale pour gérer les pourcentages
interface ExtendedPreset extends CrisisPreset {
    category: 'CRISIS' | 'REWARD';
    isPercentage?: boolean; // Si true, augmente le taux de charge hebdomadaire
}

export const AdminCrisis: React.FC<AdminCrisisProps> = ({ agencies, onUpdateAgency }) => {
  const { confirm, toast } = useUI();
  const [selectedTarget, setSelectedTarget] = useState<'ALL' | 'CLASS_A' | 'CLASS_B' | string>('ALL');
  const [selectedPreset, setSelectedPreset] = useState<ExtendedPreset | null>(null);
  const [activeTab, setActiveTab] = useState<'CRISIS' | 'REWARD' | 'CEREMONY'>('CRISIS');
  
  // Custom Form
  const [customTitle, setCustomTitle] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customImpactVE, setCustomImpactVE] = useState(0);
  const [customImpactBudget, setCustomImpactBudget] = useState(0);

  // Ceremony State
  const [selectedAward, setSelectedAward] = useState<CycleAwardDefinition | null>(null);
  const [awardWinnerId, setAwardWinnerId] = useState<string>('');

  const activeAgencies = agencies.filter(a => a.id !== 'unassigned');

  // --- CATALOGUE DES ÉVÉNEMENTS ---
  const PRESETS: ExtendedPreset[] = [
    // === CRISES & SANCTIONS ===
    { 
        label: "Inflation Matériaux Hebdo", 
        description: "Hausse globale des coûts. Impact sur les dépenses salariales.", 
        deltaVE: 0, deltaBudget: 0.10, // 10%
        isPercentage: true,
        icon: <Percent/>, category: 'CRISIS' 
    },
    { 
        label: "Taxe 'Pollueur-Payeur'", 
        description: "Sanction écologique : +5% de charges hebdos.", 
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
        label: "Erreur de Côte / Échelle", 
        description: "Catastrophe. Le mobilier dessiné ne passe pas la porte sur le plan d'exécution.", 
        deltaVE: -12, deltaBudget: 0, 
        icon: <Wrench/>, category: 'CRISIS' 
    },
    { 
        label: "Rupture de Stock Matériau", 
        description: "Le matériau spécifié n'est plus disponible à Cotonou. Changement forcé.", 
        deltaVE: -5, deltaBudget: -300, 
        icon: <Ban/>, category: 'CRISIS' 
    },
    { 
        label: "Amende Retard", 
        description: "Pénalités de retard sur le paiement des fournisseurs.", 
        deltaVE: -1, deltaBudget: -250, 
        icon: <Banknote/>, category: 'CRISIS' 
    },

    // === RÉCOMPENSES & BONUS ===
    { 
        label: "Rendu 'Photoréaliste'", 
        description: "Le lighting est parfait du premier coup. L'image vend le projet toute seule.", 
        deltaVE: +8, deltaBudget: 0, 
        icon: <Star/>, category: 'REWARD' 
    },
    { 
        label: "Détournement Génial", 
        description: "Utilisation innovante d'un matériau pauvre (brique, bambou) qui rend 'Luxe'.", 
        deltaVE: +10, deltaBudget: 0, 
        icon: <Trophy/>, category: 'REWARD' 
    },
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
      
      const impactVal = selectedPreset ? selectedPreset.deltaBudget : customImpactBudget;
      const isPercentage = selectedPreset?.isPercentage || false;

      if (!title) {
          toast('warning', "Veuillez sélectionner un événement ou entrer un titre.");
          return;
      }

      // Prepare UI Message
      let impactMsg = `Impact VE: ${dVE > 0 ? '+' : ''}${dVE}`;
      if (isPercentage) {
          impactMsg += `\nAugmentation des Charges: +${impactVal * 100}% sur la masse salariale (Permanent)`;
      } else {
          impactMsg += `\nImpact Budget Immédiat: ${impactVal > 0 ? '+' : ''}${impactVal} PiXi`;
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
              let logDesc = desc;
              let newBudget = agency.budget_real;
              let newWeeklyTax = agency.weeklyTax || 0;

              if (isPercentage) {
                  // Increase Weekly Tax
                  newWeeklyTax += impactVal;
                  logDesc = `${desc} (Charges hebdos : ${(newWeeklyTax*100).toFixed(0)}%)`;
              } else {
                  // Immediate Budget Impact
                  newBudget += impactVal;
              }

              const newEvent: GameEvent = {
                  id: `evt-${Date.now()}-${agency.id}`,
                  date: new Date().toISOString().split('T')[0],
                  type: activeTab === 'CRISIS' ? 'CRISIS' : 'VE_DELTA', // Use VE_DELTA for rewards usually
                  label: title,
                  description: logDesc,
                  deltaVE: dVE,
                  deltaBudgetReal: isPercentage ? 0 : impactVal
              };

              const newVE = Math.max(0, agency.ve_current + dVE); 

              onUpdateAgency({
                  ...agency,
                  budget_real: newBudget,
                  weeklyTax: newWeeklyTax,
                  ve_current: newVE,
                  eventLog: [...agency.eventLog, newEvent]
              });
          }
      });
      
      toast('success', activeTab === 'CRISIS' ? "Crise déclenchée." : "Récompense envoyée.");
      setSelectedPreset(null);
  };

  const handleAwardGrandPrix = async () => {
      if (!selectedAward || !awardWinnerId) return;
      const winner = agencies.find(a => a.id === awardWinnerId);
      if(!winner) return;

      const confirmed = await confirm({
          title: "Confirmer le Lauréat",
          message: `Vous allez décerner le ${selectedAward.title} à l'agence "${winner.name}".\n\nBonus: +${selectedAward.veBonus} VE\nBonus Hebdo: +${selectedAward.weeklyBonus} PiXi/semaine (Permanent)`,
          confirmText: "Décerner le Prix",
          isDangerous: false
      });

      if(!confirmed) return;

      const newEvent: GameEvent = {
          id: `gp-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'VE_DELTA',
          label: `🏆 ${selectedAward.title}`,
          deltaVE: selectedAward.veBonus,
          deltaBudgetReal: 0, // Pas de cash immédiat, c'est du bonus hebdo
          description: `Félicitations ! Gain du Grand Prix : "${selectedAward.description}". Augmentation des revenus hebdos de +${selectedAward.weeklyBonus} PiXi.`
      };

      onUpdateAgency({
          ...winner,
          ve_current: Math.min(100, winner.ve_current + selectedAward.veBonus),
          weeklyRevenueModifier: (winner.weeklyRevenueModifier || 0) + selectedAward.weeklyBonus,
          eventLog: [...winner.eventLog, newEvent]
      });

      toast('success', "Grand Prix décerné !");
      setSelectedAward(null);
      setAwardWinnerId('');
  };

  const getIcon = (iconName: string) => {
      switch(iconName) {
          case 'compass': return <Compass size={24} />;
          case 'mic': return <Mic size={24} />;
          case 'eye': return <Eye size={24} />;
          default: return <Crown size={24} />;
      }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
         <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                <div className={`p-2 rounded-xl ${activeTab === 'CRISIS' ? 'bg-red-100 text-red-600' : activeTab === 'CEREMONY' ? 'bg-yellow-100 text-yellow-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {activeTab === 'CRISIS' ? <Flame size={32}/> : activeTab === 'CEREMONY' ? <Crown size={32}/> : <Gift size={32}/>}
                </div>
                Zone d'Intervention
            </h2>
            <p className="text-slate-500 text-sm mt-1">
                {activeTab === 'CRISIS' 
                    ? "Déclenchez des crises pour tester la résilience ou sanctionner." 
                    : activeTab === 'CEREMONY' ? "Récompensez la meilleure agence de chaque cycle." 
                    : "Distribuez des bonus pour valoriser l'excellence et l'initiative."}
            </p>
        </div>

        {/* MODE TABS */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-8 w-fit">
            <button onClick={() => { setActiveTab('CRISIS'); setSelectedPreset(null); }} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'CRISIS' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}>
                <Flame size={16}/> Sanctions
            </button>
            <button onClick={() => { setActiveTab('REWARD'); setSelectedPreset(null); }} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'REWARD' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>
                <Gift size={16}/> Bonus
            </button>
            <button onClick={() => { setActiveTab('CEREMONY'); setSelectedPreset(null); }} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'CEREMONY' ? 'bg-white text-yellow-600 shadow-sm' : 'text-slate-400'}`}>
                <Crown size={16}/> Cérémonie
            </button>
        </div>

        {activeTab === 'CEREMONY' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* AWARDS LIST */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Trophy size={20} className="text-yellow-500"/> 1. Choisir le Trophée
                    </h3>
                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 mb-4 text-xs text-yellow-800 flex items-start gap-2">
                        <Info size={16} className="shrink-0 mt-0.5"/>
                        <p><strong>Règle :</strong> Vous devez décerner ce prix une fois à une équipe de la Classe A, et une fois à une équipe de la Classe B.</p>
                    </div>
                    {CYCLE_AWARDS.map(award => (
                        <div 
                            key={award.id}
                            onClick={() => setSelectedAward(award)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4 ${
                                selectedAward?.id === award.id 
                                ? 'bg-yellow-50 border-yellow-400 shadow-md scale-[1.02]' 
                                : 'bg-white border-slate-100 hover:border-yellow-200'
                            }`}
                        >
                            <div className={`p-3 rounded-full ${selectedAward?.id === award.id ? 'bg-yellow-200 text-yellow-800' : 'bg-slate-50 text-slate-400'}`}>
                                {getIcon(award.iconName)}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-900">{award.title}</h4>
                                <p className="text-xs text-slate-500">{award.description}</p>
                                <div className="flex gap-2 mt-1">
                                    <span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{award.cycleId.split(':')[0]}</span>
                                    <span className="text-[10px] font-bold text-emerald-600">+{award.veBonus} VE</span>
                                    <span className="text-[10px] font-bold text-emerald-600">+{award.weeklyBonus} PiXi/sem</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* WINNER SELECTION */}
                <div className={`transition-opacity ${selectedAward ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Target size={20} className="text-indigo-500"/> 2. Désigner le Lauréat
                    </h3>
                    
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm sticky top-24">
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Agence Gagnante</label>
                            <select 
                                className="w-full p-3 border border-slate-300 rounded-xl font-bold bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                                value={awardWinnerId}
                                onChange={e => setAwardWinnerId(e.target.value)}
                            >
                                <option value="">-- Sélectionner --</option>
                                {activeAgencies.map(a => (
                                    <option key={a.id} value={a.id}>{a.name} (Classe {a.classId})</option>
                                ))}
                            </select>
                        </div>

                        {selectedAward && awardWinnerId && (
                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 mb-6 text-center">
                                <span className="text-xs font-bold text-yellow-700 uppercase tracking-widest block mb-1">Résumé</span>
                                <p className="text-sm text-yellow-900">
                                    L'agence <strong>{agencies.find(a => a.id === awardWinnerId)?.name}</strong> reçoit le <strong>{selectedAward.title}</strong>.
                                </p>
                            </div>
                        )}

                        <button 
                            onClick={handleAwardGrandPrix}
                            disabled={!awardWinnerId}
                            className={`w-full py-4 font-bold rounded-xl flex items-center justify-center gap-3 transition-colors shadow-lg ${
                                awardWinnerId 
                                ? 'bg-slate-900 hover:bg-indigo-600 text-white' 
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <Crown size={20}/>
                            OFFRIR LE TROPHÉE
                        </button>
                    </div>
                </div>
            </div>
        ) : (
            /* EXISTING CRISIS/REWARD UI */
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
                        <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-6">
                            {activeTab === 'CRISIS' ? <AlertTriangle size={20} className="text-amber-500"/> : <Trophy size={20} className="text-emerald-500"/>}
                            2. Type d'Intervention
                        </h3>
                        
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
                                                {preset.isPercentage ? `+${preset.deltaBudget * 100}% Charges` : `${preset.deltaBudget > 0 ? '+' : ''}${preset.deltaBudget} PiXi`}
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
                                    <span className="text-xs font-bold text-slate-400 uppercase">Impact</span>
                                    <div className={`text-xl font-bold ${
                                        (selectedPreset?.category === 'CRISIS' || customImpactBudget < 0) ? 'text-red-400' : 'text-emerald-400'
                                    }`}>
                                        {selectedPreset?.isPercentage 
                                        ? `+${(selectedPreset.deltaBudget * 100)}% Charges` 
                                        : `${(selectedPreset?.deltaBudget || customImpactBudget) > 0 ? '+' : ''}${selectedPreset?.deltaBudget || customImpactBudget} PiXi`
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
        )}
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
