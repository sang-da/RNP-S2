
import React, { useState, useMemo } from 'react';
import { Agency, GameEvent } from '../../../types';
import { Bell, ChevronDown, ChevronUp } from 'lucide-react';

interface ActivityFeedProps {
    activeAgencies: Agency[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activeAgencies }) => {
    const [isFeedCollapsed, setIsFeedCollapsed] = useState(false);
    const [feedFilter, setFeedFilter] = useState<'ALL' | 'CRISIS' | 'FINANCE' | 'HR'>('ALL');

    const activityFeed = useMemo(() => {
        const allEvents: {event: GameEvent, agencyName: string, agencyId: string}[] = [];
        activeAgencies.forEach(a => {
            a.eventLog.forEach(e => {
                let include = true;
                if (feedFilter === 'CRISIS' && e.type !== 'CRISIS') include = false;
                if (feedFilter === 'FINANCE' && !['VE_DELTA', 'PAYROLL', 'REVENUE', 'BUDGET_DELTA'].includes(e.type)) include = false;
                
                if (include) {
                   allEvents.push({ event: e, agencyName: a.name, agencyId: a.id });
                }
            });
        });
        return allEvents.reverse(); 
    }, [activeAgencies, feedFilter]);
  
    const visibleFeed = isFeedCollapsed ? [] : activityFeed.slice(0, 8);

    return (
        <div className={`xl:col-span-1 bg-slate-900 rounded-3xl p-5 text-slate-300 flex flex-col transition-all duration-300 sticky top-32 shadow-xl shadow-slate-900/10 ${isFeedCollapsed ? 'h-auto' : 'h-fit'}`}>
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Bell size={18} className="text-emerald-400" />
                    Flux
                </h3>
                <div className="flex items-center gap-2">
                     <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">En direct</span>
                     <button onClick={() => setIsFeedCollapsed(!isFeedCollapsed)} className="p-1 hover:bg-slate-800 rounded text-slate-400">
                        {isFeedCollapsed ? <ChevronDown size={16}/> : <ChevronUp size={16}/>}
                     </button>
                </div>
            </div>

            {!isFeedCollapsed && (
                <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
                    {['ALL', 'CRISIS', 'FINANCE'].map((f) => (
                        <button 
                            key={f}
                            onClick={() => setFeedFilter(f as any)}
                            className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                                feedFilter === f 
                                ? 'bg-slate-700 text-white border-slate-600' 
                                : 'bg-transparent text-slate-500 border-slate-800 hover:border-slate-600'
                            }`}
                        >
                            {f === 'ALL' ? 'Tout' : f === 'CRISIS' ? 'Crises' : 'Finance'}
                        </button>
                    ))}
                </div>
            )}
            
            {!isFeedCollapsed && (
                <div className="space-y-4 pr-2 mb-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {visibleFeed.length === 0 ? (
                        <p className="text-xs text-slate-600 italic text-center py-4">Aucun événement récent.</p>
                    ) : (
                        visibleFeed.map((item, idx) => (
                            <div key={`${item.event.id}-${idx}`} className="relative pl-4 border-l border-slate-700 pb-1">
                                <div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ${
                                    item.event.type === 'CRISIS' ? 'bg-red-500' : 
                                    item.event.type === 'VE_DELTA' && (item.event.deltaVE || 0) > 0 ? 'bg-emerald-500' : 
                                    'bg-slate-600'
                                }`}></div>
                                
                                <div className="text-[10px] font-bold text-slate-500 mb-0.5 flex justify-between">
                                    <span>{item.agencyName}</span>
                                    <span>{item.event.date}</span>
                                </div>
                                <p className="text-xs font-bold text-slate-200 leading-tight">{item.event.label}</p>
                                {item.event.deltaVE !== undefined && item.event.deltaVE !== 0 && (
                                    <span className={`text-[10px] font-bold ${item.event.deltaVE > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {item.event.deltaVE > 0 ? '+' : ''}{item.event.deltaVE} VE
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
