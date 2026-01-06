
import React from 'react';
import { Agency } from '../../../types';
import { Trophy, TrendingDown, ArrowRight } from 'lucide-react';

interface AgencyLeaderboardProps {
    activeAgencies: Agency[];
    onSelectAgency: (id: string) => void;
    onNavigate: (view: string) => void;
}

export const AgencyLeaderboard: React.FC<AgencyLeaderboardProps> = ({ activeAgencies, onSelectAgency, onNavigate }) => {
    
    const leaderboard = [...activeAgencies].sort((a,b) => b.ve_current - a.ve_current);
    const top3 = leaderboard.slice(0, 3);
    const flop3 = [...leaderboard].reverse().slice(0, 3);

    return (
        <div className="xl:col-span-2 space-y-6">
            
            {/* TOP 3 */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-6 border border-emerald-100">
                <h3 className="text-emerald-800 font-bold mb-4 flex items-center gap-2">
                    <Trophy size={18} className="text-emerald-600"/> Top Performers (VE)
                </h3>
                <div className="space-y-3">
                    {top3.map((agency, i) => (
                        <div 
                            key={agency.id} 
                            onClick={() => onSelectAgency(agency.id)}
                            className="bg-white/80 p-3 rounded-xl flex items-center justify-between shadow-sm cursor-pointer hover:bg-white transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm ${i===0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>#{i+1}</div>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">{agency.name}</p>
                                    <span className={`text-[10px] font-bold px-1.5 rounded ${agency.classId === 'A' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>CLASSE {agency.classId}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block font-display font-bold text-xl text-emerald-600">{agency.ve_current}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">VE</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* FLOP 3 */}
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
                <h3 className="text-slate-600 font-bold mb-4 flex items-center gap-2">
                    <TrendingDown size={18} className="text-red-500"/> En Difficulté
                </h3>
                <div className="space-y-3">
                    {flop3.map((agency) => (
                         <div 
                            key={agency.id} 
                            onClick={() => onSelectAgency(agency.id)}
                            className="bg-white p-3 rounded-xl flex items-center justify-between border border-slate-100 cursor-pointer hover:border-slate-300 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div>
                                    <p className="font-bold text-slate-700 text-sm">{agency.name}</p>
                                    <p className="text-[10px] text-red-500 font-bold">{agency.budget_real < 0 ? 'En Dette' : 'VE Faible'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block font-display font-bold text-xl text-red-500">{agency.ve_current}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">VE</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                <p className="text-sm text-slate-500 mb-2">Pour voir la liste complète et gérer les statuts :</p>
                <button 
                    onClick={() => onNavigate('PROJECTS')}
                    className="text-indigo-600 font-bold text-sm hover:underline flex items-center justify-center gap-1"
                >
                    Aller à Gestion Projets <ArrowRight size={14}/>
                </button>
            </div>
        </div>
    );
};
