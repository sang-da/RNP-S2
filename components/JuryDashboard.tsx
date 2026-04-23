import React, { useState } from 'react';
import { Agency, Deliverable } from '../types';
import { db, doc, updateDoc, writeBatch, arrayUnion } from '../services/firebase';
import { useUI } from '../contexts/UIContext';
import { useGame } from '../contexts/GameContext';
import { Gavel, TrendingUp, Presentation, Banknote, ShieldCheck, X, FileText, Image as ImageIcon, ExternalLink, Link as LinkIcon, Download, Star, CheckCircle, Mic, Square, Loader2 } from 'lucide-react';
import { useVoiceDictation } from '../hooks/useVoiceDictation';

interface JuryDashboardProps {
    agencies: Agency[];
    userData: any; // we will pass the userData so we have their UID
    isSimulation?: boolean;
}

export const JuryDashboard: React.FC<JuryDashboardProps> = ({ agencies, userData, isSimulation = false }) => {
    const { toast, confirm } = useUI();
    const { gameConfig } = useGame();
    const [investmentAmount, setInvestmentAmount] = useState<Record<string, number>>({});
    const [feedbackComments, setFeedbackComments] = useState<Record<string, string>>({});
    const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);

    const { isRecording, isTranscribing, startRecording, stopRecording } = useVoiceDictation({
        onTranscriptionComplete: (text) => {
            if (selectedAgencyId) {
                setFeedbackComments(prev => ({
                    ...prev,
                    [selectedAgencyId]: prev[selectedAgencyId] ? `${prev[selectedAgencyId]}\n${text}` : text
                }));
                toast('success', 'Transcription vocale ajoutée !');
            }
        },
        promptContext: "Commentaires et retours d'un membre du jury concernant une agence.",
        systemPrompt: "Tu es un assistant chargé de retranscrire fidèlement et de corriger les retours oraux d'un jury. Corrige les hésitations, supprime les tics de langage, remets au propre tout en gardant exactement le sens global du retour."
    });
    
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
        const comment = feedbackComments[agencyId];
        
        if (!comment || comment.trim() === '') {
            toast('error', 'Veuillez laisser un commentaire avant de valider.');
            return;
        }
        
        try {
            if (!isSimulation) {
                const agencyRef = doc(db, "agencies", agencyId);
                await updateDoc(agencyRef, {
                    juryFeedbacks: arrayUnion({
                        juryName: userData.displayName,
                        juryId: userData.uid,
                        comment: comment,
                        date: new Date().toISOString()
                    })
                });
            }
            toast('success', isSimulation ? '[SIMULATION] Évaluation envoyée !' : 'Évaluation envoyée avec succès !');
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

        const portfolioConfig = gameConfig.juryPortfolio;
        if (!portfolioConfig || portfolioConfig.length === 0) {
            return all; // By default, show all if not configured
        }

        // Filter and sort according to config
        return all
            .filter(d => {
                const configItem = portfolioConfig.find(item => item.name === d.name);
                // If not in config or visible in config, allow it
                return configItem ? configItem.isVisible : true;
            })
            .sort((a, b) => {
                const configA = portfolioConfig.find(item => item.name === a.name);
                const configB = portfolioConfig.find(item => item.name === b.name);
                // Items without config go to the end
                const orderA = configA ? configA.order : Number.MAX_SAFE_INTEGER;
                const orderB = configB ? configB.order : Number.MAX_SAFE_INTEGER;
                return orderA - orderB;
            });
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-pink-500/30">
            {/* Header / Navbar minimalist */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center border border-pink-200">
                            <Gavel size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-bold font-display tracking-tight text-slate-900 leading-none">Espace Jury</h1>
                            <p className="text-[10px] sm:text-xs text-slate-500 font-medium tracking-wide uppercase mt-1">Portfolio des Agences</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fonds d'Investissement</div>
                            <div className="text-xl font-mono font-bold text-emerald-600">{currentWallet.toLocaleString()} <span className="text-xs text-emerald-500">PiXi</span></div>
                        </div>
                        <div className="h-10 w-10 sm:hidden bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-200 text-emerald-600 font-mono text-xs font-bold shadow-sm">
                            {currentWallet >= 1000 ? `${(currentWallet/1000).toFixed(1)}k` : currentWallet}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-4 sm:p-6 md:py-12">
                <div className="mb-8 md:mb-10 max-w-2xl">
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 font-display tracking-tight mb-4 " style={{ textWrap: 'balance' }}>
                        Découvrez, évaluez et investissez.
                    </h2>
                    <p className="text-slate-600 text-base md:text-lg leading-relaxed">
                        Bienvenue, <span className="text-slate-900 font-bold">{userData.displayName}</span>. 
                        Sélectionnez une agence pour consulter ses travaux, formuler vos retours et investir.
                    </p>
                </div>

                {/* Minimalist Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeAgencies.map(agency => {
                        const isBankrupt = agency.isBankrupt;
                        
                        return (
                            <div 
                                key={agency.id} 
                                onClick={() => {
                                    if (!isBankrupt) setSelectedAgencyId(agency.id);
                                }}
                                className={`group bg-white rounded-3xl overflow-hidden border border-slate-200 flex flex-col h-[380px] relative
                                    ${isBankrupt 
                                        ? 'opacity-80 cursor-not-allowed grayscale-[0.8]' 
                                        : 'cursor-pointer hover:border-pink-300 hover:shadow-xl hover:shadow-pink-500/10 transition-all duration-500'}`
                                }
                            >
                                {/* Bankruptcy Overlay */}
                                {isBankrupt && (
                                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-[2px]">
                                        <div className="border-4 border-red-500 text-red-500 uppercase tracking-widest font-black text-4xl py-4 px-8 transform -rotate-12 bg-white/10 backdrop-blur-sm rounded-xl shadow-2xl">
                                            FAILLITE
                                        </div>
                                    </div>
                                )}

                                {/* Banner Image */}
                                <div className="h-48 relative overflow-hidden bg-slate-100 shrink-0">
                                    {agency.branding?.bannerUrl ? (
                                        <img 
                                            src={agency.branding.bannerUrl} 
                                            alt="Banner" 
                                            className={`w-full h-full object-cover opacity-90 ${isBankrupt ? '' : 'group-hover:opacity-100 group-hover:scale-105 transition-all duration-700'}`}
                                            referrerPolicy="no-referrer"
                                        />
                                    ) : (
                                        <div className={`w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 ${isBankrupt ? '' : 'group-hover:scale-105 transition-transform duration-700'}`} />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent"></div>
                                    
                                    {/* Logo Floating */}
                                    {agency.logoUrl && (
                                        <div className={`absolute bottom-4 left-6 w-16 h-16 bg-white rounded-2xl p-1 shadow-lg border border-slate-100 ${isBankrupt ? '' : 'transform group-hover:-translate-y-2 transition-transform duration-500'}`}>
                                            <div className="w-full h-full bg-slate-50 rounded-xl overflow-hidden">
                                                <img src={agency.logoUrl} className="w-full h-full object-cover" alt="Logo" referrerPolicy="no-referrer" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Content */}
                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{agency.name}</h3>
                                    <p className="text-sm text-slate-500 line-clamp-2 transition-opacity flex-1">
                                        {agency.tagline || 'Projet en cours de développement...'}
                                    </p>
                                    
                                    <div className="pt-4 mt-auto flex items-center justify-between border-t border-slate-100">
                                        {!isBankrupt ? (
                                            <>
                                                <div className="text-xs font-medium text-slate-400 uppercase tracking-widest flex items-center gap-1.5 group-hover:text-pink-600 transition-colors">
                                                    <Presentation size={14} className="text-pink-500"/>
                                                    Examiner le projet
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-pink-100 group-hover:text-pink-600 transition-colors">
                                                    <ExternalLink size={14} />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-xs font-medium text-red-500 uppercase tracking-widest flex items-center gap-1.5">
                                                Dossier clos
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* FULLSCREEN AGENCY MODAL */}
            {selectedAgency && (
                <div className="fixed inset-0 z-50 flex bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full h-full md:max-w-6xl md:mx-auto md:h-[90vh] md:my-auto bg-white md:rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-slate-200">
                        
                        {/* LEFT COLUMN: Presentation & Deliverables (Scrollable) */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar md:w-2/3 border-b md:border-b-0 md:border-r border-slate-200 relative">
                            {/* Modal Header/Banner */}
                            <div className="relative h-48 md:h-64 bg-slate-100 shrink-0">
                                {selectedAgency.branding?.bannerUrl && (
                                    <img 
                                        src={selectedAgency.branding.bannerUrl} 
                                        alt="Banner" 
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
                                <div className="absolute top-4 left-4">
                                     <button 
                                        onClick={() => setSelectedAgencyId(null)}
                                        className="w-10 h-10 bg-white/20 backdrop-blur hover:bg-white/40 text-black md:text-white rounded-full flex items-center justify-center transition-colors md:hidden"
                                    >
                                        <X size={20} className="text-white drop-shadow-md" />
                                    </button>
                                </div>
                                <div className="absolute bottom-4 left-4 md:bottom-6 md:left-8 flex items-end gap-4 md:gap-6">
                                    {selectedAgency.logoUrl && (
                                        <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-3xl p-1.5 shadow-xl shrink-0">
                                            <div className="w-full h-full bg-slate-50 rounded-2xl overflow-hidden">
                                                <img src={selectedAgency.logoUrl} className="w-full h-full object-cover" alt="Logo" referrerPolicy="no-referrer" />
                                            </div>
                                        </div>
                                    )}
                                    <div className="mb-1 md:mb-2 text-white">
                                        <h2 className="text-2xl md:text-4xl font-black font-display drop-shadow-lg leading-tight">{selectedAgency.name}</h2>
                                        <p className="text-sm md:text-lg text-slate-200 font-medium drop-shadow-md line-clamp-2 md:line-clamp-none">{selectedAgency.tagline}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 md:p-8 space-y-8">
                                {/* Pitch / Brief */}
                                <div>
                                    <h3 className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-6 h-px bg-slate-300"></span> Le Pitch
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <div className="text-[10px] text-pink-600 font-bold uppercase tracking-wider mb-2">Le Problème</div>
                                            <div className="text-sm text-slate-700">{selectedAgency.projectDef?.problem || 'Non défini'}</div>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-2">La Cible</div>
                                            <div className="text-sm text-slate-700">{selectedAgency.projectDef?.target || 'Non défini'}</div>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <div className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mb-2">Le Geste / Lieu</div>
                                            <div className="text-sm text-slate-700">{selectedAgency.projectDef?.gesture || 'Non défini'} - {selectedAgency.projectDef?.location}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Livrables */}
                                <div>
                                    <h3 className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-6 h-px bg-slate-300"></span> Livrables validés
                                    </h3>
                                    {getAgencyAllDeliverables(selectedAgency).length === 0 ? (
                                        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                                            <FileText className="mx-auto text-slate-400 mb-2" size={32} />
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
                                                    className="flex flex-col p-4 bg-white rounded-2xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm transition-all group"
                                                >
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:text-pink-600 transition-colors">
                                                            {renderDeliverableIcon(del.type)}
                                                        </div>
                                                    </div>
                                                    <div className="font-bold text-slate-900 text-sm leading-tight truncate">{del.name}</div>
                                                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1 group-hover:text-slate-700 transition-colors">
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
                        <div className="md:w-1/3 bg-slate-50/50 flex flex-col shrink-0 relative">
                            {/* Desktop Close Button */}
                            <div className="hidden md:flex justify-end p-4 shrink-0 absolute top-0 right-0 z-10">
                                <button 
                                    onClick={() => setSelectedAgencyId(null)}
                                    className="w-10 h-10 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-full flex items-center justify-center transition-colors border border-slate-200 shadow-sm"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-4 md:p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 pt-6 md:pt-16">
                                
                                {/* 1. Investissement */}
                                <div>
                                    <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                                        <Banknote className="text-emerald-600"/> Investir (PiXi)
                                    </h3>
                                    <p className="text-xs text-slate-500 mb-4">Soutenez financièrement ce projet avant la fin du Jury.</p>
                                    
                                    <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                                        <div className="text-[10px] text-emerald-700 uppercase font-bold tracking-widest mb-2 flex justify-between">
                                            <span>Montant</span>
                                            <span>Max: {currentWallet}</span>
                                        </div>
                                        <div className="relative mb-3">
                                            <input 
                                                type="number"
                                                value={investmentAmount[selectedAgency.id] || ''}
                                                onChange={(e) => setInvestmentAmount(prev => ({...prev, [selectedAgency.id]: Number(e.target.value)}))}
                                                placeholder="0"
                                                className="w-full bg-white border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700 font-mono text-xl font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 placeholder-emerald-200 transition-all"
                                                min={0}
                                                max={currentWallet}
                                            />
                                        </div>
                                        <button 
                                            onClick={() => handleInvest(selectedAgency.id)}
                                            disabled={!investmentAmount[selectedAgency.id] || investmentAmount[selectedAgency.id] <= 0 || investmentAmount[selectedAgency.id] > currentWallet}
                                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-widest rounded-xl disabled:opacity-50 transition-colors shadow-sm"
                                        >
                                            Valider l'investissement
                                        </button>
                                    </div>
                                </div>

                                <div className="h-px bg-slate-200 w-full"></div>

                                {/* 2. Retours & Commentaires */}
                                <div>
                                    <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                                        <Star className="text-pink-600"/> Retours Constructifs
                                    </h3>
                                    <p className="text-xs text-slate-500 mb-4">Laissez un commentaire par écrit ou par dictée vocale (Grok).</p>
                                    
                                    <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-4 shadow-sm">
                                        <div>
                                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2 flex items-center justify-between">
                                                <span>Avis & Conseils</span>
                                            </div>
                                            <div className="relative">
                                                <textarea
                                                    value={feedbackComments[selectedAgency.id] || ''}
                                                    onChange={(e) => setFeedbackComments(prev => ({...prev, [selectedAgency.id]: e.target.value}))}
                                                    placeholder="Partagez vos impressions..."
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/50 transition-all min-h-[120px] resize-none custom-scrollbar"
                                                />
                                                <div className="absolute right-3 bottom-3 flex gap-2">
                                                    {isTranscribing ? (
                                                        <div className="p-2 bg-pink-100 text-pink-600 rounded-full animate-pulse">
                                                            <Loader2 size={16} className="animate-spin" />
                                                        </div>
                                                    ) : isRecording ? (
                                                         <button 
                                                            onClick={stopRecording}
                                                            className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-full transition-colors shadow-sm border border-red-200 animate-pulse"
                                                            title="Arrêter l'enregistrement"
                                                        >
                                                            <Square size={16} fill="currentColor" />
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={startRecording}
                                                            className="p-2 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-full transition-colors shadow-sm border border-pink-100"
                                                            title="Dicter avec Grok"
                                                        >
                                                            <Mic size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleSubmitFeedback(selectedAgency.id)}
                                            disabled={!feedbackComments[selectedAgency.id] || feedbackComments[selectedAgency.id].trim() === ''}
                                            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-widest rounded-xl disabled:opacity-50 transition-colors flex justify-center"
                                        >
                                            Soumettre l'avis
                                        </button>
                                        
                                        {/* Status if already reviewed */}
                                        {selectedAgency.juryFeedbacks?.some(f => f.juryId === userData?.uid) && (
                                            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex gap-3 items-start">
                                                <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={16} />
                                                <p className="text-xs text-emerald-800">Vous avez déjà évalué cette agence. Soumettre à nouveau ajoutera un nouvel avis au dossier.</p>
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
