import React from 'react';
import { Modal } from '../../Modal';
import { Agency } from '../../../types';
import { GAME_RULES, MASCOTS } from '../../../constants';
import { TrendingUp, Users, Building2, ArrowRight } from 'lucide-react';

interface FinanceDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    agency: Agency;
}

export const FinanceDetailModal: React.FC<FinanceDetailModalProps> = ({ isOpen, onClose, agency }) => {
    
    // Calculs financiers (Identiques à AgencyHeader)
    const rawSalary = agency.members.reduce((acc, member) => acc + (member.individualScore * GAME_RULES.SALARY_MULTIPLIER), 0);
    const weeklyCharges = rawSalary * (1 + (agency.weeklyTax || 0)) + GAME_RULES.AGENCY_RENT;
    const veRevenue = agency.ve_current * GAME_RULES.REVENUE_VE_MULTIPLIER;
    const weeklyRevenue = GAME_RULES.REVENUE_BASE + veRevenue + (agency.weeklyRevenueModifier || 0);
    const netWeekly = weeklyRevenue - weeklyCharges;

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
                    
                    <div className="p-4 space-y-3">
                        {/* REVENUS */}
                        <div className="flex items-center justify-between text-emerald-600">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={16} />
                                <span className="font-medium">Revenus (VE x {GAME_RULES.REVENUE_VE_MULTIPLIER})</span>
                            </div>
                            <span className="font-bold">+{veRevenue.toFixed(0)}</span>
                        </div>
                        
                        {/* SALAIRES */}
                        <div className="flex items-center justify-between text-slate-500">
                            <div className="flex items-center gap-2">
                                <Users size={16} />
                                <span className="font-medium">Masse Salariale</span>
                            </div>
                            <span className="font-medium">-{rawSalary.toFixed(0)}</span>
                        </div>

                        {/* LOYER */}
                        <div className="flex items-center justify-between text-slate-500 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Building2 size={16} />
                                <span className="font-medium">Loyer Studio</span>
                            </div>
                            <span className="font-medium">-{GAME_RULES.AGENCY_RENT}</span>
                        </div>

                        {/* TOTAL */}
                        <div className="flex items-center justify-between pt-1">
                            <span className="font-black text-slate-900 text-lg">Flux Net</span>
                            <span className={`font-black text-lg ${netWeekly >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {netWeekly > 0 ? '+' : ''}{netWeekly.toFixed(0)} PiXi
                            </span>
                        </div>
                    </div>
                </div>

                <div className="text-center text-xs text-slate-400 italic">
                    * Estimations basées sur les scores actuels. Mise à jour chaque Lundi matin.
                </div>

            </div>
        </Modal>
    );
};
