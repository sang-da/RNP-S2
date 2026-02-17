
import React, { useMemo } from 'react';
import { Agency, Student, GameEvent } from '../../../types';
import { Wallet, PiggyBank, CreditCard, TrendingUp, AlertTriangle, EyeOff, Activity, ArrowRight, ShieldAlert } from 'lucide-react';

interface StudentFinancialProfileProps {
    student: Student;
    agency: Agency;
}

export const StudentFinancialProfile: React.FC<StudentFinancialProfileProps> = ({ student, agency }) => {
    
    // 1. RECONSTITUTION DE L'HISTORIQUE PERSONNEL
    const history = useMemo(() => {
        // On scanne les logs de l'agence pour trouver tout ce qui concerne l'étudiant
        return agency.eventLog.filter(e => {
            const desc = e.description.toLowerCase();
            const name = student.name.toLowerCase();
            // Match basique sur le nom ou déduction contextuelle (black ops souvent anonymisés mais on a l'ID parfois)
            // Pour l'instant on se base sur le nom dans la description (généré par les fonctions de jeu)
            return desc.includes(name) || (e.type === 'BLACK_OP' && desc.includes('effectuée par')); 
        }).reverse();
    }, [agency.eventLog, student.name]);

    // 2. FILTRE SUSPICIEUX (BLACK OPS & CRISES)
    const suspiciousActivity = useMemo(() => {
        return history.filter(e => e.type === 'BLACK_OP' || e.type === 'CRISIS');
    }, [history]);

    // 3. STATS
    const wealth = (student.wallet || 0) + (student.savings || 0);
    const debtRatio = wealth > 0 ? ((student.loanDebt || 0) / wealth * 100).toFixed(0) : "∞";
    
    // Karma Color
    const karma = student.karma || 50;
    const karmaColor = karma > 60 ? 'text-emerald-500' : karma < 40 ? 'text-red-500' : 'text-amber-500';

    return (
        <div className="flex flex-col h-full overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            {/* HEADER */}
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <img src={student.avatarUrl} className="w-16 h-16 rounded-full border-4 border-white shadow-sm bg-white"/>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 leading-none">{student.name}</h2>
                        <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                            <span className="font-bold uppercase tracking-wider">{agency.name}</span>
                            <span>•</span>
                            <span>{student.role}</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Score Karma</p>
                    <div className={`text-3xl font-black ${karmaColor} flex items-center justify-end gap-2`}>
                        {karma} <Activity size={24}/>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                
                {/* 1. BILAN FINANCIER */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 text-emerald-50 opacity-50"><Wallet size={80}/></div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Patrimoine Net</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">{wealth} PiXi</p>
                        <div className="flex gap-2 mt-2 text-[10px] font-bold">
                            <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded">Wallet: {student.wallet}</span>
                            <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded">Épargne: {student.savings}</span>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 text-red-50 opacity-50"><CreditCard size={80}/></div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Dette Active</p>
                        <p className="text-2xl font-black text-red-600 mt-1">-{student.loanDebt || 0} PiXi</p>
                        <p className="text-[10px] text-red-400 mt-2 font-bold">Ratio Endettement: {debtRatio}%</p>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 text-indigo-50 opacity-50"><TrendingUp size={80}/></div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Investissements Agence</p>
                        <p className="text-2xl font-black text-indigo-600 mt-1">{student.cumulativeInjection || 0} PiXi</p>
                        <p className="text-[10px] text-indigo-400 mt-2 font-bold">Capital Injecté (Total)</p>
                    </div>
                </div>

                {/* 2. ACTIVITÉS SUSPECTES & BLACK OPS */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <EyeOff size={20} className="text-slate-400"/> Activités Spéciales & Incident (Karma Log)
                    </h3>
                    
                    {suspiciousActivity.length === 0 ? (
                        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-400 text-sm italic">
                            Aucune activité suspecte ou opération spéciale détectée pour ce profil.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {suspiciousActivity.map((evt, i) => (
                                <div key={i} className="flex gap-4 p-4 bg-red-50/50 border border-red-100 rounded-xl items-start">
                                    <div className="p-2 bg-white rounded-lg border border-red-100 text-red-500 shadow-sm shrink-0">
                                        {evt.type === 'BLACK_OP' ? <ShieldAlert size={20}/> : <AlertTriangle size={20}/>}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded uppercase">{evt.type}</span>
                                            <span className="text-xs text-slate-400 font-mono">{evt.date}</span>
                                        </div>
                                        <p className="font-bold text-sm text-slate-800">{evt.label}</p>
                                        <p className="text-xs text-slate-600 mt-1">{evt.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. HISTORIQUE TRANSACTIONNEL COMPLET */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <ArrowRight size={20} className="text-slate-400"/> Journal Financier Complet
                    </h3>
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                                <tr>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Opération</th>
                                    <th className="p-3">Détails</th>
                                    <th className="p-3 text-right">Impact Agence</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.map((evt, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="p-3 text-xs text-slate-400 whitespace-nowrap">{evt.date}</td>
                                        <td className="p-3 font-bold text-slate-700">{evt.label}</td>
                                        <td className="p-3 text-xs text-slate-600">{evt.description}</td>
                                        <td className={`p-3 text-right font-mono font-bold ${
                                            (evt.deltaBudgetReal || 0) > 0 ? 'text-emerald-600' : (evt.deltaBudgetReal || 0) < 0 ? 'text-red-600' : 'text-slate-400'
                                        }`}>
                                            {evt.deltaBudgetReal !== 0 ? `${evt.deltaBudgetReal > 0 ? '+' : ''}${evt.deltaBudgetReal}` : '-'}
                                        </td>
                                    </tr>
                                ))}
                                {history.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-slate-400 italic">Aucune transaction enregistrée.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};
