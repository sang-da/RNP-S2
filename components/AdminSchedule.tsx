
import React, { useState } from 'react';
import { WeekModule, Deliverable } from '../types';
import { Calendar, CheckSquare, GraduationCap, Target, Clock, Edit2, Save, X } from 'lucide-react';
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
  const weeks: WeekModule[] = Object.values(weeksData);
  
  const [editingWeekId, setEditingWeekId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'PLANNING' | 'CONTENT'>('PLANNING');
  
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
          setContentForm(JSON.parse(JSON.stringify(week))); // Deep copy
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

  // --- MISSION BUILDER LOGIC HELPERS ---
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
          message: "ATTENTION : Vous allez écraser la définition de cette semaine pour TOUTES les agences.\n\nCela mettra à jour les titres et descriptions des missions, mais conservera (normalement) les fichiers déjà rendus si les IDs correspondent.",
          confirmText: "Synchroniser Tout le Monde",
          isDangerous: true
      });

      if (!confirmed) return;

      // 1. Update Template
      onUpdateWeek(contentForm.id, contentForm);

      // 2. Batch Update Agencies
      try {
          const batch = writeBatch(db);
          agencies.forEach(agency => {
              if (agency.id === 'unassigned') return;
              
              const existingWeek = agency.progress[contentForm.id];
              const mergedDeliverables = contentForm.deliverables.map(tplDel => {
                  const existingDel = existingWeek?.deliverables.find(d => d.id === tplDel.id);
                  if (existingDel) {
                      return { ...existingDel, name: tplDel.name, description: tplDel.description };
                  }
                  return tplDel;
              });

              const updatedWeek = {
                  ...existingWeek,
                  title: contentForm.title,
                  objectives: contentForm.objectives,
                  type: contentForm.type,
                  deliverables: mergedDeliverables
              };

              const ref = doc(db, "agencies", agency.id);
              batch.update(ref, { [`progress.${contentForm.id}`]: updatedWeek });
          });

          await batch.commit();
          toast('success', "Semaine synchronisée avec succès sur toutes les agences.");
          setEditingWeekId(null);
          setContentForm(null);

      } catch (error) {
          console.error(error);
          toast('error', "Erreur lors de la synchronisation de masse.");
      }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
        <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600"><Calendar size={32}/></div>
                Mission Builder & Planning
            </h2>
            <p className="text-slate-500 text-sm mt-1">Gérez le calendrier et le contenu pédagogique des semaines.</p>
        </div>

        <div className="relative border-l-4 border-slate-200 ml-4 md:ml-8 space-y-12 py-4">
            {weeks.map((week) => (
                <div key={week.id} className="relative pl-8 md:pl-12">
                    {/* Marker */}
                    <div className="absolute -left-[22px] top-0 w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-lg border-4 border-slate-50 z-10">
                        {week.id}
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-all">
                         
                         {/* Header */}
                         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                             <div>
                                 <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-2xl font-display font-bold text-slate-900">{week.title}</h3>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getTypeColor(week.type)}`}>
                                        {week.type}
                                    </span>
                                 </div>
                                 <p className="text-slate-400 text-sm flex items-center gap-2">
                                     <GraduationCap size={16}/> Module pédagogique
                                 </p>
                             </div>
                             
                             {editingWeekId !== week.id ? (
                                 !readOnly && (
                                 <div className="flex gap-2">
                                     <button onClick={() => startEditing(week, 'PLANNING')} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs flex items-center gap-2 transition-colors">
                                         <Clock size={14}/> Planning
                                     </button>
                                     <button onClick={() => startEditing(week, 'CONTENT')} className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-xs flex items-center gap-2 transition-colors">
                                         <Edit2 size={14}/> Éditer Contenu
                                     </button>
                                 </div>
                                 )
                             ) : (
                                <div className="flex gap-2 self-start md:self-auto">
                                    <button onClick={() => { setEditingWeekId(null); setContentForm(null); }} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200"><X size={20}/></button>
                                    <button 
                                        onClick={() => editMode === 'PLANNING' ? saveSchedule(week.id) : saveContentAndSync()} 
                                        className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                                    >
                                        <Save size={18}/> {editMode === 'PLANNING' ? 'Sauvegarder' : 'Publier & Sync'}
                                    </button>
                                </div>
                             )}
                         </div>

                         {/* EDIT MODE: CONTENT (MISSION BUILDER) */}
                         {editingWeekId === week.id && editMode === 'CONTENT' && contentForm && (
                             <ContentForm 
                                contentForm={contentForm}
                                setContentForm={setContentForm}
                                addDeliverable={addDeliverable}
                                removeDeliverable={removeDeliverable}
                             />
                         )}

                         {/* EDIT MODE: PLANNING */}
                         {editingWeekId === week.id && editMode === 'PLANNING' && (
                             <PlanningForm 
                                scheduleForm={scheduleForm}
                                setScheduleForm={setScheduleForm}
                             />
                         )}

                         {/* Content Grid (Display Only when not editing content) */}
                         {(!editingWeekId || editMode !== 'CONTENT') && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div>
                                 <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                                     <Target size={18} className="text-indigo-500"/> Objectifs
                                 </h4>
                                 <ul className="space-y-2">
                                     {week.objectives.map((obj, i) => (
                                         <li key={i} className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                                             <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"></div>
                                             {obj}
                                         </li>
                                     ))}
                                 </ul>
                             </div>

                             <div>
                                 <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                                     <CheckSquare size={18} className="text-emerald-500"/> Missions ({week.deliverables.length})
                                 </h4>
                                 <div className="space-y-3">
                                     {week.deliverables.map((del) => (
                                         <div key={del.id} className="border border-slate-200 rounded-xl p-3 flex gap-3 items-start hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors">
                                             <div className="p-2 bg-white border border-slate-100 rounded-lg shadow-sm text-slate-500">
                                                 <CheckSquare size={16}/>
                                             </div>
                                             <div>
                                                 <p className="font-bold text-slate-900 text-sm">{del.name}</p>
                                                 <p className="text-xs text-slate-500 mt-0.5">{del.description}</p>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         </div>
                         )}
                    </div>
                </div>
            ))}
            
            {/* End Marker */}
            <div className="relative pl-8 md:pl-12">
                 <div className="absolute -left-[14px] top-0 w-6 h-6 rounded-full bg-slate-300 border-4 border-slate-50"></div>
                 <p className="text-slate-400 font-bold italic text-sm">Fin du semestre S2</p>
            </div>
        </div>
    </div>
  );
};
