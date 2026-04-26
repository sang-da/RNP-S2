
import React, { useState, useRef, useEffect } from 'react';
import { Agency } from '../../../types';
import { askGroq, analyzeAgenciesWithGroq } from '../../../services/groqService';
import { RefreshCw, Send, Bot, BrainCircuit, Sparkles, Database } from 'lucide-react';
import { useUI } from '../../../contexts/UIContext';
import { GAME_RULES } from '../../../constants';
import Markdown from 'react-markdown';
import { useOpenScienceAnalysis } from './useOpenScienceAnalysis';
import { useSociometricAudit } from './useSociometricAudit';
import { generateGMPrompt } from '../../../prompts/gmPrompt';

export const AssistantChat: React.FC<{agencies: Agency[]}> = ({ agencies }) => {
    const { toast } = useUI();
    const [chatInput, setChatInput] = useState("");
    const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', content: string}[]>([]);
    const [isThinking, setIsThinking] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const { generateMemo: generateOpenScienceMemo, loading: loadingOS } = useOpenScienceAnalysis(agencies, setChatHistory);
    const { generateAudit: generateSociometricAudit, loading: loadingSM } = useSociometricAudit(agencies, setChatHistory);

    const loading = isThinking || loadingOS || loadingSM;

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory, loading]);

    const getRichContextData = () => {
        return agencies.filter(a => a.id !== 'unassigned').map(a => {
            const memberCount = a.members.length;
            const totalScore = a.members.reduce((sum, m) => sum + m.individualScore, 0);
            const weeklyPayroll = totalScore * GAME_RULES.SALARY_MULTIPLIER;
            const netFlow = ((a.ve_current * 30) + (a.weeklyRevenueModifier || 0)) - (weeklyPayroll + 500);

            return {
                name: a.name,
                metrics: { ve: a.ve_current, cash: a.budget_real, burn_rate: netFlow, members_count: memberCount },
                project: {
                    theme: a.projectDef.theme || "Non défini",
                    problem: a.projectDef.problem || "Non défini",
                },
                recent_events: a.eventLog.slice(-10).map(e => {
                    const impacts = [];
                    if (e.deltaVE) impacts.push(`${e.deltaVE > 0 ? '+' : ''}${e.deltaVE} VE`);
                    if (e.deltaBudgetReal) impacts.push(`${e.deltaBudgetReal > 0 ? '+' : ''}${e.deltaBudgetReal} PiXi`);
                    const impactStr = impacts.length > 0 ? ` (Impact: ${impacts.join(', ')})` : '';
                    return `${e.date.split('T')[0]} - ${e.type}: ${e.label}${impactStr}`;
                }),
                members: a.members.map(m => ({
                    name: m.name,
                    history: m.history?.slice(-3).map(h => `${h.date}: ${h.action} (${h.agencyName})`) || [],
                    notes: m.notes?.slice(-3).map(n => `${n.date}: [${n.type}] ${n.content}`) || []
                }))
            };
        });
    };

    const handleRunGMAudit = async () => {
        setIsThinking(true);
        try {
            const insights = await analyzeAgenciesWithGroq(agencies);
            
            let message = "### 🎲 Rapport du Game Master\n\n";
            if (insights.length === 0) {
                message += "Aucune intervention nécessaire. Les agences sont stables.";
            } else {
                insights.forEach(insight => {
                    message += `**[${insight.type}] ${insight.title}**\n`;
                    message += `*Cible : ${agencies.find(a => a.id === insight.targetAgencyId)?.name || 'Inconnue'}*\n`;
                    message += `> ${insight.analysis}\n`;
                    if (insight.suggestedAction) {
                        message += `👉 **Action suggérée :** ${insight.suggestedAction.label} (${insight.suggestedAction.actionType})\n`;
                    }
                    message += `\n---\n\n`;
                });
                message += "Voulez-vous que je rédige l'un de ces événements en détail pour l'envoyer aux étudiants ?";
            }
            
            setChatHistory(prev => [...prev, { role: 'ai', content: message }]);
        } catch (error) {
            toast('error', "Erreur lors de l'audit GM.");
        } finally {
            setIsThinking(false);
        }
    };

    const handleChatSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!chatInput.trim()) return;

        const userMsg = chatInput;
        setChatInput("");
        setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsThinking(true);

        try {
            const context = getRichContextData();
            const systemPrompt = generateGMPrompt();
            const answer = await askGroq(userMsg, context, systemPrompt, chatHistory);
            setChatHistory(prev => [...prev, { role: 'ai', content: answer }]);
        } catch (error) {
            toast('error', "Erreur IA.");
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-600">Discussion avec l'Assistant</span>
                <div className="flex gap-2">
                    <button 
                        onClick={generateSociometricAudit}
                        disabled={loading}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <Database size={16} /> Audit Sociométrique
                    </button>
                    <button 
                        onClick={generateOpenScienceMemo}
                        disabled={loading}
                        className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <Database size={16} /> Mémo Open Science
                    </button>
                    <button 
                        onClick={handleRunGMAudit}
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <Sparkles size={16} /> Lancer l'Audit Game Master
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 custom-scrollbar">
                {chatHistory.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                        <BrainCircuit size={64} className="mb-4 text-indigo-200"/>
                        <p className="text-lg font-bold text-slate-500">Posez une question stratégique.</p>
                        <p className="text-sm">"Quel projet est le plus risqué ?"</p>
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
                            {msg.role === 'ai' ? (
                                <div className="markdown-body">
                                    <Markdown>{msg.content}</Markdown>
                                </div>
                            ) : (
                                <div className="whitespace-pre-wrap">{msg.content}</div>
                            )}
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
    );
};
