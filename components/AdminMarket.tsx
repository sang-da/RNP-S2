import React from 'react';
import { Agency } from '../types';
import { MarketGraph } from './MarketGraph';
import { TrendingUp, BarChart } from 'lucide-react';

interface AdminMarketProps {
    agencies: Agency[];
}

export const AdminMarket: React.FC<AdminMarketProps> = ({ agencies }) => {
    return (
        <div className="animate-in fade-in duration-500 pb-20">
            <div className="mb-8">
                <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-xl text-yellow-700"><TrendingUp size={32}/></div>
                    Marché Live
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                    Vue temps réel de la bourse des agences (Valeur d'Entreprise).
                </p>
            </div>

            {/* BIG GRAPH */}
            <div className="mb-8 h-[500px]">
                <MarketGraph 
                    agencies={agencies} 
                    title="Cours du Marché Global" 
                    height="100%" 
                />
            </div>

            {/* MINI LEADERBOARD */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agencies.filter(a => a.id !== 'unassigned').sort((a,b) => b.ve_current - a.ve_current).map((agency, i) => (
                    <div key={agency.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm ${i===0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                                #{i+1}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900">{agency.name}</h4>
                                <span className="text-[10px] text-slate-500">Classe {agency.classId}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="block font-display font-bold text-xl text-slate-900">{agency.ve_current}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">VE</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};