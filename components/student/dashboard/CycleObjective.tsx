
import React from 'react';
import { Agency, CycleType } from '../../../types';
import { CYCLE_AWARDS } from '../../../constants';
import { Trophy, Target, Sparkles, ArrowRight } from 'lucide-react';

interface CycleObjectiveProps {
    agency: Agency;
}

export const CycleObjective: React.FC<CycleObjectiveProps> = ({ agency }) => {
    // Trouver le prix associé au cycle actuel de l'agence
    const currentAward = CYCLE_AWARDS.find(a => a.cycleId === agency.currentCycle);

    if (!currentAward) return null;

    return (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-1 shadow-lg overflow-hidden relative group">
            {/* Animated Border Gradient via Padding */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-purple-500 to-indigo-500 opacity-20 group-hover:opacity-30 transition-opacity"></div>
            
            <div className="bg-slate-900 rounded-[22px] p-5 relative z-10 h-full flex flex-col md:flex-row items-center gap-5">
                
                {/* ICON BOX */}
                <div className="relative shrink-0">
                    <div className="absolute inset-0 bg-yellow-500 blur-xl opacity-20 animate-pulse"></div>
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-amber-500 rounded-2xl flex items-center justify-center text-yellow-900 shadow-lg border border-yellow-200/50">
                        <Trophy size={32} strokeWidth={2.5}/>
                    </div>
                </div>

                {/* TEXT CONTENT */}
                <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                            Objectif du Cycle
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {agency.currentCycle}
                        </span>
                    </div>
                    <h3 className="text-xl font-display font-bold text-white mb-1">
                        {currentAward.title}
                    </h3>
                    <p className="text-sm text-slate-400 leading-snug max-w-lg">
                        {currentAward.description}
                    </p>
                </div>

                {/* REWARD PILL */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                        <div className="text-right">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase">Prime Hebdo</span>
                            <span className="block text-lg font-black text-emerald-400">+{currentAward.weeklyBonus} PiXi</span>
                        </div>
                        <div className="h-8 w-px bg-white/10"></div>
                        <div className="text-right">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase">Bonus VE</span>
                            <span className="block text-lg font-black text-yellow-400">+{currentAward.veBonus}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
