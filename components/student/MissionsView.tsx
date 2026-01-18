
import React, { useState, useRef, useEffect } from 'react';
import { Agency, WeekModule, GameEvent, CycleType, Deliverable } from '../../types';
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

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; 

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
  
  // FORMS & DATA
  const [charterForm, setCharterForm] = useState({ problem: "", target: "", location: "", gesture: "", context: "", theme: "", direction: "" });
  const [namingForm, setNamingForm] = useState({ name: "", tagline: "" });
  const [checks, setChecks] = useState({ naming: false, format: false, resolution: false, audio: false });
  const [selfAssessment, setSelfAssessment] = useState<'A'|'B'|'C'>('B'); // LUCIDITY
  const [nominatedMvp, setNominatedMvp] = useState<string | null>(null); // MVP SUGGESTION

  useEffect(() => {
      if (agency.projectDef) setCharterForm({ ...agency.projectDef } as any);
      setNamingForm({ name: agency.name || "", tagline: agency.tagline || "" });
  }, [agency]);

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

  const getDynamicDeadline = (week: WeekModule, classId: string): string | undefined => {
      const schedule = classId === 'A' ? week.schedule.classA : week.schedule.classB;
      if (!schedule || !schedule.date) return undefined;
      const sessionDate = new Date(schedule.date);
      if (schedule.slot === 'MATIN') sessionDate.setHours(9, 0, 0, 0); 
      else sessionDate.setHours(13, 30, 0, 0);
      return new Date(sessionDate.getTime() - 10 * 60000).toISOString();
  };

  const handleFileClick = (deliverableId: string) => {
    const deliverable = currentWeekData.deliverables.find(d => d.id === deliverableId);
    if (!deliverable) return;
    const type = deliverable.type || 'FILE';
    if (type === 'FORM_CHARTER') { setIsCharterModalOpen(true); return; }
    if (type === 'FORM_NAMING') { setIsNamingModalOpen(true); return; }
    setChecks({ naming: false, format: false, resolution: false, audio: false });
    setTargetDeliverableId(deliverableId);
    setSelfAssessment('B'); // Reset to default B
    setNominatedMvp(null); // Reset MVP
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
    if (!file || !targetDeliverableId) { if (fileInputRef.current) fileInputRef.current.value = ''; return; }

    const targetDeliverable = currentWeekData.deliverables.find(d => d.id === targetDeliverableId);
    const type = targetDeliverable?.type || 'FILE';

    if (file.size > MAX_FILE_SIZE_BYTES) {
        toast('error', `Fichier trop lourd.`);
        return;
    }

    setIsUploading(targetDeliverableId);
    toast('info', 'Envoi en cours...');
    
    try {
        let storagePath = `submissions/${agency.id}/${activeWeek}/${targetDeliverableId}_${file.name}`;
        if (type === 'SPECIAL_LOGO') storagePath = `logos/${agency.id}_${Date.now()}`;
        else if (type === 'SPECIAL_BANNER') storagePath = `banners/${agency.id}_${Date.now()}`;

        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);

        // --- MANUAL GRADING FOR LOGOS & BANNERS ---
        // Contrairement au Nommage, les fichiers visuels sont notés par le prof.
        // On ne valide PAS automatiquement ici.

        // --- EARLY BIRD CALCULATION ---
        let bonusScore = 0;
        const dynDeadline = getDynamicDeadline(currentWeekData, agency.classId as string);
        if (dynDeadline) {
            const diffMs = new Date(dynDeadline).getTime() - new Date().getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            if (diffHours > 24) bonusScore = 3;
            else if (diffHours > 12) bonusScore = 1;
        }

        const updatedDeliverables = currentWeekData.deliverables.map((d): Deliverable => 
            d.id === targetDeliverableId 
            ? { 
                ...d, 
                status: 'submitted', 
                fileUrl: downloadUrl, 
                feedback: bonusScore > 0 ? `Bonus Early Bird (+${bonusScore}) appliqué ! En attente de note.` : "Fichier reçu. En attente de notation.",
                submissionDate: new Date().toISOString(),
                selfAssessment: selfAssessment, 
                nominatedMvpId: nominatedMvp || undefined,
                grading: undefined // La note sera mise par l'admin via le Dashboard
              } 
            : d
        );

        const updatedWeek = { ...currentWeekData, deliverables: updatedDeliverables };
        
        // Création de l'événement de dépôt
        const newEvent: GameEvent = {
            id: `evt-${Date.now()}`, date: new Date().toISOString().split('T')[0], 
            type: 'INFO',
            label: `Dépôt: ${targetDeliverable?.name}`, 
            deltaVE: 0,
            description: bonusScore > 0 ? `Rendu anticipé ! Bonus Early Bird (+${bonusScore} Score).` : `Fichier transmis pour évaluation.`
        };

        // Apply Bonus Score to ALL members (Solidarity)
        const updatedMembers = agency.members.map(m => ({
            ...m, individualScore: Math.min(100, m.individualScore + bonusScore)
        }));

        let updatedAgency = {
            ...agency,
            members: updatedMembers,
            eventLog: [...agency.eventLog, newEvent],
            progress: { ...agency.progress, [activeWeek]: updatedWeek }
        };

        // Mise à jour visuelle immédiate (Logo/Bannière) même si pas encore noté
        if (type === 'SPECIAL_LOGO') updatedAgency.logoUrl = downloadUrl;
        else if (type === 'SPECIAL_BANNER') updatedAgency.branding = { ...updatedAgency.branding, bannerUrl: downloadUrl };

        onUpdateAgency(updatedAgency);
        
        if (bonusScore > 0) toast('success', `Early Bird ! +${bonusScore} points de score.`);
        else toast('success', "Fichier enregistré !");

    } catch (error: any) {
        toast('error', `Erreur : ${error.message}`);
    } finally {
        setIsUploading(null);
        setTargetDeliverableId(null);
        if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  const handleSubmitCharter = () => {
        setIsCharterModalOpen(false);
  };

  const handleSubmitNaming = () => {
      // 1. Trouver le livrable correspondant (FORM_NAMING)
      const namingDeliverable = currentWeekData.deliverables.find(d => d.type === 'FORM_NAMING');
      
      // Si pas de livrable trouvé (cas rare), on ferme juste la modale
      if (!namingDeliverable) {
          setIsNamingModalOpen(false);
          return;
      }

      // 2. Paramètres d'automatisation (Standard B = 4 VE)
      // LE NOMMAGE RESTE AUTOMATIQUE (Demande Utilisateur)
      const autoGrade: 'A' | 'B' | 'C' | 'REJECTED' = 'B';
      const autoBonusVE = 4;

      // 3. Mettre à jour le livrable (Validé automatiquement)
      const updatedDeliverable: Deliverable = {
          ...namingDeliverable,
          status: 'validated',
          feedback: "Validation Automatique : Nom d'agence enregistré (Standard B).",
          submissionDate: new Date().toISOString(),
          grading: {
              quality: autoGrade,
              daysLate: 0,
              constraintBroken: false,
              finalDelta: autoBonusVE
          }
      };

      const updatedWeek = {
          ...currentWeekData,
          deliverables: currentWeekData.deliverables.map(d => d.id === namingDeliverable.id ? updatedDeliverable : d)
      };

      // 4. Créer l'événement de gain de VE
      const newEvent: GameEvent = {
          id: `evt-naming-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'VE_DELTA',
          label: 'Baptême Studio',
          deltaVE: autoBonusVE,
          description: `Changement de nom officiel : ${namingForm.name}. (+${autoBonusVE} VE Auto)`
      };

      // 5. Mettre à jour l'agence (Nom, Tagline, VE, Logs)
      const updatedAgency = {
          ...agency,
          name: namingForm.name, // Renommage effectif
          tagline: namingForm.tagline,
          ve_current: agency.ve_current + autoBonusVE, // Gain immédiat
          eventLog: [...agency.eventLog, newEvent],
          progress: { ...agency.progress, [activeWeek]: updatedWeek }
      };

      // 6. Sauvegarde
      onUpdateAgency(updatedAgency);
      setIsNamingModalOpen(false);
      toast('success', `Agence renommée : ${namingForm.name} (+${autoBonusVE} VE)`);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
        <input type="file" ref={fileInputRef} className="hidden" onChange={onFileSelected} />
        
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar snap-x">
             {visibleWeeks.map((week: WeekModule) => (
                <button key={week.id} onClick={() => setActiveWeek(week.id)} className={`snap-center flex-shrink-0 px-5 py-3 rounded-2xl border-2 transition-all ${activeWeek === week.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>
                    <span className="font-display font-bold text-lg">SEM {week.id}</span>
                </button>
            ))}
        </div>

        {currentWeekData ? (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm">
            <h3 className="text-2xl font-display font-bold text-slate-900 mb-6">{currentWeekData.title}</h3>
            <div className="space-y-6">
                {currentWeekData.deliverables.map((deliverable) => {
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
        ) : ( <div className="p-8 text-center text-slate-400">Sélectionnez une semaine.</div> )}

        {/* --- MODALS --- */}
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
            selfAssessment={selfAssessment} 
            setSelfAssessment={setSelfAssessment}
            members={agency.members}
            nominatedMvp={nominatedMvp}
            setNominatedMvp={setNominatedMvp}
        />
    </div>
  );
};
