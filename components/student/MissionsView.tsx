
import React, { useState, useRef, useEffect } from 'react';
import { Agency, WeekModule, GameEvent, CycleType, Deliverable } from '../../types';
import { Crown, Compass, Mic, Eye } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { CYCLE_AWARDS } from '../../constants';

// SUB-COMPONENTS
import { MissionCard } from './missions/MissionCard';
import { UploadModal } from './missions/UploadModal';
import { CharterModal, NamingModal } from './missions/SpecialForms';
import { useSubmissionLogic } from './missions/useSubmissionLogic';

interface MissionsViewProps {
  agency: Agency;
  onUpdateAgency: (agency: Agency) => void;
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; 

export const MissionsView: React.FC<MissionsViewProps> = ({ agency, onUpdateAgency }) => {
  const { toast } = useUI();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeWeek, setActiveWeek] = useState<string>("1"); 
  const [targetDeliverableId, setTargetDeliverableId] = useState<string | null>(null);
  
  // MODAL STATES
  const [isCharterModalOpen, setIsCharterModalOpen] = useState(false);
  const [isNamingModalOpen, setIsNamingModalOpen] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  
  // FORMS & DATA
  const [charterForm, setCharterForm] = useState({ problem: "", target: "", location: "", gesture: "", context: "", theme: "", direction: "" });
  const [namingForm, setNamingForm] = useState({ name: "", tagline: "" });
  const [checks, setChecks] = useState({ naming: false, format: false, resolution: false, audio: false });
  const [selfAssessment, setSelfAssessment] = useState<'A'|'B'|'C'>('B');
  const [nominatedMvp, setNominatedMvp] = useState<string | null>(null);

  const { isUploading, handleFileUpload, getDynamicDeadline } = useSubmissionLogic(agency, onUpdateAgency);

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

  const handleFileClick = (deliverableId: string) => {
    const deliverable = currentWeekData.deliverables.find(d => d.id === deliverableId);
    if (!deliverable) return;
    const type = deliverable.type || 'FILE';
    if (type === 'FORM_CHARTER') { setIsCharterModalOpen(true); return; }
    if (type === 'FORM_NAMING') { setIsNamingModalOpen(true); return; }
    setChecks({ naming: false, format: false, resolution: false, audio: false });
    setTargetDeliverableId(deliverableId);
    setSelfAssessment('B');
    setNominatedMvp(null);
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

    if (file.size > MAX_FILE_SIZE_BYTES) {
        toast('error', `Fichier trop lourd.`);
        return;
    }

    await handleFileUpload(file, targetDeliverableId, activeWeek, selfAssessment, nominatedMvp);
    
    // Reset state
    setTargetDeliverableId(null);
    if (fileInputRef.current) fileInputRef.current.value = ''; 
  };

  const handleSubmitCharter = () => {
      const updatedAgency = {
          ...agency,
          projectDef: { ...agency.projectDef, ...charterForm, isLocked: false }
      };
      onUpdateAgency(updatedAgency);
      setIsCharterModalOpen(false);
      toast('success', "Charte projet mise à jour.");
  };

  const handleSubmitNaming = () => {
      const namingDeliverable = currentWeekData.deliverables.find(d => d.type === 'FORM_NAMING');
      if (!namingDeliverable) { setIsNamingModalOpen(false); return; }

      const autoGrade: 'A' | 'B' | 'C' | 'REJECTED' = 'B';
      const autoBonusVE = 4;

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

      const newEvent: GameEvent = {
          id: `evt-naming-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'VE_DELTA',
          label: 'Baptême Studio',
          deltaVE: autoBonusVE,
          description: `Changement de nom officiel : ${namingForm.name}. (+${autoBonusVE} VE Auto)`
      };

      const updatedAgency = {
          ...agency,
          name: namingForm.name,
          tagline: namingForm.tagline,
          ve_current: agency.ve_current + autoBonusVE,
          eventLog: [...agency.eventLog, newEvent],
          progress: { ...agency.progress, [activeWeek]: updatedWeek }
      };

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

        <CharterModal isOpen={isCharterModalOpen} onClose={() => setIsCharterModalOpen(false)} onSubmit={handleSubmitCharter} form={charterForm} setForm={setCharterForm} />
        <NamingModal isOpen={isNamingModalOpen} onClose={() => setIsNamingModalOpen(false)} onSubmit={handleSubmitNaming} form={namingForm} setForm={setNamingForm} />
        <UploadModal isOpen={isChecklistOpen} onClose={() => setIsChecklistOpen(false)} onConfirm={handleChecklistSuccess} checks={checks} setChecks={setChecks} selfAssessment={selfAssessment} setSelfAssessment={setSelfAssessment} members={agency.members} nominatedMvp={nominatedMvp} setNominatedMvp={setNominatedMvp} />
    </div>
  );
};
