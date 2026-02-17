
import React from 'react';
import { Agency, WeekScoringConfig } from '../../../../../types';
import { Check, XCircle, Crown, User } from 'lucide-react';

interface GradingControlsProps {
    quality: 'A' | 'B' | 'C';
    setQuality: (q: 'A' | 'B' | 'C') => void;
    daysLate: number;
    setDaysLate: (d: number) => void;
    constraintBroken: boolean;
    setConstraintBroken: (b: boolean) => void;
    feedback: string;
    setFeedback: (s: string) => void;
    selectedMvpId: string;
    setSelectedMvpId: (id: string) => void;
    agency: Agency | undefined;
    suggestedMvpMember: any;
    scoringConfig: WeekScoringConfig;
}

export const GradingControls: React.FC<GradingControlsProps> = ({
    quality, setQuality,
    daysLate, setDaysLate,
    constraintBroken, setConstraintBroken,
    feedback, setFeedback,
    selectedMvpId, setSelectedMvpId,
    agency, suggestedMvpMember, scoringConfig
}) => {

    const getButtonClass = (btnQuality: string) => {
        const base = "flex-1 py-4 rounded-xl font-bold border-2 transition-all flex flex-col items-center justify-center gap-1 active:scale-95";
        if (quality === btnQuality) {
            if (btnQuality === 'A') return `${base} bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-200 ring-offset-1 shadow-md`;
            if (btnQuality === 'B') return `${base} bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-200 ring-offset-1 shadow-md`;
            return `${base} bg-red-50 border-red-500 text-red-700 ring-2 ring-red-200 ring-offset-1 shadow-md`;
        }
        return `${base} bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50`;
    };

    return (
        <div className="space-y-6">
            {/* 1. QUALITÉ */}
            <div>
                <div className="flex justify-between items-end mb-3">
                    <label className="block text-sm font-bold text-slate-700">Qualité du rendu</label>
                    <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                        {quality === 'A' ? `+${scoringConfig.pointsA}` : quality === 'B' ? `+${scoringConfig.pointsB}` : '0'} VE
                    </span>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setQuality('A')} className={getButtonClass('A')}>
                        <span className="text-xl font-black">A</span>
                        <span className="text-[9px] uppercase opacity-80">Top</span>
                    </button>
                    <button onClick={() => setQuality('B')} className={getButtonClass('B')}>
                        <span className="text-xl font-black">B</span>
                        <span className="text-[9px] uppercase opacity-80">Ok</span>
                    </button>
                    <button onClick={() => setQuality('C')} className={getButtonClass('C')}>
                        <span className="text-xl font-black">C</span>
                        <span className="text-[9px] uppercase opacity-80">Non</span>
                    </button>
                </div>
            </div>

            {/* 2. MVP SELECTION */}
            {agency && agency.members.length > 0 && (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <div className="flex justify-between items-start mb-2">
                        <label className="text-xs font-bold text-amber-900 flex items-center gap-2">
                            <Crown size={14}/> Validation MVP (+5)
                        </label>
                        {suggestedMvpMember && (
                            <span className="text-[10px] bg-white border border-amber-200 px-2 py-1 rounded-full text-amber-700 font-medium flex items-center gap-1">
                                <User size={10}/> Suggéré : {suggestedMvpMember.name}
                            </span>
                        )}
                    </div>
                    <select 
                        value={selectedMvpId} 
                        onChange={(e) => setSelectedMvpId(e.target.value)}
                        className="w-full p-2 rounded-lg border border-amber-200 bg-white text-sm font-bold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none"
                    >
                        <option value="NONE">-- Aucun MVP --</option>
                        {agency.members.map(m => (
                            <option key={m.id} value={m.id}>{m.name} (+5 pts)</option>
                        ))}
                    </select>
                </div>
            )}

            {/* 3. PÉNALITÉS */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jours Retard</label>
                    <div className="relative">
                        <input 
                            type="number" 
                            min="0"
                            value={daysLate}
                            onChange={(e) => setDaysLate(Number(e.target.value))}
                            className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        {daysLate > 0 && <span className="absolute right-3 top-3.5 text-xs font-bold text-red-500">-{daysLate * scoringConfig.penaltyLatePerDay} pts</span>}
                    </div>
                </div>
                <div className="flex items-end">
                    <label className={`w-full p-3 border-2 rounded-xl flex items-center gap-3 cursor-pointer transition-all h-[50px] ${constraintBroken ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${constraintBroken ? 'border-red-600 bg-red-600 text-white' : 'border-slate-300'}`}>
                            {constraintBroken && <Check size={12}/>}
                        </div>
                        <input 
                            type="checkbox" 
                            checked={constraintBroken}
                            onChange={(e) => setConstraintBroken(e.target.checked)}
                            className="hidden"
                        />
                        <div className="flex flex-col">
                            <span className="text-xs font-bold leading-none">Contrainte Brisée</span>
                            {constraintBroken && <span className="text-[9px] leading-none mt-0.5">-{scoringConfig.penaltyConstraint} pts</span>}
                        </div>
                    </label>
                </div>
            </div>

            {/* 4. FEEDBACK */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Commentaire</label>
                <textarea 
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm min-h-[100px] focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    placeholder="Feedback constructif..."
                />
            </div>
        </div>
    );
};
