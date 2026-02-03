
import React, { useState, useRef, useEffect } from 'react';
import { Agency } from '../types';
import { askGroq } from '../services/groqService';
import { Sparkles, MessageSquare, Zap, Fingerprint, Send, Bot, Copy, RefreshCw, User, Terminal, Rocket, BrainCircuit, Target, AlertTriangle, Briefcase } from 'lucide-react';
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

export const AdminAIAssistant: React.FC<AdminAIAssistantProps> = ({ agencies }) => {
    const { toast } = useUI();
    const { sendChallenge } = useGame();
    const [mode, setMode] = useState<Mode>('ORACLE');
    const [loading, setLoading] = useState(false);
    
    // CHAT STATE
    const [chatInput, setChatInput] = useState("");
    const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', content: string}[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // SCENARIO STATE
    const [targetAgencyId, setTargetAgencyId] = useState(agencies.filter(a => a.id !== 'unassigned')[0]?.id || "");
    const [generatedContent, setGeneratedContent] = useState("");
    const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
    const [challengeForm, setChallengeForm] = useState({ title: '', description: '' });

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
                metrics: { ve: a.ve_current, cash: a.budget_real, burn_rate: netFlow },
                project_identity: {
                    theme: a.projectDef.theme || "Non défini",
                    problem: a.projectDef.problem || "Non défini",
                    target: a.projectDef.target || "Non défini",
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
        const context = getRichContextData(targetAgencyId)[0];
        
        const prompt = `Génère un scénario de CRISE ADMINISTRATIVE ou FINANCIÈRE pour l'agence "${context.name}".
        Contexte : Ils ont ${context.metrics.cash} PiXi et une VE de ${context.metrics.ve}.
        Si leur Cashflow est négatif, appuie là où ça fait mal.
        Le ton doit être froid, administratif et urgent.
        Format attendu : Un titre choc, suivi d'une description de la situation et de l'impact immédiat.`;

        try {
            const result = await askGroq(prompt, context, "Tu es un Auditeur Financier impitoyable.");
            setGeneratedContent(result);
            setChallengeForm({ title: "Crise Imprévue", description: result });
        } finally { setLoading(false); }
    };

    const handleGenerateCreative = async () => {
        setLoading(true);
        const context = getRichContextData(targetAgencyId)[0];
        
        const prompt = `Agis comme un Directeur de Création excentrique.
        Le projet de l'agence est : "${context.project_identity.theme}" pour résoudre "${context.project_identity.problem}".
        Leur geste architectural est : "${context.project_identity.gesture}".
        
        Génère une "WILDCARD" (Contrainte Surprise) qui vient percuter leur concept.
        Exemple : "Votre cible a changé", "Le lieu est inondé", "Le client veut du rose".
        Cela doit être un défi ironique mais réalisable en 48h.`;

        try {
            const result = await askGroq(prompt, context, "Tu es un Directeur Artistique de renommée mondiale, brillant mais chaotique.");
            setGeneratedContent(result);
            setChallengeForm({ title: "Wildcard Créative", description: result });
        } finally { setLoading(false); }
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
            // Nettoyage basique si l'IA bavarde autour du JSON
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
        await sendChallenge(targetAgencyId, challengeForm.title, challengeForm.description);
        setIsChallengeModalOpen(false);
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

                {/* MODES: GENERATORS */}
                {(mode === 'GENERATOR_CRISIS' || mode === 'GENERATOR_CREA') && (
                    <div className="flex flex-col h-full p-6">
                        <div className={`p-6 rounded-2xl mb-6 text-white shadow-lg flex flex-col md:flex-row gap-6 items-center ${mode === 'GENERATOR_CRISIS' ? 'bg-gradient-to-r from-red-900 to-slate-900' : 'bg-gradient-to-r from-purple-900 to-indigo-900'}`}>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
                                    {mode === 'GENERATOR_CRISIS' ? <AlertTriangle/> : <Sparkles/>}
                                    {mode === 'GENERATOR_CRISIS' ? 'Générateur de Crise & Administration' : 'Directeur de Création Virtuel'}
                                </h3>
                                <p className="text-sm opacity-80">
                                    {mode === 'GENERATOR_CRISIS' 
                                        ? "Créez des incidents financiers ou administratifs basés sur la santé réelle de l'agence." 
                                        : "Générez des 'Wildcards' (Contraintes surprises) basées sur le thème et la cible du projet."}
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
                            <button 
                                onClick={mode === 'GENERATOR_CRISIS' ? handleGenerateCrisis : handleGenerateCreative}
                                disabled={loading}
                                className="px-6 py-3 bg-white text-slate-900 font-bold rounded-xl shadow-lg hover:scale-105 transition-transform disabled:opacity-50 flex items-center gap-2"
                            >
                                {loading ? <RefreshCw className="animate-spin" size={18}/> : <Zap size={18}/>}
                                Générer
                            </button>
                        </div>

                        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-6 relative overflow-y-auto shadow-inner">
                            {generatedContent ? (
                                <div className="prose prose-slate max-w-none">
                                    <div className="flex justify-between items-start mb-4">
                                        <h4 className="text-lg font-bold text-slate-900">Scénario Suggéré</h4>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => { navigator.clipboard.writeText(generatedContent); toast('success', 'Copié !'); }} 
                                                className="p-2 bg-white hover:bg-indigo-50 border rounded-lg text-slate-500 transition-colors"
                                            >
                                                <Copy size={16}/>
                                            </button>
                                            <button 
                                                onClick={() => setIsChallengeModalOpen(true)}
                                                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-bold text-xs flex items-center gap-2 shadow-sm"
                                            >
                                                <Rocket size={16}/> Envoyer le Challenge
                                            </button>
                                        </div>
                                    </div>
                                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        {generatedContent}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-30">
                                    <Terminal size={48} className="mb-4"/>
                                    <p className="font-bold">En attente de génération...</p>
                                </div>
                            )}
                        </div>
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

            {/* MODAL: SEND CHALLENGE */}
            <Modal isOpen={isChallengeModalOpen} onClose={() => setIsChallengeModalOpen(false)} title="Lancer le Challenge">
                <div className="space-y-4">
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-sm text-indigo-900">
                        <Rocket size={20} className="mb-2"/>
                        Vous allez proposer ce défi à l'agence. S'ils l'acceptent (vote), une mission spéciale sera créée dans leur planning.
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Titre</label>
                        <input 
                            type="text" 
                            value={challengeForm.title}
                            onChange={(e) => setChallengeForm({...challengeForm, title: e.target.value})}
                            className="w-full p-3 border border-slate-200 rounded-xl font-bold"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                        <textarea 
                            value={challengeForm.description}
                            onChange={(e) => setChallengeForm({...challengeForm, description: e.target.value})}
                            className="w-full p-3 border border-slate-200 rounded-xl min-h-[150px] text-sm"
                        />
                    </div>

                    <button 
                        onClick={handleSendChallenge}
                        className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors"
                    >
                        Envoyer au Vote
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
