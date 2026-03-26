import React from 'react';
import { Modal } from '../../Modal';
import { Agency } from '../../../types';
import { GAME_RULES, MASCOTS, HOLDING_RULES } from '../../../constants';
import { TrendingUp, Users, Building2, ArrowRight, Award } from 'lucide-react';

interface FinanceDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    agency: Agency;
}

export const FinanceDetailModal: React.FC<FinanceDetailModalProps> = ({ isOpen, onClose, agency }) => {
    
    // Calculs financiers détaillés
    
    // 1. Masse Salariale
    const rawSalary = agency.members.reduce((acc, member) => {
        const salary = Math.min(member.individualScore * GAME_RULES.SALARY_MULTIPLIER, GAME_RULES.SALARY_CAP_FOR_STUDENT);
        return acc + salary;
    }, 0);

    // 2. Loyer
    const rent = GAME_RULES.AGENCY_RENT;
    
    // 3. Revenus VE
    let veMultiplier = GAME_RULES.REVENUE_VE_MULTIPLIER;
    if (agency.type === 'HOLDING') {
        const history = agency.ve_history || [];
        if (history.length >= 2) {
            const growth = history[history.length - 1].value - history[history.length - 2].value;
            if (growth >= 10) veMultiplier = HOLDING_RULES.REVENUE_MULTIPLIER_PERFORMANCE;
            else if (growth >= HOLDING_RULES.GROWTH_TARGET) veMultiplier = HOLDING_RULES.REVENUE_MULTIPLIER_STANDARD;
            else veMultiplier = 30; // Pénalité
        } else {
            veMultiplier = HOLDING_RULES.REVENUE_MULTIPLIER_STANDARD;
        }
    }
    const veRevenue = agency.ve_current * veMultiplier;

    // 4. Revenus Trophées / Bonus
    const badgeRevenue = agency.weeklyRevenueModifier || 0;

    // 5. Dividendes (Si Holding)
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

    // 6. Total
    const weeklyRevenue = GAME_RULES.REVENUE_BASE + veRevenue + badgeRevenue;
    const weeklyCharges = rawSalary + rent; 
    const netWeekly = weeklyRevenue - weeklyCharges - dividends;

    // Mascotte
    const getMascot = () => {
        if (agency.budget_real <= 0) return MASCOTS.MARKET_POOR;
        if (agency.budget_real >= 5000) return MASCOTS.MARKET_RICH;
        return MASCOTS.MARKET_STABLE;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Finance : ${agency.name}`}>
            <div className="space-y-6">
                
                {/* HERO SECTION */}
                <div className="flex flex-col items-center justify-center py-4">
                    <img src={getMascot()} className="h-32 w-auto drop-shadow-xl animate-bounce-slow mb-4" alt="Mascotte Finance" />
                    
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 text-center">
                            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">VE ACTUELLE</p>
                            <p className="text-3xl font-black text-indigo-600">{agency.ve_current.toFixed(1)}</p>
                        </div>
                        <div className={`p-4 rounded-2xl border text-center ${agency.budget_real < 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                            <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${agency.budget_real < 0 ? 'text-red-400' : 'text-emerald-400'}`}>TRÉSORERIE</p>
                            <p className={`text-3xl font-black ${agency.budget_real < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {agency.budget_real.toLocaleString()} <span className="text-lg">px</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* TABLEAU DÉTAILLÉ */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                        <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">BILAN HEBDOMADAIRE ESTIMÉ</h4>
                    </div>
                    
                    <div className="p-4 space-y-4">
                        {/* REVENUS */}
                        <div>
                            <h5 className="text-xs font-bold text-slate-400 uppercase mb-2">Revenus</h5>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-emerald-600 bg-emerald-50/50 p-2 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp size={16} />
                                        <span className="font-medium">Valeur Estimée (VE x {veMultiplier})</span>
                                    </div>
                                    <span className="font-bold">+{veRevenue.toFixed(0)}</span>
                                </div>
                                {badgeRevenue > 0 && (
                                    <div className="flex items-center justify-between text-emerald-600 bg-emerald-50/50 p-2 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Award size={16} />
                                            <span className="font-medium">Bonus Trophées / Événements</span>
                                        </div>
                                        <span className="font-bold">+{badgeRevenue.toFixed(0)}</span>
                                    </div>
                                )}
                                {dividends > 0 && (
                                    <div className="flex items-center justify-between text-red-600 bg-red-50/50 p-2 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <Users size={16} className="text-red-400" />
                                            <span className="font-medium">Dividendes Seniors</span>
                                        </div>
                                        <span className="font-bold">-{dividends.toFixed(0)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* CHARGES */}
                        <div>
                            <h5 className="text-xs font-bold text-slate-400 uppercase mb-2">Charges</h5>
                            <div className="space-y-2">
                                {/* LOYER */}
                                <div className="flex items-center justify-between text-slate-600 bg-slate-50 p-2 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Building2 size={16} />
                                        <span className="font-medium">Loyer Studio</span>
                                    </div>
                                    <span className="font-medium">-{rent}</span>
                                </div>

                                {/* SALAIRES DÉTAILLÉS */}
                                <div className="bg-slate-50 p-2 rounded-lg">
                                    <div className="flex items-center justify-between text-slate-600 mb-2">
                                        <div className="flex items-center gap-2">
                                            <Users size={16} />
                                            <span className="font-medium">Masse Salariale Totale</span>
                                        </div>
                                        <span className="font-bold">-{rawSalary.toFixed(0)}</span>
                                    </div>
                                    <div className="pl-6 space-y-1 border-l-2 border-slate-200 ml-2">
                                        {agency.members.map(member => {
                                            const salary = Math.min(member.individualScore * GAME_RULES.SALARY_MULTIPLIER, GAME_RULES.SALARY_CAP_FOR_STUDENT);
                                            return (
                                                <div key={member.id} className="flex justify-between text-xs text-slate-500">
                                                    <span>{member.name} (Score: {member.individualScore})</span>
                                                    <span>-{salary.toFixed(0)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* TOTAL */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-2">
                            <span className="font-black text-slate-900 text-lg">Flux Net Hebdomadaire</span>
                            <span className={`font-black text-xl ${netWeekly >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {netWeekly > 0 ? '+' : ''}{netWeekly.toFixed(0)} PiXi
                            </span>
                        </div>
                    </div>
                </div>

                <div className="text-center text-xs text-slate-400 italic">
                    * Estimations basées sur les scores actuels. Mise à jour chaque Lundi matin. Le salaire max par étudiant est capé à {GAME_RULES.SALARY_CAP_FOR_STUDENT} PiXi.
                </div>

            </div>
        </Modal>
    );
};
