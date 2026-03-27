
import React, { useState } from 'react';
import { Agency } from '../types';
import { MarketGraph } from './MarketGraph';
import { TrendingUp, TrendingDown, Wallet, Users, X, Activity, DollarSign } from 'lucide-react';
import { MASCOTS, GAME_RULES, HOLDING_RULES, calculateMarketVE, calculateVECap } from '../constants';
import { Modal } from './Modal';

interface AdminMarketProps {
    agencies: Agency[];
}

export const AdminMarket: React.FC<AdminMarketProps> = ({ agencies }) => {
    const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);

    const getMascot = (budget: number) => {
        if (budget <= 0) return MASCOTS.MARKET_POOR;
        if (budget >= 5000) return MASCOTS.MARKET_RICH;
        return MASCOTS.MARKET_STABLE;
    };

    const getFinancialHealth = (agency: Agency) => {
        // Calculs à la volée pour l'affichage
        const totalSalary = agency.members.reduce((acc, m) => {
            const rawSalary = Math.round(m.individualScore * GAME_RULES.SALARY_MULTIPLIER);
            return acc + Math.min(rawSalary, GAME_RULES.SALARY_CAP_FOR_STUDENT);
        }, 0);
        const rent = GAME_RULES.AGENCY_RENT;
        const totalCharges = totalSalary + rent;
        
        let veMultiplier = GAME_RULES.REVENUE_VE_MULTIPLIER;
        if (agency.type === 'HOLDING') {
            const history = agency.ve_history || [];
            if (history.length >= 2) {
                const growth = history[history.length - 1].value - history[history.length - 2].value;
                if (growth >= 10) veMultiplier = HOLDING_RULES.REVENUE_MULTIPLIER_PERFORMANCE;
                else if (growth >= HOLDING_RULES.GROWTH_TARGET) veMultiplier = HOLDING_RULES.REVENUE_MULTIPLIER_STANDARD;
                else veMultiplier = 30;
            } else {
                veMultiplier = HOLDING_RULES.REVENUE_MULTIPLIER_STANDARD;
            }
        }
        
        const veRevenue = agency.ve_current * veMultiplier;
        const badgeRevenue = agency.weeklyRevenueModifier || 0;
        const revenue = veRevenue + badgeRevenue;
        
        let dividends = 0;
        if (agency.type === 'HOLDING' && agency.seniorityMap) {
            const seniorMembers = agency.members.filter(m => agency.seniorityMap?.[m.id] === 'SENIOR');
            if (seniorMembers.length > 0) {
                let dividendRate = HOLDING_RULES.DIVIDEND_RATE_LOW;
                if (agency.ve_current >= 80) dividendRate = HOLDING_RULES.DIVIDEND_RATE_HIGH;
                else if (agency.ve_current >= 60) dividendRate = HOLDING_RULES.DIVIDEND_RATE_MID;
                dividends = Math.floor((veRevenue + badgeRevenue + GAME_RULES.REVENUE_BASE) * dividendRate);
            }
        }
        
        const netFlow = revenue - totalCharges - dividends;
        
        return { totalSalary, rent, totalCharges, revenue, netFlow, dividends };
    };

    return (
        <div className="animate-in fade-in duration-500 pb-20">
            <div className="mb-8">
                <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-xl text-yellow-700"><TrendingUp size={32}/></div>
                    Marché Live
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                    Vue temps réel de la bourse des agences (Valeur d'Entreprise) et de leur santé financière.
                </p>
            </div>

            {/* BIG GRAPH */}
            <div className="mb-8 h-[400px]">
                <MarketGraph 
                    agencies={agencies} 
                    title="Cours du Marché Global" 
                    height="100%" 
                />
            </div>

            {/* LEADERBOARD & FINANCIAL CARDS */}
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Activity size={20}/> Cotations & Finances
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agencies.filter(a => a.id !== 'unassigned').sort((a,b) => b.ve_current - a.ve_current).map((agency, i) => {
                    const health = getFinancialHealth(agency);
                    return (
                        <div 
                            key={agency.id} 
                            onClick={() => setSelectedAgency(agency)}
                            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer relative overflow-hidden group"
                        >
                            {/* RANK BADGE */}
                            <div className={`absolute top-0 left-0 px-3 py-1.5 rounded-br-xl text-xs font-black text-white ${i===0 ? 'bg-yellow-400' : 'bg-slate-200 text-slate-500'}`}>
                                #{i+1}
                            </div>

                            <div className="flex justify-between items-start mb-4 mt-2 pl-2">
                                <div>
                                    <h4 className="font-bold text-slate-900 text-lg leading-tight">{agency.name}</h4>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Classe {agency.classId} • {agency.members.length} membres</span>
                                </div>
                                {/* MASCOT MINIATURE */}
                                <div className="w-12 h-12 -mt-2 -mr-2 transition-transform group-hover:scale-110">
                                    <img src={getMascot(agency.budget_real)} alt="Status" className="w-full h-full object-contain" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">VE Actuelle / Marché</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="font-display font-black text-2xl text-indigo-600">
                                            {agency.ve_current.toFixed(0)}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400">
                                            / {calculateMarketVE(agency).toFixed(0)}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Trésorerie</span>
                                    <span className={`font-mono font-bold text-xl ${agency.budget_real < 0 ? 'text-red-500' : 'text-slate-700'}`}>
                                        {agency.budget_real.toLocaleString()} <span className="text-xs text-slate-400">px</span>
                                    </span>
                                </div>
                            </div>

                            {/* MINI INDICATOR FLOW */}
                            <div className="mt-3 flex items-center justify-end gap-2 text-xs font-bold">
                                <span className="text-slate-400 text-[10px] uppercase">Flux Hebdo :</span>
                                <span className={`${health.netFlow >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {health.netFlow > 0 ? '+' : ''}{health.netFlow.toFixed(0)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* MODAL DETAIL FINANCIER */}
            {selectedAgency && (
                <Modal isOpen={!!selectedAgency} onClose={() => setSelectedAgency(null)} title={`Finance : ${selectedAgency.name}`}>
                    <div className="space-y-6">
                        {(() => {
                            const h = getFinancialHealth(selectedAgency);
                            return (
                                <>
                                    <div className="flex items-center justify-center mb-4">
                                        <img src={getMascot(selectedAgency.budget_real)} className="h-32 drop-shadow-xl animate-bounce-slow" />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-center">
                                            <p className="text-[10px] font-bold uppercase text-indigo-400 mb-1 leading-tight">VE Actuelle (Cashout)</p>
                                            <p className="text-3xl font-black text-indigo-700">{selectedAgency.ve_current.toFixed(0)}</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 leading-tight">VE Marché (Réelle)</p>
                                            <p className="text-3xl font-black text-slate-700">{calculateMarketVE(selectedAgency).toFixed(0)}</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 leading-tight">Plafond (Cap)</p>
                                            <p className="text-3xl font-black text-slate-500">{calculateVECap(selectedAgency)}</p>
                                        </div>
                                    </div>

                                    <div className={`p-4 rounded-xl border text-center ${selectedAgency.budget_real < 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                        <p className={`text-xs font-bold uppercase mb-1 ${selectedAgency.budget_real < 0 ? 'text-red-400' : 'text-emerald-400'}`}>Trésorerie</p>
                                        <p className={`text-4xl font-black ${selectedAgency.budget_real < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{selectedAgency.budget_real} px</p>
                                    </div>

                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-bold text-xs text-slate-500 uppercase">
                                            Bilan Hebdomadaire Estimé
                                        </div>
                                        <div className="p-4 space-y-2 text-sm">
                                            <div className="flex justify-between text-emerald-600">
                                                <span className="flex items-center gap-2"><TrendingUp size={14}/> Revenus Estimés</span>
                                                <span className="font-bold">+{h.revenue.toFixed(0)}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-600">
                                                <span className="flex items-center gap-2"><Users size={14}/> Masse Salariale</span>
                                                <span>-{h.totalSalary}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-600">
                                                <span className="flex items-center gap-2"><DollarSign size={14}/> Loyer Studio</span>
                                                <span>-{h.rent}</span>
                                            </div>
                                            {h.dividends > 0 && (
                                                <div className="flex justify-between text-red-600">
                                                    <span className="flex items-center gap-2"><Users size={14}/> Dividendes Seniors</span>
                                                    <span>-{h.dividends}</span>
                                                </div>
                                            )}
                                            <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between font-black text-base">
                                                <span>Flux Net</span>
                                                <span className={h.netFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                                    {h.netFlow > 0 ? '+' : ''}{h.netFlow.toFixed(0)} PiXi
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </Modal>
            )}
        </div>
    );
};
