
import React, { useMemo } from 'react';
import { Agency, GameEvent } from '../types';
import { Wallet, Landmark, TrendingUp, ArrowRightLeft, Users, PiggyBank, Building2 } from 'lucide-react';

interface AdminBankProps {
    agencies: Agency[];
}

export const AdminBank: React.FC<AdminBankProps> = ({ agencies }) => {
    
    // 1. CALCULS MACRO
    const stats = useMemo(() => {
        let totalAgencyCash = 0;
        let totalStudentWallet = 0;
        let totalDebt = 0;
        let studentCount = 0;

        agencies.forEach(a => {
            if(a.id === 'unassigned') return;
            if(a.budget_real > 0) totalAgencyCash += a.budget_real;
            else totalDebt += Math.abs(a.budget_real);

            a.members.forEach(m => {
                totalStudentWallet += (m.wallet || 0);
                studentCount++;
            });
        });

        return {
            totalCash: totalAgencyCash + totalStudentWallet,
            agencyShare: totalAgencyCash,
            studentShare: totalStudentWallet,
            debt: totalDebt,
            avgStudent: studentCount > 0 ? Math.round(totalStudentWallet / studentCount) : 0
        };
    }, [agencies]);

    // 2. JOURNAL DES TRANSACTIONS (Aggrégé)
    const transactions = useMemo(() => {
        const logs: {agencyName: string, event: GameEvent}[] = [];
        
        agencies.forEach(a => {
            // On filtre pour ne garder que les logs financiers pertinents
            const financialEvents = a.eventLog.filter(e => 
                e.type === 'PAYROLL' || 
                (e.type === 'INFO' && (e.label.includes('Virement') || e.label.includes('Injection'))) ||
                e.type === 'REVENUE'
            );
            
            financialEvents.forEach(e => logs.push({agencyName: a.name, event: e}));
        });

        // Tri décroissant par date/id
        return logs.sort((a,b) => b.event.id.localeCompare(a.event.id)).slice(0, 50); // Dernières 50 transactions
    }, [agencies]);

    return (
        <div className="animate-in fade-in duration-500 pb-20">
            <div className="mb-8">
                <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700"><Landmark size={32}/></div>
                    Banque Centrale (RNP Treasury)
                </h2>
                <p className="text-slate-500 text-sm mt-1">Supervision de la masse monétaire et des flux financiers.</p>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Masse Monétaire (PIB)</p>
                    <p className="text-3xl font-black">{stats.totalCash.toLocaleString()} PiXi</p>
                    <div className="w-full bg-slate-700 h-1 mt-3 rounded-full overflow-hidden flex">
                        <div className="bg-indigo-500 h-full" style={{width: `${(stats.agencyShare/stats.totalCash)*100}%`}}></div>
                        <div className="bg-emerald-500 h-full" style={{width: `${(stats.studentShare/stats.totalCash)*100}%`}}></div>
                    </div>
                    <div className="flex justify-between text-[9px] mt-1 text-slate-400">
                        <span>Agences ({(stats.agencyShare/stats.totalCash*100).toFixed(0)}%)</span>
                        <span>Étudiants ({(stats.studentShare/stats.totalCash*100).toFixed(0)}%)</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Wallet size={20}/></div>
                        <p className="text-sm font-bold text-slate-500">Richesse Étudiante</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stats.studentShare.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">Moyenne: {stats.avgStudent} par tête</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Building2 size={20}/></div>
                        <p className="text-sm font-bold text-slate-500">Fonds Agences</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stats.agencyShare.toLocaleString()}</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-100 text-red-600 rounded-lg"><TrendingUp size={20}/></div>
                        <p className="text-sm font-bold text-red-500">Dette Globale</p>
                    </div>
                    <p className="text-2xl font-bold text-red-600">-{stats.debt.toLocaleString()}</p>
                </div>
            </div>

            {/* TRANSACTION FEED */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <ArrowRightLeft size={20}/> Grand Livre des Transactions
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-100">
                            <tr>
                                <th className="p-4">Date</th>
                                <th className="p-4">Agence Concernée</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Description / Motif</th>
                                <th className="p-4 text-right">Montant</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transactions.map((t, idx) => (
                                <tr key={`${t.event.id}-${idx}`} className="hover:bg-slate-50 transition-colors text-sm">
                                    <td className="p-4 whitespace-nowrap text-slate-500 font-mono text-xs">{t.event.date}</td>
                                    <td className="p-4 font-bold text-slate-700">{t.agencyName}</td>
                                    <td className="p-4">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                                            t.event.type === 'REVENUE' ? 'bg-emerald-100 text-emerald-700' :
                                            t.event.type === 'PAYROLL' ? 'bg-red-100 text-red-700' :
                                            'bg-indigo-100 text-indigo-700'
                                        }`}>
                                            {t.event.label}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-600 max-w-md truncate" title={t.event.description}>
                                        {t.event.description}
                                    </td>
                                    <td className={`p-4 text-right font-mono font-bold ${
                                        (t.event.deltaBudgetReal || 0) > 0 ? 'text-emerald-600' : 
                                        (t.event.deltaBudgetReal || 0) < 0 ? 'text-red-600' : 'text-slate-400'
                                    }`}>
                                        {t.event.deltaBudgetReal !== 0 ? `${t.event.deltaBudgetReal > 0 ? '+' : ''}${t.event.deltaBudgetReal}` : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
