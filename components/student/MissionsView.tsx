
import React, { useState, useRef, useEffect } from 'react';
import { Agency, WeekModule, GameEvent, CycleType } from '../../types';
import { Crown, Compass, Mic, Eye } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { ref, uploadBytes, getDownloadURL, storage } from '../../services/firebase';
import { CYCLE_AWARDS } from '../../constants';

// SUB-COMPONENTS
import { MissionCard } from './missions/MissionCard';
import { UploadModal } from './missions/UploadModal';
import { CharterModal, NamingModal } from './missions/SpecialForms';

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
  
  // MODAL STATES
  const [isCharterModalOpen, setIsCharterModalOpen] = useState(false);
  const [isNamingModalOpen, setIsNamingModalOpen] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  
  // FORMS
  const [charterForm, setCharterForm] = useState({
      problem: "", target: "", location: "", gesture: "", context: "", theme: "", direction: ""
  });
  const [namingForm, setNamingForm] = useState({ name: "", tagline: "" });
  
  // CHECKLIST
  const [checks, setChecks] = useState({ naming: false, format: false, resolution: false, audio: false });

  // Pre-fill
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
      setNamingForm({ name: agency.name || "", tagline: agency.tagline || "" });
  }, [agency]);

  // --- HELPERS ---
  const CYCLE_MAPPING: Record<CycleType, string[]> = {
      [CycleType.MARQUE_BRIEF]: ['1', '2', '3'],
      [CycleType.NARRATION_IA]: ['4', '5', '6'],
      [CycleType.LOOKDEV]: ['7', '8', '9'],
      [CycleType.PACKAGING]: ['10', '11', '12']
  };
  const visibleWeeks = Object.values(agency.progress).filter((w: WeekModule) => (CYCLE_MAPPING[agency.currentCycle] || []).includes(w.id));
  const currentWeekData = agency.progress[activeWeek] || visibleWeeks[0];
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

  // --- DEADLINE CALCULATION ---
  // Règle : 10 minutes avant le début de la session.
  // MATIN = 09h00 -> Deadline 08h50
  // APRÈS-MIDI = 13h30 -> Deadline 13h20
  const getDynamicDeadline = (week: WeekModule, classId: string): string | undefined => {
      const schedule = classId === 'A' ? week.schedule.classA : week.schedule.classB;
      if (!schedule || !schedule.date) return undefined;

      const sessionDate = new Date(schedule.date);
      // Set time based on slot
      if (schedule.slot === 'MATIN') {
          sessionDate.setHours(9, 0, 0, 0); 
      } else {
          sessionDate.setHours(13, 30, 0, 0);
      }

      // Subtract 10 minutes
      const deadline = new Date(sessionDate.getTime() - 10 * 60000);
      return deadline.toISOString();
  };

  // --- ACTIONS ---
  const handleFileClick = (deliverableId: string) => {
    if (deliverableId === 'd_charter') { setIsCharterModalOpen(true); return; }
    if (deliverableId === 'd_branding') { setIsNamingModalOpen(true); return; }

    // STANDARD UPLOAD (Including Logo)
    setChecks({ naming: false, format: false, resolution: false, audio: false });
    setTargetDeliverableId(deliverableId);
    
    // Si c'est le logo, on peut bypass la checklist stricte ou adapter, 
    // mais pour l'instant on garde la checklist pour la forme.
    setIsChecklistOpen(true);
  };

  const handleChecklistSuccess = () => {
      setIsChecklistOpen(false);
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
          fileInputRef.current.click();
      }
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file || !targetDeliverableId) {
        if (!file) console.warn("Upload annulé");
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    setIsUploading(targetDeliverableId);
    toast('info', 'Envoi en cours...');
    
    try {
        let storagePath = `submissions/${agency.id}/${activeWeek}/${targetDeliverableId}_${file.name}`;
        
        // Spécial : Upload Logo
        if (targetDeliverableId === 'd_logo') {
            storagePath = `logos/${agency.id}_${Date.now()}`;
        }

        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);

        const feedback = "Fichier reçu. En attente de validation.";
        
        const updatedDeliverables = currentWeekData.deliverables.map(d => 
            d.id === targetDeliverableId 
            ? { ...d, status: 'submitted' as const, fileUrl: downloadUrl, feedback: feedback, submissionDate: new Date().toISOString() } 
            : d
        );

        const updatedWeek = { ...currentWeekData, deliverables: updatedDeliverables };
        const deliverableName = updatedDeliverables.find(d => d.id === targetDeliverableId)?.name || 'Inconnu';

        const newEvent: GameEvent = {
            id: `evt-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: 'INFO',
            label: `Dépôt: ${deliverableName}`,
            deltaVE: 0,
            description: `Fichier transmis avec succès.`
        };

        const updatedAgency = {
            ...agency,
            eventLog: [...agency.eventLog, newEvent],
            progress: { ...agency.progress, [activeWeek]: updatedWeek }
        };

        // Si c'était le logo, on met à jour le champ logoUrl de l'agence aussi
        if (targetDeliverableId === 'd_logo') {
            updatedAgency.logoUrl = downloadUrl;
        }

        onUpdateAgency(updatedAgency);
        toast('success', `Fichier "${file.name}" enregistré !`);

    } catch (error: any) {
        console.error("Upload Error:", error);
        toast('error', `Erreur lors de l'envoi : ${error.message}`);
    } finally {
        setIsUploading(null);
        setTargetDeliverableId(null);
        if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  const handleSubmitCharter = () => { 
      if (!charterForm.problem || !charterForm.target || !charterForm.location || !charterForm.theme) {
          toast('error', "Veuillez remplir les champs essentiels.");
          return;
      }
      const updatedWeek = { ...currentWeekData };
      updatedWeek.deliverables = updatedWeek.deliverables.map(d => 
          d.id === 'd_charter' ? { ...d, status: 'submitted' as const, feedback: "Charte enregistrée." } : d
      );
      const newEvent: GameEvent = {
            id: `evt-charter-${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'INFO',
            label: "Charte Projet Soumise", deltaVE: 0, description: "Définition du projet en attente de validation."
      };
      onUpdateAgency({
          ...agency,
          eventLog: [...agency.eventLog, newEvent],
          projectDef: { ...agency.projectDef, ...charterForm },
          progress: { ...agency.progress, [activeWeek]: updatedWeek }
      });
      setIsCharterModalOpen(false);
      toast('success', "Charte enregistrée !");
  };

  const handleSubmitNaming = () => {
      if (!namingForm.name || namingForm.name.length < 3) {
          toast('error', "Le nom doit faire au moins 3 caractères.");
          return;
      }
      const updatedWeek = { ...currentWeekData };
      updatedWeek.deliverables = updatedWeek.deliverables.map(d => 
          d.id === 'd_branding' ? { ...d, status: 'submitted' as const, feedback: "Identité enregistrée." } : d
      );
      const newEvent: GameEvent = {
            id: `evt-branding-${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'INFO',
            label: "Identité Studio Définie", deltaVE: 0, description: `Studio renommé en : ${namingForm.name}`
      };
      onUpdateAgency({
          ...agency,
          name: namingForm.name,
          tagline: namingForm.tagline,
          eventLog: [...agency.eventLog, newEvent],
          progress: { ...agency.progress, [activeWeek]: updatedWeek }
      });
      setIsNamingModalOpen(false);
      toast('success', "Studio renommé avec succès !");
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
        <input type="file" ref={fileInputRef} className="hidden" onChange={onFileSelected} />
        
        {/* CYCLE BANNER */}
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

        {/* WEEK SLIDER */}
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

        {/* CURRENT WEEK DELIVERABLES */}
        {currentWeekData ? (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm">
            <h3 className="text-2xl font-display font-bold text-slate-900 mb-6">{currentWeekData.title}</h3>
            <div className="space-y-6">
                {currentWeekData.deliverables.map((deliverable) => {
                    // Inject calculated deadline if not manually overridden
                    const dynDeadline = getDynamicDeadline(currentWeekData, agency.classId as string);
                    const finalDeliverable = { ...deliverable, deadline: deliverable.deadline || dynDeadline };

                    return (
                        <MissionCard 
                            key={deliverable.id} 
                            deliverable={finalDeliverable} 
                            isUploading={isUploading === deliverable.id}
                            onAction={handleFileClick}
                        />
                    );
                })}
            </div>
        </div>
        ) : (
            <div className="p-8 text-center text-slate-400">Sélectionnez une semaine.</div>
        )}

        {/* MODALS */}
        <CharterModal 
            isOpen={isCharterModalOpen} 
            onClose={() => setIsCharterModalOpen(false)} 
            onSubmit={handleSubmitCharter} 
            form={charterForm} 
            setForm={setCharterForm} 
        />
        
        <NamingModal 
            isOpen={isNamingModalOpen} 
            onClose={() => setIsNamingModalOpen(false)} 
            onSubmit={handleSubmitNaming} 
            form={namingForm} 
            setForm={setNamingForm} 
        />

        <UploadModal 
            isOpen={isChecklistOpen} 
            onClose={() => setIsChecklistOpen(false)} 
            onConfirm={handleChecklistSuccess}
            checks={checks}
            setChecks={setChecks}
        />
    </div>
  );
};
