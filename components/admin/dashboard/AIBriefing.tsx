
import React, { useState } from 'react';
import { Agency, AIInsight } from '../../../types';
import { analyzeAgenciesWithGroq } from '../../../services/groqService';
import { Sparkles, AlertTriangle, TrendingUp, Zap, RefreshCw, Lock, KeyRound } from 'lucide-react';
import { useUI } from '../../../contexts/UIContext';

interface AIBriefingProps {
    agencies: Agency[];
    onApplyAction: (insight: AIInsight) => void;
}

export const AIBriefing: React.FC<AIBriefingProps> = ({ agencies, onApplyAction }) => {
    const { toast } = useUI();
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [loading, setLoading] = useState(false);
    const [apiKey, setApiKey] = useState(localStorage.getItem('GROQ_API_KEY') || '');
    const [showKeyInput, setShowKeyInput] = useState(!localStorage.getItem('GROQ_API_KEY'));

    const handleSaveKey = () => {
        if(apiKey.startsWith('gsk_')) {
            localStorage.setItem('GROQ_API_KEY', apiKey);
            setShowKeyInput(false);
            toast('success', 'Clé API enregistrée localement');
        } else {
            toast('error', 'Format de clé invalide (doit commencer par gsk_)');
        }
    };

    const runAnalysis = async () => {
        if (!apiKey) {
            setShowKeyInput(true);
            return;
        }
        
        setLoading(true);
        try {
            const results = await analyzeAgenciesWithGroq(agencies, apiKey);
            setInsights(results);
            if(results.length > 0) toast('success', 'Analyse IA terminée');
            else toast('info', 'Aucun signal détecté pour le moment');
        } catch (error) {
            toast('error', 'Erreur IA. Vérifiez la clé API.');
            setShowKeyInput(true);
        } finally {
            setLoading(false);
        }
    };

    if (showKeyInput) {
        return (
            <div className="bg-slate-900 text-white rounded-3xl p-6 mb-8 border border-indigo-500/30 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <h3 className="text-xl font-display font-bold flex items-center gap-2">
                        <Sparkles className="text-yellow-400" /> Morning Briefing (IA)
                    </h3>
                </div>
                <div className="relative z-10 max-w-md">
                    <p className="text-slate-400 text-sm mb-4">Pour activer l'analyste virtuel, entrez votre clé API Groq (gratuite).</p>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <KeyRound size={16} className="absolute left-3 top-3 text-slate-500"/>
                            <input 
                                type="password" 
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="gsk_..."
                                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <button onClick={handleSaveKey} className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl font-bold text-sm transition-colors">
                            Activer
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 italic">La clé est stockée uniquement dans votre navigateur.</p>
                </div>
                {/* Decoration */}
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                    <Sparkles size={200} />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 mb-8 border border-indigo-500/30 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-700">
            {/* Background Mesh */}
            <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '30px 30px'}}></div>
            
            <div className="relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h3 className="text-2xl font-display font-bold flex items-center gap-2">
                            <Sparkles className="text-yellow-400 animate-pulse" /> Morning Briefing
                        </h3>
                        <p className="text-slate-400 text-sm">Votre analyste IA a scanné les {agencies.length} agences.</p>
                    </div>
                    
                    <div className="flex gap-2">
                        <button 
                            onClick={runAnalysis}
                            disabled={loading}
                            className="bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {loading ? <RefreshCw className="animate-spin" size={16}/> : <Zap size={16} className="text-yellow-400"/>}
                            {loading ? 'Analyse en cours...' : 'Lancer l\'Audit IA'}
                        </button>
                        <button onClick={() => setShowKeyInput(true)} className="p-2 text-slate-500 hover:text-white transition-colors" title="Changer Clé API"><KeyRound size={16}/></button>
                    </div>
                </div>

                {loading ? (
                    <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-3">
                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="animate-pulse text-sm">Analyse des bilans financiers et signaux faibles...</p>
                    </div>
                ) : insights.length === 0 ? (
                    <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-700 rounded-2xl bg-white/5">
                        <p className="text-slate-400 text-sm">Cliquez sur "Lancer l'Audit" pour générer les recommandations.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {insights.map((insight) => (
                            <div 
                                key={insight.id} 
                                className={`p-5 rounded-2xl border backdrop-blur-sm transition-all hover:scale-[1.02] flex flex-col ${
                                    insight.type === 'URGENT' ? 'bg-red-500/10 border-red-500/50 hover:bg-red-500/20' : 
                                    insight.type === 'WARNING' ? 'bg-amber-500/10 border-amber-500/50 hover:bg-amber-500/20' : 
                                    'bg-emerald-500/10 border-emerald-500/50 hover:bg-emerald-500/20'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    {insight.type === 'URGENT' && <AlertTriangle className="text-red-400" size={20} />}
                                    {insight.type === 'WARNING' && <Lock className="text-amber-400" size={20} />}
                                    {insight.type === 'OPPORTUNITY' && <TrendingUp className="text-emerald-400" size={20} />}
                                    
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                                        insight.type === 'URGENT' ? 'bg-red-500 text-white' : 
                                        insight.type === 'WARNING' ? 'bg-amber-500 text-black' : 
                                        'bg-emerald-500 text-white'
                                    }`}>{insight.type}</span>
                                </div>
                                
                                <h4 className="font-bold text-lg leading-tight mb-2">{insight.title}</h4>
                                <p className="text-sm text-slate-300 mb-4 flex-1">{insight.analysis}</p>
                                
                                <button 
                                    onClick={() => onApplyAction(insight)}
                                    className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors ${
                                        insight.type === 'URGENT' ? 'bg-red-600 hover:bg-red-500 text-white' : 
                                        insight.type === 'WARNING' ? 'bg-amber-500 hover:bg-amber-400 text-black' : 
                                        'bg-emerald-600 hover:bg-emerald-500 text-white'
                                    }`}
                                >
                                    {insight.suggestedAction.label}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
