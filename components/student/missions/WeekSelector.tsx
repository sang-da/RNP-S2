
import React from 'react';
import { WeekModule } from '../../../types';
import { Zap, Lock, Eye } from 'lucide-react';

interface WeekSelectorProps {
    cycleWeeks: WeekModule[];
    activeWeekId: string;
    setActiveWeekId: (id: string) => void;
    currentGlobalWeek: string;
    isLoading: boolean;
}

export const WeekSelector: React.FC<WeekSelectorProps> = ({ cycleWeeks, activeWeekId, setActiveWeekId, currentGlobalWeek, isLoading }) => {
    
    // Si vide (cas très rare avec le fix INITIAL_WEEKS), on affiche des placeholders
    if (cycleWeeks.length === 0) {
        return (
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                {[1, 2, 3].map(i => (
                    <div key={i} className="w-[100px] h-[70px] bg-slate-100 rounded-2xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar snap-x">
             {cycleWeeks.map((week: WeekModule) => {
                const isLive = String(week.id) === String(currentGlobalWeek);
                const isVisible = week.isVisible; // Vient de la config admin
                const isActive = activeWeekId === week.id;

                return (
                    <button 
                        key={week.id} 
                        onClick={() => setActiveWeekId(week.id)} 
                        className={`snap-center flex-shrink-0 px-5 py-3 rounded-2xl border-2 transition-all flex flex-col items-center relative min-w-[100px] group ${
                            isActive
                            ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-105' 
                            : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                        {isLive && (
                            <div className="absolute -top-2 bg-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm z-10">
                                <Zap size={8} className="fill-white"/> LIVE
                            </div>
                        )}
                        
                        {!isVisible && (
                            <div className="absolute top-2 right-2">
                                <Lock size={10} className={isActive ? "text-slate-400" : "text-slate-300"}/>
                            </div>
                        )}

                        <span className="font-display font-bold text-lg">SEM {week.id}</span>
                        <span className={`text-[8px] font-black uppercase mt-0.5 ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                            {isVisible ? (isLive ? 'En cours' : 'Ouvert') : 'Bientôt'}
                        </span>
                    </button>
                );
             })}
        </div>
    );
};
