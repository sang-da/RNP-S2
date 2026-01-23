
import React, { useState } from 'react';
import { Student, Agency } from '../../types';
import { Wallet, Landmark, ArrowUpRight, Send, TrendingUp } from 'lucide-react';
import { GAME_RULES } from '../../constants';
import { useUI } from '../../contexts/UIContext';

interface WalletViewProps {
    student: Student;
    agency: Agency;
    allStudents: Student[];
    onTransfer: any;
    onInjectCapital: any;
    onRequestScore: any;
}

export const WalletView: React.FC<WalletViewProps> = ({student, agency, allStudents, onTransfer, onInjectCapital, onRequestScore}) => {
    const { confirm } = useUI();
    const [targetId, setTargetId] = useState('');
    const [amount, setAmount] = useState(0);
    const [scoreToBuy, setScoreToBuy] = useState(0);

    const isPrecarious = (student.wallet || 0) < 0;
    const isBankrupt = agency.budget_real <= GAME_RULES.BANKRUPTCY_THRESHOLD;

    // --- LOGIQUE DE CONFIRMATION ---

    const handleTransfer = async () => {
        if(!targetId || amount <= 0) return;
        
        const targetStudent = allStudents.find(s => s.id === targetId);
        const remaining = (student.wallet || 0) - amount;

        const confirmed = await confirm({
            title: "Confirmer le virement",
            message: `Vous allez envoyer ${amount} PiXi à ${targetStudent?.name}.\n\nCe virement est irréversible.\nVotre nouveau solde : ${remaining} PiXi.`,
            confirmText: "Envoyer les fonds",
            isDangerous: false
        });

        if (confirmed) {
            await onTransfer(student.id, targetId, amount);
            setAmount(0);
        }
    };

    const handleInject = async () => {
        if(amount <= 0) return;

        const tax = Math.floor(amount * GAME_RULES.INJECTION_TAX);
        const netReceived = amount - tax;
        const newAgencyBudget = agency.budget_real + netReceived;
        const remaining = (student.wallet || 0) - amount;

        const confirmed = await confirm({
            title: "Confirmer l'Investissement",
            message: `Vous allez injecter ${amount} PiXi dans l'agence "${agency.name}".\n\n💰 Taxe (20%) : -${tax} PiXi\n✅ L'agence recevra : +${netReceived} PiXi\n🏦 Nouveau budget agence : ${newAgencyBudget} PiXi\n\nVotre nouveau solde perso : ${remaining} PiXi.\nÊtes-vous sûr ?`,
            confirmText: "Injecter le Capital",
            isDangerous: false // Ce n'est pas "dangereux" négativement, c'est un investissement
        });

        if (confirmed) {
            await onInjectCapital(student.id, agency.id, amount);
            setAmount(0);
        }
    };

    const handleBuyScore = async () => {
        if(scoreToBuy <= 0) return;
        const cost = scoreToBuy * 200;
        const remaining = (student.wallet || 0) - cost;

        const confirmed = await confirm({
            title: "Confirmer l'Achat de Formation",
            message: `Vous souhaitez acheter ${scoreToBuy} points de Score.\n\nCoût total : ${cost} PiXi.\nVotre nouveau solde : ${remaining} PiXi.\n\nLe score sera ajouté après validation administrative.`,
            confirmText: "Acheter",
            isDangerous: false
        });

        if (confirmed) {
            await onRequestScore(student.id, agency.id, cost, scoreToBuy);
            setScoreToBuy(0);
        }
    };

    return (
        <div className="animate-in fade-in space-y-6">
            {/* AGENCY TREASURY CARD */}
            <div className={`bg-slate-900 rounded-3xl p-6 border shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 ${isBankrupt ? 'border-red-500 ring-4 ring-red-500/30' : 'border-slate-700'}`}>
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-500/20 rounded-2xl text-indigo-400 border border-indigo-500/30">
                        <Landmark size={32}/>
                    </div>
                    <div>
                        <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest">Trésorerie de l'Entreprise</p>
                        <p className="text-3xl font-display font-bold text-white">{agency.budget_real} <span className="text-sm text-slate-500">PiXi</span></p>
                    </div>
                </div>
                <div className="flex flex-col items-center md:items-end">
                    <p className="text-slate-500 text-xs uppercase font-bold mb-1">Santé Financière</p>
                    <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${
                        agency.budget_real > 1000 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        agency.budget_real > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                        agency.budget_real <= GAME_RULES.BANKRUPTCY_THRESHOLD ? 'bg-red-600 text-white border-red-500 animate-pulse' :
                        'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                        {agency.budget_real > 1000 ? 'SOLVABLE' : 
                         agency.budget_real > 0 ? 'FRAGILE' : 
                         agency.budget_real <= GAME_RULES.BANKRUPTCY_THRESHOLD ? 'FAILLITE (-5000)' : 
                         'ENDETTÉ (GEL)'}
                    </div>
                </div>
            </div>

            {/* PERSONAL WALLET */}
            <div className={`p-8 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-center relative overflow-hidden transition-colors ${
                isPrecarious ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white'
            }`}>
                <div className="absolute top-0 right-0 p-20 bg-white/5 rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>
                <div className="relative z-10 text-center md:text-left mb-4 md:mb-0">
                    <p className={`text-sm font-bold uppercase mb-1 tracking-widest ${isPrecarious ? 'text-red-200' : 'text-indigo-200'}`}>Mon Solde Personnel</p>
                    <p className="text-5xl font-display font-bold text-yellow-400">{student?.wallet || 0} <span className="text-2xl text-yellow-200">PiXi</span></p>
                    {isPrecarious && <p className="text-xs font-bold mt-2 bg-red-800 px-2 py-1 rounded inline-block">⚠️ STATUT PRÉCAIRE : Malus Score Actif</p>}
                </div>
                <div className="relative z-10 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20 text-right">
                    <p className="text-xs opacity-70 mb-1">Salaire Hebdo</p>
                    <p className="font-bold text-white text-lg">+{student.individualScore * GAME_RULES.SALARY_MULTIPLIER} PiXi</p>
                    <div className="w-full h-px bg-white/20 my-2"></div>
                    <p className="text-xs opacity-70 mb-1">Coût Vie Hebdo</p>
                    <p className="font-bold text-red-300 text-lg">-{GAME_RULES.COST_OF_LIVING} PiXi</p>
                </div>
            </div>

            {/* ACTIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* INJECTION */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
                    {isPrecarious && (
                        <div className="absolute inset-0 bg-slate-100/80 backdrop-blur-[1px] z-10 flex items-center justify-center">
                            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold border border-red-200">Bloqué (Dette)</span>
                        </div>
                    )}
                    <div className="mb-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-3">
                            <ArrowUpRight size={24}/>
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg">Investir dans mon Agence</h3>
                        <p className="text-sm text-slate-500 mt-1">Injection de fonds personnels.</p>
                        <p className="text-[10px] text-red-500 font-bold mt-2 uppercase">Taxe de transaction : {(GAME_RULES.INJECTION_TAX * 100)}%</p>
                    </div>
                    <div className="mt-auto space-y-3">
                        <input type="number" className="w-full p-3 rounded-xl border border-slate-200 font-bold bg-slate-50" placeholder="Montant brut" onChange={e => setAmount(Number(e.target.value))} />
                        {amount > 0 && (
                            <div className="text-xs text-center text-slate-400 font-medium">
                                L'agence recevra : <span className="text-emerald-600 font-bold">{(amount * (1 - GAME_RULES.INJECTION_TAX)).toFixed(0)} PiXi</span>
                            </div>
                        )}
                        <button onClick={handleInject} disabled={amount <= 0 || amount > (student.wallet || 0)} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50">Injecter</button>
                    </div>
                </div>

                {/* TRANSFERT */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="mb-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-3">
                            <Send size={24}/>
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg">Virement à un collègue</h3>
                        <p className="text-sm text-slate-500 mt-1">Soutien inter-agences.</p>
                    </div>
                    <div className="mt-auto space-y-3">
                        <select className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm" onChange={e => setTargetId(e.target.value)} value={targetId}>
                            <option value="">-- Bénéficiaire --</option>
                            {allStudents.filter(s => s.id !== student.id).map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <input type="number" className="w-full p-3 rounded-xl border border-slate-200 font-bold bg-slate-50" placeholder="Montant" onChange={e => setAmount(Number(e.target.value))} />
                        <button onClick={handleTransfer} disabled={amount <= 0 || amount > (student.wallet || 0)} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">Envoyer</button>
                    </div>
                </div>

                {/* ACHAT SCORE */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="mb-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-3">
                            <TrendingUp size={24}/>
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg">Achat Score (Formation)</h3>
                        <p className="text-sm text-slate-500 mt-1">200 PiXi = 1 Point Score.</p>
                    </div>
                    <div className="mt-auto space-y-3">
                        <input type="number" className="w-full p-3 rounded-xl border border-slate-200 font-bold bg-slate-50" placeholder="Points voulus" onChange={e => setScoreToBuy(Number(e.target.value))} />
                        <button onClick={handleBuyScore} disabled={scoreToBuy <= 0 || (scoreToBuy * 200) > (student.wallet || 0)} className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50">Acheter</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
