
import React, { useState, useRef, useEffect } from 'react';
import { Agency, WeekModule, GameEvent, CycleType } from '../../types';
import { CheckCircle2, Upload, MessageSquare, Loader2, FileText, Send, XCircle, ArrowRight, CheckSquare, Crown, Compass, Mic, Eye, Save } from 'lucide-react';
import { Modal } from '../Modal';
import { useUI } from '../../contexts/UIContext';
import { ref, uploadBytes, getDownloadURL, storage } from '../../services/firebase';
import { CYCLE_AWARDS, getAgencyPerformanceMultiplier } from '../../constants';

interface MissionsViewProps {
  agency: Agency;
  onUpdateAgency: (agency: Agency) => void;
}

export const MissionsView: React.FC<MissionsViewProps> = ({ agency, onUpdateAgency }) => {
  const { toast } = useUI();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeWeek, setActiveWeek] = useState<string>("1"); 
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [targetDeliverableId, setTargetDeliverableId] = useState<string | null>(null);
  const [isCharterModalOpen, setIsCharterModalOpen] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  
  // Charter Form State
  const [charterForm, setCharterForm] = useState({
      problem: "",
      target: "",
      location: "",
      gesture: "",
      context: "",
      theme: "",
      direction: ""
  });

  // Pre-fill charter form if data exists
  useEffect(() => {
      if (agency.projectDef) {
          setCharterForm({
              problem: agency.projectDef.problem || "",
              target: agency.projectDef.target || "",
              location: agency.projectDef.location || "",
              gesture: agency.projectDef.gesture || "",
              context: agency.projectDef.context || "",
              theme: agency.projectDef.theme || "",
              direction: agency.projectDef.direction || ""
          });
      }
  }, [agency.projectDef]);
  
  // Checklist State
  const [checks, setChecks] = useState({
      naming: false,
      format: false,
      resolution: false,
      audio: false
  });

  const CYCLE_MAPPING: Record<CycleType, string[]> = {
      [CycleType.MARQUE_BRIEF]: ['1', '2', '3'],
      [CycleType.NARRATION_IA]: ['4', '5', '6'],
      [CycleType.LOOKDEV]: ['7', '8', '9'],
      [CycleType.PACKAGING]: ['10', '11', '12']
  };

  const visibleWeeks = Object.values(agency.progress).filter((w: WeekModule) => (CYCLE_MAPPING[agency.currentCycle] || []).includes(w.id));
  const currentWeekData = agency.progress[activeWeek] || visibleWeeks[0];

  // FIND CURRENT AWARD
  const currentAward = CYCLE_AWARDS.find(a => a.cycleId === agency.currentCycle);
  const hasWonAward = agency.eventLog.some(e => e.label.includes(currentAward?.title || 'Grand Prix'));

  const getAwardIcon = (iconName: string) => {
      switch(iconName) {
          case 'compass': return <Compass size={24} />;
          case 'mic': return <Mic size={24} />;
          case 'eye': return <Eye size={24} />;
          default: return <Crown size={24} />;
      }
  };

  const handleFileClick = (deliverableId: string) => {
    if (deliverableId === 'd_charter') {
        setIsCharterModalOpen(true);
        return;
    }
    // RESET CHECKLIST AND OPEN MODAL
    setChecks({ naming: false, format: false, resolution: false, audio: false });
    setTargetDeliverableId(deliverableId);
    setIsChecklistOpen(true);
  };

  const handleChecklistSuccess = () => {
      setIsChecklistOpen(false);
      fileInputRef.current?.click();
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetDeliverableId) return;

    setIsUploading(targetDeliverableId);
    
    try {
        const storageRef = ref(storage, `submissions/${agency.id}/${activeWeek}/${targetDeliverableId}_${file.name}`);
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);

        const feedback = "Fichier reçu. En attente de validation.";
        const updatedWeek = { ...currentWeekData };
        
        updatedWeek.deliverables = updatedWeek.deliverables.map(d => 
            d.id === targetDeliverableId ? { ...d, status: 'submitted' as const, fileUrl: downloadUrl, feedback: feedback } : d
        );

        // --- PERFORMANCE MULTIPLIER LOGIC ---
        const baseGain = 5;
        const multiplier = getAgencyPerformanceMultiplier(agency);
        const finalGain = Math.round(baseGain * multiplier);
        const perfPercent = Math.round(multiplier * 100);

        const newEvent: GameEvent = {
            id: `evt-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: 'VE_DELTA',
            label: `Rendu ${updatedWeek.deliverables.find(d => d.id === targetDeliverableId)?.name}`,
            deltaVE: finalGain,
            description: `Fichier uploadé. Gain VE ajusté à la performance d'équipe (${perfPercent}%).`
        };

        onUpdateAgency({
            ...agency,
            ve_current: Math.min(100, agency.ve_current + finalGain),
            eventLog: [...agency.eventLog, newEvent],
            progress: { ...agency.progress, [activeWeek]: updatedWeek }
        });
        toast('success', `Fichier transmis ! Gain : +${finalGain} VE (Perf. ${perfPercent}%)`);

    } catch (error) {
        toast('error', "Erreur lors de l'envoi du fichier.");
    } finally {
        setIsUploading(null);
        setTargetDeliverableId(null);
        if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  const handleSubmitCharter = () => { 
      if (!charterForm.problem || !charterForm.target || !charterForm.location || !charterForm.theme) {
          toast('error', "Veuillez remplir les champs essentiels (Thème, Problème, Cible, Lieu).");
          return;
      }

      const updatedWeek = { ...currentWeekData };
      updatedWeek.deliverables = updatedWeek.deliverables.map(d => 
          d.id === 'd_charter' ? { ...d, status: 'submitted' as const, feedback: "Charte enregistrée. En attente validation." } : d
      );

      const newEvent: GameEvent = {
            id: `evt-charter-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: 'VE_DELTA',
            label: "Charte Projet",
            deltaVE: 10,
            description: "Définition complète du projet soumise."
      };

      onUpdateAgency({
          ...agency,
          ve_current: Math.min(100, agency.ve_current + 10),
          eventLog: [...agency.eventLog, newEvent],
          projectDef: { ...agency.projectDef, ...charterForm },
          progress: { ...agency.progress, [activeWeek]: updatedWeek }
      });

      setIsCharterModalOpen(false);
      toast('success', "Charte enregistrée et soumise ! (+10 VE)");
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
        <input type="file" ref={fileInputRef} className="hidden" onChange={onFileSelected} />
        
        {/* CYCLE BANNER & AWARD TARGET */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="relative z-10 text-center md:text-left">
                <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest">Cycle Actuel</span>
                <h3 className="font-display font-bold text-2xl">{agency.currentCycle}</h3>
            </div>

            {currentAward && (
                <div className={`relative z-10 p-4 rounded-xl border flex items-center gap-4 max-w-sm w-full ${hasWonAward ? 'bg-yellow-400 text-yellow-900 border-yellow-300' : 'bg-white/10 border-white/20'}`}>
                    <div className={`p-3 rounded-full ${hasWonAward ? 'bg-white/30' : 'bg-yellow-400 text-yellow-900 shadow-[0_0_15px_rgba(250,204,21,0.5)]'}`}>
                        {getAwardIcon(currentAward.iconName)}
                    </div>
                    <div className="text-left flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 block">{hasWonAward ? "GRAND PRIX REMPORTÉ !" : "OBJECTIF DU CYCLE"}</span>
                        <h4 className="font-bold text-lg leading-none">{currentAward.title}</h4>
                        <div className="flex gap-2 mt-1">
                            <span className="text-xs font-bold px-1.5 py-0.5 bg-white/20 rounded">+{currentAward.veBonus} VE</span>
                            <span className="text-xs font-bold px-1.5 py-0.5 bg-white/20 rounded">+{currentAward.weeklyBonus} PiXi/sem</span>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Week Slider */}
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar snap-x">
             {visibleWeeks.map((week: WeekModule) => (
                <button
                    key={week.id}
                    onClick={() => setActiveWeek(week.id)}
                    className={`snap-center flex-shrink-0 px-5 py-3 rounded-2xl border-2 transition-all flex flex-col items-start min-w-[120px] ${
                        activeWeek === week.id 
                        ? 'bg-slate-900 border-slate-900 text-white' 
                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                    }`}
                >
                    <span className="font-display font-bold text-lg">SEM {week.id}</span>
                </button>
            ))}
        </div>

        {currentWeekData ? (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm">
            <h3 className="text-2xl font-display font-bold text-slate-900 mb-6">{currentWeekData.title}</h3>

            <div className="space-y-6">
                {currentWeekData.deliverables.map((deliverable) => (
                    <div key={deliverable.id} className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h4 className="font-bold text-lg text-slate-900">{deliverable.name}</h4>
                                    <p className="text-sm text-slate-500">{deliverable.description}</p>
                                </div>
                                <div className={`p-2 rounded-xl ${
                                    deliverable.status === 'validated' ? 'bg-emerald-100 text-emerald-600' :
                                    deliverable.status === 'submitted' ? 'bg-indigo-100 text-indigo-600' :
                                    'bg-white text-slate-400 border'
                                }`}>
                                    {deliverable.status === 'validated' ? <CheckCircle2 size={20}/> : 
                                     deliverable.status === 'submitted' ? <Loader2 size={20} className="animate-spin"/> : 
                                     <Upload size={20}/>}
                                </div>
                            </div>

                            {/* ACTIONS FOOTER */}
                            <div className="flex items-center justify-end gap-4 mt-2 pt-3 border-t border-slate-200/50">
                                
                                {/* Secondary Action: Link (Text Only) */}
                                {deliverable.fileUrl && deliverable.fileUrl !== '#' && (
                                    <a 
                                        href={deliverable.fileUrl} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 mr-auto"
                                    >
                                        <FileText size={14} /> Voir le fichier
                                    </a>
                                )}

                                {/* Primary Action: Button */}
                                {(deliverable.status === 'pending' || deliverable.status === 'rejected') ? (
                                    <button 
                                        onClick={() => !isUploading && handleFileClick(deliverable.id)}
                                        disabled={!!isUploading}
                                        className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-transform active:scale-95 ${
                                            deliverable.id === 'd_charter' 
                                            ? 'bg-slate-900 text-white' 
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                        }`}
                                    >
                                        {isUploading === deliverable.id ? <Loader2 className="animate-spin" size={16}/> : deliverable.id === 'd_charter' ? <FileText size={16}/> : <Upload size={16}/>}
                                        {deliverable.id === 'd_charter' ? 'Remplir le Formulaire' : 'Déposer'}
                                    </button>
                                ) : (
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider py-2">
                                        {deliverable.status === 'submitted' ? 'En attente...' : 'Validé'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        ) : (
            <div className="p-8 text-center text-slate-400">Sélectionnez une semaine.</div>
        )}

        {/* MODAL: Charter Form */}
        <Modal isOpen={isCharterModalOpen} onClose={() => setIsCharterModalOpen(false)} title="Charte de Projet">
             <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                 <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-sm text-indigo-800">
                     Définissez l'identité de votre projet. Ces informations seront visibles par l'administration et sur votre tableau de bord.
                 </div>

                 {/* SECTION 1: IDENTITÉ */}
                 <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                     <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 pb-2">1. Identité</h4>
                     <div>
                         <label className="text-xs font-bold text-slate-700 mb-1 block">Thème Principal</label>
                         <input 
                            type="text"
                            value={charterForm.theme}
                            onChange={e => setCharterForm({...charterForm, theme: e.target.value})}
                            className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm"
                            placeholder="Ex: Écologie Urbaine / Cyber-Surveillance..."
                         />
                     </div>
                     <div>
                         <label className="text-xs font-bold text-slate-700 mb-1 block">Direction Artistique (Intention)</label>
                         <textarea 
                            value={charterForm.direction}
                            onChange={e => setCharterForm({...charterForm, direction: e.target.value})}
                            className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm h-20"
                            placeholder="Ex: Minimaliste, néon, textures brutes..."
                         />
                     </div>
                 </div>

                 {/* SECTION 2: PROBLÉMATIQUE */}
                 <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                     <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 pb-2">2. Problématique</h4>
                     <div>
                         <label className="text-xs font-bold text-slate-700 mb-1 block">Contexte (Sociétal/Urbain)</label>
                         <textarea 
                            value={charterForm.context}
                            onChange={e => setCharterForm({...charterForm, context: e.target.value})}
                            className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm h-20"
                            placeholder="Ex: Dans une ville saturée par la publicité..."
                         />
                     </div>
                     <div>
                         <label className="text-xs font-bold text-slate-700 mb-1 block">Problème Identifié</label>
                         <textarea 
                            value={charterForm.problem}
                            onChange={e => setCharterForm({...charterForm, problem: e.target.value})}
                            className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm h-20"
                            placeholder="Quel problème local essayez-vous de résoudre ?"
                         />
                     </div>
                 </div>

                 {/* SECTION 3: CIBLE & LIEU */}
                 <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                     <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 pb-2">3. Ancrage</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                             <label className="text-xs font-bold text-slate-700 mb-1 block">Cible (Persona)</label>
                             <input 
                                type="text"
                                value={charterForm.target}
                                onChange={e => setCharterForm({...charterForm, target: e.target.value})}
                                className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm"
                                placeholder="Qui est votre utilisateur ?"
                             />
                         </div>
                         <div>
                             <label className="text-xs font-bold text-slate-700 mb-1 block">Lieu</label>
                             <input 
                                type="text"
                                value={charterForm.location}
                                onChange={e => setCharterForm({...charterForm, location: e.target.value})}
                                className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm"
                                placeholder="Adresse ou Quartier"
                             />
                         </div>
                     </div>
                     <div>
                         <label className="text-xs font-bold text-slate-700 mb-1 block">Geste Architectural</label>
                         <input 
                            type="text"
                            value={charterForm.gesture}
                            onChange={e => setCharterForm({...charterForm, gesture: e.target.value})}
                            className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm"
                            placeholder="Ex: Kiosque, Passerelle..."
                         />
                     </div>
                 </div>

                 <div className="pt-2 sticky bottom-0 bg-white pb-2">
                     <button 
                        onClick={handleSubmitCharter}
                        className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2 shadow-lg"
                     >
                         <Save size={18} /> Enregistrer & Soumettre
                     </button>
                 </div>
             </div>
        </Modal>

        {/* MODAL: Checklist Pré-Rendu */}
        <Modal isOpen={isChecklistOpen} onClose={() => setIsChecklistOpen(false)} title="Contrôle Qualité">
            <div className="space-y-6">
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm text-amber-800">
                    Avant de déposer, certifiez la conformité de votre fichier. Un mauvais format entraînera un rejet immédiat.
                </div>

                <div className="space-y-3">
                    <CheckItem 
                        label="Nommage Correct" 
                        sub="GRPXX_SEMXX_NomLivrable_vXX.ext"
                        checked={checks.naming} 
                        onChange={() => setChecks({...checks, naming: !checks.naming})}
                    />
                    <CheckItem 
                        label="Format de Fichier" 
                        sub="MP4 (H.264) ou PDF ou PNG"
                        checked={checks.format} 
                        onChange={() => setChecks({...checks, format: !checks.format})}
                    />
                    <CheckItem 
                        label="Spécifications Techniques" 
                        sub="1080p / < 50Mo"
                        checked={checks.resolution} 
                        onChange={() => setChecks({...checks, resolution: !checks.resolution})}
                    />
                    <CheckItem 
                        label="Conformité Audio" 
                        sub="Pas de saturation / LUFS OK"
                        checked={checks.audio} 
                        onChange={() => setChecks({...checks, audio: !checks.audio})}
                    />
                </div>

                <button 
                    onClick={handleChecklistSuccess}
                    disabled={!Object.values(checks).every(Boolean)}
                    className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                        Object.values(checks).every(Boolean) 
                        ? 'bg-slate-900 text-white hover:bg-indigo-600 shadow-lg' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                >
                    {Object.values(checks).every(Boolean) ? <><Upload size={18}/> Confirmer le Dépôt</> : 'Validez la checklist'}
                </button>
            </div>
        </Modal>
    </div>
  );
};

const CheckItem: React.FC<{label: string, sub: string, checked: boolean, onChange: () => void}> = ({label, sub, checked, onChange}) => (
    <div 
        onClick={onChange}
        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
            checked ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
        }`}
    >
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
            checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
        }`}>
            {checked && <CheckSquare size={14} className="text-white"/>}
        </div>
        <div>
            <p className={`font-bold text-sm ${checked ? 'text-emerald-900' : 'text-slate-700'}`}>{label}</p>
            <p className="text-xs text-slate-500">{sub}</p>
        </div>
    </div>
);
