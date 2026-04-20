import React, { useState } from 'react';
import { Agency, Deliverable } from '../types';
import { db, doc, updateDoc, writeBatch, arrayUnion } from '../services/firebase';
import { useUI } from '../contexts/UIContext';
import { Gavel, TrendingUp, Presentation, Banknote, ShieldCheck, X, FileText, Image as ImageIcon, ExternalLink, Link as LinkIcon, Download, Star, CheckCircle } from 'lucide-react';

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
    const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
    
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

    const selectedAgency = agencies.find(a => a.id === selectedAgencyId);
    const activeAgencies = agencies.filter(a => a.id !== 'unassigned');

    const renderDeliverableIcon = (type?: string) => {
        if (type === 'LINK') return <LinkIcon size={16} />;
        if (type === 'SPECIAL_LOGO' || type === 'SPECIAL_BANNER') return <ImageIcon size={16} />;
        return <FileText size={16} />;
    };

    const getAgencyAllDeliverables = (agency: Agency) => {
        let all: Deliverable[] = [];
        Object.values(agency.progress || {}).forEach(week => {
            if (week.isVisible) {
                const subbed = week.deliverables.filter(d => d.status === 'submitted' || d.status === 'validated');
                all = [...all, ...subbed];
            }
        });
        return all;
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-pink-500/30">
            {/* Header / Navbar minimalist */}
            <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-pink-500/20 text-pink-500 flex items-center justify-center border border-pink-500/20">
                            <Gavel size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold font-display tracking-tight text-white leading-none">Espace Jury</h1>
                            <p className="text-xs text-slate-400 font-medium tracking-wide uppercase mt-1">Portfolio des Agences</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fonds d'Investissement</div>
                            <div className="text-xl font-mono font-bold text-emerald-400">{currentWallet.toLocaleString()} <span className="text-xs text-emerald-600">PiXi</span></div>
                        </div>
                        <div className="h-10 w-10 md:hidden bg-slate-800 rounded-full flex items-center justify-center border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                            {currentWallet >= 1000 ? `${(currentWallet/1000).toFixed(1)}k` : currentWallet}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 md:py-12">
                <div className="mb-10 max-w-2xl">
                    <h2 className="text-3xl md:text-5xl font-bold text-white font-display tracking-tight mb-4 " style={{ textWrap: 'balance' }}>
                        Découvrez, évaluez et investissez dans l'avenir.
                    </h2>
                    <p className="text-slate-400 text-lg leading-relaxed">
                        Bienvenue, <span className="text-white font-medium">{userData.displayName}</span>. 
                        Sélectionnez une agence pour consulter ses travaux, laisser une note globale ou investir une partie de votre enveloppe.
                    </p>
                </div>

                {/* Minimalist Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeAgencies.map(agency => (
                        <div 
                            key={agency.id} 
                            onClick={() => setSelectedAgencyId(agency.id)}
                            className="group cursor-pointer bg-slate-800 rounded-3xl overflow-hidden border border-white/5 hover:border-pink-500/50 hover:shadow-[0_0_30px_rgba(236,72,153,0.15)] transition-all duration-500 flex flex-col h-[380px]"
                        >
                            {/* Banner Image */}
                            <div className="h-48 relative overflow-hidden bg-slate-900 shrink-0">
                                {agency.branding?.bannerUrl ? (
                                    <img 
                                        src={agency.branding.bannerUrl} 
                                        alt="Banner" 
                                        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 group-hover:scale-105 transition-transform duration-700" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-800 via-transparent to-transparent opacity-80"></div>
                                
                                {/* Logo Floating */}
                                {agency.logoUrl && (
                                    <div className="absolute bottom-4 left-6 w-16 h-16 bg-white rounded-2xl p-1 shadow-lg transform group-hover:-translate-y-2 transition-transform duration-500 border border-white/10">
                                        <div className="w-full h-full bg-slate-100 rounded-xl overflow-hidden">
                                            <img src={agency.logoUrl} className="w-full h-full object-cover" alt="Logo" referrerPolicy="no-referrer" />
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Content */}
                            <div className="p-6 flex-1 flex flex-col">
                                <h3 className="text-2xl font-bold text-white mb-2">{agency.name}</h3>
                                <p className="text-sm text-slate-400 line-clamp-2 opacity-80 group-hover:opacity-100 transition-opacity flex-1">
                                    {agency.tagline || 'Projet en cours de développement...'}
                                </p>
                                
                                <div className="pt-4 mt-auto flex items-center justify-between border-t border-white/5">
                                    <div className="text-xs font-medium text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                        <Presentation size={14} className="text-pink-500"/>
                                        Examiner le projet
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white group-hover:bg-pink-500 group-hover:text-white transition-colors">
                                        <ExternalLink size={14} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* FULLSCREEN AGENCY MODAL */}
            {selectedAgency && (
                <div className="fixed inset-0 z-50 flex bg-slate-900/95 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-6xl mx-auto h-full bg-slate-900 md:h-[90vh] md:my-auto md:rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-white/10">
                        
                        {/* LEFT COLUMN: Presentation & Deliverables (Scrollable) */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar md:w-2/3 border-r border-white/5">
                            {/* Modal Header/Banner */}
                            <div className="relative h-64 bg-slate-800 shrink-0">
                                {selectedAgency.branding?.bannerUrl && (
                                    <img 
                                        src={selectedAgency.branding.bannerUrl} 
                                        alt="Banner" 
                                        className="w-full h-full object-cover opacity-60"
                                        referrerPolicy="no-referrer"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                                <div className="absolute top-4 left-4">
                                     <button 
                                        onClick={() => setSelectedAgencyId(null)}
                                        className="w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur text-white rounded-full flex items-center justify-center transition-colors md:hidden"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="absolute bottom-6 left-8 flex items-end gap-6">
                                    {selectedAgency.logoUrl && (
                                        <div className="w-24 h-24 bg-white rounded-3xl p-1.5 shadow-2xl shrink-0">
                                            <div className="w-full h-full bg-slate-100 rounded-2xl overflow-hidden">
                                                <img src={selectedAgency.logoUrl} className="w-full h-full object-cover" alt="Logo" referrerPolicy="no-referrer" />
                                            </div>
                                        </div>
                                    )}
                                    <div className="mb-2">
                                        <h2 className="text-4xl font-black text-white font-display drop-shadow-lg">{selectedAgency.name}</h2>
                                        <p className="text-lg text-slate-300 font-medium">{selectedAgency.tagline}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-10">
                                {/* Pitch / Brief */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-6 h-px bg-slate-600"></span> Le Pitch
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <div className="text-[10px] text-pink-400 font-bold uppercase tracking-wider mb-2">Le Problème</div>
                                            <div className="text-sm text-slate-300">{selectedAgency.projectDef?.problem || 'Non défini'}</div>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-2">La Cible</div>
                                            <div className="text-sm text-slate-300">{selectedAgency.projectDef?.target || 'Non défini'}</div>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-2">Le Geste / Lieu</div>
                                            <div className="text-sm text-slate-300">{selectedAgency.projectDef?.gesture || 'Non défini'} - {selectedAgency.projectDef?.location}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Livrables */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-6 h-px bg-slate-600"></span> Livrables validés
                                    </h3>
                                    {getAgencyAllDeliverables(selectedAgency).length === 0 ? (
                                        <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/5 border-dashed">
                                            <FileText className="mx-auto text-slate-600 mb-2" size={32} />
                                            <p className="text-sm text-slate-500 italic">Aucun livrable rendu ou validé pour le moment.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {getAgencyAllDeliverables(selectedAgency).map((del, idx) => (
                                                <a 
                                                    key={`${del.id}-${idx}`}
                                                    href={del.fileUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex flex-col p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all group"
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:text-pink-400 transition-colors">
                                                            {renderDeliverableIcon(del.type)}
                                                        </div>
                                                        {del.grading?.quality && (
                                                            <div className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-1 rounded">
                                                                Note Pédagogique: {del.grading.quality}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="font-bold text-slate-200 text-sm leading-tight truncate">{del.name}</div>
                                                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 group-hover:text-slate-300 transition-colors">
                                                        Ouvrir le fichier <ExternalLink size={10}/>
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Actions (Invest / Review) */}
                        <div className="md:w-1/3 bg-slate-900 border-l border-white/5 flex flex-col shrink-0">
                            {/* Desktop Close Button */}
                            <div className="hidden md:flex justify-end p-4 shrink-0">
                                <button 
                                    onClick={() => setSelectedAgencyId(null)}
                                    className="w-10 h-10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-full flex items-center justify-center transition-colors border border-white/5"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                                
                                {/* 1. Investissement */}
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                                        <Banknote className="text-emerald-500"/> Investir
                                    </h3>
                                    <p className="text-xs text-slate-400 mb-4">Soutenez financièrement ce projet avant la fin du Jury.</p>
                                    
                                    <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20">
                                        <div className="text-[10px] text-emerald-400/80 uppercase font-bold tracking-widest mb-2 flex justify-between">
                                            <span>Montant (PiXi)</span>
                                            <span>Max: {currentWallet}</span>
                                        </div>
                                        <div className="relative mb-3">
                                            <input 
                                                type="number"
                                                value={investmentAmount[selectedAgency.id] || ''}
                                                onChange={(e) => setInvestmentAmount(prev => ({...prev, [selectedAgency.id]: Number(e.target.value)}))}
                                                placeholder="0"
                                                className="w-full bg-slate-900/50 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 font-mono text-xl font-bold focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/50 placeholder-emerald-900/50 transition-all"
                                                min={0}
                                                max={currentWallet}
                                            />
                                        </div>
                                        <button 
                                            onClick={() => handleInvest(selectedAgency.id)}
                                            disabled={!investmentAmount[selectedAgency.id] || investmentAmount[selectedAgency.id] <= 0 || investmentAmount[selectedAgency.id] > currentWallet}
                                            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black uppercase tracking-widest rounded-xl disabled:opacity-50 disabled:hover:bg-emerald-500 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                                        >
                                            Valider l'investissement
                                        </button>
                                    </div>
                                </div>

                                <div className="h-px bg-white/5 w-full"></div>

                                {/* 2. Notation Globale */}
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                                        <Star className="text-pink-500"/> Évaluation Globale
                                    </h3>
                                    <p className="text-xs text-slate-400 mb-4">Donnez une note sur 20 et un bref commentaire constructif.</p>
                                    
                                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-4">
                                        <div>
                                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2 block">Note globale /20</label>
                                            <input
                                                type="number"
                                                value={feedbackScores[selectedAgency.id] || ''}
                                                onChange={(e) => setFeedbackScores(prev => ({...prev, [selectedAgency.id]: Number(e.target.value)}))}
                                                placeholder="Ex: 16"
                                                className="w-24 bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono text-lg font-bold focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/50 transition-all"
                                                min={0}
                                                max={20}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2 block">Avis & Conseils</label>
                                            <textarea
                                                value={feedbackComments[selectedAgency.id] || ''}
                                                onChange={(e) => setFeedbackComments(prev => ({...prev, [selectedAgency.id]: e.target.value}))}
                                                placeholder="Partagez vos impressions..."
                                                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/50 transition-all min-h-[100px] resize-none custom-scrollbar"
                                            />
                                        </div>
                                        <button 
                                            onClick={() => handleSubmitFeedback(selectedAgency.id)}
                                            disabled={feedbackScores[selectedAgency.id] === undefined || feedbackScores[selectedAgency.id] === null}
                                            className="w-full py-3 bg-white hover:bg-slate-200 text-slate-900 font-black uppercase tracking-widest rounded-xl disabled:opacity-50 transition-colors flex justify-center"
                                        >
                                            Soumettre l'avis
                                        </button>
                                        
                                        {/* Status if already reviewed */}
                                        {selectedAgency.juryFeedbacks?.some(f => f.juryId === userData?.uid) && (
                                            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex gap-3 items-start">
                                                <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                                                <p className="text-xs text-emerald-200/80">Vous avez déjà évalué cette agence. Soumettre à nouveau ajoutera un nouvel avis.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};
