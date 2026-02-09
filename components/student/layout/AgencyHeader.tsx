
import React from 'react';
import { Agency, BrandColor, Student } from '../../../types';
import { Settings, Wallet, Landmark, HelpCircle, Shield, Crown, Sparkles, Star } from 'lucide-react';
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

    // --- 100 VE GOD MODE CHECK ---
    const isElite = agency.ve_current >= 100;

    return (
        <div className={`relative mb-8 rounded-b-3xl md:rounded-3xl overflow-hidden min-h-[200px] md:min-h-[240px] shadow-md group transition-all duration-700 ${
            isElite 
            ? 'bg-slate-900 border-b-4 md:border-4 border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.3)]' 
            : 'bg-slate-100'
        }`}>
            {/* BACKGROUND LAYER */}
            {agency.branding?.bannerUrl ? (
                <img src={agency.branding.bannerUrl} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${isElite ? 'opacity-40 grayscale' : 'opacity-100'}`} alt="Banner" />
            ) : (
                <div className={`absolute inset-0 opacity-10 ${theme.bg}`} style={{backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
            )}
            
            {/* GRADIENT OVERLAY */}
            <div className={`absolute inset-0 transition-colors duration-700 ${
                isElite 
                ? 'bg-gradient-to-t from-black via-slate-900/80 to-yellow-900/20' 
                : 'bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent'
            }`}></div>

            {/* ELITE PARTICLES */}
            {isElite && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-10 left-1/4 text-yellow-400 opacity-20 animate-pulse"><Sparkles size={24}/></div>
                    <div className="absolute top-1/3 right-10 text-yellow-200 opacity-30 animate-bounce"><Star size={16}/></div>
                    <div className="absolute bottom-20 right-1/3 text-amber-500 opacity-20 animate-pulse"><Sparkles size={32}/></div>
                </div>
            )}

            {/* SETTINGS BUTTON */}
            {agency.id !== 'unassigned' && (
                <button onClick={onOpenSettings} className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-black/50 transition-all opacity-0 group-hover:opacity-100 border border-white/10 z-20">
                    <Settings size={20}/>
                </button>
            )}

            {/* MAIN CONTENT */}
            <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col xl:flex-row justify-between items-end xl:items-end gap-6 text-white">
                <div className="w-full xl:w-auto flex gap-4 items-end">
                    {/* AGENCY LOGO */}
                    {agency.logoUrl && (
                        <div className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl p-1 shadow-2xl shrink-0 animate-in zoom-in duration-300 relative ${isElite ? 'bg-gradient-to-br from-yellow-200 to-amber-600' : 'bg-white'}`}>
                            <img src={agency.logoUrl} className="w-full h-full object-contain rounded-xl bg-white" alt="Logo" />
                            {isElite && (
                                <div className="absolute -top-3 -left-3 bg-yellow-400 text-yellow-900 p-1.5 rounded-full shadow-lg border-2 border-white">
                                    <Crown size={16} fill="currentColor"/>
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            {agency.id !== 'unassigned' && (
                                isElite ? (
                                    <span className="bg-yellow-400 text-yellow-900 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-yellow-400/20 flex items-center gap-1 border border-yellow-200">
                                        <Crown size={10} fill="currentColor"/> LÉGENDAIRE
                                    </span>
                                ) : (
                                    <span className="bg-white/20 backdrop-blur border border-white/10 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                        Rang #{myRank}
                                    </span>
                                )
                            )}
                            <span className={`italic text-sm truncate ${isElite ? 'text-yellow-100/70' : 'text-slate-300'}`}>"{agency.tagline}"</span>
                        </div>
                        
                        <h2 className={`text-4xl md:text-5xl font-display font-bold tracking-tight drop-shadow-lg leading-none mb-3 ${isElite ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 via-yellow-300 to-amber-500' : 'text-white'}`}>
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
                    isElite 
                    ? 'bg-yellow-900/20 border-yellow-500/30' 
                    : 'bg-black/40 border-white/10'
                }`}>
                    {myMemberProfile && (
                        <div className="flex-1 md:text-right md:border-r border-white/20 md:pr-4">
                            <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 flex items-center gap-1 md:justify-end ${isElite ? 'text-yellow-200' : 'text-yellow-300'}`}>
                                <Wallet size={12}/> Mon Solde
                            </span>
                            <div className="text-lg font-bold text-white flex items-center md:justify-end gap-2">
                                <span className={`font-mono ${myMemberProfile.wallet && myMemberProfile.wallet < 0 ? 'text-red-400' : 'text-yellow-400'}`}>{myMemberProfile.wallet || 0} PiXi</span>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex-1 md:text-right md:border-r border-white/20 md:pr-4">
                        <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 flex items-center gap-1 md:justify-end ${isElite ? 'text-amber-200' : 'text-indigo-300'}`}>
                            <Landmark size={12}/> Trésorerie
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
                                className={`text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1 justify-center cursor-pointer hover:text-white ${isElite ? 'text-yellow-400' : 'text-slate-300'}`}
                            >
                                VE <HelpCircle size={10}/>
                            </div>
                            <div className={`text-3xl font-display font-bold leading-none ${isElite ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' : (agency.ve_current >= 60 ? 'text-emerald-400' : 'text-amber-400')}`}>
                                {agency.ve_current}
                            </div>
                        </div>
                    </div>
                </div>
                )}
            </div>
        </div>
    );
};
