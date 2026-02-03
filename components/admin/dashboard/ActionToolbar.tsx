import React from 'react';
import { Flame, Activity, Layers, CalendarDays, Zap } from 'lucide-react';
import { useGame } from '../../../contexts/GameContext';

interface ActionToolbarProps {
    selectedClass: 'ALL' | 'A' | 'B';
    setSelectedClass: (c: 'ALL' | 'A' | 'B') => void;
    onNavigate: (view: string) => void;
    onOpenControlPanel: () => void;
    readOnly?: boolean;
}

export const ActionToolbar: React.FC<ActionToolbarProps> = ({ selectedClass, setSelectedClass, onNavigate, onOpenControlPanel, readOnly }) => {
    const { gameConfig, updateGameConfig } = useGame();

    const handleCycleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateGameConfig({ currentCycle: Number(e.target.value) });
    };

    const handleWeekChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateGameConfig({ currentWeek: Number(e.target.value) });
    };

    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-16 md:top-4 z-30">
            
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                {/* Class Filter */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
                    <button onClick={() => setSelectedClass('ALL')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${selectedClass === 'ALL' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Toutes</button>
                    <button onClick={() => setSelectedClass('A')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${selectedClass === 'A' ? 'bg-blue-100 text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}>Classe A</button>
                    <button onClick={() => setSelectedClass('B')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${selectedClass === 'B' ? 'bg-purple-100 text-purple-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}>Classe B</button>
                </div>

                {/* Pilotes Globaux (Cycle & Semaine) */}
                {!readOnly && (
                    <div className="flex items-center gap-3">
                        {/* Status Card (Visual Feedback) */}
                        <div className="hidden lg:flex items-center gap-2 bg-indigo-900 text-white px-4 py-1.5 rounded-xl border border-indigo-700 shadow-sm animate-in fade-in slide-in-from-left-2">
                            <Zap size={14} className="text-yellow-400 animate-pulse"/>
                            <span className="text-[11px] font-black uppercase tracking-tight">S{gameConfig.currentWeek || 1} - Cycle {gameConfig.currentCycle || 1}</span>
                        </div>

                        {/* Cycle Switcher */}
                        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner">
                            <Layers size={16} className="text-slate-400 ml-2"/>
                            <select 
                                value={String(gameConfig.currentCycle || 1)}
                                onChange={handleCycleChange}
                                className="bg-white border-none rounded-lg text-xs font-black text-indigo-600 px-3 py-1 outline-none focus:ring-0 shadow-sm cursor-pointer hover:bg-slate-50"
                            >
                                <option value="1">Cycle 1</option>
                                <option value="2">Cycle 2</option>
                                <option value="3">Cycle 3</option>
                                <option value="4">Cycle 4</option>
                            </select>
                        </div>

                        {/* Week Switcher */}
                        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner">
                            <CalendarDays size={16} className="text-slate-400 ml-2"/>
                            <select 
                                value={String(gameConfig.currentWeek || 1)}
                                onChange={handleWeekChange}
                                className="bg-white border-none rounded-lg text-xs font-black text-emerald-600 px-3 py-1 outline-none focus:ring-0 shadow-sm cursor-pointer hover:bg-slate-50"
                            >
                                {[...Array(12)].map((_, i) => (
                                    <option key={i+1} value={String(i+1)}>Semaine {i+1}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>
    
            {/* Actions / Control Center */}
            {!readOnly && (
            <div className="flex gap-2 w-full md:w-auto">
                 <button 
                    onClick={() => onNavigate('CRISIS')}
                    className="flex-1 md:flex-none justify-center bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl border border-red-200 font-bold text-sm flex items-center gap-2 transition-colors"
                 >
                    <Flame size={16} /> Crises
                 </button>
                 
                 <button 
                    onClick={onOpenControlPanel}
                    className="flex-1 md:flex-none justify-center bg-slate-900 hover:bg-slate-700 text-white px-6 py-2 rounded-xl border border-slate-900 font-bold text-sm flex items-center gap-2 transition-colors shadow-lg shadow-slate-900/20"
                 >
                    <Activity size={16} /> Auto-Pilote
                 </button>
            </div>
            )}
        </div>
    );
};