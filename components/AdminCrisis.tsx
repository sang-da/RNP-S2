
import React, { useState, useMemo } from 'react';
import { Agency, CrisisPreset, GameEvent } from '../types';
import { Flame, TrendingDown, Ban, Wallet, Target, Send, ShieldAlert, AlertTriangle, AlertOctagon, Banknote, Megaphone, Wrench, HardDrive } from 'lucide-react';
import { useUI } from '../contexts/UIContext';

interface AdminCrisisProps {
  agencies: Agency[];
  onUpdateAgency: (agency: Agency) => void;
}

type CrisisCategory = 'ALL' | 'VE_HEAVY' | 'MONEY_HEAVY' | 'TECH' | 'MAJOR';

export const AdminCrisis: React.FC<AdminCrisisProps> = ({ agencies, onUpdateAgency }) => {
  const { confirm, toast } = useUI();
  const [selectedTarget, setSelectedTarget] = useState<'ALL' | 'CLASS_A' | 'CLASS_B' | string>('ALL');
  const [selectedPreset, setSelectedPreset] = useState<CrisisPreset | null>(null);
  const [activeCategory, setActiveCategory] = useState<CrisisCategory>('ALL');
  
  // Custom Crisis Form
  const [customTitle, setCustomTitle] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customImpactVE, setCustomImpactVE] = useState(0);
  const [customImpactBudget, setCustomImpactBudget] = useState(0);

  const activeAgencies = agencies.filter(a => a.id !== 'unassigned');

  // --- CATALOGUE DE CRISES ENRICHI ---
  const ALL_CRISES: (CrisisPreset & { category: CrisisCategory })[] = [
    // --- MAJEUR (Systémique) ---
    { 
        label: "Krach Boursier RNP", 
        description: "Perte de confiance des investisseurs. La VE s'effondre.", 
        deltaVE: -15, deltaBudget: 0, 
        icon: <Flame/>, category: 'MAJOR' 
    },
    { 
        label: "Inflation Matériaux", 
        description: "Hausse brutale du coût du bois et de l'acier.", 
        deltaVE: 0, deltaBudget: -1000, 
        icon: <TrendingDown/>, category: 'MAJOR' 
    },
    { 
        label: "Scandale Écologique", 
        description: "L'agence est accusée de greenwashing.", 
        deltaVE: -20, deltaBudget: -200, 
        icon: <ShieldAlert/>, category: 'MAJOR' 
    },
    { 
        label: "Grève des Transports", 
        description: "Retards logistiques. Impossible de livrer à temps.", 
        deltaVE: -3, deltaBudget: 0, 
        icon: <Ban/>, category: 'MAJOR' 
    },

    // --- RÉPUTATION (VE Heavy) ---
    { 
        label: "Plagiat Avéré", 
        description: "Une ressemblance frappante est détectée avec un projet existant.", 
        deltaVE: -30, deltaBudget: 0, 
        icon: <AlertOctagon/>, category: 'VE_HEAVY' 
    },
    { 
        label: "Bad Buzz Réseaux", 
        description: "Une communication maladroite devient virale.", 
        deltaVE: -8, deltaBudget: 0, 
        icon: <Megaphone/>, category: 'VE_HEAVY' 
    },
    { 
        label: "Mésentente Publique", 
        description: "Conflit visible entre associés lors d'une présentation.", 
        deltaVE: -5, deltaBudget: 0, 
        icon: <AlertTriangle/>, category: 'VE_HEAVY' 
    },
    { 
        label: "Retard Livrable Client", 
        description: "Le client est mécontent du non-respect des délais.", 
        deltaVE: -4, deltaBudget: 0, 
        icon: <ClockIcon/>, category: 'VE_HEAVY' 
    },

    // --- FINANCE (Money Heavy) ---
    { 
        label: "Redressement Fiscal", 
        description: "Erreur de déclaration. L'administration réclame son dû.", 
        deltaVE: -2, deltaBudget: -2000, 
        icon: <Banknote/>, category: 'MONEY_HEAVY' 
    },
    { 
        label: "Vol de Matériel", 
        description: "Disparition de matériel coûteux (Laptops, Tablettes).", 
        deltaVE: 0, deltaBudget: -800, 
        icon: <Wallet/>, category: 'MONEY_HEAVY' 
    },
    { 
        label: "Surcoût Licences", 
        description: "Mise à jour obligatoire des logiciels pro.", 
        deltaVE: 0, deltaBudget: -400, 
        icon: <Wrench/>, category: 'MONEY_HEAVY' 
    },
    { 
        label: "Amende Retard", 
        description: "Pénalités de retard sur le paiement des fournisseurs.", 
        deltaVE: 0, deltaBudget: -150, 
        icon: <Banknote/>, category: 'MONEY_HEAVY' 
    },

    // --- TECHNIQUE / OPÉRATIONNEL (Mixte) ---
    { 
        label: "Crash Serveur", 
        description: "Perte de données. Frais de récupération + Retard.", 
        deltaVE: -2, deltaBudget: -300, 
        icon: <HardDrive/>, category: 'TECH' 
    },
    { 
        label: "Fichier Corrompu", 
        description: "Le fichier maître est illisible. Il faut refaire.", 
        deltaVE: -5, deltaBudget: 0, 
        icon: <AlertTriangle/>, category: 'TECH' 
    },
    { 
        label: "Démission Clé", 
        description: "Un membre essentiel menace de partir (Burnout).", 
        deltaVE: -6, deltaBudget: 0, 
        icon: <Ban/>, category: 'TECH' 
    },
    { 
        label: "Subvention Exceptionnelle", 
        description: "Aide inattendue du ministère (Bonus).", 
        deltaVE: +5, deltaBudget: 1500, 
        icon: <Wallet/>, category: 'MAJOR' // Positif mais dans crisis pour l'admin
    },
  ];

  const filteredCrises = useMemo(() => {
      if (activeCategory === 'ALL') return ALL_CRISES;
      return ALL_CRISES.filter(c => c.category === activeCategory);
  }, [activeCategory]);

  const handleApply = async () => {
      // Determine Payload
      const title = selectedPreset ? selectedPreset.label : customTitle;
      const desc = selectedPreset ? selectedPreset.description : customDesc;
      const dVE = selectedPreset ? selectedPreset.deltaVE : customImpactVE;
      const dBudget = selectedPreset ? selectedPreset.deltaBudget : customImpactBudget;

      if (!title) {
          toast('warning', "Veuillez sélectionner une crise ou entrer un titre.");
          return;
      }

      const confirmed = await confirm({
          title: "Déclencher une Crise",
          message: `APPLIQUER : ${title}\nCIBLE : ${selectedTarget === 'ALL' ? 'Tout le monde' : selectedTarget === 'CLASS_A' ? 'Classe A' : selectedTarget === 'CLASS_B' ? 'Classe B' : 'Une Agence'}\n\nImpact VE: ${dVE}\nImpact PiXi: ${dBudget}`,
          confirmText: "Déclencher",
          isDangerous: true
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
              const newEvent: GameEvent = {
                  id: `crisis-${Date.now()}-${agency.id}`,
                  date: new Date().toISOString().split('T')[0],
                  type: 'CRISIS',
                  label: title,
                  description: desc,
                  deltaVE: dVE,
                  deltaBudgetReal: dBudget
              };

              const newBudget = agency.budget_real + dBudget;
              const newVE = Math.max(0, agency.ve_current + dVE); // No negative VE

              onUpdateAgency({
                  ...agency,
                  budget_real: newBudget,
                  ve_current: newVE,
                  eventLog: [...agency.eventLog, newEvent]
              });
          }
      });
      
      toast('success', "Crise déclenchée avec succès.");
      setSelectedPreset(null);
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
         <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-xl text-red-600"><Flame size={32}/></div>
                Zone de Crise
            </h2>
            <p className="text-slate-500 text-sm mt-1">Déclenchez des événements majeurs pour tester la résilience des agences.</p>
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
                            <AlertTriangle size={20} className="text-amber-500"/> 2. Choisissez la Catastrophe
                        </h3>
                        
                        {/* CATEGORY TABS */}
                        <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full">
                            <TabButton label="Tout" active={activeCategory === 'ALL'} onClick={() => setActiveCategory('ALL')} />
                            <TabButton label="Majeur" active={activeCategory === 'MAJOR'} onClick={() => setActiveCategory('MAJOR')} />
                            <TabButton label="Réputation (VE)" active={activeCategory === 'VE_HEAVY'} onClick={() => setActiveCategory('VE_HEAVY')} />
                            <TabButton label="Finance (€)" active={activeCategory === 'MONEY_HEAVY'} onClick={() => setActiveCategory('MONEY_HEAVY')} />
                            <TabButton label="Technique" active={activeCategory === 'TECH'} onClick={() => setActiveCategory('TECH')} />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {filteredCrises.map((preset, idx) => (
                            <div 
                                key={idx}
                                onClick={() => { setSelectedPreset(preset); setCustomTitle(''); }}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-2 relative overflow-hidden group ${
                                    selectedPreset === preset 
                                    ? 'border-red-500 bg-red-50 shadow-md scale-[1.02]' 
                                    : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-300'
                                }`}
                            >
                                <div className="flex justify-between items-center relative z-10">
                                    <span className={`font-bold ${selectedPreset === preset ? 'text-red-700' : 'text-slate-800'}`}>{preset.label}</span>
                                    <div className={`${selectedPreset === preset ? 'text-red-500' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                        {preset.icon}
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 relative z-10">{preset.description}</p>
                                
                                <div className="flex gap-2 mt-auto pt-2 relative z-10">
                                    {preset.deltaVE !== 0 && (
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                                            Math.abs(preset.deltaVE) >= 15 ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white border-slate-200'
                                        }`}>
                                            {preset.deltaVE > 0 ? '+' : ''}{preset.deltaVE} VE
                                        </span>
                                    )}
                                    {preset.deltaBudget !== 0 && (
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                                            Math.abs(preset.deltaBudget) >= 1000 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white border-slate-200'
                                        }`}>
                                            {preset.deltaBudget > 0 ? '+' : ''}{preset.deltaBudget} PiXi
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Custom Form */}
                    <div className={`border-t border-slate-100 pt-6 transition-opacity ${selectedPreset ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                         <h4 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                            <Wrench size={16}/> Ou Créer une Crise Personnalisée
                         </h4>
                         <div className="space-y-4">
                            <input 
                                type="text" 
                                placeholder="Titre (ex: Procès Client)"
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
                 <div className="bg-slate-900 text-white p-6 rounded-3xl sticky top-24 shadow-2xl shadow-slate-900/20">
                    <h3 className="font-display font-bold text-2xl mb-6">Récapitulatif</h3>
                    
                    <div className="space-y-4 mb-8">
                        <div>
                            <span className="text-xs font-bold text-slate-500 uppercase">Cible</span>
                            <div className="text-lg font-bold text-indigo-400">
                                {selectedTarget === 'ALL' ? 'Toutes les Agences' : selectedTarget === 'CLASS_A' ? 'Classe A' : selectedTarget === 'CLASS_B' ? 'Classe B' : 'Une seule agence'}
                            </div>
                        </div>
                        <div>
                            <span className="text-xs font-bold text-slate-500 uppercase">Événement</span>
                            <div className="text-lg font-bold text-white leading-tight">
                                {selectedPreset ? selectedPreset.label : customTitle || '...'}
                            </div>
                        </div>
                        <div className="flex gap-4 pt-4 border-t border-slate-700">
                            <div>
                                <span className="text-xs font-bold text-slate-500 uppercase">VE</span>
                                <div className={`text-2xl font-bold ${(selectedPreset?.deltaVE || customImpactVE) < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {(selectedPreset?.deltaVE || customImpactVE) > 0 ? '+' : ''}{selectedPreset?.deltaVE || customImpactVE}
                                </div>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-500 uppercase">PiXi</span>
                                <div className={`text-2xl font-bold ${(selectedPreset?.deltaBudget || customImpactBudget) < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {(selectedPreset?.deltaBudget || customImpactBudget) > 0 ? '+' : ''}{selectedPreset?.deltaBudget || customImpactBudget}
                                </div>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleApply}
                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-colors shadow-lg shadow-red-600/30"
                    >
                        <Send size={20}/>
                        DÉCLENCHER
                    </button>
                    <p className="text-center text-xs text-slate-500 mt-3 opacity-60">Action irréversible. Sera inscrit dans l'historique.</p>
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

const TabButton: React.FC<{label: string, active: boolean, onClick: () => void}> = ({label, active, onClick}) => (
    <button 
        onClick={onClick}
        className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
            active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
        }`}
    >
        {label}
    </button>
);

// Simple Clock Icon component since it wasn't imported from Lucide in previous context but used in new list
const ClockIcon = (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);
