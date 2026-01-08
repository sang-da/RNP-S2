
import React, { useState, useRef, useEffect } from 'react';
import { Agency } from '../types';
import { askGroq } from '../services/groqService';
import { Sparkles, MessageSquare, Zap, Fingerprint, Send, Bot, Copy, RefreshCw, User, Terminal } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { GAME_RULES } from '../constants'; // Import des règles économiques

interface AdminAIAssistantProps {
    agencies: Agency[];
}

type Mode = 'CHAT' | 'SCENARIO' | 'PROFILE';

export const AdminAIAssistant: React.FC<AdminAIAssistantProps> = ({ agencies }) => {
    const { toast } = useUI();
    const [mode, setMode] = useState<Mode>('CHAT');
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState("");
    
    // CHAT STATE
    const [chatInput, setChatInput] = useState("");
    const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', content: string}[]>([]);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // SCENARIO STATE
    const [scenarioType, setScenarioType] = useState("CRISIS");
    const [targetAgencyId, setTargetAgencyId] = useState(agencies[0]?.id || "");

    // PROFILE STATE
    const [targetStudentName, setTargetStudentName] = useState("");

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory, loading]);

    // --- CONTEXTE RICHE & RÈGLES DU JEU ---
    const getRichContextData = () => {
        // 1. Définition des règles pour l'IA
        const rulesContext = {
            currency: "PiXi",
            rent_cost: GAME_RULES.AGENCY_RENT, // 500
            salary_formula: "Score Individuel * 10",
            bankruptcy_threshold: GAME_RULES.BANKRUPTCY_THRESHOLD, // -5000
            revenue_formula: "(VE * 30) + Bonus",
            ve_meaning: "Note de l'agence (0-100). Impacte les revenus.",
            critical_status: "VE < 40 ou Budget < 0"
        };

        // 2. Analyse financière de chaque agence
        const agenciesAnalysis = agencies.filter(a => a.id !== 'unassigned').map(a => {
            const memberCount = a.members.length;
            const totalScore = a.members.reduce((sum, m) => sum + m.individualScore, 0);
            
            // Calculs économiques
            const weeklyPayroll = totalScore * GAME_RULES.SALARY_MULTIPLIER;
            const weeklyRent = GAME_RULES.AGENCY_RENT;
            const totalExpenses = weeklyPayroll + weeklyRent;
            
            const weeklyRevenue = (a.ve_current * GAME_RULES.REVENUE_VE_MULTIPLIER) + (a.weeklyRevenueModifier || 0) + GAME_RULES.REVENUE_BASE;
            const netFlow = weeklyRevenue - totalExpenses; // Cashflow net

            // Estimation survie
            let weeksToDeath = "Illimité";
            if (netFlow < 0) {
                const remainingBudget = a.budget_real - GAME_RULES.BANKRUPTCY_THRESHOLD; // Distance avant -5000
                weeksToDeath = Math.floor(remainingBudget / Math.abs(netFlow)) + " semaines";
            }

            return {
                name: a.name,
                class: a.classId,
                metrics: {
                    ve: a.ve_current,
                    cash: a.budget_real,
                    members: memberCount,
                    avg_score: memberCount > 0 ? Math.round(totalScore / memberCount) : 0
                },
                financials: {
                    weekly_expenses: totalExpenses,
                    weekly_revenue: weeklyRevenue,
                    net_cashflow: netFlow,
                    burn_rate_alert: weeksToDeath
                },
                project: a.projectDef.problem ? `${a.projectDef.problem} (${a.projectDef.target})` : "Non défini",
                top_talent: a.members.reduce((prev, current) => (prev.individualScore > current.individualScore) ? prev : current).name,
                weakest_link: a.members.reduce((prev, current) => (prev.individualScore < current.individualScore) ? prev : current).name
            };
        });

        return {
            rules: rulesContext,
            market_state: agenciesAnalysis
        };
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
                Tu es l'Oracle Financier et Pédagogique du RNP Manager.
                
                TES RÈGLES D'OR :
                1. L'argent (PiXi) est crucial. Une agence meurt à -5000 PiXi.
                2. Tu dois juger la rentabilité. Une agence avec un Cashflow négatif est en danger, même si elle a une bonne VE.
                3. Sois direct, un peu cynique, style "Corporate Finance".
                4. Utilise les données fournies (Burn Rate, Top Talent) pour tes réponses.
                5. Si on te demande "Qui va couler ?", regarde le 'burn_rate_alert'.
            `;

            const answer = await askGroq(
                userMsg, 
                context, 
                systemPrompt
            );
            setChatHistory(prev => [...prev, { role: 'ai', content: answer }]);
        } catch (error) {
            toast('error', "Erreur de connexion à l'IA.");
            setChatHistory(prev => [...prev, { role: 'ai', content: "Erreur système. Connexion neurale perdue." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateScenario = async () => {
        setLoading(true);
        const targetAgency = agencies.find(a => a.id === targetAgencyId);
        const context = getRichContextData(); // On passe tout le contexte pour qu'il puisse comparer
        
        let prompt = "";
        if (scenarioType === "CRISIS") prompt = `Génère un scénario de crise financière ou technique pour l'agence "${targetAgency?.name}". Prends en compte qu'ils ont ${targetAgency?.budget_real} PiXi et une VE de ${targetAgency?.ve_current}. Si leur cashflow est négatif, appuie là où ça fait mal. Format: Titre, Description, Impact suggéré.`;
        if (scenarioType === "EMAIL") prompt = `Rédige un email de la Direction Financière à "${targetAgency?.name}". Ton ton doit dépendre de leur santé financière (Cash: ${targetAgency?.budget_real}). S'ils sont riches, félicite-les mais incite à l'investissement. S'ils sont pauvres, menace-les de tutelle.`;
        if (scenarioType === "BRIEF") prompt = `Invente une "Wildcard" (Contrainte surprise) pour le projet "${targetAgency?.projectDef.problem}" de l'agence "${targetAgency?.name}". Ça doit être ironique et difficile.`;

        try {
            const result = await askGroq(prompt, context, "Tu es un Maître du Jeu sadique mais juste. Tu connais parfaitement les finances des étudiants.");
            setResponse(result);
        } catch (error) {
            toast('error', "Erreur génération.");
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyzeProfile = async () => {
        if(!targetStudentName) return;
        setLoading(true);
        
        // Find student data across all agencies
        let studentData = null;
        let agencyContext = null;

        for (const a of agencies) {
            const s = a.members.find(m => m.name.toLowerCase().includes(targetStudentName.toLowerCase()));
            if (s) {
                const salary = s.individualScore * GAME_RULES.SALARY_MULTIPLIER;
                studentData = { 
                    ...s, 
                    cost_to_agency: salary, 
                    is_profitable: s.individualScore > 60 // Simple heuristic
                };
                agencyContext = { 
                    name: a.name, 
                    ve: a.ve_current, 
                    budget: a.budget_real, 
                    status: a.status 
                };
                break;
            }
        }

        if (!studentData) {
            setResponse("Étudiant introuvable.");
            setLoading(false);
            return;
        }

        const prompt = `Analyse le profil de l'étudiant ${studentData.name}. 
        
        Données : 
        - Score: ${studentData.individualScore}/100
        - Coût Salarial: ${studentData.cost_to_agency} PiXi/semaine
        - Agence: ${agencyContext?.name} (Budget: ${agencyContext?.budget}, VE: ${agencyContext?.ve})
        
        Question: Est-ce un atout ou un poids mort pour son agence ? Donne un avis psychologique et financier tranché.`;

        try {
            const result = await askGroq(prompt, { student: studentData, agency: agencyContext }, "Tu es un DRH impitoyable qui analyse la rentabilité des employés.");
            setResponse(result);
        } catch (error) {
            toast('error', "Erreur analyse.");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(response);
        toast('success', 'Copié dans le presse-papier');
    };

    return (
        <div className="animate-in fade-in duration-500 pb-20 h-[calc(100vh-100px)] flex flex-col">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
                <div>
                    <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl text-white shadow-lg shadow-indigo-200"><Bot size={32}/></div>
                        Co-Pilote IA
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">L'IA a désormais accès aux bilans comptables, salaires et risques de faillite.</p>
                </div>

                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <button onClick={() => setMode('CHAT')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${mode === 'CHAT' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <MessageSquare size={16}/> Oracle
                    </button>
                    <button onClick={() => setMode('SCENARIO')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${mode === 'SCENARIO' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <Zap size={16}/> Générateur
                    </button>
                    <button onClick={() => setMode('PROFILE')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${mode === 'PROFILE' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <Fingerprint size={16}/> Profiler
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col relative">
                
                {/* MODE: CHAT ORACLE */}
                {mode === 'CHAT' && (
                    <div className="flex flex-col h-full">
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                            {chatHistory.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                    <Sparkles size={48} className="mb-4"/>
                                    <p className="text-lg font-bold">Posez une question financière ou stratégique.</p>
                                    <p className="text-sm">"Quelle agence perd le plus d'argent chaque semaine ?"</p>
                                    <p className="text-sm">"Est-ce que l'agence X peut survivre au loyer ?"</p>
                                </div>
                            )}
                            {chatHistory.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                        msg.role === 'user' 
                                        ? 'bg-slate-900 text-white rounded-tr-none' 
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
                                        <RefreshCw size={14} className="animate-spin"/> Analyse des flux financiers...
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
                                placeholder="Interrogez le système (ex: Qui est le maillon faible ?)..."
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                            />
                            <button type="submit" disabled={loading || !chatInput.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl transition-colors disabled:opacity-50">
                                <Send size={20}/>
                            </button>
                        </form>
                    </div>
                )}

                {/* MODE: SCENARIO GENERATOR */}
                {mode === 'SCENARIO' && (
                    <div className="flex flex-col h-full p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Type de Génération</label>
                                <select 
                                    value={scenarioType}
                                    onChange={e => setScenarioType(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="CRISIS">🔥 Scénario de Crise</option>
                                    <option value="EMAIL">📧 Email Administratif (Finances)</option>
                                    <option value="BRIEF">🎲 Contrainte Surprise (Wildcard)</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Agence Cible</label>
                                <select 
                                    value={targetAgencyId}
                                    onChange={e => setTargetAgencyId(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {agencies.filter(a => a.id !== 'unassigned').map(a => (
                                        <option key={a.id} value={a.id}>{a.name} (VE: {a.ve_current} | Cash: {a.budget_real})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button 
                            onClick={handleGenerateScenario}
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 mb-6"
                        >
                            {loading ? <RefreshCw className="animate-spin"/> : <Sparkles/>}
                            Générer le contenu
                        </button>

                        <div className="flex-1 bg-slate-900 rounded-2xl p-6 relative overflow-y-auto font-mono text-sm text-slate-300 shadow-inner">
                            {response ? (
                                <>
                                    <button onClick={copyToClipboard} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors" title="Copier">
                                        <Copy size={16}/>
                                    </button>
                                    <div className="whitespace-pre-wrap">{response}</div>
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-30">
                                    <Terminal size={48} className="mb-4"/>
                                    <p>En attente de génération...</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* MODE: PROFILER */}
                {mode === 'PROFILE' && (
                    <div className="flex flex-col h-full p-6">
                        <div className="flex gap-4 mb-6">
                            <div className="relative flex-1">
                                <User className="absolute left-3 top-3.5 text-slate-400" size={20}/>
                                <input 
                                    type="text" 
                                    value={targetStudentName}
                                    onChange={e => setTargetStudentName(e.target.value)}
                                    placeholder="Nom de l'étudiant..."
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                />
                            </div>
                            <button 
                                onClick={handleAnalyzeProfile}
                                disabled={loading || !targetStudentName}
                                className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? <RefreshCw className="animate-spin"/> : <Fingerprint/>}
                                Rentabilité
                            </button>
                        </div>

                        <div className="flex-1 bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 relative overflow-y-auto">
                            {response ? (
                                <div className="prose prose-slate max-w-none">
                                    <h3 className="flex items-center gap-2 text-indigo-600 font-bold mb-4">
                                        <Fingerprint/> Rapport Psychologique & Financier
                                    </h3>
                                    <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                                        {response}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                    <User size={48} className="mb-4"/>
                                    <p className="font-bold">Recherchez un profil pour lancer l'audit IA.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
