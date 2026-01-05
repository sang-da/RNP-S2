
import React, { useState } from 'react';
import { WeekModule, ClassSession } from '../types';
import { Calendar, CheckSquare, GraduationCap, Target, Clock, Edit2, Save, X } from 'lucide-react';

interface AdminScheduleProps {
    weeksData: { [key: string]: WeekModule };
    onUpdateWeek: (weekId: string, updatedWeek: WeekModule) => void;
    readOnly?: boolean;
}

export const AdminSchedule: React.FC<AdminScheduleProps> = ({ weeksData, onUpdateWeek, readOnly }) => {
  const weeks: WeekModule[] = Object.values(weeksData);
  const [editingWeekId, setEditingWeekId] = useState<string | null>(null);
  
  // Local state for editing form
  const [scheduleForm, setScheduleForm] = useState<{
      classA: { date: string, slot: string },
      classB: { date: string, slot: string }
  }>({
      classA: { date: '', slot: 'MATIN' },
      classB: { date: '', slot: 'APRÈS-MIDI' }
  });

  const getTypeColor = (type: string) => {
    switch (type) {
        case 'FUN/CHILL': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'THÉORIE': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'TECHNIQUE': return 'bg-amber-100 text-amber-800 border-amber-200';
        case 'JURY': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const startEditing = (week: WeekModule) => {
      setEditingWeekId(week.id);
      setScheduleForm({
          classA: { 
              date: week.schedule.classA?.date || '', 
              slot: week.schedule.classA?.slot || 'MATIN' 
          },
          classB: { 
              date: week.schedule.classB?.date || '', 
              slot: week.schedule.classB?.slot || 'APRÈS-MIDI' 
          }
      });
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

  return (
    <div className="animate-in fade-in duration-500 pb-20">
        <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600"><Calendar size={32}/></div>
                Planning & Cours
            </h2>
            <p className="text-slate-500 text-sm mt-1">Définissez les créneaux de cours pour chaque classe (A & B).</p>
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
                                 <button 
                                    onClick={() => startEditing(week)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors self-start md:self-auto"
                                 >
                                     <Edit2 size={16}/> Gérer Planning
                                 </button>
                                 )
                             ) : (
                                <div className="flex gap-2 self-start md:self-auto">
                                    <button onClick={() => setEditingWeekId(null)} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200"><X size={20}/></button>
                                    <button onClick={() => saveSchedule(week.id)} className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20"><Save size={18}/> Sauvegarder</button>
                                </div>
                             )}
                         </div>

                         {/* PLANNING EDITOR / DISPLAY */}
                         <div className="mb-8 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                             <h4 className="font-bold text-slate-500 text-xs uppercase mb-3 flex items-center gap-2">
                                 <Clock size={14}/> Horaires de Cours
                             </h4>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {/* CLASS A */}
                                 <div className={`p-4 rounded-xl border-l-4 border-blue-500 bg-white shadow-sm`}>
                                     <div className="flex justify-between items-center mb-2">
                                         <span className="font-bold text-blue-600 text-sm">CLASSE A</span>
                                     </div>
                                     {editingWeekId === week.id ? (
                                         <div className="space-y-2">
                                             <input 
                                                type="date" 
                                                value={scheduleForm.classA.date}
                                                onChange={e => setScheduleForm({...scheduleForm, classA: {...scheduleForm.classA, date: e.target.value}})}
                                                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900"
                                             />
                                             <select 
                                                value={scheduleForm.classA.slot}
                                                onChange={e => setScheduleForm({...scheduleForm, classA: {...scheduleForm.classA, slot: e.target.value}})}
                                                className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 bg-white"
                                             >
                                                 <option value="MATIN">Matin (09h-12h)</option>
                                                 <option value="APRÈS-MIDI">Après-Midi (13h-17h)</option>
                                                 <option value="JOURNÉE">Journée Complète</option>
                                             </select>
                                         </div>
                                     ) : (
                                         <div>
                                             {week.schedule.classA ? (
                                                 <>
                                                    <div className="text-lg font-bold text-slate-900">
                                                        {new Date(week.schedule.classA.date).toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric', month: 'short'})}
                                                    </div>
                                                    <div className="text-xs font-bold uppercase text-slate-400 bg-slate-100 inline-block px-2 py-1 rounded mt-1">
                                                        {week.schedule.classA.slot}
                                                    </div>
                                                 </>
                                             ) : (
                                                 <span className="text-xs italic text-slate-400">Non programmé</span>
                                             )}
                                         </div>
                                     )}
                                 </div>

                                 {/* CLASS B */}
                                 <div className={`p-4 rounded-xl border-l-4 border-purple-500 bg-white shadow-sm`}>
                                     <div className="flex justify-between items-center mb-2">
                                         <span className="font-bold text-purple-600 text-sm">CLASSE B</span>
                                     </div>
                                     {editingWeekId === week.id ? (
                                         <div className="space-y-2">
                                             <input 
                                                type="date" 
                                                value={scheduleForm.classB.date}
                                                onChange={e => setScheduleForm({...scheduleForm, classB: {...scheduleForm.classB, date: e.target.value}})}
                                                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900"
                                             />
                                             <select 
                                                value={scheduleForm.classB.slot}
                                                onChange={e => setScheduleForm({...scheduleForm, classB: {...scheduleForm.classB, slot: e.target.value}})}
                                                className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 bg-white"
                                             >
                                                 <option value="MATIN">Matin (09h-12h)</option>
                                                 <option value="APRÈS-MIDI">Après-Midi (13h-17h)</option>
                                                 <option value="JOURNÉE">Journée Complète</option>
                                             </select>
                                         </div>
                                     ) : (
                                         <div>
                                             {week.schedule.classB ? (
                                                 <>
                                                    <div className="text-lg font-bold text-slate-900">
                                                        {new Date(week.schedule.classB.date).toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric', month: 'short'})}
                                                    </div>
                                                    <div className="text-xs font-bold uppercase text-slate-400 bg-slate-100 inline-block px-2 py-1 rounded mt-1">
                                                        {week.schedule.classB.slot}
                                                    </div>
                                                 </>
                                             ) : (
                                                 <span className="text-xs italic text-slate-400">Non programmé</span>
                                             )}
                                         </div>
                                     )}
                                 </div>
                             </div>
                         </div>

                         {/* Content Grid (Objectives & Deliverables) */}
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
                                     <CheckSquare size={18} className="text-emerald-500"/> Livrables Attendus
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
