
import React, { useState, useRef, useEffect } from 'react';
import { Agency } from '../../../types';
import { askGroq, analyzeAgenciesWithGroq } from '../../../services/groqService';
import { RefreshCw, Send, Bot, BrainCircuit, Sparkles, Database } from 'lucide-react';
import { useUI } from '../../../contexts/UIContext';
import { GAME_RULES } from '../../../constants';
import Markdown from 'react-markdown';

export const AssistantChat: React.FC<{agencies: Agency[]}> = ({ agencies }) => {
    const { toast } = useUI();
    const [chatInput, setChatInput] = useState("");
    const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', content: string}[]>([]);
    const [loading, setLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

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
        setLoading(true);
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
            setLoading(false);
        }
    };

    const generateOpenScienceMemo = async () => {
        setLoading(true);
        try {
            // Aggregate Statistics
            const activeAgencies = agencies.filter(a => a.id !== 'unassigned');
            let totalStudents = 0;
            let totalDismissals = 0;
            let totalCrises = 0;
            let totalFinancialCharges = 0;
            let successfulAgencies = 0;
            let failedAgencies = 0;
            let minDate = new Date();
            let maxDate = new Date(0);

            activeAgencies.forEach(a => {
                totalStudents += a.members.length;
                a.members.forEach(m => {
                    totalDismissals += (m.history || []).filter(h => h.action === 'FIRED').length;
                });
                a.eventLog.forEach(e => {
                    if (e.type === 'CRISIS' || (e.deltaVE && e.deltaVE < 0)) totalCrises++;
                    if (e.deltaBudgetReal && e.deltaBudgetReal < 0) totalFinancialCharges += Math.abs(e.deltaBudgetReal);
                    const eDate = new Date(e.date);
                    if (eDate < minDate) minDate = eDate;
                    if (eDate > maxDate) maxDate = eDate;
                });
                
                if (a.ve_current >= 60 && !a.isBankrupt) successfulAgencies++;
                else if (a.ve_current < 40 || a.isBankrupt) failedAgencies++;
            });

            const statsPrompt = `
                Generate a comprehensive Open Science Research Memo based on the following gamification experiment dataset.
                
                Format: Professional Markdown Document.
                Language: French.
                Sections: 
                - Période & Population (Dates: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}, Students: ${totalStudents})
                - Dynamique Financière & Sociale (Crises: ${totalCrises}, Dismissals: ${totalDismissals}, Total Financial Charges: ${totalFinancialCharges} PiXi)
                - Réussite & Échec (Success: ${successfulAgencies}, Failures: ${failedAgencies}, Total Agencies: ${activeAgencies.length})
                - Analyse Pédagogique (Extrapolate what this indicates about peer-regulation, accountability, and the gamified format's success)
                
                Write it formally as an academic abstract/memo. Do not invent numbers, only use those provided.
            `;

            const answer = await askGroq(statsPrompt, [], "Tu es un chercheur en pédagogie rédigeant une note de synthèse Open Science.");
            
            // Add download functionality
            setChatHistory(prev => [...prev, { role: 'ai', content: answer + "\n\n*Memo généré avec succès. Vous pouvez maintenant l'exporter.*" }]);

            // Anonymize active agencies data for Open Science
            const anonymizedAgencies = activeAgencies.map(a => ({
                ...a,
                members: a.members.map(m => ({
                    ...m,
                    name: `Student_${m.id.substring(0,6)}`,
                    email: undefined,
                    avatar: undefined,
                }))
            }));

            // Export raw JSON dataset + Memo text to a download file
            const fullExport = {
                metadata: {
                    generatedAt: new Date().toISOString(),
                    type: "OPEN_SCIENCE_DATASET_AND_MEMO",
                    stats: {
                        duration: { start: minDate.toISOString(), end: maxDate.toISOString() },
                        students: totalStudents,
                        dismissals: totalDismissals,
                        crises: totalCrises,
                        totalFinancialCharges: totalFinancialCharges,
                        successCount: successfulAgencies,
                        failCount: failedAgencies
                    }
                },
                memo: answer,
                raw_agencies: anonymizedAgencies
            };

            // 1. Download JSON
            const jsonBlob = new Blob([JSON.stringify(fullExport, null, 2)], { type: 'application/json;charset=utf-8;' });
            const jsonUrl = URL.createObjectURL(jsonBlob);
            const jsonLink = document.createElement('a');
            jsonLink.href = jsonUrl;
            jsonLink.setAttribute('download', `RNP_OpenScience_Export_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(jsonLink);
            jsonLink.click();
            document.body.removeChild(jsonLink);

            // 2. Download Markdown Memo
            const mdBlob = new Blob([answer], { type: 'text/markdown;charset=utf-8;' });
            const mdUrl = URL.createObjectURL(mdBlob);
            const mdLink = document.createElement('a');
            mdLink.href = mdUrl;
            mdLink.setAttribute('download', `RNP_OpenScience_Memo_${new Date().toISOString().split('T')[0]}.md`);
            document.body.appendChild(mdLink);
            mdLink.click();
            document.body.removeChild(mdLink);

            toast('success', "Memo Open Science généré et données (JSON + MD) exportées.");

        } catch (error) {
            toast('error', "Erreur lors de la génération du Memo Open Science.");
        } finally {
            setLoading(false);
        }
    };

    const generateSociometricAudit = async () => {
        setLoading(true);
        try {
            const activeAgencies = agencies.filter(a => a.id !== 'unassigned');
            let totalP2PTransfers = 0;
            let totalPhantomMarketTxs = 0;
            let totalFired = 0;
            let totalResigned = 0;
            let totalTransfers = 0;
            let totalJuryEvents = 0;
            let minDate = new Date();
            let maxDate = new Date(0);

            activeAgencies.forEach(a => {
                a.members.forEach(m => {
                    const history = m.history || [];
                    totalFired += history.filter(h => h.action === 'FIRED').length;
                    totalResigned += history.filter(h => h.action === 'RESIGNED').length;
                    totalTransfers += history.filter(h => h.action === 'TRANSFER').length;
                });
                
                a.eventLog.forEach(e => {
                    if (e.description.includes(' -> ') && e.description.includes('PiXi')) totalP2PTransfers++;
                    if (e.type === 'BLACK_OP' || e.description.includes('Achat de :') || e.description.includes('Enchère')) totalPhantomMarketTxs++;
                    if (e.type === 'JURY' || e.label.includes('Jury')) totalJuryEvents++;
                    
                    const eDate = new Date(e.date);
                    if (eDate < minDate) minDate = eDate;
                    if (eDate > maxDate) maxDate = eDate;
                });
            });

            const prompt = `
                Generate a Sociometric & Behavioral Audit Memo based on the following gamification experiment dataset.
                
                Format: Professional Markdown Document.
                Language: French.
                Sections: 
                - Dynamique de l'Emploi (Fired: ${totalFired}, Resigned: ${totalResigned}, Transfers/Poaching: ${totalTransfers})
                - Économie Souterraine & Espace Fantôme (Transactions Black Market / Backdoor: ${totalPhantomMarketTxs}, P2P Transfers: ${totalP2PTransfers})
                - Intervention Externe (Actions Jury: ${totalJuryEvents})
                - Analyse des Interactions Sociales (Analyze what these numbers tell us about the cohort's trust, collaboration, and propensity for shadow-economy hacking vs regular agency work)
                
                Write it formally as an academic abstract/memo. Do not invent numbers, only use those provided.
            `;

            const answer = await askGroq(prompt, [], "Tu es un chercheur en sociologie des groupes et pédagogie rédigeant une note de synthèse sociométrique.");
            
            setChatHistory(prev => [...prev, { role: 'ai', content: answer + "\n\n*Audit sociométrique généré avec succès. Exportation en cours...*" }]);

            const exportData = {
                metadata: {
                    generatedAt: new Date().toISOString(),
                    type: "SOCIOMETRIC_AUDIT_DATASET_AND_MEMO",
                    stats: {
                        duration: { start: minDate.toISOString(), end: maxDate.toISOString() },
                        p2pTransfers: totalP2PTransfers,
                        phantomTransactions: totalPhantomMarketTxs,
                        fired: totalFired,
                        resigned: totalResigned,
                        transfers: totalTransfers,
                        juryEvents: totalJuryEvents
                    }
                },
                memo: answer
            };

            const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8;' });
            const jsonUrl = URL.createObjectURL(jsonBlob);
            const jsonLink = document.createElement('a');
            jsonLink.href = jsonUrl;
            jsonLink.setAttribute('download', `RNP_Sociometric_Export_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(jsonLink);
            jsonLink.click();
            document.body.removeChild(jsonLink);

            const mdBlob = new Blob([answer], { type: 'text/markdown;charset=utf-8;' });
            const mdUrl = URL.createObjectURL(mdBlob);
            const mdLink = document.createElement('a');
            mdLink.href = mdUrl;
            mdLink.setAttribute('download', `RNP_Sociometric_Memo_${new Date().toISOString().split('T')[0]}.md`);
            document.body.appendChild(mdLink);
            mdLink.click();
            document.body.removeChild(mdLink);

            toast('success', "Audit sociométrique généré et exporté (JSON + MD).");

        } catch (error) {
            toast('error', "Erreur lors de la génération de l'audit sociométrique.");
        } finally {
            setLoading(false);
        }
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
                Tu es le Game Master et Directeur Stratégique du RNP. Tu as accès aux données financières et aux projets.
                Si on te demande de rédiger un événement (crise, challenge, bonus), rédige un texte immersif et court (max 280 caractères) destiné aux étudiants, en précisant les impacts (ex: -500 PiXi, -10 VE).
            `;
            const answer = await askGroq(userMsg, context, systemPrompt, chatHistory);
            setChatHistory(prev => [...prev, { role: 'ai', content: answer }]);
        } catch (error) {
            toast('error', "Erreur IA.");
        } finally {
            setLoading(false);
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
