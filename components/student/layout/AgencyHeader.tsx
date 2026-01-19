
import React from 'react';
import { Agency, BrandColor, Student } from '../../../types';
import { Settings, Wallet, Landmark, HelpCircle, Shield } from 'lucide-react';
import { GAME_RULES } from '../../../constants';

interface AgencyHeaderProps {
    agency: Agency;
    myRank: number;
    theme: { bg: string, text: string };
    myMemberProfile?: Student;
    onOpenSettings: () => void;
    onOpenVERules: () => void;
}

export const AgencyHeader: React.FC<AgencyHeaderProps> = ({ 
    agency, 
    myRank, 
    theme, 
    myMemberProfile, 
    onOpenSettings, 
    onOpenVERules 
}) => {
    
    // Calculs financiers pour l'affichage
    const rawSalary = agency.members.reduce((acc, member) => acc + (member.individualScore * GAME_RULES.SALARY_MULTIPLIER), 0);
    const weeklyCharges = rawSalary * (1 + (agency.weeklyTax || 0)) + GAME_RULES.AGENCY_RENT;
    const veRevenue = agency.ve_current * GAME_RULES.REVENUE_VE_MULTIPLIER;
    const weeklyRevenue = GAME_RULES.REVENUE_BASE + veRevenue + (agency.weeklyRevenueModifier || 0);
    const netWeekly = weeklyRevenue - weeklyCharges;

    return (
        <div className="relative mb-8 rounded-b-3xl md:rounded-3xl overflow-hidden bg-slate-100 min-h-[200px] md:min-h-[240px] shadow-md group">
            {agency.branding?.bannerUrl ? (
                <img src={agency.branding.bannerUrl} className="absolute inset-0 w-full h-full object-cover" alt="Banner" />
            ) : (
                <div className={`absolute inset-0 opacity-10 ${theme.bg}`} style={{backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
            {agency.id !== 'unassigned' && (
                <button onClick={onOpenSettings} className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-black/50 transition-all opacity-0 group-hover:opacity-100 border border-white/10 z-20">
                    <Settings size={20}/>
                </button>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col xl:flex-row justify-between items-end xl:items-end gap-6 text-white">
                <div className="w-full xl:w-auto flex gap-4 items-end">
                    {/* AGENCY LOGO */}
                    {agency.logoUrl && (
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white p-1 shadow-2xl shrink-0 animate-in zoom-in duration-300">
                            <img src={agency.logoUrl} className="w-full h-full object-contain rounded-xl" alt="Logo" />
                        </div>
                    )}
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            {agency.id !== 'unassigned' && <span className="bg-white/20 backdrop-blur border border-white/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Rang #{myRank}</span>}
                            <span className="text-slate-300 italic text-sm truncate">"{agency.tagline}"</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight drop-shadow-lg leading-none mb-3">{agency.name}</h2>
                        <div className="flex items-center gap-1">
                            {agency.badges && agency.badges.map(b => (
                                <div key={b.id} title={b.label} className="w-6 h-6 rounded-full bg-yellow-400 text-yellow-900 flex items-center justify-center shadow-lg border border-yellow-200"><Shield size={12}/></div>
                            ))}
                        </div>
                    </div>
                </div>

                {agency.id !== 'unassigned' && (
                <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                    {myMemberProfile && (
                        <div className="flex-1 md:text-right md:border-r border-white/20 md:pr-4">
                            <span className="text-[10px] font-bold text-yellow-300 uppercase tracking-widest block mb-1 flex items-center gap-1 md:justify-end">
                                <Wallet size={12}/> Mon Solde
                            </span>
                            <div className="text-lg font-bold text-white flex items-center md:justify-end gap-2">
                                <span className={`font-mono ${myMemberProfile.wallet && myMemberProfile.wallet < 0 ? 'text-red-400' : 'text-yellow-400'}`}>{myMemberProfile.wallet || 0} PiXi</span>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex-1 md:text-right md:border-r border-white/20 md:pr-4">
                        <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest block mb-1 flex items-center gap-1 md:justify-end">
                            <Landmark size={12}/> Trésorerie Studio
                        </span>
                        <div className="text-lg font-bold text-white flex items-center md:justify-end gap-2">
                            <span className={`font-mono ${agency.budget_real < 0 ? 'text-red-400' : 'text-white'}`}>{agency.budget_real} PiXi</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-start gap-6 pl-2">
                        <div className="text-center">
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block mb-1">Flux Net</span>
                            <div className={`text-xl font-bold ${netWeekly >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{netWeekly > 0 ? '+' : ''}{netWeekly.toFixed(0)}</div>
                        </div>
                        <div className="text-center">
                            <div 
                                onClick={onOpenVERules}
                                className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1 flex items-center gap-1 justify-center cursor-pointer hover:text-white"
                            >
                                VE <HelpCircle size={10}/>
                            </div>
                            <div className={`text-3xl font-display font-bold leading-none ${agency.ve_current >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>{agency.ve_current}</div>
                        </div>
                    </div>
                </div>
                )}
            </div>
        </div>
    );
};
