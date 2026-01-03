import React from 'react';
import { Agency } from '../../types';

interface HistoryViewProps {
  agency: Agency;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ agency }) => {
  return (
    <div className="animate-in slide-in-from-right-4 duration-500 max-w-2xl mx-auto">
        <div className="relative border-l-2 border-slate-200 ml-4 space-y-8 py-4">
            {[...agency.eventLog].reverse().map((event) => (
                <div key={event.id} className="relative pl-8">
                    {/* Dot */}
                    <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-4 border-slate-50 ${
                            event.type === 'CRISIS' ? 'bg-red-500' :
                            event.type === 'VE_DELTA' ? (event.deltaVE && event.deltaVE > 0 ? 'bg-emerald-500' : 'bg-red-500') :
                            'bg-indigo-500'
                    }`}></div>
                    
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{event.date}</span>
                            {event.deltaVE && (
                                <span className={`text-sm font-black ${event.deltaVE > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {event.deltaVE > 0 ? '+' : ''}{event.deltaVE} VE
                                </span>
                            )}
                        </div>
                        <h4 className="font-bold text-slate-900 text-lg mb-1">{event.label}</h4>
                        {event.description && <p className="text-slate-500 text-sm leading-relaxed">"{event.description}"</p>}
                        
                        {event.deltaBudgetReal && (
                            <div className="mt-3 inline-block px-3 py-1 bg-slate-50 rounded-lg text-xs font-bold text-slate-600">
                                Impact Budget: {event.deltaBudgetReal > 0 ? '+' : ''}{event.deltaBudgetReal} €
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};