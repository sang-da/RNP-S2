
import React, { useState, useEffect, useMemo } from 'react';
import { Agency, WeekModule, GameEvent, Deliverable } from '../../types';
import { Layers, Zap, Lock } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { useGame } from '../../contexts/GameContext';
import { MissionCard } from './missions/MissionCard';
import { LockedMissionCard } from './missions/LockedMissionCard';
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
  const { gameConfig, weeks: globalWeeks } = useGame(); 
  
  // FALLBACK INTELLIGENT : Si la synchro globale échoue, on utilise la copie locale de l'agence
  const weeksSource = (globalWeeks && Object.keys(globalWeeks).length > 0) ? globalWeeks : agency.progress;

  // 1. DÉTERMINATION DU CYCLE ACTIF
  const [selectedCycle, setSelectedCycle] = useState<number>(1);

  useEffect(() => {
      if (gameConfig && gameConfig.currentCycle) {
          setSelectedCycle(Number(gameConfig.currentCycle));
      }
  }, [gameConfig.currentCycle]);

  // 2. CONSTRUCTION DE LA ROADMAP
  const cycleWeeks = useMemo(() => {
      if (!weeksSource) return [];
      const allWeeks = Object.values(weeksSource) as WeekModule[];
      
      return allWeeks
          .filter((w: WeekModule) => w.cycleId === selectedCycle)
          .sort((a, b) => parseInt(a.id) - parseInt(b.id));
  }, [weeksSource, selectedCycle]);

  // 3. SEMAINE ACTIVE
  const [activeWeekId, setActiveWeekId] = useState<string>(""); 

  useEffect(() => {
    const globalCurrentWeekStr = String(gameConfig.currentWeek);
    const isLiveInThisCycle = cycleWeeks.find(w => w.id === globalCurrentWeekStr);

    if (isLiveInThisCycle) {
        setActiveWeekId(globalCurrentWeekStr);
    } else if (cycleWeeks.length > 0) {
        setActiveWeekId(cycleWeeks[0].id);
    }
  }, [cycleWeeks, gameConfig.currentWeek]);

  // 4. RÉCUPÉRATION DÉFINITION
  const weekDef = weeksSource[activeWeekId];
  
  // On utilise isVisible comme seule source de vérité pour l'affichage
  const isDisplayedWeekVisible = weekDef ? weekDef.isVisible : false;

  // 5. FUSION DES DONNÉES
  const studentWeekData = agency.progress[activeWeekId];

  const mergedDeliverables = useMemo(() => {
      if (!weekDef) return [];
      
      return weekDef.deliverables.map(adminDel => {
          const studentDel = studentWeekData?.deliverables.find(d => d.id === adminDel.id);
          
          return {
              ...adminDel, 
              deadline: adminDel.deadline,
              status: studentDel ? studentDel.status : 'pending',
              fileUrl: studentDel?.fileUrl,
              feedback: studentDel?.feedback,
              grading: studentDel?.grading,
              submissionDate: studentDel?.submissionDate,
              selfAssessment: studentDel?.selfAssessment,
              nominatedMvpId: studentDel?.nominatedMvpId
          } as Deliverable;
      });
  }, [weekDef, studentWeekData]);

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
    const deliverable = mergedDeliverables.find(d => d.id === deliverableId);
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
      const namingDeliverable = mergedDeliverables.find(d => d.type === 'FORM_NAMING');
      if (!namingDeliverable) { setIsNamingModalOpen(false); return; }

      const autoBonusVE = 4;
      const currentAgencyWeek = agency.progress[activeWeekId] || { ...weekDef, deliverables: mergedDeliverables };
      
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
      
      const newEvent: GameEvent = { id: `evt-naming-${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'VE_DELTA', label: 'Baptême Studio', deltaVE: autoBonusVE, description: `Changement de nom officiel : ${namingForm.name}. (+${autoBonusVE} VE Auto)` };

      const updatedAgency = { ...agency, name: namingForm.name, tagline: namingForm.tagline, ve_current: agency.ve_current + autoBonusVE, eventLog: [...agency.eventLog, newEvent], progress: { ...agency.progress, [activeWeekId]: updatedWeek } };
      onUpdateAgency(updatedAgency);
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
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar snap-x">
             {cycleWeeks.length === 0 ? (
                 <div className="text-sm text-slate-400 italic px-4 py-2">Aucune semaine disponible pour ce cycle.</div>
             ) : (
                 cycleWeeks.map((week: WeekModule) => {
                    const isLive = String(week.id) === String(gameConfig.currentWeek);
                    const isVisible = week.isVisible;
                    const isActive = activeWeekId === week.id;

                    return (
                        <button 
                            key={week.id} 
                            onClick={() => setActiveWeekId(week.id)} 
                            className={`snap-center flex-shrink-0 px-5 py-3 rounded-2xl border-2 transition-all flex flex-col items-center relative min-w-[100px] group ${
                                isActive
                                ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                                : isVisible 
                                    ? 'bg-white border-slate-100 text-slate-500 hover:border-slate-200' 
                                    : 'bg-slate-50 border-slate-200 text-slate-400 opacity-70 hover:opacity-100'
                            }`}
                        >
                            {isLive && (
                                <div className="absolute -top-2 bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm z-10">
                                    <Zap size={8} className="fill-white"/> LIVE
                                </div>
                            )}
                            {!isVisible && (
                                <div className="absolute top-2 right-2">
                                    <Lock size={10} className="text-slate-400"/>
                                </div>
                            )}
                            <span className="font-display font-bold text-lg">SEM {week.id}</span>
                            <span className="text-[8px] font-black opacity-60 uppercase mt-0.5">
                                {isVisible ? (isLive ? 'En cours' : 'Dispo') : 'Bientôt'}
                            </span>
                        </button>
                    );
                 })
             )}
        </div>

        {weekDef ? (
            isDisplayedWeekVisible ? (
                // SEMAINE VISIBLE
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                    {String(weekDef.id) === String(gameConfig.currentWeek) && (
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Zap size={120} />
                        </div>
                    )}
                    <h3 className="text-2xl font-display font-bold text-slate-900 mb-2">{weekDef.title}</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase mb-6 tracking-widest flex items-center gap-2">
                        Cycle {selectedCycle} en cours
                        {String(weekDef.id) === String(gameConfig.currentWeek) && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] animate-pulse">Phase Active</span>}
                    </p>
                    <div className="space-y-6">
                        {mergedDeliverables.map((deliverable) => {
                            const dynDeadline = getDynamicDeadline(weekDef, agency.classId as string);
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
                // SEMAINE VERROUILLÉE
                <LockedMissionCard week={weekDef} />
            )
        ) : cycleWeeks.length > 0 && ( 
            <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border-2 border-dashed flex flex-col items-center gap-4">
                <Layers size={48} className="opacity-20"/>
                <div>
                    <p className="font-bold">Sélectionnez une semaine.</p>
                </div>
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
