
import React, { useState, useRef, useEffect } from 'react';
import { Agency } from '../types';
import { askGroq } from '../services/groqService';
import { Sparkles, MessageSquare, Zap, Fingerprint, Send, Bot, Copy, RefreshCw, User, Terminal } from 'lucide-react';
import { useUI } from '../contexts/UIContext';

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

    // --- PREPARER LA DATA CONTEXTUELLE (VERSION LIGHT) ---
    const getContextData = () => {
        return agencies.filter(a => a.id !== 'unassigned').map(a => ({
            nom: a.name,
            classe: a.classId,
            ve: a.ve_current,
            tresorerie: a.budget_real,
            membres: a.members.map(m => `${m.name} (Score: ${m.individualScore})`),
            statut: a.status,
            projet: a.projectDef.problem
        }));
    };

    const handleChatSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!chatInput.trim()) return;

        const userMsg = chatInput;
        setChatInput("");
        setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const context = getContextData();
            const answer = await askGroq(
                userMsg, 
                context, 
                "Tu es l'Oracle du RNP Manager. Tu as accès à toutes les données. Réponds de manière précise, un peu cynique (style Corpo/Cyberpunk). Si on te demande des stats, calcule-les."
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
        
        let prompt = "";
        if (scenarioType === "CRISIS") prompt = `Génère un scénario de crise narrative pour l'agence "${targetAgency?.name}". Le scénario doit être lié à leur projet "${targetAgency?.projectDef.problem}". Propose un titre, une description dramatique, et un impact suggéré sur la VE et le Budget.`;
        if (scenarioType === "EMAIL") prompt = `Rédige un email formel et intimidant de la part de l'Administration à l'agence "${targetAgency?.name}" concernant leur performance actuelle (VE: ${targetAgency?.ve_current}, Budget: ${targetAgency?.budget_real}).`;
        if (scenarioType === "BRIEF") prompt = `Invente une contrainte technique surprise ("Wildcard") pour le prochain rendu de l'agence "${targetAgency?.name}", qui soit ironique par rapport à leur style "${targetAgency?.constraints.style}".`;

        try {
            const result = await askGroq(prompt, { agency: targetAgency }, "Tu es un Maître du Jeu sadique mais juste.");
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
        for (const a of agencies) {
            const s = a.members.find(m => m.name.toLowerCase().includes(targetStudentName.toLowerCase()));
            if (s) {
                studentData = { ...s, agencyName: a.name, agencyStatus: a.status };
                break;
            }
        }

        if (!studentData) {
            setResponse("Étudiant introuvable.");
            setLoading(false);
            return;
        }

        const prompt = `Analyse le profil de l'étudiant ${studentData.name}. 
        Données : Score ${studentData.individualScore}/100, Rôle ${studentData.role}, Agence ${studentData.agencyName} (${studentData.agencyStatus}).
        Donne un avis psychologique sur sa performance, ses forces probables et ses risques de décrochage. Sois perspicace.`;

        try {
            const result = await askGroq(prompt, studentData, "Tu es un psychologue du travail et DRH expert.");
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
                    <p className="text-slate-500 text-sm mt-1">Générez du contenu, analysez des profils et interrogez vos données en langage naturel.</p>
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
                                    <p className="text-lg font-bold">Posez une question sur vos données.</p>
                                    <p className="text-sm">"Quelle est l'agence la plus riche ?"</p>
                                    <p className="text-sm">"Qui risque la faillite cette semaine ?"</p>
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
                                placeholder="Interrogez le système..."
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
                                    <option value="EMAIL">📧 Email Administratif</option>
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
                                        <option key={a.id} value={a.id}>{a.name} (VE: {a.ve_current})</option>
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
                                Analyser
                            </button>
                        </div>

                        <div className="flex-1 bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 relative overflow-y-auto">
                            {response ? (
                                <div className="prose prose-slate max-w-none">
                                    <h3 className="flex items-center gap-2 text-indigo-600 font-bold mb-4">
                                        <Fingerprint/> Rapport Psychologique & Performance
                                    </h3>
                                    <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                                        {response}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                    <User size={48} className="mb-4"/>
                                    <p className="font-bold">Recherchez un profil pour lancer l'analyse IA.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
