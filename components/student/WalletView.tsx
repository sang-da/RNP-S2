
import React, { useState } from 'react';
import { Student, Agency } from '../../types';
import { Wallet, Landmark, ArrowUpRight, Send, TrendingUp, PiggyBank, Briefcase, Plus, Minus, CreditCard, AlertTriangle, ArrowRight } from 'lucide-react';
import { GAME_RULES } from '../../constants';
import { useUI } from '../../contexts/UIContext';
import { useGame } from '../../contexts/GameContext'; // Import for manageSavings/Loans

interface WalletViewProps {
    student: Student;
    agency: Agency;
    allStudents: Student[];
    onTransfer: any;
    onInjectCapital: any;
    onRequestScore: any;
}

type WalletTab = 'WALLET' | 'BANK';

export const WalletView: React.FC<WalletViewProps> = ({student, agency, allStudents, onTransfer, onInjectCapital, onRequestScore}) => {
    const { confirm } = useUI();
    const { manageSavings, manageLoan } = useGame();
    
    const [activeTab, setActiveTab] = useState<WalletTab>('WALLET');
    
    // Inputs
    const [targetId, setTargetId] = useState('');
    const [amount, setAmount] = useState<string>(''); // String to handle empty state better
    const [scoreToBuy, setScoreToBuy] = useState<string>('');

    // Bank Inputs
    const [savingsAmount, setSavingsAmount] = useState<string>('');
    const [loanAmount, setLoanAmount] = useState<string>('');

    const isPrecarious = (student.wallet || 0) < 0;
    const isBankrupt = agency.budget_real <= GAME_RULES.BANKRUPTCY_THRESHOLD;
    
    // Data
    const walletBalance = student.wallet || 0;
    const savingsBalance = student.savings || 0;
    const currentDebt = student.loanDebt || 0;
    const loanCapacity = Math.max(0, (student.individualScore * 30) - currentDebt);

    // --- LOGIQUE DE CONFIRMATION WALLET ---

    const handleTransfer = async () => {
        const val = Number(amount);
        if(!targetId || val <= 0) return;
        
        const targetStudent = allStudents.find(s => s.id === targetId);
        const remaining = walletBalance - val;

        const confirmed = await confirm({
            title: "Confirmer le virement",
            message: `Vous allez envoyer ${val} PiXi à ${targetStudent?.name}.\n\nCe virement est irréversible.\nVotre nouveau solde : ${remaining} PiXi.`,
            confirmText: "Envoyer les fonds",
            isDangerous: false
        });

        if (confirmed) {
            await onTransfer(student.id, targetId, val);
            setAmount('');
        }
    };

    const handleInject = async () => {
        const val = Number(amount);
        if(val <= 0) return;

        // CALCUL DE TAXE CUMULATIVE POUR L'AFFICHAGE (IDENTIQUE LOGIC BACKEND)
        const previousInjection = student.cumulativeInjection || 0;
        const newTotalInjection = previousInjection + val;
        const totalTaxDue = Math.floor(newTotalInjection * GAME_RULES.INJECTION_TAX);
        const previousTaxPaid = Math.floor(previousInjection * GAME_RULES.INJECTION_TAX);
        
        const currentTax = totalTaxDue - previousTaxPaid;
        const netReceived = val - currentTax;
        
        const newAgencyBudget = agency.budget_real + netReceived;
        const remaining = walletBalance - val;

        const confirmed = await confirm({
            title: "Confirmer l'Investissement",
            message: `Vous allez injecter ${val} PiXi.\n\n💰 Taxe (20% lissé) : -${currentTax} PiXi\n✅ L'agence recevra : +${netReceived} PiXi\n🏦 Nouveau budget agence : ${newAgencyBudget} PiXi\n\n(Taxe calculée sur le cumul de vos dons : ${previousInjection} + ${val} = ${newTotalInjection})`,
            confirmText: "Injecter le Capital",
            isDangerous: false 
        });

        if (confirmed) {
            await onInjectCapital(student.id, agency.id, val);
            setAmount('');
        }
    };

    const handleBuyScore = async () => {
        const pts = Number(scoreToBuy);
        if(pts <= 0) return;
        const cost = pts * 200;
        const remaining = walletBalance - cost;

        const confirmed = await confirm({
            title: "Confirmer l'Achat de Formation",
            message: `Vous souhaitez acheter ${pts} points de Score.\n\nCoût total : ${cost} PiXi.\nVotre nouveau solde : ${remaining} PiXi.\n\nLe score sera ajouté après validation administrative.`,
            confirmText: "Acheter",
            isDangerous: false
        });

        if (confirmed) {
            await onRequestScore(student.id, agency.id, cost, pts);
            setScoreToBuy('');
        }
    };

    // --- LOGIQUE BANQUE ---

    const handleSavings = async (type: 'DEPOSIT' | 'WITHDRAW') => {
        const val = Number(savingsAmount);
        if(val <= 0) return;
        
        await manageSavings(student.id, agency.id, val, type);
        setSavingsAmount('');
    };

    const handleLoan = async (type: 'TAKE' | 'REPAY') => {
        const val = Number(loanAmount);
        if(val <= 0) return;

        if (type === 'TAKE') {
            const cost = Math.floor(val * 0.5);
            const totalDebt = val + cost;
            const confirmed = await confirm({
                title: "Souscrire un Emprunt",
                message: `Vous empruntez ${val} PiXi.\nCoût du crédit (50% immédiat) : +${cost} PiXi de dette.\n\nVous recevrez : +${val} PiXi Cash.\nVotre dette augmentera de : ${totalDebt} PiXi.\n\n⚠️ ATTENTION : Remboursement automatique (saisie sur salaire) chaque semaine.`,
                confirmText: "Accepter l'offre",
                isDangerous: true
            });
            if(!confirmed) return;
        }

        await manageLoan(student.id, agency.id, val, type);
        setLoanAmount('');
    };

    return (
        <div className="animate-in fade-in space-y-6">
            
            {/* TOP METRICS (AGENCY) */}
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

            {/* TAB SWITCHER */}
            <div className="flex p-1 bg-slate-200 rounded-xl">
                <button 
                    onClick={() => setActiveTab('WALLET')}
                    className={`flex-1 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'WALLET' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Wallet size={18}/> Mon Portefeuille
                </button>
                <button 
                    onClick={() => setActiveTab('BANK')}
                    className={`flex-1 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'BANK' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <PiggyBank size={18}/> Banque RNP
                </button>
            </div>

            {/* CONTENT */}
            {activeTab === 'WALLET' ? (
                <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                    {/* PERSONAL WALLET CARD */}
                    <div className={`p-8 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-center relative overflow-hidden transition-colors ${
                        isPrecarious ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white'
                    }`}>
                        <div className="absolute top-0 right-0 p-20 bg-white/5 rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>
                        <div className="relative z-10 text-center md:text-left mb-4 md:mb-0">
                            <p className={`text-sm font-bold uppercase mb-1 tracking-widest ${isPrecarious ? 'text-red-200' : 'text-indigo-200'}`}>Mon Solde Courant</p>
                            <p className="text-5xl font-display font-bold text-yellow-400">{walletBalance} <span className="text-2xl text-yellow-200">PiXi</span></p>
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

                    {/* ACTIONS GRID */}
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
                                <h3 className="font-bold text-slate-900 text-lg">Investir dans l'Agence</h3>
                                <p className="text-sm text-slate-500 mt-1">Injection de fonds personnels.</p>
                                <p className="text-[10px] text-red-500 font-bold mt-2 uppercase">Taxe : 20% (Lissée sur historique)</p>
                            </div>
                            <div className="mt-auto space-y-3">
                                <input type="number" className="w-full p-3 rounded-xl border border-slate-200 font-bold bg-slate-50" placeholder="Montant brut" value={amount} onChange={e => setAmount(e.target.value)} />
                                <button onClick={handleInject} disabled={Number(amount) <= 0 || Number(amount) > walletBalance} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50">Injecter</button>
                            </div>
                        </div>

                        {/* TRANSFERT */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                            <div className="mb-4">
                                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-3">
                                    <Send size={24}/>
                                </div>
                                <h3 className="font-bold text-slate-900 text-lg">Virement P2P</h3>
                                <p className="text-sm text-slate-500 mt-1">Envoyer de l'argent à un collègue.</p>
                            </div>
                            <div className="mt-auto space-y-3">
                                <select className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm" onChange={e => setTargetId(e.target.value)} value={targetId}>
                                    <option value="">-- Bénéficiaire --</option>
                                    {allStudents.filter(s => s.id !== student.id).map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                                <input type="number" className="w-full p-3 rounded-xl border border-slate-200 font-bold bg-slate-50" placeholder="Montant" value={amount} onChange={e => setAmount(e.target.value)} />
                                <button onClick={handleTransfer} disabled={Number(amount) <= 0 || Number(amount) > walletBalance} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">Envoyer</button>
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
                                <input type="number" className="w-full p-3 rounded-xl border border-slate-200 font-bold bg-slate-50" placeholder="Points voulus" value={scoreToBuy} onChange={e => setScoreToBuy(e.target.value)} />
                                <button onClick={handleBuyScore} disabled={Number(scoreToBuy) <= 0 || (Number(scoreToBuy) * 200) > walletBalance} className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50">Acheter</button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    {/* SAVINGS CARD */}
                    <div className="bg-emerald-50 rounded-3xl p-6 border-2 border-emerald-100 flex flex-col md:flex-row gap-6 items-start">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-emerald-200 rounded-xl text-emerald-800"><PiggyBank size={24}/></div>
                                <h3 className="text-xl font-bold text-emerald-900">Livret Épargne RNP</h3>
                            </div>
                            <p className="text-sm text-emerald-700 mb-4">
                                Placez votre argent pour générer des intérêts composés. L'argent sur ce compte est protégé mais ne peut pas être utilisé immédiatement.
                            </p>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-xs font-bold bg-white text-emerald-600 px-3 py-1 rounded-full border border-emerald-200">
                                    Taux : 10% / semaine
                                </span>
                                {savingsBalance > 0 && <span className="text-xs font-bold text-emerald-600">Gain estimé: +{Math.floor(savingsBalance * 0.1)} PiXi</span>}
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm inline-block min-w-[200px]">
                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Solde Épargne</span>
                                <span className="text-3xl font-display font-bold text-emerald-600">{savingsBalance} <span className="text-sm text-emerald-300">PiXi</span></span>
                            </div>
                        </div>
                        <div className="w-full md:w-64 bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm space-y-3">
                            <input 
                                type="number" 
                                className="w-full p-3 rounded-xl border border-slate-200 font-bold text-center" 
                                placeholder="Montant" 
                                value={savingsAmount}
                                onChange={e => setSavingsAmount(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <button onClick={() => handleSavings('DEPOSIT')} disabled={Number(savingsAmount) > walletBalance} className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-700 transition-colors disabled:opacity-50">
                                    DÉPOSER
                                </button>
                                <button onClick={() => handleSavings('WITHDRAW')} disabled={Number(savingsAmount) > savingsBalance} className="flex-1 py-2 bg-white border border-emerald-200 text-emerald-600 font-bold rounded-lg text-xs hover:bg-emerald-50 transition-colors disabled:opacity-50">
                                    RETIRER
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* LOANS CARD */}
                    <div className="bg-slate-50 rounded-3xl p-6 border-2 border-slate-200 flex flex-col md:flex-row gap-6 items-start">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-rose-100 rounded-xl text-rose-600"><CreditCard size={24}/></div>
                                <h3 className="text-xl font-bold text-slate-900">Crédit Étudiant (Levier)</h3>
                            </div>
                            <p className="text-sm text-slate-600 mb-4">
                                Besoin de cash immédiat ? Empruntez en fonction de votre score de crédibilité.
                                <br/><strong className="text-red-500">Attention : Coût fixe de 50% à la souscription.</strong>
                            </p>
                            
                            <div className="flex flex-wrap gap-4 mb-4">
                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Dette Actuelle</span>
                                    <span className={`text-2xl font-display font-bold ${currentDebt > 0 ? 'text-red-500' : 'text-slate-900'}`}>
                                        {currentDebt} PiXi
                                    </span>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Capacité d'Emprunt</span>
                                    <span className="text-2xl font-display font-bold text-indigo-600">
                                        {loanCapacity} PiXi
                                    </span>
                                </div>
                            </div>
                            
                            {currentDebt > 0 && (
                                <div className="flex items-start gap-2 bg-red-50 p-3 rounded-lg border border-red-100 text-xs text-red-700">
                                    <AlertTriangle size={16} className="shrink-0 mt-0.5"/>
                                    <p>Tant que vous avez une dette, 100% de votre salaire hebdomadaire sera saisi pour le remboursement.</p>
                                </div>
                            )}
                        </div>

                        <div className="w-full md:w-64 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                            <input 
                                type="number" 
                                className="w-full p-3 rounded-xl border border-slate-200 font-bold text-center" 
                                placeholder="Montant" 
                                value={loanAmount}
                                onChange={e => setLoanAmount(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleLoan('TAKE')} 
                                    disabled={Number(loanAmount) > loanCapacity || Number(loanAmount) <= 0} 
                                    className="flex-1 py-2 bg-slate-900 text-white font-bold rounded-lg text-xs hover:bg-indigo-600 transition-colors disabled:opacity-50"
                                >
                                    EMPRUNTER
                                </button>
                                <button 
                                    onClick={() => handleLoan('REPAY')} 
                                    disabled={currentDebt === 0 || Number(loanAmount) > walletBalance} 
                                    className="flex-1 py-2 bg-white border border-slate-300 text-slate-600 font-bold rounded-lg text-xs hover:bg-slate-50 transition-colors disabled:opacity-50"
                                >
                                    REMBOURSER
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
