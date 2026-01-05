

import React, { useState, useMemo } from 'react';
import { Agency, CrisisPreset, GameEvent, CycleAwardDefinition, Student } from '../types';
import { Flame, TrendingDown, Ban, Wallet, Target, Send, ShieldAlert, AlertTriangle, AlertOctagon, Banknote, Megaphone, Wrench, HardDrive, Gift, Trophy, Star, HeartHandshake, Percent, Ruler, Crown, Compass, Mic, Eye, Info, User, ArrowRightLeft, PlusCircle } from 'lucide-react';
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

  // New Actions Panel State
  const [rightPanelMode, setRightPanelMode] = useState<'SUMMARY' | 'INJECTION' | 'TRANSFER' | 'INDIVIDUAL'>('SUMMARY');
  
  // States for Specific Actions
  const [injectionAmount, setInjectionAmount] = useState(0);
  const [transferSourceId, setTransferSourceId] = useState('');
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [individualBonusScore, setIndividualBonusScore] = useState(0);
  const [individualBonusWallet, setIndividualBonusWallet] = useState(0);

  // Ceremony State
  const [selectedAward, setSelectedAward] = useState<CycleAwardDefinition | null>(null);
  const [awardWinnerId, setAwardWinnerId] = useState<string>('');

  const activeAgencies = agencies.filter(a => a.id !== 'unassigned');
  
  // Flatten students for Individual tools
  const allStudents = useMemo(() => {
      const list: {student: Student, agencyName: string}[] = [];
      agencies.forEach(a => {
          a.members.forEach(m => list.push({student: m, agencyName: a.name}));
      });
      return list.sort((a,b) => a.student.name.localeCompare(b.student.name));
  }, [agencies]);

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

  // --- ACTIONS LOGIC ---

  const handleApplyPreset = async () => {
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

  const handleInjection = async () => {
      if (injectionAmount === 0) return;
      if (selectedTarget === 'ALL' || selectedTarget === 'CLASS_A' || selectedTarget === 'CLASS_B') {
          toast('warning', 'Veuillez sélectionner une agence spécifique pour l\'injection.');
          return;
      }
      const agency = agencies.find(a => a.id === selectedTarget);
      if (!agency) return;

      const confirmed = await confirm({
          title: "Injection de Fonds",
          message: `Verser ${injectionAmount} PiXi à l'agence "${agency.name}" ?`,
          confirmText: "Injecter"
      });
      if (!confirmed) return;

      const newEvent: GameEvent = {
          id: `inj-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'REVENUE',
          label: 'Injection de Fonds (Admin)',
          deltaBudgetReal: injectionAmount,
          description: "Subvention exceptionnelle ou prêt administratif."
      };

      onUpdateAgency({
          ...agency,
          budget_real: agency.budget_real + injectionAmount,
          eventLog: [...agency.eventLog, newEvent]
      });
      toast('success', 'Fonds injectés.');
      setInjectionAmount(0);
      setRightPanelMode('SUMMARY');
  };

  const handleTransfer = async () => {
      if (!transferSourceId || !transferTargetId || transferAmount <= 0) return;
      const source = agencies.find(a => a.id === transferSourceId);
      const target = agencies.find(a => a.id === transferTargetId);
      if (!source || !target) return;

      const confirmed = await confirm({
          title: "Transfert de Fonds",
          message: `Transférer ${transferAmount} PiXi de "${source.name}" vers "${target.name}" ?\n\n(Exemple: Investissement ou Rachat)`,
          confirmText: "Transférer"
      });
      if (!confirmed) return;

      // Update Source
      const eventSource: GameEvent = {
          id: `tr-out-${Date.now()}`, date: new Date().toISOString().split('T')[0],
          type: 'BUDGET_DELTA', label: `Transfert vers ${target.name}`,
          deltaBudgetReal: -transferAmount, description: "Investissement ou soutien."
      };
      onUpdateAgency({ ...source, budget_real: source.budget_real - transferAmount, eventLog: [...source.eventLog, eventSource] });

      // Update Target
      const eventTarget: GameEvent = {
          id: `tr-in-${Date.now()}`, date: new Date().toISOString().split('T')[0],
          type: 'REVENUE', label: `Reçu de ${source.name}`,
          deltaBudgetReal: transferAmount, description: "Fonds reçus."
      };
      // Important: Fetch fresh target state if possible, but here using memory ref should be ok if updateAgency handles it
      // Actually we must update target based on current memory
      // Since updateAgency updates Firestore, we should trigger it for target too.
      // But wait, updateAgency only accepts one arg.
      // We can call it sequentially.
      
      // HACK: Small delay to ensure DB writes don't overlap too much if async issues (rare with Firestore batching usually)
      setTimeout(() => {
          onUpdateAgency({ ...target, budget_real: target.budget_real + transferAmount, eventLog: [...target.eventLog, eventTarget] });
      }, 100);

      toast('success', 'Transfert effectué.');
      setRightPanelMode('SUMMARY');
  };

  const handleIndividualAward = async () => {
      if (!selectedStudentId) return;
      // Find student and agency
      let foundAgency: Agency | undefined;
      let foundStudent: Student | undefined;
      
      agencies.forEach(a => {
          const s = a.members.find(m => m.id === selectedStudentId);
          if (s) { foundAgency = a; foundStudent = s; }
      });

      if (!foundAgency || !foundStudent) return;

      const confirmed = await confirm({
          title: "Récompense Individuelle",
          message: `Récompenser ${foundStudent.name} ?\n\nScore: +${individualBonusScore}\nWallet: +${individualBonusWallet} PiXi`,
          confirmText: "Appliquer"
      });
      if (!confirmed) return;

      const updatedMembers = foundAgency.members.map(m => 
          m.id === foundStudent!.id 
          ? { ...m, individualScore: Math.min(100, m.individualScore + individualBonusScore), wallet: (m.wallet || 0) + individualBonusWallet } 
          : m
      );

      // Add Log to Agency (so it's visible)
      const newEvent: GameEvent = {
          id: `ind-award-${Date.now()}`, date: new Date().toISOString().split('T')[0],
          type: 'INFO', label: `🏆 Récompense : ${foundStudent.name}`,
          description: `Bonus individuel accordé (+${individualBonusScore} Score, +${individualBonusWallet} Wallet).`
      };

      onUpdateAgency({
          ...foundAgency,
          members: updatedMembers,
          eventLog: [...foundAgency.eventLog, newEvent]
      });

      toast('success', 'Récompense appliquée.');
      setRightPanelMode('SUMMARY');
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
            /* CRISIS/REWARD + ACTIONS UI */
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
                                    onClick={() => { setSelectedPreset(preset); setCustomTitle(''); setRightPanelMode('SUMMARY'); }}
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
                                                {preset.isPercentage ? `+${(preset.deltaBudget * 100)}% Charges` : `${preset.deltaBudget > 0 ? '+' : ''}${preset.deltaBudget} PiXi`}
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
                                    onChange={e => { setCustomTitle(e.target.value); setSelectedPreset(null); setRightPanelMode('SUMMARY'); }}
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

                {/* RIGHT: SUMMARY & ACTIONS PANEL */}
                <div className="xl:col-span-1">
                    
                    {/* NEW ACTION BUTTONS ROW */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <button onClick={() => setRightPanelMode('INJECTION')} className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-bold text-[10px] uppercase transition-all ${rightPanelMode === 'INJECTION' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border hover:border-indigo-300'}`}>
                            <PlusCircle size={20}/> Injection
                        </button>
                        <button onClick={() => setRightPanelMode('TRANSFER')} className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-bold text-[10px] uppercase transition-all ${rightPanelMode === 'TRANSFER' ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-slate-500 border hover:border-purple-300'}`}>
                            <ArrowRightLeft size={20}/> Transfert
                        </button>
                        <button onClick={() => setRightPanelMode('INDIVIDUAL')} className={`py-3 rounded-xl flex flex-col items-center justify-center gap-1 font-bold text-[10px] uppercase transition-all ${rightPanelMode === 'INDIVIDUAL' ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-slate-500 border hover:border-amber-300'}`}>
                            <User size={20}/> Individuel
                        </button>
                    </div>

                    <div className={`p-6 rounded-3xl sticky top-24 shadow-2xl transition-colors ${
                        activeTab === 'CRISIS' && rightPanelMode === 'SUMMARY' ? 'bg-slate-900 text-white shadow-slate-900/20' : 
                        rightPanelMode === 'SUMMARY' ? 'bg-emerald-900 text-white shadow-emerald-900/20' :
                        'bg-white text-slate-900 border border-slate-200 shadow-sm'
                    }`}>
                        
                        {/* --- MODE SUMMARY (Default) --- */}
                        {rightPanelMode === 'SUMMARY' && (
                            <>
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
                                    onClick={handleApplyPreset}
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
                            </>
                        )}

                        {/* --- MODE INJECTION --- */}
                        {rightPanelMode === 'INJECTION' && (
                            <div className="space-y-4">
                                <h3 className="font-bold text-lg text-indigo-700 flex items-center gap-2 mb-4">
                                    <PlusCircle size={20}/> Injection de Fonds
                                </h3>
                                <p className="text-xs text-slate-500 mb-2">Ajoutez du cash directement dans la trésorerie de l'agence sélectionnée à gauche.</p>
                                
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Agence Cible</span>
                                    <div className="font-bold text-slate-900">
                                        {selectedTarget === 'ALL' || selectedTarget.startsWith('CLASS') ? <span className="text-red-500">Sélectionnez une agence unique à gauche</span> : agencies.find(a => a.id === selectedTarget)?.name}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Montant (PiXi)</label>
                                    <input type="number" value={injectionAmount} onChange={e => setInjectionAmount(Number(e.target.value))} className="w-full p-3 border-2 border-indigo-100 rounded-xl font-bold text-xl text-indigo-600 focus:outline-none focus:border-indigo-500" placeholder="0"/>
                                </div>

                                <button onClick={handleInjection} disabled={injectionAmount <= 0} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                                    <Wallet size={18}/> Verser les Fonds
                                </button>
                                <button onClick={() => setRightPanelMode('SUMMARY')} className="w-full py-2 text-slate-400 hover:text-slate-600 text-xs font-bold">Annuler</button>
                            </div>
                        )}

                        {/* --- MODE TRANSFER --- */}
                        {rightPanelMode === 'TRANSFER' && (
                            <div className="space-y-4">
                                <h3 className="font-bold text-lg text-purple-700 flex items-center gap-2 mb-4">
                                    <ArrowRightLeft size={20}/> Transfert Inter-Agences
                                </h3>
                                
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Source (Débiteur)</label>
                                    <select value={transferSourceId} onChange={e => setTransferSourceId(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700">
                                        <option value="">-- Choisir --</option>
                                        {activeAgencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Cible (Bénéficiaire)</label>
                                    <select value={transferTargetId} onChange={e => setTransferTargetId(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700">
                                        <option value="">-- Choisir --</option>
                                        {activeAgencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Montant (PiXi)</label>
                                    <input type="number" value={transferAmount} onChange={e => setTransferAmount(Number(e.target.value))} className="w-full p-3 border-2 border-purple-100 rounded-xl font-bold text-xl text-purple-600 focus:outline-none focus:border-purple-500"/>
                                </div>

                                <button onClick={handleTransfer} disabled={!transferSourceId || !transferTargetId || transferAmount <= 0} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                                    <ArrowRightLeft size={18}/> Exécuter le Virement
                                </button>
                                <button onClick={() => setRightPanelMode('SUMMARY')} className="w-full py-2 text-slate-400 hover:text-slate-600 text-xs font-bold">Annuler</button>
                            </div>
                        )}

                        {/* --- MODE INDIVIDUAL --- */}
                        {rightPanelMode === 'INDIVIDUAL' && (
                            <div className="space-y-4">
                                <h3 className="font-bold text-lg text-amber-600 flex items-center gap-2 mb-4">
                                    <User size={20}/> Action Individuelle
                                </h3>
                                
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Étudiant</label>
                                    <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700">
                                        <option value="">-- Choisir un élève --</option>
                                        {allStudents.map(item => (
                                            <option key={item.student.id} value={item.student.id}>{item.student.name} ({item.agencyName})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Bonus Score</label>
                                        <input type="number" value={individualBonusScore} onChange={e => setIndividualBonusScore(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded-lg text-sm"/>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Bonus Wallet</label>
                                        <input type="number" value={individualBonusWallet} onChange={e => setIndividualBonusWallet(Number(e.target.value))} className="w-full p-2 border border-slate-200 rounded-lg text-sm"/>
                                    </div>
                                </div>

                                <button onClick={handleIndividualAward} disabled={!selectedStudentId} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50">
                                    <Gift size={18}/> Récompenser
                                </button>
                                <button onClick={() => setRightPanelMode('SUMMARY')} className="w-full py-2 text-slate-400 hover:text-slate-600 text-xs font-bold">Annuler</button>
                            </div>
                        )}

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