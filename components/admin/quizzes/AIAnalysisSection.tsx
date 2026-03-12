import React, { useState } from 'react';
import { Quiz, QuizAttempt } from '../../../types';
import { Brain, Sparkles, AlertCircle, CheckCircle, TrendingUp, BarChart2 } from 'lucide-react';
import { analyzeQuizResults, QuizAnalysisResult } from '../../../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface AIAnalysisSectionProps {
    quiz: Quiz;
    attempts: QuizAttempt[];
}

export const AIAnalysisSection: React.FC<AIAnalysisSectionProps> = ({ quiz, attempts }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<QuizAnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        if (attempts.length === 0) return;
        
        setIsAnalyzing(true);
        setError(null);
        
        try {
            // Prepare data for AI
            const dataToAnalyze = attempts.map(attempt => {
                const answers: any = {};
                
                // Inclure le score si c'est un quiz noté
                if (quiz.type === 'QUIZ') {
                    answers['Score global'] = `${attempt.score} / ${attempt.maxScore}`;
                }

                quiz.questions.forEach(q => {
                    // 1. Réponses standards (choix, texte, notes)
                    const ans = attempt.answers?.[q.id];
                    if (ans !== undefined) {
                        if (q.type === 'choice') {
                            answers[q.text] = q.options?.[ans as number] || ans;
                        } else {
                            answers[q.text] = ans;
                        }
                    }
                    
                    // 2. Transcriptions audio (très important pour l'analyse qualitative)
                    const transcription = attempt.transcriptions?.[q.id];
                    if (transcription) {
                        answers[q.text] = (answers[q.text] ? answers[q.text] + " | Audio: " : "") + transcription;
                    }
                });
                return answers;
            });

            const result = await analyzeQuizResults(quiz.title, quiz.description || '', dataToAnalyze);
            
            if (result) {
                setAnalysisResult(result);
            } else {
                setError("L'analyse a échoué. Veuillez réessayer.");
            }
        } catch (err) {
            console.error(err);
            setError("Une erreur est survenue lors de l'analyse.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Prepare chart data
    const renderCharts = () => {
        return quiz.questions.map((q, idx) => {
            if (q.type === 'choice' && q.options) {
                // Count frequencies
                const counts: Record<string, number> = {};
                q.options.forEach(opt => counts[opt] = 0);
                
                attempts.forEach(a => {
                    const ansIdx = a.answers?.[q.id] as number;
                    if (ansIdx !== undefined && q.options?.[ansIdx]) {
                        counts[q.options[ansIdx]]++;
                    }
                });

                const chartData = Object.entries(counts).map(([name, count]) => ({ name, count }));

                return (
                    <div key={q.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
                        <h4 className="font-bold text-slate-800 mb-4 text-sm">Q{idx + 1}. {q.text}</h4>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" allowDecimals={false} />
                                    <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12}} />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                );
            }

            if (q.type === 'rating') {
                if (q.ratingCriteria && q.ratingCriteria.length > 0) {
                    // Radar chart for criteria
                    const criteriaSums: Record<string, number> = {};
                    const criteriaCounts: Record<string, number> = {};
                    
                    q.ratingCriteria.forEach(c => {
                        criteriaSums[c] = 0;
                        criteriaCounts[c] = 0;
                    });

                    attempts.forEach(a => {
                        const ans = a.answers?.[q.id] as Record<string, number>;
                        if (ans && typeof ans === 'object') {
                            Object.entries(ans).forEach(([crit, val]) => {
                                if (criteriaSums[crit] !== undefined) {
                                    criteriaSums[crit] += val;
                                    criteriaCounts[crit]++;
                                }
                            });
                        }
                    });

                    const chartData = q.ratingCriteria.map(c => ({
                        subject: c,
                        A: criteriaCounts[c] > 0 ? (criteriaSums[c] / criteriaCounts[c]).toFixed(1) : 0,
                        fullMark: 5,
                    }));

                    return (
                        <div key={q.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
                            <h4 className="font-bold text-slate-800 mb-4 text-sm">Q{idx + 1}. {q.text}</h4>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="subject" tick={{fontSize: 12}} />
                                        <PolarRadiusAxis angle={30} domain={[0, 5]} />
                                        <Radar name="Moyenne" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                                        <Tooltip />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    );
                } else {
                    // Simple average rating
                    let sum = 0;
                    let count = 0;
                    attempts.forEach(a => {
                        const ans = a.answers?.[q.id] as number;
                        if (ans !== undefined && typeof ans === 'number') {
                            sum += ans;
                            count++;
                        }
                    });
                    const avg = count > 0 ? (sum / count).toFixed(1) : 0;

                    return (
                        <div key={q.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4 flex items-center justify-between">
                            <h4 className="font-bold text-slate-800 text-sm">Q{idx + 1}. {q.text}</h4>
                            <div className="text-2xl font-black text-amber-500 flex items-center gap-2">
                                {avg} <span className="text-sm text-slate-400">/ 5</span>
                            </div>
                        </div>
                    );
                }
            }

            return null;
        });
    };

    if (attempts.length === 0) return null;

    return (
        <div className="mb-8 space-y-6">
            <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <div>
                    <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                        <Brain className="text-indigo-600" />
                        Analyse & Visualisation
                    </h3>
                    <p className="text-sm text-indigo-700 mt-1">
                        Générez un résumé intelligent des réponses et visualisez les tendances.
                    </p>
                </div>
                <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50 transition-colors"
                >
                    {isAnalyzing ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Analyse en cours...</>
                    ) : (
                        <><Sparkles size={16}/> Générer l'Analyse IA</>
                    )}
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-2 text-sm font-medium">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* Data Visualization Section */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <BarChart2 size={20} className="text-slate-500" />
                    Visualisation des données
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderCharts()}
                </div>
            </div>

            {/* AI Analysis Results */}
            {analysisResult && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-900 p-6 text-white">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Sparkles className="text-amber-400" />
                                    Synthèse IA
                                </h3>
                                <p className="text-slate-400 text-sm mt-1">Basée sur {attempts.length} participations</p>
                            </div>
                            <div className="bg-white/10 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                                Sentiment: 
                                <span className={
                                    analysisResult.averageSentiment.toLowerCase().includes('positif') ? 'text-emerald-400' :
                                    analysisResult.averageSentiment.toLowerCase().includes('négatif') ? 'text-red-400' :
                                    'text-amber-400'
                                }>
                                    {analysisResult.averageSentiment}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6 space-y-6">
                        <div>
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Résumé Général</h4>
                            <p className="text-slate-700 leading-relaxed">{analysisResult.summary}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2 mb-3">
                                    <CheckCircle size={16} /> Points Positifs
                                </h4>
                                <ul className="space-y-2">
                                    {analysisResult.positivePoints.map((pt, i) => (
                                        <li key={i} className="text-sm text-emerald-700 flex items-start gap-2">
                                            <span className="text-emerald-400 mt-0.5">•</span> {pt}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                <h4 className="text-sm font-bold text-red-800 flex items-center gap-2 mb-3">
                                    <AlertCircle size={16} /> Points d'Attention
                                </h4>
                                <ul className="space-y-2">
                                    {analysisResult.negativePoints.map((pt, i) => (
                                        <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                                            <span className="text-red-400 mt-0.5">•</span> {pt}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                            <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2 mb-3">
                                <TrendingUp size={16} /> Plan d'Action / À retenir
                            </h4>
                            <ul className="space-y-2">
                                {analysisResult.actionPlan.map((pt, i) => (
                                    <li key={i} className="text-sm text-indigo-800 flex items-start gap-2">
                                        <span className="bg-indigo-200 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i+1}</span>
                                        {pt}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
