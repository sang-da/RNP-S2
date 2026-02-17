import React, { useState, useRef, useEffect } from 'react';
import { Agency, GameEvent, Deliverable } from '../../../types';
import { askGroq } from '../../../services/groqService';
import { useUI } from '../../../contexts/UIContext';
import { useGame } from '../../../contexts/GameContext';
import { AlertTriangle, RefreshCw, Gavel, MapPin, MailWarning, Copy, Target, Send, ArrowUp, Zap } from 'lucide-react';
import { ContextSelector } from './ContextSelector';

interface CrisisGeneratorProps {
    agencies: Agency[];
}

interface CrisisImpact {
    type: 'VE_FIXED' | 'BUDGET_FIXED' | 'BUDGET_PERCENT' | 'SALARY_FREEZE' | 'FIRING_RISK' | 'CUSTOM';
    value: number; // peut être négatif
    label: string;
}

interface CrisisScenario {
    title: string;
    pitch: string;
    email_object: string;
    email_body: string;
    impacts: CrisisImpact[];
    constraints: string[];
}

export const CrisisGenerator: React.FC<CrisisGeneratorProps> = ({ agencies }) => {
    const { toast, confirm } = useUI();
    const { updateAgency } = useGame();
    
    const [targetAgencyId, setTargetAgencyId] = useState(agencies.filter(a => a.id !== 'unassigned')[0]?.id || "");
    const [generatedCrisis, setGeneratedCrisis] = useState<CrisisScenario | null>(null);
    const [loading, setLoading] = useState(false);
    
    // Chat & Context
    const [refinementInput, setRefinementInput] = useState("");
    const [selectedDeliverableIds, setSelectedDeliverableIds] = useState<string[]>([]);
    const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Scroll auto
    useEffect(() => {
        if(chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }, [chatHistory, generatedCrisis]);

    const targetAgency = agencies.find(a => a.id === targetAgencyId);

    const toggleDeliverable = (id: string) => {
        setSelectedDeliverableIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // --- CONSTRUCT CONTEXT ---
    const getPromptContext = () => {
        if (!targetAgency) return "";
        
        let context = `
        AGENCE CIBLE : "${targetAgency.name}"
        - Effectif : ${targetAgency.members.length} membres.
        - Trésorerie : ${targetAgency.budget_real} PiXi.
        - VE Actuelle : ${targetAgency.ve_current}.
        - Projet : ${targetAgency.projectDef.theme} (${targetAgency.projectDef.location}).
        `;

        // Add Selected Deliverables Info
        const selectedDocs = Object.values(targetAgency.progress)
            .flatMap((w: any) => w.deliverables)
            .filter((d: Deliverable) => selectedDeliverableIds.includes(d.id));

        if (selectedDocs.length > 0) {
            context += `\nLIVRABLES ANALYSÉS (CONTEXTE) :\n`;
            selectedDocs.forEach((d: Deliverable) => {
                context += `- Fichier "${d.name}" (${d.type}). Feedback reçu: "${d.feedback}". Note: ${d.grading?.quality}.\n`;
            });
        }

        return context;
    };

    const handleGenerateOrRefine = async (isRefinement = false) => {
        if (!targetAgency) return;
        setLoading(true);

        const systemPrompt = `Tu es un "Game Master" sadique mais juste pour un jeu de gestion d'agence de design à Cotonou.
        Tu dois générer ou affiner un Scénario de Crise.
        
        RÈGLES D'IMPACT :
        - Les pénalités ne sont pas que des points. Tu peux geler les salaires, saisir un % du budget, ou menacer de licenciement.
        - Sois narratif et dramatique (Style JT de 20h ou Email Client Furieux).
        
        FORMAT DE SORTIE (JSON STRICT UNIQUE) :
        {
            "title": "Titre Court",
            "pitch": "Contexte narratif oral pour le prof.",
            "email_object": "Objet du mail",
            "email_body": "Corps du mail pour les étudiants.",
            "constraints": ["Contrainte de jeu 1", "Contrainte de jeu 2"],
            "impacts": [
                { "type": "VE_FIXED", "value": -10, "label": "-10 VE (Réputation)" },
                { "type": "BUDGET_PERCENT", "value": -20, "label": "-20% Trésorerie (Amende)" },
                { "type": "SALARY_FREEZE", "value": 1, "label": "Gel des salaires (1 sem)" }
            ]
        }`;

        let userPrompt = "";
        if (!isRefinement) {
            userPrompt = `Génère une NOUVELLE crise pour l'agence.
            ${getPromptContext()}
            Contexte Local : Saison des pluies, coupures d'électricité, pression politique.`;
            setChatHistory([]); // Reset chat on new generation
        } else {
            userPrompt = `MODIFICATION DEMANDÉE : "${refinementInput}".
            ${getPromptContext()}
            Génère le JSON mis à jour en prenant en compte cette modification.`;
            setChatHistory(prev => [...prev, { role: "user", content: refinementInput }]);
            setRefinementInput("");
        }

        try {
            // On envoie l'historique complet pour garder le fil
            const messages = [
                { role: "system", content: systemPrompt },
                ...chatHistory.map(m => ({ role: m.role as any, content: m.content })),
                { role: "user", content: userPrompt }
            ];

            // Note: askGroq simple ne suffit pas pour l'historique, on refait un fetch manuel ou on adapte le service.
            // Pour simplifier ici, on utilise askGroq en mode "One Shot" avec tout le contexte dans le prompt si l'historique est court,
            // ou on passe par le service modifié si disponible. Ici je concatène pour la sécurité.
            const fullPromptForOneShot = `${systemPrompt}\n\nHISTORIQUE:\n${chatHistory.map(m => m.role + ": " + m.content).join('\n')}\n\nUSER: ${userPrompt}`;
            
            const result = await askGroq(fullPromptForOneShot, {}, "Tu es un Game Master JSON.");
            const jsonStr = result.substring(result.indexOf('{'), result.lastIndexOf('}') + 1);
            const parsed = JSON.parse(jsonStr);
            
            setGeneratedCrisis(parsed);
            
            if (isRefinement) {
                setChatHistory(prev => [...prev, { role: "assistant", content: "Scénario mis à jour selon vos directives." }]);
            } else {
                setChatHistory([{ role: "user", content: "Génère une crise." }, { role: "assistant", content: parsed.pitch }]);
            }

        } catch (e) {
            console.error(e);
            toast('error', "Erreur IA. Reformulez.");
        } finally {
            setLoading(false);
        }
    };

    const handleApplyCrisis = async () => {
        if (!generatedCrisis || !targetAgency) return;

        // Calcul des impacts réels
        let veDelta = 0;
        let budgetDelta = 0;
        let description = `${generatedCrisis.pitch} [Voir Mail]. Impacts: `;

        generatedCrisis.impacts.forEach(imp => {
            description += `${imp.label}, `;
            if (imp.type === 'VE_FIXED') veDelta += imp.value;
            if (imp.type === 'BUDGET_FIXED') budgetDelta += imp.value;
            if (imp.type === 'BUDGET_PERCENT') budgetDelta += Math.floor(targetAgency.budget_real * (imp.value / 100));
            // Salary Freeze et Firing Risk sont purement narratifs/loggés ici, l'admin doit agir manuellement pour le firing
        });

        const isConfirmed = await confirm({
            title: "Déclencher ce Scénario ?",
            message: `Agence: ${targetAgency.name}\n${description}`,
            confirmText: "VALIDER",
            isDangerous: true
        });

        if (isConfirmed) {
            const newEvent: GameEvent = {
                id: `crisis-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                type: 'CRISIS',
                label: generatedCrisis.title,
                description: description,
                deltaVE: veDelta,
                deltaBudgetReal: budgetDelta
            };

            updateAgency({
                ...targetAgency,
                ve_current: Math.max(0, targetAgency.ve_current + veDelta),
                budget_real: targetAgency.budget_real + budgetDelta,
                eventLog: [...targetAgency.eventLog, newEvent]
            });
            toast('success', "Crise déclenchée avec succès.");
            setGeneratedCrisis(null);
            setChatHistory([]);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* TOP BAR */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <AlertTriangle className="text-red-500"/>
                    <select 
                        value={targetAgencyId}
                        onChange={e => setTargetAgencyId(e.target.value)}
                        className="p-2 bg-white border border-slate-300 rounded-lg font-bold text-sm outline-none w-full md:w-64"
                    >
                        {agencies.filter(a => a.id !== 'unassigned').map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                    </select>
                </div>
                <button 
                    onClick={() => handleGenerateOrRefine(false)}
                    disabled={loading}
                    className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg shadow hover:bg-slate-700 transition-all flex items-center gap-2 disabled:opacity-50 text-sm whitespace-nowrap"
                >
                    {loading ? <RefreshCw className="animate-spin" size={16}/> : <Zap size={16}/>}
                    Générer Scénario
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
                        
                        {/* CHAT HISTORY */}
                        <div className="space-y-3">
                            {chatHistory.map((msg, i) => (
                                <div key={i} className={`p-3 rounded-lg text-xs ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-900 ml-4' : 'bg-white border border-slate-200 mr-4'}`}>
                                    <span className="font-bold block mb-1 opacity-50">{msg.role === 'user' ? 'Vous' : 'IA'}</span>
                                    {msg.content}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* INPUT REFINEMENT */}
                    <div className="p-3 border-t border-slate-200 bg-white">
                        <form onSubmit={(e) => { e.preventDefault(); if(generatedCrisis) handleGenerateOrRefine(true); }} className="relative">
                            <input 
                                type="text" 
                                value={refinementInput}
                                onChange={e => setRefinementInput(e.target.value)}
                                placeholder={generatedCrisis ? "Ajuster (ex: 'Moins de budget, plus de VE')..." : "Générez d'abord une crise..."}
                                disabled={!generatedCrisis || loading}
                                className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                            />
                            <button 
                                type="submit"
                                disabled={!generatedCrisis || loading || !refinementInput.trim()}
                                className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                                <ArrowUp size={16}/>
                            </button>
                        </form>
                    </div>
                </div>

                {/* RIGHT: RESULT PREVIEW */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-100 relative custom-scrollbar">
                    {generatedCrisis ? (
                        <div className="max-w-3xl mx-auto space-y-6 pb-20">
                            {/* HEADER */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mb-2 inline-block">Scénario Proposé</span>
                                    <h2 className="text-2xl font-black text-slate-900 leading-tight">{generatedCrisis.title}</h2>
                                </div>
                                <button 
                                    onClick={handleApplyCrisis}
                                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95"
                                >
                                    <Gavel size={18}/> APPLIQUER
                                </button>
                            </div>

                            {/* PITCH */}
                            <div className="bg-white p-6 rounded-2xl border-l-4 border-slate-900 shadow-sm">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <MapPin size={14}/> Pitch Narratif
                                </h4>
                                <p className="text-lg text-slate-800 font-medium leading-relaxed italic">
                                    "{generatedCrisis.pitch}"
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* IMPACTS */}
                                <div className="bg-red-50 rounded-2xl border border-red-100 p-6 shadow-sm">
                                    <h4 className="text-xs font-bold text-red-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Target size={14}/> Impacts & Pénalités
                                    </h4>
                                    <ul className="space-y-3">
                                        {generatedCrisis.impacts.map((imp, idx) => (
                                            <li key={idx} className="flex gap-3 items-center text-sm font-bold text-red-900 bg-white/50 p-2 rounded-lg border border-red-100">
                                                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0"></div>
                                                {imp.label}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* CONSTRAINTS */}
                                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 shadow-sm">
                                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4">Nouvelles Contraintes</h4>
                                    <ul className="space-y-2">
                                        {generatedCrisis.constraints.map((c, i) => (
                                            <li key={i} className="text-sm text-slate-700 flex gap-2">
                                                <span>•</span> {c}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* EMAIL */}
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><MailWarning size={14}/> Email Officiel</span>
                                    <button 
                                        onClick={() => { navigator.clipboard.writeText(`OBJET: ${generatedCrisis.email_object}\n\n${generatedCrisis.email_body}`); toast('success', 'Copié !'); }} 
                                        className="text-[10px] bg-white border border-slate-300 px-2 py-1 rounded hover:bg-indigo-50 text-slate-600 flex items-center gap-1 font-bold"
                                    >
                                        <Copy size={10}/> COPIER
                                    </button>
                                </div>
                                <div className="p-6 font-mono text-sm text-slate-700 bg-slate-50/30">
                                    <p className="mb-4 font-bold text-slate-900">OBJET: {generatedCrisis.email_object}</p>
                                    <p className="whitespace-pre-wrap leading-relaxed">{generatedCrisis.email_body}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-30">
                            <Target size={64} className="mb-4 text-slate-400"/>
                            <p className="font-bold text-slate-500">Configurez et générez une crise pour voir le résultat.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};