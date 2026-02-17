
import React, { useState, useRef, useEffect } from 'react';
import { Agency, Deliverable } from '../../../types';
import { askGroq } from '../../../services/groqService';
import { useUI } from '../../../contexts/UIContext';
import { useGame } from '../../../contexts/GameContext';
import { Rocket, Sparkles, RefreshCw, PenTool, Target, Coins, ArrowUp, Briefcase } from 'lucide-react';
import { ContextSelector } from './ContextSelector';
import { Modal } from '../../Modal';

export const CreativeDirector: React.FC<{agencies: Agency[]}> = ({ agencies }) => {
    const { toast } = useUI();
    const { sendChallenge } = useGame();
    
    const [targetAgencyId, setTargetAgencyId] = useState(agencies.filter(a => a.id !== 'unassigned')[0]?.id || "");
    const [challengeForm, setChallengeForm] = useState<{title: string, description: string, rewardVE: number, rewardBudget: number} | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Chat & Context
    const [refinementInput, setRefinementInput] = useState("");
    const [selectedDeliverableIds, setSelectedDeliverableIds] = useState<string[]>([]);
    const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Scroll auto
    useEffect(() => {
        if(chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }, [chatHistory, challengeForm]);

    const targetAgency = agencies.find(a => a.id === targetAgencyId);

    const toggleDeliverable = (id: string) => {
        setSelectedDeliverableIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // --- CONSTRUCT CONTEXT ---
    const getPromptContext = () => {
        if (!targetAgency) return "";
        
        let context = `
        AGENCE : "${targetAgency.name}"
        PROJET : "${targetAgency.projectDef.theme}"
        PROBLÈME : "${targetAgency.projectDef.problem}"
        CIBLE : "${targetAgency.projectDef.target}"
        `;

        const selectedDocs = Object.values(targetAgency.progress)
            .flatMap((w: any) => w.deliverables)
            .filter((d: Deliverable) => selectedDeliverableIds.includes(d.id));

        if (selectedDocs.length > 0) {
            context += `\nLIVRABLES DE RÉFÉRENCE :\n`;
            selectedDocs.forEach((d: Deliverable) => {
                context += `- ${d.name} (${d.type}): ${d.feedback || "Pas de feedback"}\n`;
            });
        }

        return context;
    };

    const handleGenerateOrRefine = async (isRefinement = false) => {
        if (!targetAgency) return;
        setLoading(true);

        const systemPrompt = `Tu es un Client VIP pressé et exigeant pour une agence de design.
        Tu veux commander une "Mission Commando" (Challenge) courte et percutante.
        
        RÈGLES IMPORTANTES :
        1. SOIS BREF. Description max 3 phrases. Pas de bla-bla.
        2. SOIS CONCRET. Demande un livrable précis (ex: "Une variante luxe du logo", "Un post Instagram").
        3. RESTE DANS LE THÈME du projet de l'agence.
        
        FORMAT DE SORTIE (JSON STRICT) :
        {
            "title": "Titre Court (ex: Commande Urgente)",
            "description": "Le contexte et la demande précise.",
            "rewardVE": (int entre 5 et 15),
            "rewardBudget": (int entre 300 et 1000)
        }`;

        let userPrompt = "";
        if (!isRefinement) {
            userPrompt = `Génère une mission pertinente pour ce projet.
            ${getPromptContext()}`;
            setChatHistory([]); 
        } else {
            userPrompt = `MODIFICATION : "${refinementInput}".
            ${getPromptContext()}
            Refais le JSON.`;
            setChatHistory(prev => [...prev, { role: "user", content: refinementInput }]);
            setRefinementInput("");
        }

        try {
            const fullPrompt = `${systemPrompt}\n\nHISTORIQUE:\n${chatHistory.map(m => m.role + ": " + m.content).join('\n')}\n\nUSER: ${userPrompt}`;
            
            const result = await askGroq(fullPrompt, {}, "Tu es un Client VIP JSON.");
            const jsonStr = result.substring(result.indexOf('{'), result.lastIndexOf('}') + 1);
            const parsed = JSON.parse(jsonStr);
            
            setChallengeForm(parsed);
            
            if (isRefinement) {
                setChatHistory(prev => [...prev, { role: "assistant", content: "Offre mise à jour." }]);
            } else {
                setChatHistory([{ role: "user", content: "Génère une mission." }, { role: "assistant", content: parsed.title }]);
            }
        } catch(e) {
            toast('error', "Erreur IA.");
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!targetAgencyId || !challengeForm) return;
        await sendChallenge(targetAgencyId, challengeForm.title, challengeForm.description, challengeForm.rewardVE, challengeForm.rewardBudget);
        setChallengeForm(null);
        setChatHistory([]);
        setShowPreview(false);
        toast('success', "Challenge envoyé !");
    };

    return (
        <div className="flex flex-col h-full">
            {/* TOP BAR */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Rocket className="text-purple-600"/>
                    <select 
                        value={targetAgencyId} 
                        onChange={e => setTargetAgencyId(e.target.value)}
                        className="p-2 bg-white border border-slate-300 rounded-lg font-bold text-sm outline-none w-full md:w-64"
                    >
                        {agencies.filter(a => a.id !== 'unassigned').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
                <button 
                    onClick={() => handleGenerateOrRefine(false)} 
                    disabled={loading}
                    className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg shadow hover:bg-slate-700 transition-all flex items-center gap-2 disabled:opacity-50 text-sm whitespace-nowrap"
                >
                    {loading ? <RefreshCw className="animate-spin" size={16}/> : <Sparkles size={16}/>}
                    Générer Mission
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* LEFT: CONTEXT & CHAT */}
                <div className="w-1/3 border-r border-slate-200 bg-slate-50 flex flex-col hidden md:flex">
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" ref={chatContainerRef}>
                        <ContextSelector 
                            agencyId={targetAgencyId} 
                            agencies={agencies}
                            selectedDeliverableIds={selectedDeliverableIds}
                            onToggleDeliverable={toggleDeliverable}
                        />
                        <div className="space-y-3">
                            {chatHistory.map((msg, i) => (
                                <div key={i} className={`p-3 rounded-lg text-xs ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-900 ml-4' : 'bg-white border border-slate-200 mr-4'}`}>
                                    <span className="font-bold block mb-1 opacity-50">{msg.role === 'user' ? 'Vous' : 'IA'}</span>
                                    {msg.content}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-3 border-t border-slate-200 bg-white">
                        <form onSubmit={(e) => { e.preventDefault(); if(challengeForm) handleGenerateOrRefine(true); }} className="relative">
                            <input 
                                type="text" 
                                value={refinementInput}
                                onChange={e => setRefinementInput(e.target.value)}
                                placeholder={challengeForm ? "Ajuster (ex: 'Plus court')..." : "Générez d'abord..."}
                                disabled={!challengeForm || loading}
                                className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none text-sm"
                            />
                            <button type="submit" disabled={!challengeForm || loading || !refinementInput.trim()} className="absolute right-2 top-2 p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                                <ArrowUp size={16}/>
                            </button>
                        </form>
                    </div>
                </div>

                {/* RIGHT: PREVIEW */}
                <div className="flex-1 p-8 overflow-y-auto bg-slate-100">
                    {challengeForm ? (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="bg-white p-8 rounded-3xl shadow-xl border border-purple-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-5">
                                    <Briefcase size={120}/>
                                </div>
                                
                                <div className="relative z-10">
                                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-4 inline-block">Offre de Contrat</span>
                                    
                                    <h2 className="text-3xl font-display font-bold text-slate-900 mb-4">{challengeForm.title}</h2>
                                    
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-6 text-slate-700 leading-relaxed text-sm">
                                        {challengeForm.description}
                                    </div>

                                    <div className="flex gap-4 mb-8">
                                        <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2">
                                            <Target className="text-emerald-500" size={20}/>
                                            <span className="font-bold text-emerald-700">+{challengeForm.rewardVE} VE</span>
                                        </div>
                                        <div className="bg-yellow-50 px-4 py-2 rounded-xl border border-yellow-100 flex items-center gap-2">
                                            <Coins className="text-yellow-500" size={20}/>
                                            <span className="font-bold text-yellow-700">+{challengeForm.rewardBudget} PiXi</span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => setShowPreview(true)}
                                        className="w-full py-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <Rocket size={20}/> APERÇU & ENVOYER
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                            <Rocket size={64} className="mb-4 text-purple-400"/>
                            <p className="font-bold text-slate-500">Configurez et générez une mission.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* PREVIEW MODAL */}
            <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Aperçu : Ce que verront les étudiants">
                {challengeForm && (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <Rocket className="text-yellow-400 animate-pulse"/>
                                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">Opportunité Freelance</span>
                                </div>
                                <h3 className="text-2xl font-black mb-4 leading-tight">{challengeForm.title}</h3>
                                <p className="text-sm text-indigo-100 leading-relaxed bg-white/10 p-4 rounded-xl border border-white/10 mb-4">
                                    {challengeForm.description}
                                </p>
                                <div className="flex gap-4">
                                    <span className="font-bold text-emerald-200">+{challengeForm.rewardVE} VE</span>
                                    <span className="font-bold text-yellow-200">+{challengeForm.rewardBudget} PiXi</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4 border-t border-slate-100">
                            <button onClick={() => setShowPreview(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">
                                Modifier
                            </button>
                            <button onClick={handleSend} className="flex-2 w-full py-3 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-lg flex items-center justify-center gap-2">
                                <PenTool size={18}/> CONFIRMER L'OFFRE
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
