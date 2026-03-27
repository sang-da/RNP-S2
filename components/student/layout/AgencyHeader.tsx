
import React, { useState } from 'react';
import { Agency, BrandColor, Student } from '../../../types';
import { Settings, Wallet, Landmark, HelpCircle, Shield, Crown, Sparkles, Star, History } from 'lucide-react';
import { GAME_RULES, HOLDING_RULES, calculateVECap, calculateMarketVE } from '../../../constants';

interface AgencyHeaderProps {
    agency: Agency;
    myRank: number;
    theme: { bg: string, text: string };
    myMemberProfile?: Student;
    onOpenSettings: () => void;
    onOpenVERules: () => void;
    onOpenHistory?: () => void;
    onOpenFinance?: () => void;
}

export const AgencyHeader: React.FC<AgencyHeaderProps> = ({ 
    agency, 
    myRank, 
    theme, 
    myMemberProfile, 
    onOpenSettings, 
    onOpenVERules,
    onOpenHistory,
    onOpenFinance
}) => {
    
    // Calculs financiers pour l'affichage (Synchronisés avec useFinanceLogic)
    const isHolding = agency.type === 'HOLDING';
    
    // 1. REVENUS
    let multiplier = GAME_RULES.REVENUE_VE_MULTIPLIER; // 30
    if (isHolding) {
        const history = agency.ve_history || [];
        if (history.length >= 2) {
            const growth = history[history.length - 1].value - history[history.length - 2].value;
            if (growth >= 10) multiplier = HOLDING_RULES.REVENUE_MULTIPLIER_PERFORMANCE; // 70
            else if (growth >= HOLDING_RULES.GROWTH_TARGET) multiplier = HOLDING_RULES.REVENUE_MULTIPLIER_STANDARD; // 50
            else multiplier = 30; // Pénalité
        } else {
            multiplier = HOLDING_RULES.REVENUE_MULTIPLIER_STANDARD; // 50
        }
    }
    const veRevenue = agency.ve_current * multiplier;
    const weeklyRevenue = veRevenue + (agency.weeklyRevenueModifier || 0) + GAME_RULES.REVENUE_BASE;

    // 2. CHARGES
    const rent = GAME_RULES.AGENCY_RENT;
    const totalSalaries = agency.members.reduce((acc, member) => {
        const rawSalary = Math.round(member.individualScore * GAME_RULES.SALARY_MULTIPLIER);
        return acc + Math.min(rawSalary, GAME_RULES.SALARY_CAP_FOR_STUDENT);
    }, 0);
    const weeklyCharges = rent + totalSalaries;

    // 3. DIVIDENDES (Si Holding)
    let dividends = 0;
    if (isHolding && agency.seniorityMap) {
        const seniorMembers = agency.members.filter(m => agency.seniorityMap?.[m.id] === 'SENIOR');
        if (seniorMembers.length > 0) {
            let dividendRate = HOLDING_RULES.DIVIDEND_RATE_LOW;
            if (agency.ve_current >= 80) dividendRate = HOLDING_RULES.DIVIDEND_RATE_HIGH;
            else if (agency.ve_current >= 60) dividendRate = HOLDING_RULES.DIVIDEND_RATE_MID;
            dividends = Math.floor(weeklyRevenue * dividendRate);
        }
    }

    const netWeekly = weeklyRevenue - weeklyCharges - dividends;

    // VE Calculations
    const maxVE = calculateVECap(agency);
    const marketVE = calculateMarketVE(agency);

    // --- 100 VE GOD MODE CHECK ---
    const isElite = agency.ve_current >= 100;

    return (
        <div className={`relative mb-8 rounded-b-3xl md:rounded-3xl overflow-hidden min-h-[200px] md:min-h-[240px] shadow-md group transition-all duration-700 ${
            isElite || isHolding
            ? 'bg-slate-900 border-b-4 md:border-4 border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.3)]' 
            : 'bg-slate-100'
        }`}>
            {/* BACKGROUND LAYER */}
            {agency.branding?.bannerUrl ? (
                <img src={agency.branding.bannerUrl} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${isElite || isHolding ? 'opacity-40 grayscale' : 'opacity-100'}`} alt="Banner" />
            ) : (
                <div className={`absolute inset-0 opacity-10 ${theme.bg}`} style={{backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
            )}
            
            {/* GRADIENT OVERLAY */}
            <div className={`absolute inset-0 transition-colors duration-700 ${
                isElite || isHolding
                ? 'bg-gradient-to-t from-black via-slate-900/80 to-yellow-900/20' 
                : 'bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent'
            }`}></div>

            {/* ELITE PARTICLES */}
            {(isElite || isHolding) && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-10 left-1/4 text-yellow-400 opacity-20 animate-pulse"><Sparkles size={24}/></div>
                    <div className="absolute top-1/3 right-10 text-yellow-200 opacity-30 animate-bounce"><Star size={16}/></div>
                    <div className="absolute bottom-20 right-1/3 text-amber-500 opacity-20 animate-pulse"><Sparkles size={32}/></div>
                </div>
            )}

            {/* SETTINGS & HISTORY BUTTONS */}
            <div className="absolute top-4 right-4 flex gap-2 z-20">
                {agency.id !== 'unassigned' && (
                    <>
                        {onOpenHistory && (
                            <button 
                                onClick={onOpenHistory} 
                                className="p-2 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-black/50 transition-all opacity-0 group-hover:opacity-100 border border-white/10"
                                title="Historique des Incidents"
                            >
                                <History size={20}/>
                            </button>
                        )}
                        <button 
                            onClick={onOpenSettings} 
                            className="p-2 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-black/50 transition-all opacity-0 group-hover:opacity-100 border border-white/10"
                            title="Paramètres Agence"
                        >
                            <Settings size={20}/>
                        </button>
                    </>
                )}
            </div>

            {/* MAIN CONTENT */}
            <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col xl:flex-row justify-between items-end xl:items-end gap-6 text-white">
                <div className="w-full xl:w-auto flex gap-4 items-end">
                    {/* AGENCY LOGO */}
                    {agency.logoUrl && (
                        <div className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl p-1 shadow-2xl shrink-0 animate-in zoom-in duration-300 relative ${isElite || isHolding ? 'bg-gradient-to-br from-yellow-200 to-amber-600' : 'bg-white'}`}>
                            <img src={agency.logoUrl} className="w-full h-full object-contain rounded-xl bg-white" alt="Logo" />
                            {(isElite || isHolding) && (
                                <div className="absolute -top-3 -left-3 bg-yellow-400 text-yellow-900 p-1.5 rounded-full shadow-lg border-2 border-white">
                                    <Crown size={16} fill="currentColor"/>
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            {agency.id !== 'unassigned' && (
                                isElite || isHolding ? (
                                    <span className="bg-yellow-400 text-yellow-900 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-yellow-400/20 flex items-center gap-1 border border-yellow-200">
                                        <Crown size={10} fill="currentColor"/> {isHolding ? 'HOLDING' : 'LÉGENDAIRE'}
                                    </span>
                                ) : (
                                    <span className="bg-white/20 backdrop-blur border border-white/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                        Rang #{myRank}
                                    </span>
                                )
                            )}
                            <span className={`italic text-sm truncate ${isElite || isHolding ? 'text-yellow-100/70' : 'text-slate-300'}`}>"{agency.tagline}"</span>
                        </div>
                        
                        <h2 className={`text-4xl md:text-5xl font-display font-bold tracking-tight drop-shadow-lg leading-none mb-3 ${isElite || isHolding ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 via-yellow-300 to-amber-500' : 'text-white'}`}>
                            {agency.name}
                        </h2>
                        
                        <div className="flex items-center gap-1">
                            {agency.badges && agency.badges.map(b => (
                                <div key={b.id} title={b.label} className="w-6 h-6 rounded-full bg-yellow-400 text-yellow-900 flex items-center justify-center shadow-lg border border-yellow-200"><Shield size={12}/></div>
                            ))}
                        </div>
                    </div>
                </div>

                {agency.id !== 'unassigned' && (
                <div className={`flex flex-col md:flex-row gap-4 w-full xl:w-auto backdrop-blur-md p-4 rounded-2xl border transition-colors duration-500 ${
                    isElite || isHolding
                    ? 'bg-yellow-900/20 border-yellow-500/30' 
                    : 'bg-black/40 border-white/10'
                }`}>
                    {myMemberProfile && (
                        <div className="flex-1 md:text-right md:border-r border-white/20 md:pr-4">
                            <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 flex items-center gap-1 md:justify-end ${isElite || isHolding ? 'text-yellow-200' : 'text-yellow-300'}`}>
                                <Wallet size={12}/> Mon Solde
                            </span>
                            <div className="text-lg font-bold text-white flex items-center md:justify-end gap-2">
                                <span className={`font-mono ${myMemberProfile.wallet && myMemberProfile.wallet < 0 ? 'text-red-400' : 'text-yellow-400'}`}>{(myMemberProfile.wallet || 0).toFixed(0)} PiXi</span>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex-1 md:text-right md:border-r border-white/20 md:pr-4">
                        <div 
                            onClick={onOpenFinance}
                            className={`${onOpenFinance ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                        >
                            <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 flex items-center gap-1 md:justify-end ${isElite || isHolding ? 'text-amber-200' : 'text-indigo-300'}`}>
                                <Landmark size={12}/> Trésorerie
                            </span>
                            <div className="text-lg font-bold text-white flex items-center md:justify-end gap-2">
                                <span className={`font-mono ${agency.budget_real < 0 ? 'text-red-400' : 'text-white'}`}>{Math.round(agency.budget_real)} PiXi</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-start gap-6 pl-2">
                        <div className="text-center">
                            <div 
                                onClick={onOpenFinance}
                                className={`${onOpenFinance ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                            >
                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block mb-1">Flux Net</span>
                                <div className={`text-xl font-bold ${netWeekly >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{netWeekly > 0 ? '+' : ''}{netWeekly.toFixed(0)}</div>
                            </div>
                        </div>
                        <div className="text-center">
                            <div 
                                onClick={onOpenVERules}
                                className={`text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1 justify-center cursor-pointer hover:text-white ${isElite || isHolding ? 'text-yellow-400' : 'text-slate-300'}`}
                            >
                                VE Marché / Plafond <HelpCircle size={10}/>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className={`text-3xl font-display font-bold leading-none flex items-baseline gap-1 justify-center ${isElite || isHolding ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' : (agency.ve_current >= 60 ? 'text-emerald-400' : 'text-amber-400')}`}>
                                    {agency.ve_current.toFixed(0)} <span className="text-sm opacity-60 font-sans font-bold">/ {maxVE}</span>
                                </div>
                                {marketVE > maxVE && (
                                    <div className="text-[9px] font-bold text-emerald-500 uppercase mt-0.5 flex items-center gap-1" title="Votre VE Marché est supérieure à votre plafond, elle sert de bouclier contre les pertes.">
                                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                        Bouclier Marché: {marketVE.toFixed(0)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                )}
            </div>
        </div>
    );
};
