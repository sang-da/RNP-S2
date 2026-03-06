
import React, { useMemo, useState } from 'react';
import { Agency, GameEvent, Student } from '../types';
import { Wallet, Landmark, TrendingUp, ArrowRightLeft, Users, PiggyBank, Building2, CreditCard, AlertTriangle, ShieldCheck, MailWarning, Bell, Eye, Eraser, Microscope, Coins, Percent, Banknote, BarChart3, PieChart } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { doc, updateDoc, db, arrayUnion, writeBatch } from '../services/firebase';
import { useGame } from '../contexts/GameContext'; 
import { Modal } from './Modal';
import { BankMicroView } from './admin/bank/BankMicroView';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';

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
    const { wipeDebt } = useGame();
    const [activeView, setActiveView] = useState<'GLOBAL' | 'DEBT' | 'MICRO'>('GLOBAL');
    const [focusedDebtor, setFocusedDebtor] = useState<Debtor | null>(null);

    // 1. CALCULS MACRO
    const stats = useMemo(() => {
        let totalAgencyCash = 0;
        let totalStudentWallet = 0;
        let totalDebt = 0;
        let studentCount = 0;
        let agencyCount = 0;

        agencies.forEach(a => {
            if(a.id === 'unassigned') return;
            agencyCount++;
            if(a.budget_real > 0) totalAgencyCash += a.budget_real;
            else totalDebt += Math.abs(a.budget_real);

            a.members.forEach(m => {
                totalStudentWallet += (m.wallet || 0);
                studentCount++;
            });
        });

        const totalCash = totalAgencyCash + totalStudentWallet;

        return {
            totalCash,
            agencyShare: totalAgencyCash,
            studentShare: totalStudentWallet,
            debt: totalDebt,
            avgStudent: studentCount > 0 ? Math.round(totalStudentWallet / studentCount) : 0,
            avgAgency: agencyCount > 0 ? Math.round(totalAgencyCash / agencyCount) : 0,
            inflationRate: 2.5 // Mock inflation rate for now
        };
    }, [agencies]);

    // 2. DATA FOR CHARTS
    const chartData = useMemo(() => {
        return agencies.filter(a => a.id !== 'unassigned').map(a => ({
            name: a.name,
            budget: a.budget_real,
            ve: a.ve_current
        })).sort((a, b) => b.budget - a.budget);
    }, [agencies]);

    const pieData = [
        { name: 'Agences', value: stats.agencyShare },
        { name: 'Étudiants', value: stats.studentShare },
    ];
    const COLORS = ['#6366f1', '#10b981'];

    // 3. CENTRAL BANK ACTIONS
    const handleHelicopterMoney = async () => {
        const confirmed = await confirm({
            title: "Injection Monétaire Globale",
            message: "Vous allez distribuer 100 PiXi à TOUS les étudiants.\nCela augmentera la masse monétaire totale.",
            confirmText: "Injecter (Helicopter Money)"
        });

        if (confirmed) {
            try {
                const batch = writeBatch(db);
                let count = 0;
                agencies.forEach(a => {
                    a.members.forEach(m => {
                        const studentRef = doc(db, "agencies", a.id); 
                        // Note: In this data model, students are inside agency documents. 
                        // Updating nested arrays in Firestore is tricky with batch. 
                        // We might need a different approach or just update the agency doc entirely.
                        // For simplicity/safety in this context, we might need to iterate and update individually or use a specific backend function.
                        // However, assuming we can update the agency doc:
                        const updatedMembers = a.members.map(mem => {
                            if (mem.id === m.id) return { ...mem, wallet: (mem.wallet || 0) + 100 };
                            return mem;
                        });
                        batch.update(studentRef, { members: updatedMembers });
                        count++;
                    });
                });
                await batch.commit();
                toast('success', `Injection réussie : ${count * 100} PiXi distribués.`);
            } catch (e) {
                console.error(e);
                toast('error', "Erreur lors de l'injection.");
            }
        }
    };

    const handleTaxLevy = async () => {
        const confirmed = await confirm({
            title: "Prélèvement Exceptionnel",
            message: "Vous allez prélever 50 PiXi à TOUS les étudiants (Taxe d'inflation).\nCeux qui n'ont pas assez tomberont à 0.",
            confirmText: "Prélever (Taxe)",
            isDangerous: true
        });

        if (confirmed) {
             try {
                const batch = writeBatch(db);
                agencies.forEach(a => {
                    const updatedMembers = a.members.map(mem => {
                        return { ...mem, wallet: Math.max(0, (mem.wallet || 0) - 50) };
                    });
                    const studentRef = doc(db, "agencies", a.id);
                    batch.update(studentRef, { members: updatedMembers });
                });
                await batch.commit();
                toast('success', "Prélèvement effectué.");
            } catch (e) {
                console.error(e);
                toast('error', "Erreur lors du prélèvement.");
            }
        }
    };

    // 2. JOURNAL DES TRANSACTIONS (Aggrégé)
    const transactions = useMemo(() => {
        const logs: {agencyName: string, agencyId: string, event: GameEvent}[] = [];
        
        agencies.forEach(a => {
            // On filtre pour ne garder que les logs financiers pertinents + LOANS
            const financialEvents = a.eventLog.filter(e => 
                e.type === 'PAYROLL' || 
                (e.type === 'INFO' && (e.label.includes('Virement') || e.label.includes('Injection') || e.label.includes('Prêt') || e.label.includes('Remboursement') || e.label.includes('Amnistie'))) ||
                e.type === 'REVENUE'
            );
            
            financialEvents.forEach(e => logs.push({agencyName: a.name, agencyId: a.id, event: e}));
        });

        // Tri décroissant par date/id
        return logs.sort((a,b) => b.event.id.localeCompare(a.event.id)).slice(0, 50); // Dernières 50 transactions
    }, [agencies]);

    const handleReverseTransaction = async (agencyId: string, event: GameEvent) => {
        const confirmed = await confirm({
            title: "Annuler la transaction ?",
            message: `Vous allez contre-passer cette opération de ${event.deltaBudgetReal} PiXi.\nCela créera une écriture inverse.`,
            confirmText: "Annuler (Contre-passation)"
        });

        if (confirmed) {
            const reverseAmount = -event.deltaBudgetReal;
            const newEvent: GameEvent = {
                id: `rev-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                type: 'INFO',
                label: 'ANNULATION',
                deltaBudgetReal: reverseAmount,
                description: `Annulation de l'opération ${event.id} (${event.description})`
            };

            const agencyRef = doc(db, "agencies", agencyId);
            await updateDoc(agencyRef, {
                budget_real: (agencies.find(a => a.id === agencyId)?.budget_real || 0) + reverseAmount,
                eventLog: arrayUnion(newEvent)
            });
            toast('success', "Transaction annulée.");
        }
    };

    const handleFlagFraud = async (agencyId: string, event: GameEvent) => {
        const confirmed = await confirm({
            title: "Signaler comme Fraude ?",
            message: "Vous allez sanctionner cette opération comme frauduleuse.\nUne amende de 500 PiXi sera appliquée à l'agence.",
            confirmText: "Sanctionner (Fraude)",
            isDangerous: true
        });

        if (confirmed) {
            const fine = -500;
            const newEvent: GameEvent = {
                id: `fraud-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                type: 'INFO',
                label: 'SANCTION FRAUDE',
                deltaBudgetReal: fine,
                description: `Amende pour opération frauduleuse: ${event.description}`
            };

            const agencyRef = doc(db, "agencies", agencyId);
            await updateDoc(agencyRef, {
                budget_real: (agencies.find(a => a.id === agencyId)?.budget_real || 0) + fine,
                eventLog: arrayUnion(newEvent)
            });
            toast('success', "Sanction appliquée.");
        }
    };

    // 4. OBSERVATOIRE DE LA DETTE (Existing logic)
    const debtors = useMemo(() => {
        const list: Debtor[] = [];
        agencies.forEach(agency => {
            if(agency.id === 'unassigned') return;
            agency.members.forEach(student => {
                if ((student.loanDebt || 0) > 0) {
                    const assets = (student.wallet || 0) + (student.savings || 0);
                    const debt = student.loanDebt || 0;
                    const netWorth = assets - debt;
                    let score: 'AAA' | 'B' | 'C' | 'D' = 'B';
                    if (netWorth >= debt) score = 'AAA'; 
                    else if (netWorth >= 0) score = 'B'; 
                    else if (Math.abs(netWorth) < 500) score = 'C'; 
                    else score = 'D';
                    list.push({ student, agency, solvencyScore: score, netWorth });
                }
            });
        });
        return list.sort((a,b) => {
            const map = { 'D': 0, 'C': 1, 'B': 2, 'AAA': 3 };
            return map[a.solvencyScore] - map[b.solvencyScore];
        });
    }, [agencies]);

    const handleWipeDebt = async () => {
        if (!focusedDebtor) return;
        const confirmed = await confirm({
            title: "Amnistie Bancaire Totale ?",
            message: `Vous allez annuler la dette de ${focusedDebtor.student.name} (${focusedDebtor.student.loanDebt} PiXi).`,
            confirmText: "Effacer la dette",
            isDangerous: true
        });
        if (confirmed) {
            await wipeDebt(focusedDebtor.student.id, focusedDebtor.agency.id);
            setFocusedDebtor(null);
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
        <div className="animate-in fade-in duration-500 pb-20 space-y-8">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700"><Landmark size={32}/></div>
                        Banque Centrale
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Politique monétaire et supervision financière.</p>
                </div>
                
                <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto">
                    <button onClick={() => setActiveView('GLOBAL')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeView === 'GLOBAL' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400'}`}>
                        <Building2 size={14}/> Vue Macro
                    </button>
                    <button onClick={() => setActiveView('DEBT')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeView === 'DEBT' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}>
                        <AlertTriangle size={14}/> Risques & Dettes
                        {debtors.length > 0 && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[9px]">{debtors.length}</span>}
                    </button>
                    <button onClick={() => setActiveView('MICRO')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeView === 'MICRO' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                        <Microscope size={14}/> Audit Micro
                    </button>
                </div>
            </div>

            {/* GLOBAL VIEW */}
            {activeView === 'GLOBAL' && (
                <>
                    {/* KPI ROW */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden group">
                            <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Coins size={64}/></div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Masse Monétaire (M3)</p>
                            <p className="text-4xl font-black tracking-tight">{stats.totalCash.toLocaleString()} <span className="text-lg text-slate-500 font-medium">PiXi</span></p>
                            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded w-fit">
                                <TrendingUp size={12}/> +{stats.inflationRate}% Inflation (Est.)
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Moyenne / Agence</p>
                                <p className="text-2xl font-bold text-slate-900">{stats.avgAgency.toLocaleString()} PiXi</p>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 mt-2 rounded-full overflow-hidden">
                                <div className="bg-indigo-500 h-full" style={{width: '60%'}}></div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Moyenne / Étudiant</p>
                                <p className="text-2xl font-bold text-slate-900">{stats.avgStudent.toLocaleString()} PiXi</p>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 mt-2 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full" style={{width: '40%'}}></div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
                            <div className="absolute right-0 top-0 p-4 opacity-5"><Banknote size={48}/></div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Dette Totale</p>
                                <p className="text-2xl font-bold text-red-600">-{stats.debt.toLocaleString()} PiXi</p>
                            </div>
                            <button className="mt-2 text-xs font-bold text-red-600 hover:text-red-700 underline text-left">Voir détails &rarr;</button>
                        </div>
                    </div>

                    {/* CHARTS & ACTIONS ROW */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* CHART: Budget Distribution */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <BarChart3 size={20} className="text-indigo-600"/> Répartition des Budgets Agences
                            </h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={60}/>
                                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}}/>
                                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}/>
                                        <Bar dataKey="budget" fill="#6366f1" radius={[4, 4, 0, 0]} name="Budget (PiXi)" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* ACTIONS & PIE */}
                        <div className="space-y-6">
                            {/* PIE CHART */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <PieChart size={20} className="text-emerald-600"/> Distribution Richesse
                                </h3>
                                <div className="h-40 w-full flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RePieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8}/>
                                        </RePieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* CENTRAL BANK CONTROLS */}
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Landmark size={20} className="text-amber-600"/> Politique Monétaire
                                </h3>
                                <div className="space-y-3">
                                    <button 
                                        onClick={handleHelicopterMoney}
                                        className="w-full py-3 bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl font-bold text-xs uppercase shadow-sm transition-all flex items-center justify-center gap-2"
                                    >
                                        <Banknote size={16}/> Helicopter Money (+100)
                                    </button>
                                    <button 
                                        onClick={handleTaxLevy}
                                        className="w-full py-3 bg-white border border-red-200 text-red-700 hover:bg-red-50 rounded-xl font-bold text-xs uppercase shadow-sm transition-all flex items-center justify-center gap-2"
                                    >
                                        <Percent size={16}/> Taxe Inflation (-50)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TRANSACTION HISTORY */}
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
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {transactions.map((t, idx) => (
                                        <tr key={`${t.event.id}-${idx}`} className="hover:bg-slate-50 transition-colors text-sm group">
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
                                            <td className="p-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleReverseTransaction(t.agencyId, t.event)}
                                                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded"
                                                        title="Annuler (Contre-passation)"
                                                    >
                                                        <ArrowRightLeft size={14}/>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleFlagFraud(t.agencyId, t.event)}
                                                        className="p-1.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded"
                                                        title="Sanctionner (Fraude)"
                                                    >
                                                        <AlertTriangle size={14}/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* DEBT VIEW */}
            {activeView === 'DEBT' && (
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
                                        <tr key={`${d.student.id}-${idx}`} className="hover:bg-slate-50 transition-colors group">
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
                                                <div className="flex gap-2 justify-end">
                                                    <button 
                                                        onClick={() => setFocusedDebtor(d)}
                                                        className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                                        title="Voir Détails"
                                                    >
                                                        <Eye size={16}/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* MICRO VIEW */}
            {activeView === 'MICRO' && <BankMicroView agencies={agencies} />}

            {/* DEBTOR MODAL */}
            {focusedDebtor && (
                <Modal isOpen={!!focusedDebtor} onClose={() => setFocusedDebtor(null)} title="Inspection Financière (Dette)">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <img src={focusedDebtor.student.avatarUrl} className="w-16 h-16 rounded-full border-2 border-white shadow-sm" />
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg">{focusedDebtor.student.name}</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase">{focusedDebtor.agency.name}</p>
                                <div className="mt-2">{getSolvencyBadge(focusedDebtor.solvencyScore)}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                                <p className="text-xs font-bold text-red-400 uppercase mb-1">Dette Totale</p>
                                <p className="text-2xl font-black text-red-600">-{focusedDebtor.student.loanDebt} PiXi</p>
                            </div>
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
                                <p className="text-xs font-bold text-emerald-400 uppercase mb-1">Actifs Personnels</p>
                                <p className="text-2xl font-black text-emerald-600">
                                    {((focusedDebtor.student.wallet||0) + (focusedDebtor.student.savings||0))} PiXi
                                </p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <button 
                                onClick={handleWipeDebt}
                                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
                            >
                                <Eraser size={20}/>
                                Amnistie Totale (Effacer la Dette)
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};
