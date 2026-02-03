
import React, { useState, useMemo } from 'react';
import { WeekModule, Deliverable } from '../types';
import { Calendar, Layers, TrendingUp, Save, X, Eye, EyeOff, CheckSquare } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { useUI } from '../contexts/UIContext';
import { doc, writeBatch, db } from '../services/firebase';

// Sub-components
import { PlanningForm } from './admin/schedule/PlanningForm';
import { ContentForm } from './admin/schedule/ContentForm';
import { WeekCard } from './admin/schedule/WeekCard';

interface AdminScheduleProps {
    weeksData: { [key: string]: WeekModule };
    onUpdateWeek: (weekId: string, updatedWeek: WeekModule) => void;
    readOnly?: boolean;
}

export const AdminSchedule: React.FC<AdminScheduleProps> = ({ weeksData, onUpdateWeek, readOnly }) => {
  const { agencies, gameConfig } = useGame();
  const { confirm, toast } = useUI();
  
  const [editingWeekId, setEditingWeekId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'PLANNING' | 'CONTENT'>('PLANNING');
  
  // Groupement des semaines par cycles de 3
  const cycles = useMemo(() => {
      const allWeeks = (Object.values(weeksData) as WeekModule[]).sort((a, b) => parseInt(a.id) - parseInt(b.id));
      const grouped: { [key: number]: WeekModule[] } = { 1: [], 2: [], 3: [], 4: [] };
      
      allWeeks.forEach(w => {
          const cycleId = Math.ceil(parseInt(w.id) / 3);
          if (cycleId <= 4) grouped[cycleId].push(w);
          else grouped[4].push(w);
      });
      return grouped;
  }, [weeksData]);

  const allWeeksList = useMemo(() => (Object.values(weeksData) as WeekModule[]).sort((a, b) => parseInt(a.id) - parseInt(b.id)), [weeksData]);

  // Forms State
  const [scheduleForm, setScheduleForm] = useState<{
      classA: { date: string, slot: string },
      classB: { date: string, slot: string }
  }>({ classA: { date: '', slot: 'MATIN' }, classB: { date: '', slot: 'APRÈS-MIDI' } });

  const [contentForm, setContentForm] = useState<WeekModule | null>(null);

  const startEditing = (week: WeekModule, mode: 'PLANNING' | 'CONTENT') => {
      setEditingWeekId(week.id);
      setEditMode(mode);
      if (mode === 'PLANNING') {
          setScheduleForm({
              classA: { date: week.schedule.classA?.date || '', slot: week.schedule.classA?.slot || 'MATIN' },
              classB: { date: week.schedule.classB?.date || '', slot: week.schedule.classB?.slot || 'APRÈS-MIDI' }
          });
      } else {
          setContentForm(JSON.parse(JSON.stringify(week)));
      }
  };

  const handleToggleVisibility = async (week: WeekModule) => {
      if (readOnly) return;
      const newStatus = !week.isVisible;
      const updatedWeek = { ...week, isVisible: newStatus };
      onUpdateWeek(week.id, updatedWeek);
      toast('info', `Semaine ${week.id} ${newStatus ? 'Visible' : 'Cachée'}`);
  };

  const saveSchedule = (weekId: string) => {
      const currentWeek = weeksData[weekId];
      if(!currentWeek) return;
      const updatedWeek: WeekModule = {
          ...currentWeek,
          schedule: {
              classA: scheduleForm.classA.date ? { date: scheduleForm.classA.date, slot: scheduleForm.classA.slot as any } : null,
              classB: scheduleForm.classB.date ? { date: scheduleForm.classB.date, slot: scheduleForm.classB.slot as any } : null
          }
      };
      onUpdateWeek(weekId, updatedWeek);
      setEditingWeekId(null);
  };

  const addDeliverable = () => {
      if (!contentForm) return;
      const newDel: Deliverable = {
          id: `d_custom_${Date.now()}`,
          name: "Nouvelle Mission",
          description: "Description de la tâche...",
          status: 'pending'
      };
      setContentForm({ ...contentForm, deliverables: [...contentForm.deliverables, newDel] });
  };

  const removeDeliverable = (index: number) => {
      if (!contentForm) return;
      const newDeliverables = contentForm.deliverables.filter((_, i) => i !== index);
      setContentForm({ ...contentForm, deliverables: newDeliverables });
  };

  const saveContentAndSync = async () => {
      if (!contentForm) return;
      const confirmed = await confirm({
          title: "Standardiser & Synchroniser ?",
          message: "ATTENTION : Vous allez écraser la définition de cette semaine pour TOUTES les agences.",
          confirmText: "Synchroniser Tout le Monde",
          isDangerous: true
      });

      if (!confirmed) return;

      onUpdateWeek(contentForm.id, contentForm);

      try {
          const batch = writeBatch(db);
          agencies.forEach(agency => {
              if (agency.id === 'unassigned') return;
              const existingWeek = agency.progress[contentForm.id];
              const mergedDeliverables = contentForm.deliverables.map(tplDel => {
                  const existingDel = existingWeek?.deliverables.find(d => d.id === tplDel.id);
                  return existingDel ? { ...existingDel, name: tplDel.name, description: tplDel.description } : tplDel;
              });

              const updatedWeek = {
                  ...existingWeek,
                  title: contentForm.title,
                  objectives: contentForm.objectives,
                  type: contentForm.type,
                  deliverables: mergedDeliverables,
                  scoring: contentForm.scoring,
                  isVisible: contentForm.isVisible 
              };

              const ref = doc(db, "agencies", agency.id);
              batch.update(ref, { [`progress.${contentForm.id}`]: updatedWeek });
          });

          await batch.commit();
          toast('success', "Semaine synchronisée avec succès.");
          setEditingWeekId(null);
          setContentForm(null);
      } catch (error) {
          toast('error', "Erreur lors de la synchronisation.");
      }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600"><Calendar size={32}/></div>
                    Cycles & Pilotage des Phases
                </h2>
                <p className="text-slate-500 text-sm mt-1">Configurez les attentes et les barèmes de points par cycles de 3 semaines.</p>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-4">
                 <div className="p-2 bg-amber-100 rounded-full text-amber-600"><TrendingUp size={20}/></div>
                 <div>
                     <p className="text-[10px] font-bold text-amber-800 uppercase">Astuce Économique</p>
                     <p className="text-xs text-amber-700">Baissez les points des cycles 2 et 3 si la classe est trop riche.</p>
                 </div>
            </div>
        </div>

        {/* --- CHECKLIST VISIBILITÉ RAPIDE --- */}
        <div className="mb-10 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <CheckSquare size={16}/> Contrôle Rapide de Visibilité
            </h3>
            <div className="flex gap-2">
                {allWeeksList.map(week => (
                    <button 
                        key={week.id} 
                        onClick={() => handleToggleVisibility(week)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all min-w-[70px] ${
                            week.isVisible 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                            : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'
                        }`}
                    >
                        <span className="text-[10px] font-black uppercase">SEM {week.id}</span>
                        {week.isVisible ? <Eye size={16}/> : <EyeOff size={16}/>}
                        <span className="text-[9px] font-bold">{week.isVisible ? 'VISIBLE' : 'CACHÉE'}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* AFFICHAGE DES CYCLES */}
        <div className="space-y-12">
            {[1, 2, 3, 4].map(cycleNum => (
                <div key={cycleNum} className="space-y-6">
                    {/* Header Cycle */}
                    <div className="flex items-center gap-4 px-2">
                        <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-full shadow-lg">
                            <Layers size={18} className="text-indigo-400"/>
                            <span className="font-display font-bold">CYCLE {cycleNum}</span>
                        </div>
                        <div className="h-px flex-1 bg-slate-200"></div>
                        <div className="text-right">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Points Attendus</p>
                             <p className="font-bold text-slate-900">
                                 {cycles[cycleNum].reduce((acc, w) => acc + (w.scoring?.expectedTargetVE || 0), 0)} VE
                             </p>
                        </div>
                    </div>

                    {/* Semaines du Cycle */}
                    <div className="relative border-l-4 border-slate-100 ml-6 md:ml-10 space-y-8 py-2">
                        {cycles[cycleNum].map((week) => (
                            <div key={week.id}>
                                {editingWeekId === week.id ? (
                                    <div className="relative pl-8 md:pl-12">
                                        <div className="bg-white rounded-2xl border-2 border-indigo-500 shadow-xl p-6">
                                            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                                                <h3 className="font-bold text-lg text-indigo-700">
                                                    {editMode === 'PLANNING' ? `Planning Semaine ${week.id}` : `Contenu Semaine ${week.id}`}
                                                </h3>
                                                <div className="flex gap-2">
                                                    <button onClick={() => { setEditingWeekId(null); setContentForm(null); }} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200"><X size={20}/></button>
                                                    <button onClick={() => editMode === 'PLANNING' ? saveSchedule(week.id) : saveContentAndSync()} className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95">
                                                        <Save size={18}/> Enregistrer
                                                    </button>
                                                </div>
                                            </div>

                                            {editMode === 'CONTENT' && contentForm && (
                                                <ContentForm 
                                                    contentForm={contentForm}
                                                    setContentForm={setContentForm}
                                                    addDeliverable={addDeliverable}
                                                    removeDeliverable={removeDeliverable}
                                                />
                                            )}

                                            {editMode === 'PLANNING' && (
                                                <PlanningForm 
                                                    scheduleForm={scheduleForm}
                                                    setScheduleForm={setScheduleForm}
                                                />
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <WeekCard 
                                        week={week}
                                        isActive={week.id === gameConfig.currentWeek.toString()}
                                        onEditPlanning={() => startEditing(week, 'PLANNING')}
                                        onEditContent={() => startEditing(week, 'CONTENT')}
                                        onToggleVisibility={handleToggleVisibility}
                                        readOnly={readOnly}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};
