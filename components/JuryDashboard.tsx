import React, { useState } from 'react';
import { Agency } from '../types';
import { db, doc, updateDoc, writeBatch, arrayUnion } from '../services/firebase';
import { useUI } from '../contexts/UIContext';
import { Gavel, TrendingUp, Building2, Banknote, ShieldCheck } from 'lucide-react';

interface JuryDashboardProps {
    agencies: Agency[];
    userData: any; // we will pass the userData so we have their UID
    isSimulation?: boolean;
}

export const JuryDashboard: React.FC<JuryDashboardProps> = ({ agencies, userData, isSimulation = false }) => {
    const { toast, confirm } = useUI();
    const [investmentAmount, setInvestmentAmount] = useState<Record<string, number>>({});
    const [feedbackScores, setFeedbackScores] = useState<Record<string, number>>({});
    const [feedbackComments, setFeedbackComments] = useState<Record<string, string>>({});
    
    // Default to 0 if not set yet by admin.
    const currentWallet = userData.juryWallet || 0;
    
    // We can also calculate how much they have already invested if we tracked it, 
    // but the easiest is just having their wallet decrease on investment.

    const handleInvest = async (agencyId: string) => {
        const amount = investmentAmount[agencyId];
        if (!amount || amount <= 0) {
            toast('error', 'Veuillez entrer un montant valide');
            return;
        }
        if (amount > currentWallet) {
            toast('error', 'Fonds insuffisants dans votre portefeuille');
            return;
        }

        const confirmed = await confirm({
            title: "Confirmer l'investissement",
            message: `Vous êtes sur le point d'investir ${amount} PiXi dans cette agence. Cette action est définitive.`,
            confirmText: "Investir"
        });

        if (!confirmed) return;

        try {
            const batch = writeBatch(db);
            
            // Deduct from Jury
            if (!isSimulation) {
                const newJuryWallet = currentWallet - amount;
                batch.update(doc(db, "users", userData.uid), { juryWallet: newJuryWallet });
            }

            // Add to Agency
            const agency = agencies.find(a => a.id === agencyId);
            if (!agency) throw new Error("Agence introuvable");
            
            const newBudget = (agency.budget_real || 0) + amount;
            
            const investmentEvent = {
                id: `invest-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                type: 'INFO',
                label: 'INVESTISSEMENT JURY',
                deltaBudgetReal: amount,
                description: `Investissement reçu par le membre du Jury : ${userData.displayName}`
            };

            if (!isSimulation) {
                batch.update(doc(db, "agencies", agency.id), {
                    budget_real: newBudget,
                    eventLog: arrayUnion(investmentEvent)
                });
                await batch.commit();
            }
            
            toast('success', isSimulation ? `[SIMULATION] Investissement de ${amount} validé` : `Investissement de ${amount} PiXi validé !`);
            setInvestmentAmount(prev => ({...prev, [agencyId]: 0}));
        } catch(e) {
            console.error(e);
            toast('error', 'Erreur technique lors de l\'investissement.');
        }
    };

    const handleSubmitFeedback = async (agencyId: string) => {
        const score = feedbackScores[agencyId];
        const comment = feedbackComments[agencyId];
        
        if (score === undefined || score < 0 || score > 20) {
            toast('error', 'Veuillez entrer une note entre 0 et 20.');
            return;
        }
        
        try {
            if (!isSimulation) {
                const agencyRef = doc(db, "agencies", agencyId);
                await updateDoc(agencyRef, {
                    juryFeedbacks: arrayUnion({
                        juryName: userData.displayName,
                        juryId: userData.uid,
                        score,
                        comment: comment || '',
                        date: new Date().toISOString()
                    })
                });
            }
            toast('success', isSimulation ? '[SIMULATION] Évaluation envoyée !' : 'Évaluation envoyée avec succès !');
            setFeedbackScores(prev => ({...prev, [agencyId]: 0}));
            setFeedbackComments(prev => ({...prev, [agencyId]: ''}));
        } catch(e) {
            console.error(e);
            toast('error', 'Échec de l\'envoi de l\'évaluation.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-pink-100 rounded-2xl text-pink-700">
                            <Gavel size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-display font-bold text-slate-900">Espace Jury</h1>
                            <p className="text-slate-500">Bienvenue {userData.displayName}. Évaluez les projets et distribuez vos fonds.</p>
                        </div>
                    </div>
                    <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg border-2 border-indigo-500">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Capacité d'investissement (PiXi)</div>
                        <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight">
                            {currentWallet.toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {agencies.filter(a => a.id !== 'unassigned').map(agency => (
                        <div key={agency.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6 border-b border-slate-100 bg-slate-50">
                                <h2 className="text-2xl font-bold text-slate-900 mb-2">{agency.name}</h2>
                                <p className="text-sm text-slate-600 line-clamp-2">{agency.tagline || 'Projet innovant en développement...'}</p>
                            </div>
                            
                            <div className="p-6 space-y-6">
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex items-center gap-2 p-3 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 flex-1 min-w-[120px]">
                                        <TrendingUp size={18} />
                                        <div>
                                            <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">VALORISATION</div>
                                            <div className="font-black">{(agency.budget_real || 0).toLocaleString()} <span className="text-xs">PiXi</span></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-3 bg-purple-50 text-purple-700 rounded-xl border border-purple-100 flex-1 min-w-[120px]">
                                        <ShieldCheck size={18} />
                                        <div>
                                            <div className="text-[10px] font-bold uppercase tracking-wider opacity-70">NIVEAU VE</div>
                                            <div className="font-black">{agency.ve_current || 1}</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Soutenir ce projet (Investissement)</label>
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-1">
                                            <Banknote className="absolute left-3 top-3 text-slate-400" size={18} />
                                            <input 
                                                type="number"
                                                value={investmentAmount[agency.id] || ''}
                                                onChange={(e) => setInvestmentAmount(prev => ({...prev, [agency.id]: Number(e.target.value)}))}
                                                placeholder="Montant en PiXi..."
                                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 font-mono text-lg font-bold"
                                                min={0}
                                                max={currentWallet}
                                            />
                                        </div>
                                        <button 
                                            onClick={() => handleInvest(agency.id)}
                                            disabled={!investmentAmount[agency.id] || investmentAmount[agency.id] <= 0 || investmentAmount[agency.id] > currentWallet}
                                            className="px-6 py-3 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:bg-slate-400 text-white font-bold rounded-xl shadow-lg transition-colors"
                                        >
                                            Investir
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Évaluation du Jury</label>
                                    <div className="space-y-3">
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <input
                                                    type="number"
                                                    value={feedbackScores[agency.id] || ''}
                                                    onChange={(e) => setFeedbackScores(prev => ({...prev, [agency.id]: Number(e.target.value)}))}
                                                    placeholder="Note globale / 20"
                                                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm"
                                                    min={0}
                                                    max={20}
                                                />
                                            </div>
                                            <button 
                                                onClick={() => handleSubmitFeedback(agency.id)}
                                                disabled={feedbackScores[agency.id] === undefined}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-400 text-white font-bold rounded-xl shadow-sm transition-colors"
                                            >
                                                Valider la Note
                                            </button>
                                        </div>
                                        <textarea
                                            value={feedbackComments[agency.id] || ''}
                                            onChange={(e) => setFeedbackComments(prev => ({...prev, [agency.id]: e.target.value}))}
                                            placeholder="Laissez un commentaire constructif (optionnel)..."
                                            className="w-full p-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm min-h-[80px]"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
