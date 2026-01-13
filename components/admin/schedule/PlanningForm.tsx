
import React from 'react';
import { Clock } from 'lucide-react';

interface PlanningFormProps {
    scheduleForm: {
        classA: { date: string, slot: string },
        classB: { date: string, slot: string }
    };
    setScheduleForm: (form: any) => void;
}

export const PlanningForm: React.FC<PlanningFormProps> = ({ scheduleForm, setScheduleForm }) => {
    return (
        <div className="mb-8 bg-slate-50 rounded-2xl p-4 border border-slate-100 animate-in fade-in">
            <h4 className="font-bold text-slate-500 text-xs uppercase mb-3 flex items-center gap-2">
                <Clock size={14}/> Horaires de Cours
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CLASS A */}
                <div className={`p-4 rounded-xl border-l-4 border-blue-500 bg-white shadow-sm`}>
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-blue-600 text-sm">CLASSE A</span>
                    </div>
                    <div className="space-y-2">
                        <input type="date" value={scheduleForm.classA.date} onChange={e => setScheduleForm({...scheduleForm, classA: {...scheduleForm.classA, date: e.target.value}})} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900"/>
                        <select value={scheduleForm.classA.slot} onChange={e => setScheduleForm({...scheduleForm, classA: {...scheduleForm.classA, slot: e.target.value}})} className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 bg-white">
                            <option value="MATIN">Matin (09h-12h)</option>
                            <option value="APRÈS-MIDI">Après-Midi (13h-17h)</option>
                            <option value="JOURNÉE">Journée Complète</option>
                        </select>
                    </div>
                </div>
                {/* CLASS B */}
                <div className={`p-4 rounded-xl border-l-4 border-purple-500 bg-white shadow-sm`}>
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-purple-600 text-sm">CLASSE B</span>
                    </div>
                    <div className="space-y-2">
                        <input type="date" value={scheduleForm.classB.date} onChange={e => setScheduleForm({...scheduleForm, classB: {...scheduleForm.classB, date: e.target.value}})} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900"/>
                        <select value={scheduleForm.classB.slot} onChange={e => setScheduleForm({...scheduleForm, classB: {...scheduleForm.classB, slot: e.target.value}})} className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 bg-white">
                            <option value="MATIN">Matin (09h-12h)</option>
                            <option value="APRÈS-MIDI">Après-Midi (13h-17h)</option>
                            <option value="JOURNÉE">Journée Complète</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};
