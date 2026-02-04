
import React, { useState, useEffect, useMemo } from 'react';
import { Agency, WeekModule, GameEvent, CycleType, Deliverable } from '../../types';
import { Layers, Zap } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { useGame } from '../../contexts/GameContext';
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
  const { gameConfig, weeks: globalWeeks } = useGame();
  
  // NAVIGATION DES CYCLES
  const [selectedCycle, setSelectedCycle] = useState<number>(gameConfig.currentCycle || 1);

  // LOGIQUE DE FILTRE PAR CYCLE ET VISIBILITÉ
  const visibleWeeks = useMemo(() => {
      const allWeeks = Object.values(agency.progress) as WeekModule[];
      return allWeeks
          .filter((w: WeekModule) => {
              const globalConf = globalWeeks[w.id];
              const isVisible = globalConf ? (globalConf.isVisible !== false) : true;
              return w.cycleId === selectedCycle && isVisible;
          })
          .sort((a, b) => parseInt(a.id) - parseInt(b.id));
  }, [agency.progress, selectedCycle, globalWeeks]);

  const [activeWeek, setActiveWeek] = useState<string>(""); 

  useEffect(() => {
    const globalWeekStr = gameConfig.currentWeek.toString();
    const isGlobalVisible = visibleWeeks.find(w => w.id === globalWeekStr);

    if (isGlobalVisible) {
        setActiveWeek(globalWeekStr);
    } else if (visibleWeeks.length > 0) {
        setActiveWeek(visibleWeeks[visibleWeeks.length - 1].id);
    }
  }, [visibleWeeks, gameConfig.currentWeek, selectedCycle]);

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

  const currentWeekData = agency.progress[activeWeek];

  const handleFileClick = (deliverableId: string) => {
    const deliverable = currentWeekData?.deliverables.find(d => d.id === deliverableId);
    if (!deliverable) return;
    const type = deliverable.type || 'FILE';
    if (type === 'FORM_CHARTER') { setIsCharterModalOpen(true); return; }
    if (type === 'FORM_NAMING') { setIsNamingModalOpen(true); return; }
    
    // Reset Checklist
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

    setIsChecklistOpen(false); // Close modal before upload starts to show progress on card
    await handleFileUpload(file, targetDeliverableId, activeWeek, selfAssessment, nominatedMvp);
    setTargetDeliverableId(null);
  };

  const handleSubmitCharter = () => {
      const updatedAgency = { ...agency, projectDef: { ...agency.projectDef, ...charterForm, isLocked: false } };
      onUpdateAgency(updatedAgency);
      setIsCharterModalOpen(false);
      toast('success', "Charte projet mise à jour.");
  };

  const handleSubmitNaming = () => {
      const namingDeliverable = currentWeekData?.deliverables.find(d => d.type === 'FORM_NAMING');
      if (!namingDeliverable) { setIsNamingModalOpen(false); return; }

      const autoBonusVE = 4;
      const updatedDeliverable: Deliverable = {
          ...namingDeliverable,
          status: 'validated',
          feedback: "Validation Automatique : Nom d'agence enregistré (Standard B).",
          submissionDate: new Date().toISOString(),
          grading: { quality: 'B', daysLate: 0, constraintBroken: false, finalDelta: autoBonusVE }
      };

      const updatedWeek = { ...currentWeekData, deliverables: currentWeekData.deliverables.map(d => d.id === namingDeliverable.id ? updatedDeliverable : d) };
      const newEvent: GameEvent = { id: `evt-naming-${Date.now()}`, date: new Date().toISOString().split('T')[0], type: 'VE_DELTA', label: 'Baptême Studio', deltaVE: autoBonusVE, description: `Changement de nom officiel : ${namingForm.name}. (+${autoBonusVE} VE Auto)` };

      const updatedAgency = { ...agency, name: namingForm.name, tagline: namingForm.tagline, ve_current: agency.ve_current + autoBonusVE, eventLog: [...agency.eventLog, newEvent], progress: { ...agency.progress, [activeWeek]: updatedWeek } };
      onUpdateAgency(updatedAgency);
      setIsNamingModalOpen(false);
      toast('success', `Agence renommée : ${namingForm.name}`);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
        
        {/* CYCLE SELECTOR (TABS) */}
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
             {visibleWeeks.length === 0 ? (
                 <div className="text-sm text-slate-400 italic px-4 py-2">Aucune semaine disponible pour ce cycle.</div>
             ) : (
                 visibleWeeks.map((week: WeekModule) => {
                    const isLive = week.id === gameConfig.currentWeek.toString();
                    return (
                        <button 
                            key={week.id} 
                            onClick={() => setActiveWeek(week.id)} 
                            className={`snap-center flex-shrink-0 px-5 py-3 rounded-2xl border-2 transition-all flex flex-col items-center relative min-w-[100px] ${
                                activeWeek === week.id 
                                ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                            }`}
                        >
                            {isLive && (
                                <div className="absolute -top-2 bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                                    <Zap size={8} className="fill-white"/> LIVE
                                </div>
                            )}
                            <span className="font-display font-bold text-lg">SEM {week.id}</span>
                            {isLive && <span className="text-[8px] font-black opacity-60 uppercase">En cours</span>}
                        </button>
                    );
                 })
             )}
        </div>

        {currentWeekData ? (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm relative overflow-hidden">
            {currentWeekData.id === gameConfig.currentWeek.toString() && (
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Zap size={120} />
                </div>
            )}
            <h3 className="text-2xl font-display font-bold text-slate-900 mb-2">{currentWeekData.title}</h3>
            <p className="text-slate-400 text-xs font-bold uppercase mb-6 tracking-widest flex items-center gap-2">
                Cycle {selectedCycle} en cours
                {currentWeekData.id === gameConfig.currentWeek.toString() && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] animate-pulse">Phase Active</span>}
            </p>
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
        ) : visibleWeeks.length > 0 && ( 
            <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border-2 border-dashed flex flex-col items-center gap-4">
                <Layers size={48} className="opacity-20"/>
                <div>
                    <p className="font-bold">Sélectionnez une semaine.</p>
                </div>
            </div> 
        )}

        <CharterModal isOpen={isCharterModalOpen} onClose={() => setIsCharterModalOpen(false)} onSubmit={handleSubmitCharter} form={charterForm} setForm={setCharterForm} />
        <NamingModal isOpen={isNamingModalOpen} onClose={() => setIsNamingModalOpen(false)} onSubmit={handleSubmitNaming} form={namingForm} setForm={setNamingForm} />
        
        {/* NEW UPLOAD MODAL WITH DIRECT FILE HANDLING */}
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
