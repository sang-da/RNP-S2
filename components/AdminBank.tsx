
import React, { useMemo, useState } from 'react';
import { Agency, GameEvent, Student } from '../types';
import { Wallet, Landmark, TrendingUp, ArrowRightLeft, Users, PiggyBank, Building2, CreditCard, AlertTriangle, ShieldCheck, MailWarning, Bell } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { doc, updateDoc, db, arrayUnion } from '../services/firebase';

interface AdminBankProps {
    agencies: Agency[];
}

interface Debtor {
    student: Student;
    agency: Agency;
    solvencyScore: 'AAA' | 'B' | 'C' | 'D';
    netWorth: number;
}

export const AdminBank: React.FC<AdminBankProps> = ({ agencies }) => {
    const { toast, confirm } = useUI();
    const [activeView, setActiveView] = useState<'GLOBAL' | 'DEBT'>('GLOBAL');
    
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
            // On filtre pour ne garder que les logs financiers pertinents + LOANS
            const financialEvents = a.eventLog.filter(e => 
                e.type === 'PAYROLL' || 
                (e.type === 'INFO' && (e.label.includes('Virement') || e.label.includes('Injection') || e.label.includes('Prêt') || e.label.includes('Remboursement'))) ||
                e.type === 'REVENUE'
            );
            
            financialEvents.forEach(e => logs.push({agencyName: a.name, event: e}));
        });

        // Tri décroissant par date/id
        return logs.sort((a,b) => b.event.id.localeCompare(a.event.id)).slice(0, 50); // Dernières 50 transactions
    }, [agencies]);

    // 3. OBSERVATOIRE DE LA DETTE
    const debtors = useMemo(() => {
        const list: Debtor[] = [];
        agencies.forEach(agency => {
            if(agency.id === 'unassigned') return;
            agency.members.forEach(student => {
                if ((student.loanDebt || 0) > 0) {
                    // Calcul Solvabilité
                    // Net Worth = (Wallet + Savings) - Debt
                    // Si Net Worth > 0 : Solvable (AAA ou B)
                    // Si Net Worth < 0 : Insolvable (C ou D)
                    
                    const assets = (student.wallet || 0) + (student.savings || 0);
                    const debt = student.loanDebt || 0;
                    const netWorth = assets - debt;
                    
                    let score: 'AAA' | 'B' | 'C' | 'D' = 'B';
                    
                    if (netWorth >= debt) score = 'AAA'; // Peut rembourser 2x
                    else if (netWorth >= 0) score = 'B'; // Peut rembourser juste
                    else if (Math.abs(netWorth) < 500) score = 'C'; // Léger découvert
                    else score = 'D'; // Critique

                    list.push({ student, agency, solvencyScore: score, netWorth });
                }
            });
        });
        // Tri par score de solvabilité (les plus risqués en premier D -> AAA)
        return list.sort((a,b) => {
            const map = { 'D': 0, 'C': 1, 'B': 2, 'AAA': 3 };
            return map[a.solvencyScore] - map[b.solvencyScore];
        });
    }, [agencies]);

    // ACTION : ENVOYER RAPPEL
    const handleSendReminder = async (debtor: Debtor) => {
        const confirmed = await confirm({
            title: "Envoyer un Rappel ?",
            message: `Notifier ${debtor.student.name} de son échéance.\nCela créera une notification officielle dans le journal de l'agence.`,
            confirmText: "Notifier"
        });

        if (confirmed) {
            const newEvent: GameEvent = {
                id: `reminder-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                type: 'INFO',
                label: `⚠️ AVIS D'ÉCHÉANCE BANCAIRE`,
                deltaBudgetReal: 0,
                description: `Rappel pour ${debtor.student.name}. Dette: ${debtor.student.loanDebt} PiXi. Prochaine saisie sur salaire Lundi.`
            };

            const agencyRef = doc(db, "agencies", debtor.agency.id);
            // On utilise arrayUnion pour ajouter proprement sans écraser si l'agence a bougé entre temps
            await updateDoc(agencyRef, {
                eventLog: arrayUnion(newEvent)
            });
            toast('success', `Rappel envoyé à ${debtor.student.name}`);
        }
    };

    const getSolvencyBadge = (score: string) => {
        switch(score) {
            case 'AAA': return <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-1 rounded text-xs font-black">AAA</span>;
            case 'B': return <span className="bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-1 rounded text-xs font-black">B</span>;
            case 'C': return <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded text-xs font-black">C</span>;
            case 'D': return <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded text-xs font-black animate-pulse">D (CRITIQUE)</span>;
            default: return null;
        }
    };

    return (
        <div className="animate-in fade-in duration-500 pb-20">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700"><Landmark size={32}/></div>
                        Banque Centrale
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Supervision de la masse monétaire et des risques de crédit.</p>
                </div>
                
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveView('GLOBAL')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${activeView === 'GLOBAL' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400'}`}
                    >
                        <Building2 size={14}/> Vue Macro
                    </button>
                    <button 
                        onClick={() => setActiveView('DEBT')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${activeView === 'DEBT' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}
                    >
                        <AlertTriangle size={14}/> Observatoire Dette
                        {debtors.length > 0 && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[9px]">{debtors.length}</span>}
                    </button>
                </div>
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

                <div className={`p-5 rounded-2xl border shadow-sm transition-colors ${stats.debt > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-100 text-red-600 rounded-lg"><TrendingUp size={20}/></div>
                        <p className="text-sm font-bold text-slate-500">Dette Globale</p>
                    </div>
                    <p className="text-2xl font-bold text-red-600">-{stats.debt.toLocaleString()}</p>
                </div>
            </div>

            {/* CONTENT VIEW SWITCHER */}
            {activeView === 'GLOBAL' ? (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
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
            ) : (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-right-4">
                    <div className="p-6 border-b border-slate-100 bg-red-50/30 flex justify-between items-center">
                        <h3 className="font-bold text-red-700 flex items-center gap-2">
                            <ShieldCheck size={20}/> Observatoire des Risques
                        </h3>
                        <div className="text-xs text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                            {debtors.length} dossiers à risque
                        </div>
                    </div>
                    
                    {debtors.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 italic">
                            <ShieldCheck size={48} className="mx-auto mb-4 text-emerald-200"/>
                            Aucun étudiant endetté. Le système est sain.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-100">
                                    <tr>
                                        <th className="p-4">Débiteur</th>
                                        <th className="p-4">Agence</th>
                                        <th className="p-4 text-right">Dette Totale</th>
                                        <th className="p-4 text-right">Actifs (Wallet+Epargne)</th>
                                        <th className="p-4 text-center">Solvabilité</th>
                                        <th className="p-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {debtors.map((d, idx) => (
                                        <tr key={`${d.student.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <img src={d.student.avatarUrl} className="w-8 h-8 rounded-full bg-slate-200"/>
                                                    <span className="font-bold text-slate-700">{d.student.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-xs text-slate-500 font-bold uppercase">{d.agency.name}</td>
                                            <td className="p-4 text-right font-mono text-red-600 font-bold">-{d.student.loanDebt}</td>
                                            <td className="p-4 text-right font-mono text-slate-600">
                                                {((d.student.wallet||0) + (d.student.savings||0))}
                                            </td>
                                            <td className="p-4 text-center">
                                                {getSolvencyBadge(d.solvencyScore)}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button 
                                                    onClick={() => handleSendReminder(d)}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-500 rounded-lg text-xs font-bold transition-all shadow-sm"
                                                >
                                                    <MailWarning size={14}/> Rappel
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
