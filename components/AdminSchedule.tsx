
import React, { useState, useMemo } from 'react';
import { WeekModule, Deliverable } from '../types';
import { Calendar, CheckSquare, GraduationCap, Target, Clock, Edit2, Save, X, Layers, TrendingUp, ChevronRight } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { useUI } from '../contexts/UIContext';
import { doc, writeBatch, db } from '../services/firebase';

// Sub-components
import { PlanningForm } from './admin/schedule/PlanningForm';
import { ContentForm } from './admin/schedule/ContentForm';

interface AdminScheduleProps {
    weeksData: { [key: string]: WeekModule };
    onUpdateWeek: (weekId: string, updatedWeek: WeekModule) => void;
    readOnly?: boolean;
}

export const AdminSchedule: React.FC<AdminScheduleProps> = ({ weeksData, onUpdateWeek, readOnly }) => {
  const { agencies } = useGame();
  const { confirm, toast } = useUI();
  
  const [editingWeekId, setEditingWeekId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'PLANNING' | 'CONTENT'>('PLANNING');
  
  // Groupement des semaines par cycles de 3
  const cycles = useMemo(() => {
      // FIX: Cast Object.values to WeekModule[] to fix 'unknown' type errors on line 28
      const allWeeks = (Object.values(weeksData) as WeekModule[]).sort((a, b) => parseInt(a.id) - parseInt(b.id));
      const grouped: { [key: number]: WeekModule[] } = { 1: [], 2: [], 3: [], 4: [] };
      
      allWeeks.forEach(w => {
          // FIX: w is now inferred as WeekModule, fixing 'unknown' errors on lines 32, 33, 34
          const cycleId = Math.ceil(parseInt(w.id) / 3);
          if (cycleId <= 4) grouped[cycleId].push(w);
          else grouped[4].push(w); // Semaine 13+ dans le dernier cycle
      });
      return grouped;
  }, [weeksData]);

  // Forms State
  const [scheduleForm, setScheduleForm] = useState<{
      classA: { date: string, slot: string },
      classB: { date: string, slot: string }
  }>({ classA: { date: '', slot: 'MATIN' }, classB: { date: '', slot: 'APRÈS-MIDI' } });

  const [contentForm, setContentForm] = useState<WeekModule | null>(null);

  const getTypeColor = (type: string) => {
    switch (type) {
        case 'FUN/CHILL': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'THÉORIE': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'TECHNIQUE': return 'bg-amber-100 text-amber-800 border-amber-200';
        case 'JURY': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

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
                  scoring: contentForm.scoring // On synchronise les paramètres de notation !
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
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Points Attendus (Total Cycle)</p>
                             <p className="font-bold text-slate-900">
                                 {cycles[cycleNum].reduce((acc, w) => acc + (w.scoring?.expectedTargetVE || 0), 0)} VE
                             </p>
                        </div>
                    </div>

                    {/* Semaines du Cycle */}
                    <div className="relative border-l-4 border-slate-100 ml-6 md:ml-10 space-y-8 py-2">
                        {cycles[cycleNum].map((week) => (
                            <div key={week.id} className="relative pl-8 md:pl-12">
                                <div className={`absolute -left-[20px] top-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-md border-4 border-white z-10 ${parseInt(week.id) % 2 === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                    {week.id}
                                </div>

                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 group hover:shadow-md transition-all">
                                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-50">
                                         <div>
                                             <div className="flex items-center gap-3">
                                                <h3 className="text-xl font-bold text-slate-900">{week.title}</h3>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getTypeColor(week.type)}`}>
                                                    {week.type}
                                                </span>
                                             </div>
                                             {week.scoring && (
                                                 <div className="flex items-center gap-4 mt-2">
                                                     <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                                         <Target size={14} className="text-indigo-500"/> Objectif: <span className="font-bold text-slate-900">{week.scoring.expectedTargetVE} VE</span>
                                                     </div>
                                                     <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                                         <TrendingUp size={14} className="text-emerald-500"/> Grade A: <span className="font-bold text-emerald-600">+{week.scoring.pointsA}</span>
                                                     </div>
                                                 </div>
                                             )}
                                         </div>
                                         
                                         {editingWeekId !== week.id ? (
                                             !readOnly && (
                                             <div className="flex gap-2">
                                                 <button onClick={() => startEditing(week, 'PLANNING')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors" title="Planning"><Clock size={18}/></button>
                                                 <button onClick={() => startEditing(week, 'CONTENT')} className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors">
                                                     <Edit2 size={14}/> Paramétrer la Phase
                                                 </button>
                                             </div>
                                             )
                                         ) : (
                                            <div className="flex gap-2">
                                                <button onClick={() => { setEditingWeekId(null); setContentForm(null); }} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200"><X size={20}/></button>
                                                <button onClick={() => editMode === 'PLANNING' ? saveSchedule(week.id) : saveContentAndSync()} className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95">
                                                    <Save size={18}/> Enregistrer
                                                </button>
                                            </div>
                                         )}
                                     </div>

                                     {editingWeekId === week.id && editMode === 'CONTENT' && contentForm && (
                                         <ContentForm 
                                            contentForm={contentForm}
                                            setContentForm={setContentForm}
                                            addDeliverable={addDeliverable}
                                            removeDeliverable={removeDeliverable}
                                         />
                                     )}

                                     {editingWeekId === week.id && editMode === 'PLANNING' && (
                                         <PlanningForm 
                                            scheduleForm={scheduleForm}
                                            setScheduleForm={setScheduleForm}
                                         />
                                     )}

                                     {(!editingWeekId || editMode !== 'CONTENT') && (
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                         <div>
                                             <h4 className="font-bold text-slate-400 mb-2 text-[10px] uppercase tracking-widest flex items-center gap-2">Missions ({week.deliverables.length})</h4>
                                             <div className="space-y-2">
                                                 {week.deliverables.map((del) => (
                                                     <div key={del.id} className="text-sm text-slate-600 flex items-center gap-2">
                                                         <ChevronRight size={14} className="text-slate-300"/> {del.name}
                                                     </div>
                                                 ))}
                                             </div>
                                         </div>
                                     </div>
                                     )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};
