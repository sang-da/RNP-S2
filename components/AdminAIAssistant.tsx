
import React, { useState, useRef, useEffect } from 'react';
import { Agency, GameEvent } from '../types';
import { askGroq } from '../services/groqService';
import { Sparkles, MessageSquare, Zap, Fingerprint, Send, Bot, Copy, RefreshCw, User, Terminal, Rocket, BrainCircuit, Target, AlertTriangle, Briefcase, Gavel, PenTool, Coins, MailWarning, MapPin } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { useGame } from '../contexts/GameContext';
import { GAME_RULES } from '../constants';
import { Modal } from './Modal';

interface AdminAIAssistantProps {
    agencies: Agency[];
}

type Mode = 'ORACLE' | 'GENERATOR_CRISIS' | 'GENERATOR_CREA' | 'PROFILER';

interface ProfilerResult {
    psychological_profile: string;
    soft_skills: {
        leadership: number;
        teamwork: number;
        reliability: number;
    };
    financial_viability: number;
    verdict: string;
    recommendation: string;
}

interface CrisisScenario {
    title: string;
    pitch: string;
    email_object: string;
    email_body: string;
    constraints: string[];
    ve_penalty: number;
}

export const AdminAIAssistant: React.FC<AdminAIAssistantProps> = ({ agencies }) => {
    const { toast, confirm } = useUI();
    const { sendChallenge, updateAgency } = useGame();
    const [mode, setMode] = useState<Mode>('ORACLE');
    const [loading, setLoading] = useState(false);
    
    // CHAT STATE
    const [chatInput, setChatInput] = useState("");
    const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', content: string}[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // SCENARIO STATE
    const [targetAgencyId, setTargetAgencyId] = useState(agencies.filter(a => a.id !== 'unassigned')[0]?.id || "");
    const [generatedCrisis, setGeneratedCrisis] = useState<CrisisScenario | null>(null);
    
    // CHALLENGE MODAL STATE
    const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
    const [challengeForm, setChallengeForm] = useState({ title: '', description: '', rewardVE: 10, rewardBudget: 500 });
    const [isWritingChallenge, setIsWritingChallenge] = useState(false);

    // PROFILE STATE
    const [targetStudentId, setTargetStudentId] = useState("");
    const [profileResult, setProfileResult] = useState<ProfilerResult | null>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory, loading]);

    // --- CONTEXTE RICHE & RÈGLES DU JEU ---
    const getRichContextData = (specificAgencyId?: string) => {
        const targetList = specificAgencyId ? agencies.filter(a => a.id === specificAgencyId) : agencies.filter(a => a.id !== 'unassigned');

        return targetList.map(a => {
            const memberCount = a.members.length;
            const totalScore = a.members.reduce((sum, m) => sum + m.individualScore, 0);
            
            // Calculs économiques
            const weeklyPayroll = totalScore * GAME_RULES.SALARY_MULTIPLIER;
            const netFlow = ((a.ve_current * 30) + (a.weeklyRevenueModifier || 0)) - (weeklyPayroll + 500);

            return {
                name: a.name,
                class: a.classId,
                metrics: { ve: a.ve_current, cash: a.budget_real, burn_rate: netFlow, members_count: memberCount },
                project_identity: {
                    theme: a.projectDef.theme || "Non défini",
                    problem: a.projectDef.problem || "Non défini",
                    target: a.projectDef.target || "Non défini",
                    location: a.projectDef.location || "Non défini", // Ajout Location
                    direction: a.projectDef.direction || "Non défini",
                    gesture: a.projectDef.gesture || "Non défini"
                },
                team_composition: a.members.map(m => `${m.name} (${m.role}, Score: ${m.individualScore})`).join(', ')
            };
        });
    };

    const handleChatSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!chatInput.trim()) return;

        const userMsg = chatInput;
        setChatInput("");
        setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const context = getRichContextData();
            const systemPrompt = `
                Tu es le Directeur Stratégique du RNP. Tu as accès aux données financières et aux DÉTAILS DES PROJETS.
                Utilise les infos de 'project_identity' (Thème, Problème, Cible) pour donner des conseils précis.
                Si on parle d'argent, sois cynique. Si on parle de projet, sois un Directeur Artistique exigeant.
            `;

            const answer = await askGroq(userMsg, context, systemPrompt);
            setChatHistory(prev => [...prev, { role: 'ai', content: answer }]);
        } catch (error) {
            toast('error', "Erreur IA.");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateCrisis = async () => {
        setLoading(true);
        setGeneratedCrisis(null);
        const context = getRichContextData(targetAgencyId)[0];
        
        const prompt = `Génère un ÉVÉNEMENT MAJEUR (Scénario de Crise) pour l'agence "${context.name}" (Design d'Espace).
        
        CONTEXTE GÉOGRAPHIQUE & RÉALISTE :
        - Ville : Cotonou, Bénin.
        - Contexte : Urbanisme tropical, saison des pluies, enjeux politiques locaux, gentrification, décrets préfectoraux, coupures de courant (SBEE), inflation des matériaux importés.
        
        CONTEXTE AGENCE :
        - Projet : "${context.project_identity.theme}" situé à "${context.project_identity.location}".
        - Effectif : ${context.metrics.members_count} membres.
        - Trésorerie : ${context.metrics.cash} PiXi.

        TON OBJECTIF :
        Tu es un "Game Master" sadique mais juste. Crée un événement narratif FORT qui change la donne du projet et force l'agence à sortir de sa zone de confort.
        Cela doit ressembler à une nouvelle tombée au JT de 20h ou un mail urgent du client.

        FORMAT ATTENDU (JSON STRICT) :
        {
            "title": "Titre Court & Claquant (ex: Décret Littoral 2026)",
            "pitch": "Le contexte narratif (ex: Ce matin à 8h, la préfecture a annoncé...)",
            "email_object": "Objet du mail urgent (ex: URGENCE - ARRÊT DU CHANTIER)",
            "email_body": "Le corps du mail adressé à l'équipe. Ton professionnel, paniqué ou officiel. Doit contenir la mauvaise nouvelle.",
            "constraints": [
                "Une contrainte de pivot (ex: Changer de lieu, passer en architecture mobile...)",
                "Une contrainte RH ou budgétaire (ex: Licencier 1 personne, Budget coupé de 50%...)"
            ],
            "ve_penalty": (Nombre entier négatif entre -5 et -20 selon la gravité)
        }
        `;

        try {
            const result = await askGroq(prompt, context, "Tu es un Scénariste de Serious Game expert en contexte africain urbain. Tu réponds UNIQUEMENT en JSON.");
            const jsonStr = result.substring(result.indexOf('{'), result.lastIndexOf('}') + 1);
            const parsed = JSON.parse(jsonStr);
            
            setGeneratedCrisis(parsed);
        } catch(e) {
            console.error(e);
            toast('error', "L'IA a trébuché. Réessayez.");
        } finally { setLoading(false); }
    };

    const handleExecuteCrisis = async () => {
        if (!generatedCrisis || !targetAgencyId) return;
        const agency = agencies.find(a => a.id === targetAgencyId);
        if(!agency) return;

        const isConfirmed = await confirm({
            title: "Exécuter ce Scénario ?",
            message: `Cela va impacter l'agence "${agency.name}" de ${generatedCrisis.ve_penalty} VE.\nL'événement sera inscrit dans l'historique.`,
            confirmText: "DÉCLENCHER",
            isDangerous: true
        });

        if (isConfirmed) {
            const newEvent: GameEvent = {
                id: `ai-crisis-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                type: 'CRISIS',
                label: generatedCrisis.title,
                description: `${generatedCrisis.pitch} [Voir mail]. Impact: ${generatedCrisis.ve_penalty} VE.`,
                deltaVE: generatedCrisis.ve_penalty,
                deltaBudgetReal: 0
            };
            
            updateAgency({
                ...agency,
                ve_current: Math.max(0, agency.ve_current + generatedCrisis.ve_penalty),
                eventLog: [...agency.eventLog, newEvent]
            });
            toast('success', "Scénario activé. À vous d'envoyer le mail !");
        }
    };

    const handleGenerateCreativeForChallenge = async () => {
        setIsWritingChallenge(true);
        const context = getRichContextData(targetAgencyId)[0];
        
        const prompt = `Agis comme un CLIENT EXIGEANT ou un INVESTISSEUR pour l'agence "${context.name}".
        Leur projet : "${context.project_identity.theme}" sur le problème "${context.project_identity.problem}".
        Cible : "${context.project_identity.target}".
        
        Rédige un BRIEF DE MISSION SPÉCIALE (Challenge) qui s'intègre parfaitement à leur réalité.
        Demande un livrable précis (ex: "Une variante luxe", "Une version mobile", "Un poster pour un event spécifique").
        
        Format attendu : JSON { "title": "Titre accrocheur (ex: Commande Urgente)", "description": "Le contexte et la demande précise du livrable à produire." }
        `;

        try {
            const result = await askGroq(prompt, context, "Tu es un client VIP réaliste et pressé. Tu réponds en JSON.");
            const jsonStr = result.substring(result.indexOf('{'), result.lastIndexOf('}') + 1);
            const parsed = JSON.parse(jsonStr);
            
            setChallengeForm(prev => ({
                ...prev,
                title: parsed.title,
                description: parsed.description
            }));
        } catch(e) {
            toast('error', "L'IA n'a pas pu générer le challenge.");
        } finally { setIsWritingChallenge(false); }
    };

    const handleAnalyzeProfile = async () => {
        if(!targetStudentId) return;
        setLoading(true);
        setProfileResult(null);
        
        let studentData = null;
        let agencyContext = null;

        for (const a of agencies) {
            const s = a.members.find(m => m.id === targetStudentId);
            if (s) {
                studentData = s;
                agencyContext = a;
                break;
            }
        }

        if (!studentData) { setLoading(false); return; }

        const prompt = `Analyse le profil de l'étudiant ${studentData.name}.
        Données : Score ${studentData.individualScore}/100, Rôle: ${studentData.role}, Wallet: ${studentData.wallet}.
        Agence : ${agencyContext?.name} (VE: ${agencyContext?.ve_current}).
        
        Génère un JSON STRICT avec cette structure exacte :
        {
            "psychological_profile": "Analyse comportementale en 2 phrases (style FBI Profiler).",
            "soft_skills": { "leadership": 0-100, "teamwork": 0-100, "reliability": 0-100 },
            "financial_viability": 0-100 (Est-il rentable pour l'agence ?),
            "verdict": "Un mot (ex: TOXIQUE, PILIER, FUTUR CEO)",
            "recommendation": "Conseil pour le prof (ex: Le surveiller, Le promouvoir)."
        }
        Ne mets RIEN d'autre que le JSON.`;

        try {
            const result = await askGroq(prompt, { student: studentData }, "Tu es un algorithme de profilage RH avancé. Tu parles en JSON.");
            const jsonStr = result.substring(result.indexOf('{'), result.lastIndexOf('}') + 1);
            setProfileResult(JSON.parse(jsonStr));
        } catch (error) {
            console.error(error);
            toast('error', "Format IA invalide. Réessayez.");
        } finally {
            setLoading(false);
        }
    };

    const handleSendChallenge = async () => {
        if (!targetAgencyId || !challengeForm.title || !challengeForm.description) return;
        await sendChallenge(targetAgencyId, challengeForm.title, challengeForm.description, challengeForm.rewardVE, challengeForm.rewardBudget);
        setIsChallengeModalOpen(false);
        setChallengeForm({ title: '', description: '', rewardVE: 10, rewardBudget: 500 });
        toast('success', "Offre de mission envoyée !");
    };

    const openChallengeModal = () => {
        setChallengeForm({ title: '', description: '', rewardVE: 10, rewardBudget: 500 });
        setIsChallengeModalOpen(true);
    };

    return (
        <div className="animate-in fade-in duration-500 pb-20 h-[calc(100vh-100px)] flex flex-col">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                <div>
                    <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl text-white shadow-lg shadow-indigo-200"><Bot size={32}/></div>
                        Co-Pilote IA
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Assistant intelligent connecté aux données du RNP.</p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                    <button onClick={() => setMode('ORACLE')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${mode === 'ORACLE' ? 'bg-white text-indigo-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                        <MessageSquare size={16}/> Oracle
                    </button>
                    <button onClick={() => setMode('GENERATOR_CRISIS')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${mode === 'GENERATOR_CRISIS' ? 'bg-red-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                        <AlertTriangle size={16}/> Crises
                    </button>
                    <button onClick={() => setMode('GENERATOR_CREA')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${mode === 'GENERATOR_CREA' ? 'bg-purple-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Sparkles size={16}/> Créa
                    </button>
                    <button onClick={() => setMode('PROFILER')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${mode === 'PROFILER' ? 'bg-white text-indigo-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                        <Fingerprint size={16}/> Profiler
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col relative">
                
                {/* MODE: ORACLE (CHAT) */}
                {mode === 'ORACLE' && (
                    <div className="flex flex-col h-full">
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                            {chatHistory.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                    <BrainCircuit size={64} className="mb-4 text-indigo-200"/>
                                    <p className="text-lg font-bold text-slate-500">Posez une question stratégique.</p>
                                    <p className="text-sm">"Quel projet est le plus risqué ?"</p>
                                    <p className="text-sm">"Donne-moi une analyse SWOT de l'agence Alpha."</p>
                                </div>
                            )}
                            {chatHistory.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                        msg.role === 'user' 
                                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                                    }`}>
                                        {msg.role === 'ai' && <Bot size={16} className="mb-2 text-indigo-500"/>}
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none flex items-center gap-2 text-slate-500 text-sm">
                                        <RefreshCw size={14} className="animate-spin"/> Réflexion en cours...
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                        <form onSubmit={handleChatSubmit} className="p-4 bg-white border-t border-slate-200 flex gap-2">
                            <input 
                                type="text" 
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                placeholder="Interrogez le système sur les finances ou les projets..."
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                            />
                            <button type="submit" disabled={loading || !chatInput.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl transition-colors disabled:opacity-50">
                                <Send size={20}/>
                            </button>
                        </form>
                    </div>
                )}

                {/* MODES: GENERATORS (CRISIS & CREA) */}
                {(mode === 'GENERATOR_CRISIS' || mode === 'GENERATOR_CREA') && (
                    <div className="flex flex-col h-full p-6">
                        <div className={`p-6 rounded-2xl mb-6 text-white shadow-lg flex flex-col md:flex-row gap-6 items-center ${mode === 'GENERATOR_CRISIS' ? 'bg-gradient-to-r from-red-900 to-slate-900' : 'bg-gradient-to-r from-purple-900 to-indigo-900'}`}>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
                                    {mode === 'GENERATOR_CRISIS' ? <AlertTriangle/> : <Sparkles/>}
                                    {mode === 'GENERATOR_CRISIS' ? 'Générateur de Scénario (Game Master)' : 'Directeur de Création Virtuel'}
                                </h3>
                                <p className="text-sm opacity-80">
                                    {mode === 'GENERATOR_CRISIS' 
                                        ? "Générez un événement majeur contextuel (Décret, Météo, Social) pour challenger l'agence." 
                                        : "Générez des 'Missions Commandos' (Challenges) basées sur la réalité du projet de l'agence."}
                                </p>
                            </div>
                            <div className="w-full md:w-64 bg-white/10 p-2 rounded-xl backdrop-blur-sm">
                                <label className="block text-[10px] font-bold uppercase mb-1 opacity-70 px-1">Cible</label>
                                <select 
                                    value={targetAgencyId}
                                    onChange={e => setTargetAgencyId(e.target.value)}
                                    className="w-full p-2 bg-slate-900/50 border border-white/20 rounded-lg text-sm font-bold text-white outline-none"
                                >
                                    {agencies.filter(a => a.id !== 'unassigned').map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            {mode === 'GENERATOR_CRISIS' ? (
                                <button 
                                    onClick={handleGenerateCrisis}
                                    disabled={loading}
                                    className="px-6 py-3 bg-white text-slate-900 font-bold rounded-xl shadow-lg hover:scale-105 transition-transform disabled:opacity-50 flex items-center gap-2"
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={18}/> : <Zap size={18}/>}
                                    Créer le Chaos
                                </button>
                            ) : (
                                <button 
                                    onClick={openChallengeModal}
                                    className="px-6 py-3 bg-white text-slate-900 font-bold rounded-xl shadow-lg hover:scale-105 transition-transform disabled:opacity-50 flex items-center gap-2"
                                >
                                    <Rocket size={18}/>
                                    Créer Challenge
                                </button>
                            )}
                        </div>

                        {/* RESULT AREA FOR CRISIS ONLY */}
                        {mode === 'GENERATOR_CRISIS' && (
                            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-6 relative overflow-y-auto shadow-inner">
                                {generatedCrisis ? (
                                    <div className="space-y-6">
                                        
                                        {/* HEADER DU SCENARIO */}
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Scénario Actif</span>
                                                    <span className="text-red-600 font-bold text-sm">Pénalité: {generatedCrisis.ve_penalty} VE</span>
                                                </div>
                                                <h2 className="text-2xl font-black text-slate-900 leading-tight">{generatedCrisis.title}</h2>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={handleExecuteCrisis}
                                                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95"
                                                >
                                                    <Gavel size={18}/> DÉCLENCHER
                                                </button>
                                            </div>
                                        </div>

                                        {/* LE PITCH NARRATIF */}
                                        <div className="bg-white p-6 rounded-2xl border-l-4 border-slate-900 shadow-sm">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <MapPin size={14}/> Le Pitch Narratif (Oral)
                                            </h4>
                                            <p className="text-lg text-slate-800 font-medium leading-relaxed italic">
                                                "{generatedCrisis.pitch}"
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* L'EMAIL À ENVOYER */}
                                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                                                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                                                    <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><MailWarning size={14}/> Message Officiel</span>
                                                    <button 
                                                        onClick={() => { navigator.clipboard.writeText(`OBJET: ${generatedCrisis.email_object}\n\n${generatedCrisis.email_body}`); toast('success', 'Email copié !'); }} 
                                                        className="text-[10px] bg-white border border-slate-300 px-2 py-1 rounded hover:bg-indigo-50 text-slate-600 flex items-center gap-1 font-bold"
                                                    >
                                                        <Copy size={10}/> COPIER
                                                    </button>
                                                </div>
                                                <div className="p-6 font-mono text-sm text-slate-700 bg-slate-50/50 flex-1">
                                                    <p className="mb-4 font-bold text-slate-900">OBJET: {generatedCrisis.email_object}</p>
                                                    <p className="whitespace-pre-wrap leading-relaxed">{generatedCrisis.email_body}</p>
                                                </div>
                                            </div>

                                            {/* LES NOUVELLES CONTRAINTES */}
                                            <div className="bg-red-50 rounded-2xl border border-red-100 p-6 shadow-sm">
                                                <h4 className="text-xs font-bold text-red-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <Target size={14}/> Nouvelles Règles du Jeu
                                                </h4>
                                                <ul className="space-y-3">
                                                    {generatedCrisis.constraints.map((rule, idx) => (
                                                        <li key={idx} className="flex gap-3 items-start text-sm text-red-900">
                                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div>
                                                            <span className="font-medium">{rule}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center opacity-30">
                                        <Terminal size={48} className="mb-4"/>
                                        <p className="font-bold">En attente de génération...</p>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {mode === 'GENERATOR_CREA' && (
                            <div className="flex-1 flex items-center justify-center opacity-30 border-2 border-dashed border-slate-200 rounded-2xl">
                                <div className="text-center">
                                    <Rocket size={48} className="mx-auto mb-4 text-purple-400"/>
                                    <p className="font-bold">Cliquez sur "Créer Challenge" pour ouvrir l'éditeur.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* MODE: PROFILER (VISUEL) */}
                {mode === 'PROFILER' && (
                    <div className="flex flex-col h-full p-6">
                        <div className="flex gap-4 mb-6">
                            <div className="relative flex-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Sélectionnez un étudiant</label>
                                <select 
                                    value={targetStudentId}
                                    onChange={e => setTargetStudentId(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                >
                                    <option value="">-- Choisir un profil --</option>
                                    {agencies.map(agency => (
                                        <optgroup key={agency.id} label={agency.name}>
                                            {agency.members.map(member => (
                                                <option key={member.id} value={member.id}>
                                                    {member.name} (Score: {member.individualScore})
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button 
                                    onClick={handleAnalyzeProfile}
                                    disabled={loading || !targetStudentId}
                                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-50 h-[48px] shadow-lg"
                                >
                                    {loading ? <RefreshCw className="animate-spin"/> : <Fingerprint/>}
                                    Lancer le Profilage
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 bg-slate-100 rounded-3xl p-6 overflow-y-auto">
                            {profileResult ? (
                                <div className="max-w-4xl mx-auto space-y-6">
                                    {/* HEADER CARD */}
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="p-4 bg-slate-900 rounded-full text-white">
                                                <User size={32}/>
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-bold text-slate-900">Rapport Confidentiel</h3>
                                                <p className="text-slate-500 text-sm">ID Sujet: {targetStudentId.slice(0,8)}</p>
                                            </div>
                                        </div>
                                        <div className={`px-6 py-3 rounded-xl border-2 font-black text-xl uppercase tracking-widest ${
                                            profileResult.verdict.includes('TOXIQUE') ? 'border-red-500 text-red-500 bg-red-50' : 
                                            profileResult.verdict.includes('TOP') ? 'border-emerald-500 text-emerald-500 bg-emerald-50' : 
                                            'border-slate-300 text-slate-500'
                                        }`}>
                                            {profileResult.verdict}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* GAUCHE : STATS */}
                                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                                            <h4 className="font-bold text-slate-400 uppercase text-xs tracking-widest border-b pb-2">Métriques de Performance</h4>
                                            
                                            <div className="space-y-4">
                                                <MetricBar label="Leadership" value={profileResult.soft_skills.leadership} color="bg-indigo-500" />
                                                <MetricBar label="Esprit d'Équipe" value={profileResult.soft_skills.teamwork} color="bg-pink-500" />
                                                <MetricBar label="Fiabilité" value={profileResult.soft_skills.reliability} color="bg-cyan-500" />
                                                <div className="pt-4 mt-4 border-t border-slate-100">
                                                    <MetricBar label="Rentabilité Financière" value={profileResult.financial_viability} color="bg-emerald-500" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* DROITE : ANALYSE */}
                                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                                            <h4 className="font-bold text-slate-400 uppercase text-xs tracking-widest border-b pb-2 mb-4">Profil Psychologique</h4>
                                            <p className="text-sm text-slate-700 leading-relaxed italic mb-6">
                                                "{profileResult.psychological_profile}"
                                            </p>
                                            
                                            <div className="mt-auto bg-slate-50 p-4 rounded-xl border-l-4 border-indigo-500">
                                                <p className="text-xs font-bold text-indigo-500 uppercase mb-1">Recommendation IA</p>
                                                <p className="text-sm font-bold text-slate-900">{profileResult.recommendation}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                    <Target size={64} className="mb-4"/>
                                    <p className="font-bold">En attente de données...</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL: SEND CHALLENGE V2 */}
            <Modal isOpen={isChallengeModalOpen} onClose={() => setIsChallengeModalOpen(false)} title="Créer un Contrat Sur-Mesure">
                <div className="space-y-4">
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-sm text-indigo-900">
                        <Rocket size={20} className="mb-2"/>
                        Vous allez proposer une <strong>Mission Spéciale</strong> à l'agence cible. 
                        Si l'équipe vote OUI, un <strong>Livrable Spécial</strong> sera ajouté à leur liste de tâches de la semaine en cours.
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 flex justify-between items-end">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Titre de la mission</label>
                            <button 
                                onClick={handleGenerateCreativeForChallenge}
                                disabled={isWritingChallenge}
                                className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                            >
                                {isWritingChallenge ? <RefreshCw className="animate-spin" size={12}/> : <Sparkles size={12}/>}
                                Générer via IA (Contextuel)
                            </button>
                        </div>
                        <div className="col-span-2">
                            <input 
                                type="text" 
                                value={challengeForm.title}
                                onChange={(e) => setChallengeForm({...challengeForm, title: e.target.value})}
                                className="w-full p-3 border border-slate-200 rounded-xl font-bold"
                                placeholder="Ex: Commande Client VIP"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                <Target size={12}/> Gain VE
                            </label>
                            <input 
                                type="number" 
                                value={challengeForm.rewardVE}
                                onChange={(e) => setChallengeForm({...challengeForm, rewardVE: Number(e.target.value)})}
                                className="w-full p-3 border border-slate-200 rounded-xl font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                                <Coins size={12}/> Gain Budget (PiXi)
                            </label>
                            <input 
                                type="number" 
                                value={challengeForm.rewardBudget}
                                onChange={(e) => setChallengeForm({...challengeForm, rewardBudget: Number(e.target.value)})}
                                className="w-full p-3 border border-slate-200 rounded-xl font-bold"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description & Livrable Attendu</label>
                        <textarea 
                            value={challengeForm.description}
                            onChange={(e) => setChallengeForm({...challengeForm, description: e.target.value})}
                            className="w-full p-3 border border-slate-200 rounded-xl min-h-[150px] text-sm"
                            placeholder="Décrivez le contexte et ce que l'agence doit produire..."
                        />
                    </div>

                    <button 
                        onClick={handleSendChallenge}
                        disabled={!challengeForm.title}
                        className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                    >
                        <PenTool size={18}/> Envoyer l'Offre de Contrat
                    </button>
                </div>
            </Modal>
        </div>
    );
};

const MetricBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div>
        <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
            <span>{label}</span>
            <span>{value}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${color}`} style={{ width: `${value}%` }}></div>
        </div>
    </div>
);
