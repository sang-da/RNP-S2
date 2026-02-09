
import React, { useState, useEffect, useMemo } from 'react';
import { Agency, WeekModule, Deliverable } from '../../types';
import { Layers, Zap } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { useGame } from '../../contexts/GameContext';
import { UploadModal } from './missions/UploadModal';
import { CharterModal, NamingModal } from './missions/SpecialForms';
import { useSubmissionLogic } from './missions/useSubmissionLogic';
import { INITIAL_WEEKS } from '../../constants';

// Sous-Composants
import { WeekSelector } from './missions/WeekSelector';
import { MissionList } from './missions/MissionList';

interface MissionsViewProps {
  agency: Agency;
  onUpdateAgency: (agency: Agency) => void;
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; 

export const MissionsView: React.FC<MissionsViewProps> = ({ agency, onUpdateAgency }) => {
  const { toast } = useUI();
  const { gameConfig, weeks: globalWeeks } = useGame(); 
  
  // 1. CYCLE ACTIF
  const [selectedCycle, setSelectedCycle] = useState<number>(1);

  useEffect(() => {
      if (gameConfig && gameConfig.currentCycle) {
          setSelectedCycle(Number(gameConfig.currentCycle));
      }
  }, [gameConfig.currentCycle]);

  // 2. SOURCE DE VÉRITÉ (HYBRIDE)
  // On prend INITIAL_WEEKS comme base structurelle (garantit que l'UI s'affiche tjrs)
  // Et on merge avec les données Globales (Admin) pour avoir le statut 'isVisible' à jour.
  const activeWeekData = useMemo(() => {
      const merged: { [key: string]: WeekModule } = { ...INITIAL_WEEKS };
      
      // On applique les surcharges Admin (Visibilité, modif de titre...)
      if (globalWeeks) {
          Object.keys(globalWeeks).forEach(key => {
              if (merged[key]) {
                  merged[key] = { ...merged[key], ...globalWeeks[key] };
              }
          });
      }
      return merged;
  }, [globalWeeks]);

  // 3. CONSTRUCTION DE LA ROADMAP
  const cycleWeeks = useMemo(() => {
      return Object.values(activeWeekData)
          .filter((w: WeekModule) => w.cycleId === selectedCycle)
          .sort((a: WeekModule, b: WeekModule) => parseInt(a.id) - parseInt(b.id));
  }, [activeWeekData, selectedCycle]);

  // 4. SEMAINE SÉLECTIONNÉE
  const [activeWeekId, setActiveWeekId] = useState<string>(""); 

  useEffect(() => {
    // Si aucune semaine active, on prend celle du jeu ou la première du cycle
    if (!activeWeekId) {
        const globalCurrentWeekStr = String(gameConfig.currentWeek);
        const isLiveInThisCycle = cycleWeeks.find(w => w.id === globalCurrentWeekStr);
        if (isLiveInThisCycle) setActiveWeekId(globalCurrentWeekStr);
        else if (cycleWeeks.length > 0) setActiveWeekId(cycleWeeks[0].id);
    }
  }, [cycleWeeks, gameConfig.currentWeek, activeWeekId]);

  // 5. PRÉPARATION DES DONNÉES DE LA SEMAINE ACTIVE
  const currentWeekDef = activeWeekData[activeWeekId];
  
  // --- VISIBILITY LOGIC (Global OR Local Override via Intel) ---
  const isGloballyVisible = currentWeekDef ? currentWeekDef.isVisible : false;
  // On vérifie si l'agence a payé pour débloquer cette semaine spécifique
  const isLocallyUnlocked = agency.progress && agency.progress[activeWeekId] && agency.progress[activeWeekId].isVisible === true;
  
  // La semaine est verrouillée SEULEMENT SI elle n'est ni visible globalement, ni débloquée localement
  const isWeekLocked = !isGloballyVisible && !isLocallyUnlocked;

  // Fusion avec les données locales étudiant (pour savoir ce qui est uploadé)
  const studentLocalData = agency.progress[activeWeekId];

  const displayDeliverables = useMemo(() => {
      if (!currentWeekDef) return [];
      return currentWeekDef.deliverables.map(adminDel => {
          const studentDel = studentLocalData?.deliverables.find(d => d.id === adminDel.id);
          return {
              ...adminDel, 
              status: studentDel ? studentDel.status : 'pending',
              fileUrl: studentDel?.fileUrl,
              feedback: studentDel?.feedback,
              grading: studentDel?.grading,
              submissionDate: studentDel?.submissionDate,
              selfAssessment: studentDel?.selfAssessment,
              nominatedMvpId: studentDel?.nominatedMvpId,
              deadline: adminDel.deadline // L'admin a toujours raison sur la deadline
          } as Deliverable;
      });
  }, [currentWeekDef, studentLocalData]);

  // --- LOGIQUE MODALES & UPLOAD ---
  const [targetDeliverableId, setTargetDeliverableId] = useState<string | null>(null);
  const [isCharterModalOpen, setIsCharterModalOpen] = useState(false);
  const [isNamingModalOpen, setIsNamingModalOpen] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  
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

  const handleFileClick = (deliverableId: string) => {
    if (isWeekLocked) return; // Sécurité double
    const deliverable = displayDeliverables.find(d => d.id === deliverableId);
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

  const onFileSelected = async (file: File) => {
    if (!file || !targetDeliverableId) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
        toast('error', `Fichier trop lourd (${(file.size/1024/1024).toFixed(1)}Mo). Max 50Mo.`);
        return;
    }
    setIsChecklistOpen(false); 
    await handleFileUpload(file, targetDeliverableId, activeWeekId, selfAssessment, nominatedMvp);
    setTargetDeliverableId(null);
  };

  const handleSubmitCharter = () => {
      const updatedAgency = { ...agency, projectDef: { ...agency.projectDef, ...charterForm, isLocked: false } };
      onUpdateAgency(updatedAgency);
      setIsCharterModalOpen(false);
      toast('success', "Charte projet mise à jour.");
  };

  const handleSubmitNaming = () => {
      const namingDeliverable = displayDeliverables.find(d => d.type === 'FORM_NAMING');
      if (!namingDeliverable) { setIsNamingModalOpen(false); return; }

      const autoBonusVE = 4;
      const currentAgencyWeek = agency.progress[activeWeekId] || { ...currentWeekDef, deliverables: displayDeliverables };
      
      const updatedDeliverable: Deliverable = {
          ...namingDeliverable,
          status: 'validated',
          feedback: "Validation Automatique : Nom d'agence enregistré (Standard B).",
          submissionDate: new Date().toISOString(),
          grading: { quality: 'B', daysLate: 0, constraintBroken: false, finalDelta: autoBonusVE }
      };

      const updatedWeek = { 
          ...currentAgencyWeek, 
          deliverables: currentAgencyWeek.deliverables.map(d => d.id === namingDeliverable.id ? updatedDeliverable : d) 
      };
      
      const newEvent = { id: `evt-naming-${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'VE_DELTA', label: 'Baptême Studio', deltaVE: autoBonusVE, description: `Changement de nom officiel : ${namingForm.name}. (+${autoBonusVE} VE Auto)` };

      const updatedAgency = { ...agency, name: namingForm.name, tagline: namingForm.tagline, ve_current: agency.ve_current + autoBonusVE, eventLog: [...agency.eventLog, newEvent], progress: { ...agency.progress, [activeWeekId]: updatedWeek } };
      onUpdateAgency(updatedAgency as any);
      setIsNamingModalOpen(false);
      toast('success', `Agence renommée : ${namingForm.name}`);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
        
        {/* CYCLE SELECTOR */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
            {[1, 2, 3, 4].map(cycleId => (
                <button
                    key={cycleId}
                    onClick={() => setSelectedCycle(cycleId)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                        selectedCycle === cycleId
                        ? 'bg-slate-900 text-white shadow-lg'
                        : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    <Layers size={14} className={selectedCycle === cycleId ? 'text-indigo-400' : 'text-slate-400'}/>
                    Cycle {cycleId}
                </button>
            ))}
        </div>

        {/* WEEK SELECTOR */}
        <WeekSelector 
            cycleWeeks={cycleWeeks}
            activeWeekId={activeWeekId}
            setActiveWeekId={setActiveWeekId}
            currentGlobalWeek={String(gameConfig.currentWeek)}
            isLoading={false} // On force false car on utilise INITIAL_WEEKS
        />

        {currentWeekDef ? (
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm relative overflow-hidden transition-all duration-500">
                
                {/* HEADER SEMAINE */}
                <div className="relative z-10 mb-6">
                    {String(currentWeekDef.id) === String(gameConfig.currentWeek) && (
                        <div className="absolute -top-6 -right-6 p-4 opacity-5 pointer-events-none">
                            <Zap size={120} />
                        </div>
                    )}
                    <h3 className="text-2xl font-display font-bold text-slate-900 mb-2">{currentWeekDef.title}</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        Cycle {selectedCycle} en cours
                        {String(currentWeekDef.id) === String(gameConfig.currentWeek) && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] animate-pulse">Phase Active</span>}
                        {isLocallyUnlocked && !isGloballyVisible && <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] border border-indigo-200">Débloqué via Intel</span>}
                    </p>
                </div>

                {/* LISTE DES MISSIONS (AVEC MODE BLUR SI LOCKED) */}
                <MissionList 
                    deliverables={displayDeliverables}
                    weekDef={currentWeekDef}
                    agencyClassId={agency.classId as string}
                    isUploading={isUploading}
                    onFileClick={handleFileClick}
                    getDynamicDeadline={getDynamicDeadline}
                    isLocked={isWeekLocked} // LOGIQUE MISE À JOUR
                />
            </div>
        ) : (
            <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border-2 border-dashed flex flex-col items-center gap-4">
                <Layers size={48} className="opacity-20"/>
                <p className="font-bold">Aucune semaine sélectionnée.</p>
            </div>
        )}

        <CharterModal isOpen={isCharterModalOpen} onClose={() => setIsCharterModalOpen(false)} onSubmit={handleSubmitCharter} form={charterForm} setForm={setCharterForm} />
        <NamingModal isOpen={isNamingModalOpen} onClose={() => setIsNamingModalOpen(false)} onSubmit={handleSubmitNaming} form={namingForm} setForm={setNamingForm} />
        
        <UploadModal 
            isOpen={isChecklistOpen} 
            onClose={() => setIsChecklistOpen(false)} 
            onFileSelect={onFileSelected} 
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