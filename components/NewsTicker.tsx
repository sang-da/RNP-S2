
import React, { useMemo } from 'react';
import { useGame } from '../contexts/GameContext';
import { GameEvent } from '../types';
import { Flame, TrendingUp, TrendingDown, Info, Gift } from 'lucide-react';

export const NewsTicker: React.FC = () => {
    const { agencies } = useGame();

    const latestEvents = useMemo(() => {
        const events: { agency: string, event: GameEvent }[] = [];
        agencies.forEach(a => {
            if (a.id === 'unassigned') return;
            // Get last 2 events from each agency
            const recents = [...a.eventLog].reverse().slice(0, 2);
            recents.forEach(e => events.push({ agency: a.name, event: e }));
        });
        
        // Sort globally by date (descending) then take top 10
        return events.sort((a,b) => b.event.id.localeCompare(a.event.id)).slice(0, 10);
    }, [agencies]);

    if (latestEvents.length === 0) return null;

    return (
        <div className="bg-slate-900 text-white h-10 flex items-center overflow-hidden border-b border-slate-800 relative z-50">
            <div className="px-4 bg-red-600 h-full flex items-center font-bold text-xs uppercase tracking-widest shrink-0 z-10 shadow-lg">
                Info Direct
            </div>
            
            <div className="flex items-center gap-12 animate-marquee whitespace-nowrap pl-4">
                {latestEvents.map((item, idx) => (
                    <div key={`${item.event.id}-${idx}`} className="flex items-center gap-2 text-sm">
                        <span className="text-slate-400 font-bold uppercase text-[10px]">{item.agency}</span>
                        <div className="flex items-center gap-1">
                            {item.event.type === 'CRISIS' && <Flame size={14} className="text-red-500"/>}
                            {item.event.type === 'VE_DELTA' && (item.event.deltaVE || 0) > 0 && <TrendingUp size={14} className="text-emerald-500"/>}
                            {item.event.type === 'VE_DELTA' && (item.event.deltaVE || 0) < 0 && <TrendingDown size={14} className="text-red-500"/>}
                            {item.event.type === 'INFO' && <Info size={14} className="text-blue-400"/>}
                            
                            <span className="font-medium text-slate-200">
                                {item.event.label}
                            </span>
                            
                            {item.event.deltaVE !== undefined && item.event.deltaVE !== 0 && (
                                <span className={`font-bold ${item.event.deltaVE > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {item.event.deltaVE > 0 ? '+' : ''}{item.event.deltaVE} VE
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                }
            `}</style>
        </div>
    );
};
