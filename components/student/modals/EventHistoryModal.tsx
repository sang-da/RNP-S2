import React from 'react';
import { Modal } from '../../Modal';
import { GameEvent } from '../../../types';
import { AlertTriangle, PartyPopper, Zap, TrendingUp, TrendingDown, Skull, ShieldAlert, Info } from 'lucide-react';

interface EventHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    events: GameEvent[];
}

export const EventHistoryModal: React.FC<EventHistoryModalProps> = ({ isOpen, onClose, events }) => {
    
    // Filter out routine financial events to focus on "Incidents" and "Missions"
    // Unless the user wants EVERYTHING. The request says "crises et missions spéciales".
    // We'll keep CRISIS, BLACK_OP, VE_DELTA (often rewards/penalties), and INFO.
    // We might exclude REVENUE and PAYROLL if they are just noise.
    const filteredEvents = events
        .filter(e => ['CRISIS', 'BLACK_OP', 'VE_DELTA', 'INFO'].includes(e.type))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const getIcon = (event: GameEvent) => {
        if (event.type === 'CRISIS') return <AlertTriangle className="text-red-500" />;
        if (event.type === 'BLACK_OP') return <Skull className="text-purple-500" />;
        if (event.type === 'VE_DELTA') {
            return (event.deltaVE || 0) > 0 ? <PartyPopper className="text-emerald-500" /> : <TrendingDown className="text-red-500" />;
        }
        return <Info className="text-blue-500" />;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Journal des Incidents & Missions">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {filteredEvents.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 italic">
                        <ShieldAlert size={48} className="mx-auto mb-4 opacity-20"/>
                        <p>Aucun incident majeur ou mission spéciale enregistré.</p>
                    </div>
                ) : (
                    filteredEvents.map(event => (
                        <div key={event.id} className="bg-white p-4 rounded-xl border border-slate-200 flex gap-4 items-start hover:shadow-md transition-shadow">
                            <div className="p-3 bg-slate-50 rounded-full shrink-0">
                                {getIcon(event)}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-slate-900">{event.label}</h4>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{event.date}</span>
                                </div>
                                <p className="text-sm text-slate-600 mt-1 leading-relaxed">{event.description}</p>
                                
                                {(event.deltaVE !== undefined && event.deltaVE !== 0) && (
                                    <div className={`mt-2 text-xs font-bold px-2 py-1 rounded w-fit ${event.deltaVE > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                        {event.deltaVE > 0 ? '+' : ''}{event.deltaVE} VE
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Modal>
    );
};
