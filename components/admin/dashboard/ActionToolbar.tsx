
import React from 'react';
import { Flame, Activity, Layers } from 'lucide-react';
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

    return (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-16 md:top-4 z-30">
            
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                {/* Class Filter */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
                    <button onClick={() => setSelectedClass('ALL')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${selectedClass === 'ALL' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Toutes</button>
                    <button onClick={() => setSelectedClass('A')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${selectedClass === 'A' ? 'bg-blue-100 text-blue-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}>Classe A</button>
                    <button onClick={() => setSelectedClass('B')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${selectedClass === 'B' ? 'bg-purple-100 text-purple-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}>Classe B</button>
                </div>

                {/* Cycle Switcher (GLOBAL CONTROL) */}
                {!readOnly && (
                    <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner">
                        <Layers size={16} className="text-slate-400 ml-2"/>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Cycle Actif :</span>
                        <select 
                            value={gameConfig.currentCycle}
                            onChange={handleCycleChange}
                            className="bg-white border-none rounded-lg text-xs font-black text-indigo-600 px-3 py-1 outline-none focus:ring-0 shadow-sm"
                        >
                            <option value={1}>1 (S1-S3)</option>
                            <option value={2}>2 (S4-S6)</option>
                            <option value={3}>3 (S7-S9)</option>
                            <option value={4}>4 (S10-S12)</option>
                        </select>
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
