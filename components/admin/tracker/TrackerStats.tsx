
import React from 'react';
import { Activity, Users, Wallet, Trophy } from 'lucide-react';

interface TrackerStatsProps {
    globalStats: {
        totalStudents: number;
        avgScore: string;
        avgWealth: number;
        countA: number;
        countB: number;
        top3: any[];
    } | null;
}

export const TrackerStats: React.FC<TrackerStatsProps> = ({ globalStats }) => {
    if (!globalStats) return null;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 bg-slate-900 p-6 rounded-3xl text-white shadow-xl">
            <div className="space-y-1 border-r border-slate-700 pr-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest"><Users size={14}/> Effectif Total</div>
                <div className="text-3xl font-black">{globalStats.totalStudents} <span className="text-sm font-medium opacity-50">étudiants</span></div>
                <div className="text-xs text-slate-400">Classe A: {globalStats.countA} | Classe B: {globalStats.countB}</div>
            </div>
            <div className="space-y-1 border-r border-slate-700 px-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest"><Activity size={14}/> Niveau Moyen</div>
                <div className="text-3xl font-black text-emerald-400">{globalStats.avgScore} <span className="text-sm font-medium opacity-50">/ 100</span></div>
                <div className="text-xs text-slate-400">Score de performance global</div>
            </div>
            <div className="space-y-1 border-r border-slate-700 px-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest"><Wallet size={14}/> Richesse Moy.</div>
                <div className="text-3xl font-black text-yellow-400">{globalStats.avgWealth} <span className="text-sm font-medium opacity-50">PiXi</span></div>
                <div className="text-xs text-slate-400">Pouvoir d'achat moyen</div>
            </div>
            <div className="space-y-1 pl-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest"><Trophy size={14}/> Top 3 Actuel</div>
                <div className="text-sm font-bold space-y-1 mt-2">
                    {globalStats.top3.map((s, i) => (
                        <div key={s.id} className="flex justify-between w-full">
                            <span className="truncate max-w-[100px]">{i+1}. {s.name}</span>
                            <span className="text-emerald-400">{s.individualScore}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
