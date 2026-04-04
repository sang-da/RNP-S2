import React, { useState, useEffect } from 'react';
import { Agency, Student } from '../../../types';
import { ClipboardCheck, Settings, Play, BrainCircuit, Download, Trophy, AlertTriangle } from 'lucide-react';
import { useUI } from '../../../contexts/UIContext';
import { evaluateAgencyWithGroq } from '../../../services/groqService';
import referentialRaw from '../../../documentation/REFERENTIAL.md?raw';

interface AdminEvaluationProps {
    agencies: Agency[];
}

interface EvalWeights {
    veWeight: number;
    budgetWeight: number;
    individualScoreWeight: number;
    aiEvaluationWeight: number;
}

interface StudentEvalResult {
    studentId: string;
    studentName: string;
    agencyName: string;
    veScore: number;
    budgetScore: number;
    individualScore: number;
    aiScore: number;
    finalScore: number;
    aiFeedback: string;
}

export const AdminEvaluation: React.FC<AdminEvaluationProps> = ({ agencies }) => {
    const { toast } = useUI();
    const [weights, setWeights] = useState<EvalWeights>({
        veWeight: 40,
        budgetWeight: 20,
        individualScoreWeight: 20,
        aiEvaluationWeight: 20
    });
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [results, setResults] = useState<StudentEvalResult[]>([]);
    const [referentialRules, setReferentialRules] = useState<string>(referentialRaw || 'Évaluez la pertinence du projet, la gestion financière et la cohésion d\'équipe.');

    const handleWeightChange = (key: keyof EvalWeights, value: number) => {
        setWeights(prev => ({ ...prev, [key]: value }));
    };

    const totalWeight = weights.veWeight + weights.budgetWeight + weights.individualScoreWeight + weights.aiEvaluationWeight;

    const runEvaluation = async () => {
        if (totalWeight !== 100) {
            toast({
                title: "Erreur de paramétrage",
                description: "La somme des pondérations doit être égale à 100%.",
                type: "error"
            });
            return;
        }

        setIsEvaluating(true);
        toast({
            title: "Évaluation en cours",
            description: "Calcul des scores et analyse IA en cours...",
            type: "info"
        });

        try {
            const newResults: StudentEvalResult[] = [];

            // Find max values for normalization
            const maxVE = Math.max(...agencies.map(a => a.ve), 1);
            const maxBudget = Math.max(...agencies.map(a => a.budget), 1);
            const maxIndivScore = Math.max(...agencies.flatMap(a => a.members.map(m => m.individualScore)), 1);

            for (const agency of agencies) {
                if (agency.id === 'unassigned') continue;

                // AI Evaluation for the agency
                let aiScore = 50;
                let aiFeedback = "Évaluation IA non disponible.";

                if (weights.aiEvaluationWeight > 0) {
                    try {
                        const aiResult = await evaluateAgencyWithGroq(agency, referentialRules);
                        aiScore = aiResult.score || 50;
                        aiFeedback = aiResult.feedback || "Évaluation complétée.";
                    } catch (error) {
                        console.error("Erreur IA pour l'agence", agency.name, error);
                        aiFeedback = "Erreur lors de l'évaluation IA.";
                    }
                }

                // Calculate scores for each member
                for (const student of agency.members) {
                    const normalizedVE = (agency.ve / maxVE) * 100;
                    const normalizedBudget = (agency.budget / maxBudget) * 100;
                    const normalizedIndiv = (student.individualScore / maxIndivScore) * 100;

                    const finalScore = (
                        (normalizedVE * (weights.veWeight / 100)) +
                        (normalizedBudget * (weights.budgetWeight / 100)) +
                        (normalizedIndiv * (weights.individualScoreWeight / 100)) +
                        (aiScore * (weights.aiEvaluationWeight / 100))
                    );

                    newResults.push({
                        studentId: student.id,
                        studentName: student.name,
                        agencyName: agency.name,
                        veScore: normalizedVE,
                        budgetScore: normalizedBudget,
                        individualScore: normalizedIndiv,
                        aiScore: aiScore,
                        finalScore: finalScore,
                        aiFeedback: aiFeedback
                    });
                }
            }

            // Sort by final score descending
            newResults.sort((a, b) => b.finalScore - a.finalScore);
            setResults(newResults);

            toast({
                title: "Évaluation terminée",
                description: "Les résultats finaux ont été générés avec succès.",
                type: "success"
            });

        } catch (error) {
            console.error("Erreur lors de l'évaluation", error);
            toast({
                title: "Erreur",
                description: "Une erreur est survenue lors de l'évaluation.",
                type: "error"
            });
        } finally {
            setIsEvaluating(false);
        }
    };

    const exportToCSV = () => {
        if (results.length === 0) return;

        const headers = ['Rang', 'Étudiant', 'Agence', 'Score VE', 'Score Budget', 'Score Indiv.', 'Score IA', 'Score Final', 'Feedback IA'];
        const csvContent = [
            headers.join(','),
            ...results.map((r, i) => [
                i + 1,
                `"${r.studentName}"`,
                `"${r.agencyName}"`,
                r.veScore.toFixed(2),
                r.budgetScore.toFixed(2),
                r.individualScore.toFixed(2),
                r.aiScore.toFixed(2),
                r.finalScore.toFixed(2),
                `"${r.aiFeedback.replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('url');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `evaluation_finale_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
                        <ClipboardCheck className="text-indigo-600" />
                        Évaluation Finale
                    </h1>
                    <p className="text-slate-500">Paramétrez et lancez l'évaluation finale basée sur votre référentiel.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <Settings size={20} className="text-slate-500" />
                            Pondérations (%)
                        </h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Valeur d'Entreprise (VE)</label>
                                <input 
                                    type="number" 
                                    min="0" max="100"
                                    value={weights.veWeight}
                                    onChange={(e) => handleWeightChange('veWeight', parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Richesse (Budget)</label>
                                <input 
                                    type="number" 
                                    min="0" max="100"
                                    value={weights.budgetWeight}
                                    onChange={(e) => handleWeightChange('budgetWeight', parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Score Individuel</label>
                                <input 
                                    type="number" 
                                    min="0" max="100"
                                    value={weights.individualScoreWeight}
                                    onChange={(e) => handleWeightChange('individualScoreWeight', parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                    <BrainCircuit size={16} className="text-purple-500" />
                                    Évaluation IA
                                </label>
                                <input 
                                    type="number" 
                                    min="0" max="100"
                                    value={weights.aiEvaluationWeight}
                                    onChange={(e) => handleWeightChange('aiEvaluationWeight', parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            
                            <div className={`p-3 rounded-lg flex items-center justify-between font-bold ${totalWeight === 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                <span>Total</span>
                                <span>{totalWeight}%</span>
                            </div>
                            {totalWeight !== 100 && (
                                <p className="text-xs text-red-600 flex items-center gap-1">
                                    <AlertTriangle size={12} /> Le total doit être de 100%
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Règles du Référentiel</h2>
                        <textarea
                            value={referentialRules}
                            onChange={(e) => setReferentialRules(e.target.value)}
                            className="w-full h-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                            placeholder="Collez ici les règles de votre referential.md..."
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            Ces règles seront utilisées par l'IA pour évaluer les agences si la pondération IA est &gt; 0.
                        </p>
                    </div>

                    <button
                        onClick={runEvaluation}
                        disabled={isEvaluating || totalWeight !== 100}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        {isEvaluating ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <Play size={20} />
                        )}
                        Lancer l'Évaluation
                    </button>
                </div>

                {/* Results Panel */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 min-h-[600px]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Trophy size={20} className="text-amber-500" />
                                Résultats Finaux
                            </h2>
                            {results.length > 0 && (
                                <button 
                                    onClick={exportToCSV}
                                    className="text-sm text-indigo-600 font-medium flex items-center gap-1 hover:text-indigo-800"
                                >
                                    <Download size={16} /> Exporter CSV
                                </button>
                            )}
                        </div>

                        {results.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                                <ClipboardCheck size={48} className="mb-4 opacity-20" />
                                <p>Aucun résultat. Lancez l'évaluation pour voir le classement.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-sm text-slate-500">
                                            <th className="pb-3 font-medium">Rang</th>
                                            <th className="pb-3 font-medium">Étudiant</th>
                                            <th className="pb-3 font-medium">Agence</th>
                                            <th className="pb-3 font-medium text-right">Score Final</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {results.map((result, index) => (
                                            <tr key={result.studentId} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                                        index === 0 ? 'bg-amber-100 text-amber-700' :
                                                        index === 1 ? 'bg-slate-200 text-slate-700' :
                                                        index === 2 ? 'bg-orange-100 text-orange-800' :
                                                        'bg-slate-50 text-slate-500'
                                                    }`}>
                                                        {index + 1}
                                                    </div>
                                                </td>
                                                <td className="py-3 font-medium text-slate-900">{result.studentName}</td>
                                                <td className="py-3 text-slate-500 text-sm">{result.agencyName}</td>
                                                <td className="py-3 text-right">
                                                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold">
                                                        {result.finalScore.toFixed(1)} / 100
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
