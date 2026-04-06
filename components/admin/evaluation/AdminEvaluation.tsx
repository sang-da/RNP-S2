import React, { useState, useEffect } from 'react';
import { Agency, Student, CriterionEval, StudentEvaluation } from '../../../types';
import { ClipboardCheck, Play, Download, Trophy, ChevronDown, ChevronUp, User, Users, Edit2, Check, Settings, Save, BrainCircuit, Calculator, Copy } from 'lucide-react';
import { useUI } from '../../../contexts/UIContext';
import { evaluateAgencyAndMembersWithGroq } from '../../../services/groqService';
import referentialRaw from '../../../documentation/REFERENTIAL.md?raw';

interface AdminEvaluationProps {
    agencies: Agency[];
    onUpdateAgency?: (agency: Agency) => void;
}

interface StudentEvalResult {
    studentId: string;
    studentName: string;
    agencyId: string;
    agencyName: string;
    groupEvaluation: CriterionEval[];
    individualEvaluation: CriterionEval[];
    // Algo stats
    veScore: number;
    budgetScore: number;
    baseIndividualScore: number;
    peerReviewScore: number;
}

export const AdminEvaluation: React.FC<AdminEvaluationProps> = ({ agencies, onUpdateAgency }) => {
    const { toast, confirm } = useUI();
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [results, setResults] = useState<StudentEvalResult[]>([]);
    const [referentialRules, setReferentialRules] = useState<string>(referentialRaw || 'Évaluez la pertinence du projet, la gestion financière et la cohésion d\'équipe.');
    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
    const [editingScore, setEditingScore] = useState<{ studentId: string, type: 'group' | 'individual', criterionId: string } | null>(null);
    const [editValue, setEditValue] = useState<string>("");
    const [showSettings, setShowSettings] = useState(false);
    const [selectedAgencyId, setSelectedAgencyId] = useState<string>('ALL');

    // Ponderations
    const [weights, setWeights] = useState({
        group: {
            ve: 20,
            budget: 10,
            ai: 70
        },
        individual: {
            baseScore: 30,
            peerReviews: 20,
            ai: 50
        }
    });

    // Load existing evaluations from agencies
    useEffect(() => {
        const loadedResults: StudentEvalResult[] = [];
        agencies.forEach(agency => {
            if (agency.id === 'unassigned') return;
            agency.members.forEach(student => {
                if (student.evaluation) {
                    loadedResults.push({
                        studentId: student.id,
                        studentName: student.name,
                        agencyId: agency.id,
                        agencyName: agency.name,
                        groupEvaluation: student.evaluation.groupEvaluation,
                        individualEvaluation: student.evaluation.individualEvaluation,
                        veScore: student.evaluation.veScore,
                        budgetScore: student.evaluation.budgetScore,
                        baseIndividualScore: student.evaluation.baseIndividualScore,
                        peerReviewScore: student.evaluation.peerReviewScore
                    });
                }
            });
        });
        setResults(loadedResults);
    }, [agencies]);

    const calculateAlgoScores = (agency: Agency, student: Student) => {
        // VE Score (max 20, assuming 100 VE = 20/20)
        const veScore = Math.min(20, Math.max(0, (agency.ve_current / 100) * 20));
        
        // Budget Score (max 20, assuming 5000 budget = 20/20)
        const budgetScore = Math.min(20, Math.max(0, (agency.budget_real / 5000) * 20));
        
        // Base Individual Score (max 20, assuming 100 score = 20/20)
        const baseIndividualScore = Math.min(20, Math.max(0, (student.individualScore / 100) * 20));

        // Peer Review Score
        const peerReviews = agency.peerReviews?.filter(pr => pr.targetId === student.id) || [];
        let peerReviewScore = 10; // Default average
        if (peerReviews.length > 0) {
            const avgRating = peerReviews.reduce((acc, pr) => acc + ((pr.ratings.attendance + pr.ratings.quality + pr.ratings.involvement) / 3), 0) / peerReviews.length;
            peerReviewScore = (avgRating / 5) * 20; // Convert 0-5 to 0-20
        }

        return { veScore, budgetScore, baseIndividualScore, peerReviewScore };
    };

    const runEvaluation = async () => {
        setIsEvaluating(true);
        toast('info', "Analyse IA détaillée en cours pour les agences sélectionnées...");

        try {
            const newResults: StudentEvalResult[] = [...results];
            const agenciesToEval = selectedAgencyId === 'ALL' 
                ? agencies.filter(a => a.id !== 'unassigned') 
                : agencies.filter(a => a.id === selectedAgencyId);

            for (const agency of agenciesToEval) {
                try {
                    const aiResult = await evaluateAgencyAndMembersWithGroq(agency, referentialRules);
                    
                    for (const student of agency.members) {
                        const algoScores = calculateAlgoScores(agency, student);
                        
                        // Remove existing result for this student if any
                        const existingIdx = newResults.findIndex(r => r.studentId === student.id);
                        if (existingIdx >= 0) {
                            newResults.splice(existingIdx, 1);
                        }

                        newResults.push({
                            studentId: student.id,
                            studentName: student.name,
                            agencyId: agency.id,
                            agencyName: agency.name,
                            groupEvaluation: aiResult.groupEvaluation || [],
                            individualEvaluation: aiResult.membersEvaluation[student.id] || [],
                            ...algoScores
                        });
                    }
                } catch (error) {
                    console.error("Erreur IA pour l'agence", agency.name, error);
                    toast('error', `L'évaluation a échoué pour l'agence ${agency.name}.`);
                }
            }

            setResults(newResults);
            toast('success', "Les résultats détaillés ont été générés avec succès.");

        } catch (error) {
            console.error("Erreur lors de l'évaluation", error);
            toast('error', "Une erreur est survenue lors de l'évaluation globale.");
        } finally {
            setIsEvaluating(false);
        }
    };

    const getAverageScore = (evals: CriterionEval[]) => {
        if (!evals || evals.length === 0) return 0;
        const sum = evals.reduce((acc, curr) => acc + curr.score, 0);
        return sum / evals.length;
    };

    const getFinalGroupScore = (result: StudentEvalResult) => {
        const aiScore = getAverageScore(result.groupEvaluation);
        const totalWeight = weights.group.ve + weights.group.budget + weights.group.ai;
        if (totalWeight === 0) return 0;
        
        const final = (
            (result.veScore * weights.group.ve) + 
            (result.budgetScore * weights.group.budget) + 
            (aiScore * weights.group.ai)
        ) / totalWeight;
        return final;
    };

    const getFinalIndividualScore = (result: StudentEvalResult) => {
        const aiScore = getAverageScore(result.individualEvaluation);
        const totalWeight = weights.individual.baseScore + weights.individual.peerReviews + weights.individual.ai;
        if (totalWeight === 0) return 0;

        const final = (
            (result.baseIndividualScore * weights.individual.baseScore) + 
            (result.peerReviewScore * weights.individual.peerReviews) + 
            (aiScore * weights.individual.ai)
        ) / totalWeight;
        return final;
    };

    const handleScoreSave = (studentId: string, type: 'group' | 'individual', criterionId: string) => {
        const numValue = parseFloat(editValue);
        if (isNaN(numValue) || numValue < 0 || numValue > 20) {
            toast('error', "La note doit être comprise entre 0 et 20.");
            return;
        }

        setResults(prev => prev.map(result => {
            if (result.studentId !== studentId) return result;

            const updatedResult = { ...result };
            if (type === 'group') {
                updatedResult.groupEvaluation = updatedResult.groupEvaluation.map(crit => 
                    crit.criterionId === criterionId ? { ...crit, score: numValue } : crit
                );
            } else {
                updatedResult.individualEvaluation = updatedResult.individualEvaluation.map(crit => 
                    crit.criterionId === criterionId ? { ...crit, score: numValue } : crit
                );
            }
            return updatedResult;
        }));

        setEditingScore(null);
        toast('success', "La note a été mise à jour avec succès.");
    };

    const startEditing = (studentId: string, type: 'group' | 'individual', criterionId: string, currentScore: number) => {
        setEditingScore({ studentId, type, criterionId });
        setEditValue(currentScore.toString());
    };

    const saveEvaluations = () => {
        if (!onUpdateAgency) return;

        // Group results by agency
        const resultsByAgency: Record<string, StudentEvalResult[]> = {};
        results.forEach(r => {
            if (!resultsByAgency[r.agencyId]) resultsByAgency[r.agencyId] = [];
            resultsByAgency[r.agencyId].push(r);
        });

        // Update each agency
        Object.keys(resultsByAgency).forEach(agencyId => {
            const agency = agencies.find(a => a.id === agencyId);
            if (agency) {
                const updatedAgency = { ...agency };
                updatedAgency.members = updatedAgency.members.map(student => {
                    const studentResult = resultsByAgency[agencyId].find(r => r.studentId === student.id);
                    if (studentResult) {
                        return {
                            ...student,
                            evaluation: {
                                groupEvaluation: studentResult.groupEvaluation,
                                individualEvaluation: studentResult.individualEvaluation,
                                veScore: studentResult.veScore,
                                budgetScore: studentResult.budgetScore,
                                baseIndividualScore: studentResult.baseIndividualScore,
                                peerReviewScore: studentResult.peerReviewScore,
                                lastUpdated: new Date().toISOString()
                            }
                        };
                    }
                    return student;
                });
                onUpdateAgency(updatedAgency);
            }
        });

        toast('success', "Les évaluations ont été sauvegardées avec succès.");
    };

    const exportToCSV = () => {
        if (results.length === 0) return;

        const allCriteriaIds = new Set<string>();
        results.forEach(r => {
            r.groupEvaluation.forEach(e => allCriteriaIds.add(e.criterionId));
            r.individualEvaluation.forEach(e => allCriteriaIds.add(e.criterionId));
        });
        const criteriaList = Array.from(allCriteriaIds).sort();

        const headers = [
            'Étudiant', 
            'Agence', 
            'Note Finale Groupe (/20)', 
            'Note Finale Individuelle (/20)',
            'Algo VE (/20)',
            'Algo Budget (/20)',
            'Moyenne IA Groupe (/20)',
            'Algo Score Indiv (/20)',
            'Algo Pairs (/20)',
            'Moyenne IA Indiv (/20)',
            ...criteriaList.map(c => `Groupe ${c} Score`),
            ...criteriaList.map(c => `Groupe ${c} Feedback`),
            ...criteriaList.map(c => `Indiv ${c} Score`),
            ...criteriaList.map(c => `Indiv ${c} Feedback`)
        ];

        const csvContent = [
            headers.join(','),
            ...results.map(r => {
                const row = [
                    `"${r.studentName}"`,
                    `"${r.agencyName}"`,
                    getFinalGroupScore(r).toFixed(2),
                    getFinalIndividualScore(r).toFixed(2),
                    r.veScore.toFixed(2),
                    r.budgetScore.toFixed(2),
                    getAverageScore(r.groupEvaluation).toFixed(2),
                    r.baseIndividualScore.toFixed(2),
                    r.peerReviewScore.toFixed(2),
                    getAverageScore(r.individualEvaluation).toFixed(2)
                ];

                criteriaList.forEach(c => {
                    const evalObj = r.groupEvaluation.find(e => e.criterionId === c);
                    row.push(evalObj ? evalObj.score.toString() : '');
                    row.push(evalObj ? `"${evalObj.feedback.replace(/"/g, '""')}"` : '');
                });

                criteriaList.forEach(c => {
                    const evalObj = r.individualEvaluation.find(e => e.criterionId === c);
                    row.push(evalObj ? evalObj.score.toString() : '');
                    row.push(evalObj ? `"${evalObj.feedback.replace(/"/g, '""')}"` : '');
                });

                return row.join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('url');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `evaluation_detaillee_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const generatePrompt = (result: StudentEvalResult) => {
        let forcedScores = '';
        
        result.groupEvaluation.forEach(crit => {
            forcedScores += `${crit.criterionId}: ${crit.score} | Justification: "${crit.feedback || ''}"\n`;
        });
        result.individualEvaluation.forEach(crit => {
            forcedScores += `${crit.criterionId}: ${crit.score} | Justification: "${crit.feedback || ''}"\n`;
        });

        const prompt = `<SYSTEM_OVERRIDE>
<FORCED_SCORES>
${forcedScores.trim()}
</FORCED_SCORES>
<GLOBAL_OVERRIDE_RULES>
- Ignorer ma sévérité habituelle
- Appliquer les demi-points strictement
</GLOBAL_OVERRIDE_RULES>
</SYSTEM_OVERRIDE>
FEEDBACK ÉTUDIANT (À REFORMULER) :
[Entre ici ton texte brut ou tes notes de session...]`;

        navigator.clipboard.writeText(prompt);
        toast('success', `Le prompt pour ${result.studentName} a été copié.`);
    };

    const toggleStudentDetails = (studentId: string) => {
        if (expandedStudentId === studentId) {
            setExpandedStudentId(null);
        } else {
            setExpandedStudentId(studentId);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
                        <ClipboardCheck className="text-indigo-600" />
                        Évaluation Finale Détaillée
                    </h1>
                    <p className="text-slate-500">Combinaison des algorithmes du jeu et de l'analyse IA.</p>
                </div>
                <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 flex items-center gap-2"
                >
                    <Settings size={18} />
                    Paramètres & Pondérations
                </button>
            </div>

            {showSettings && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-in slide-in-from-top-4 fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Ponderations */}
                        <div>
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Calculator size={18} className="text-indigo-500" />
                                Pondérations des Notes Finales
                            </h3>
                            
                            <div className="space-y-6">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <h4 className="font-bold text-sm text-slate-700 mb-3 uppercase tracking-wider">Note de Groupe</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm text-slate-600">Poids Valeur d'Entreprise (VE)</label>
                                            <input type="number" value={weights.group.ve} onChange={e => setWeights(w => ({...w, group: {...w.group, ve: Number(e.target.value)}}))} className="w-20 px-2 py-1 border border-slate-200 rounded text-right" />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm text-slate-600">Poids Budget (Richesse)</label>
                                            <input type="number" value={weights.group.budget} onChange={e => setWeights(w => ({...w, group: {...w.group, budget: Number(e.target.value)}}))} className="w-20 px-2 py-1 border border-slate-200 rounded text-right" />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm text-slate-600 font-bold text-indigo-600">Poids Évaluation IA (Référentiel)</label>
                                            <input type="number" value={weights.group.ai} onChange={e => setWeights(w => ({...w, group: {...w.group, ai: Number(e.target.value)}}))} className="w-20 px-2 py-1 border border-indigo-300 bg-indigo-50 rounded text-right font-bold text-indigo-700" />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <h4 className="font-bold text-sm text-slate-700 mb-3 uppercase tracking-wider">Note Individuelle</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm text-slate-600">Poids Score Individuel Base</label>
                                            <input type="number" value={weights.individual.baseScore} onChange={e => setWeights(w => ({...w, individual: {...w.individual, baseScore: Number(e.target.value)}}))} className="w-20 px-2 py-1 border border-slate-200 rounded text-right" />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm text-slate-600">Poids Évaluations par les Pairs</label>
                                            <input type="number" value={weights.individual.peerReviews} onChange={e => setWeights(w => ({...w, individual: {...w.individual, peerReviews: Number(e.target.value)}}))} className="w-20 px-2 py-1 border border-slate-200 rounded text-right" />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm text-slate-600 font-bold text-emerald-600">Poids Évaluation IA (Référentiel)</label>
                                            <input type="number" value={weights.individual.ai} onChange={e => setWeights(w => ({...w, individual: {...w.individual, ai: Number(e.target.value)}}))} className="w-20 px-2 py-1 border border-emerald-300 bg-emerald-50 rounded text-right font-bold text-emerald-700" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Referential */}
                        <div>
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <BrainCircuit size={18} className="text-purple-500" />
                                Référentiel IA
                            </h3>
                            <p className="text-sm text-slate-500 mb-2">
                                Ce texte est envoyé à l'IA pour évaluer la qualité du travail. Ne modifiez que si vous souhaitez changer les critères d'évaluation de base.
                            </p>
                            <textarea
                                value={referentialRules}
                                onChange={(e) => setReferentialRules(e.target.value)}
                                className="w-full h-[320px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                                placeholder="Collez ici les règles de votre referential.md..."
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Lancement de l'Évaluation</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Sélectionner une agence</label>
                                <select 
                                    value={selectedAgencyId}
                                    onChange={(e) => setSelectedAgencyId(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="ALL">Toutes les agences</option>
                                    {agencies.filter(a => a.id !== 'unassigned').map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                <h4 className="text-sm font-bold text-indigo-800 mb-2">Ce qui est envoyé à l'IA :</h4>
                                <ul className="text-xs text-indigo-700 space-y-1 list-disc pl-4">
                                    <li>Concept et Cible de l'agence</li>
                                    <li>Rôle de chaque membre</li>
                                    <li>Commentaires des évaluations par les pairs</li>
                                    <li>Notes de l'administrateur</li>
                                    <li>Le référentiel ci-dessus</li>
                                </ul>
                            </div>

                            <button
                                onClick={runEvaluation}
                                disabled={isEvaluating}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                {isEvaluating ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                ) : (
                                    <Play size={20} />
                                )}
                                {selectedAgencyId === 'ALL' ? "Évaluer Tout" : "Évaluer l'Agence"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results Panel */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 min-h-[600px]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Trophy size={20} className="text-amber-500" />
                                Résultats par Étudiant
                            </h2>
                            {results.length > 0 && (
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={saveEvaluations}
                                        className="text-sm text-emerald-600 font-medium flex items-center gap-1 hover:text-emerald-800"
                                    >
                                        <Save size={16} /> Sauvegarder
                                    </button>
                                    <button 
                                        onClick={exportToCSV}
                                        className="text-sm text-indigo-600 font-medium flex items-center gap-1 hover:text-indigo-800"
                                    >
                                        <Download size={16} /> Exporter CSV Complet
                                    </button>
                                </div>
                            )}
                        </div>

                        {results.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                                <ClipboardCheck size={48} className="mb-4 opacity-20" />
                                <p>Aucun résultat. Lancez l'évaluation pour voir le détail.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {results.map((result) => (
                                    <div key={result.studentId} className="border border-slate-200 rounded-xl overflow-hidden">
                                        <div 
                                            className="bg-slate-50 p-4 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                                            onClick={() => toggleStudentDetails(result.studentId)}
                                        >
                                            <div>
                                                <h3 className="font-bold text-slate-900">{result.studentName}</h3>
                                                <p className="text-sm text-slate-500">{result.agencyName}</p>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-center">
                                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Note Finale Groupe</p>
                                                    <p className="font-bold text-indigo-700 text-lg">{getFinalGroupScore(result).toFixed(1)} / 20</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Note Finale Indiv</p>
                                                    <p className="font-bold text-emerald-700 text-lg">{getFinalIndividualScore(result).toFixed(1)} / 20</p>
                                                </div>
                                                {expandedStudentId === result.studentId ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                                            </div>
                                        </div>
                                        
                                        {expandedStudentId === result.studentId && (
                                            <div className="p-4 bg-white border-t border-slate-200">
                                                <div className="flex justify-end mb-4">
                                                    <button 
                                                        onClick={() => generatePrompt(result)}
                                                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                                                    >
                                                        <Copy size={16} />
                                                        Générer Prompt IA
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Group Evaluation Details */}
                                                    <div>
                                                    <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                                                        <Users size={16} className="text-indigo-500" />
                                                        Détail Groupe
                                                    </h4>
                                                    
                                                    <div className="flex gap-2 mb-4">
                                                        <div className="flex-1 bg-slate-50 p-2 rounded text-center border border-slate-100">
                                                            <p className="text-[10px] text-slate-500 uppercase">Algo VE</p>
                                                            <p className="font-bold text-slate-700">{result.veScore.toFixed(1)}</p>
                                                        </div>
                                                        <div className="flex-1 bg-slate-50 p-2 rounded text-center border border-slate-100">
                                                            <p className="text-[10px] text-slate-500 uppercase">Algo Budget</p>
                                                            <p className="font-bold text-slate-700">{result.budgetScore.toFixed(1)}</p>
                                                        </div>
                                                        <div className="flex-1 bg-indigo-50 p-2 rounded text-center border border-indigo-100">
                                                            <p className="text-[10px] text-indigo-500 uppercase">Moy. IA</p>
                                                            <p className="font-bold text-indigo-700">{getAverageScore(result.groupEvaluation).toFixed(1)}</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {result.groupEvaluation.length > 0 ? result.groupEvaluation.map((crit, idx) => {
                                                            const isEditing = editingScore?.studentId === result.studentId && editingScore?.type === 'group' && editingScore?.criterionId === crit.criterionId;
                                                            return (
                                                            <div key={idx} className="bg-slate-50 rounded-lg p-3">
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <span className="font-bold text-slate-700">{crit.criterionId}</span>
                                                                    {isEditing ? (
                                                                        <div className="flex items-center gap-1">
                                                                            <input 
                                                                                type="number" 
                                                                                min="0" max="20" step="0.5"
                                                                                value={editValue}
                                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                                className="w-16 px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                                autoFocus
                                                                            />
                                                                            <button 
                                                                                onClick={() => handleScoreSave(result.studentId, 'group', crit.criterionId)}
                                                                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                                                            >
                                                                                <Check size={16} />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-sm">{crit.score}/20</span>
                                                                            <button 
                                                                                onClick={() => startEditing(result.studentId, 'group', crit.criterionId, crit.score)}
                                                                                className="text-slate-400 hover:text-indigo-600 transition-colors"
                                                                                title="Modifier la note"
                                                                            >
                                                                                <Edit2 size={14} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <p className="text-sm text-slate-600">{crit.feedback}</p>
                                                            </div>
                                                        )}) : <p className="text-sm text-slate-500 italic">Aucune donnée de groupe.</p>}
                                                    </div>
                                                </div>

                                                {/* Individual Evaluation Details */}
                                                <div>
                                                    <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                                                        <User size={16} className="text-emerald-500" />
                                                        Détail Individuel
                                                    </h4>

                                                    <div className="flex gap-2 mb-4">
                                                        <div className="flex-1 bg-slate-50 p-2 rounded text-center border border-slate-100">
                                                            <p className="text-[10px] text-slate-500 uppercase">Algo Score</p>
                                                            <p className="font-bold text-slate-700">{result.baseIndividualScore.toFixed(1)}</p>
                                                        </div>
                                                        <div className="flex-1 bg-slate-50 p-2 rounded text-center border border-slate-100">
                                                            <p className="text-[10px] text-slate-500 uppercase">Algo Pairs</p>
                                                            <p className="font-bold text-slate-700">{result.peerReviewScore.toFixed(1)}</p>
                                                        </div>
                                                        <div className="flex-1 bg-emerald-50 p-2 rounded text-center border border-emerald-100">
                                                            <p className="text-[10px] text-emerald-500 uppercase">Moy. IA</p>
                                                            <p className="font-bold text-emerald-700">{getAverageScore(result.individualEvaluation).toFixed(1)}</p>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {result.individualEvaluation.length > 0 ? result.individualEvaluation.map((crit, idx) => {
                                                            const isEditing = editingScore?.studentId === result.studentId && editingScore?.type === 'individual' && editingScore?.criterionId === crit.criterionId;
                                                            return (
                                                            <div key={idx} className="bg-slate-50 rounded-lg p-3">
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <span className="font-bold text-slate-700">{crit.criterionId}</span>
                                                                    {isEditing ? (
                                                                        <div className="flex items-center gap-1">
                                                                            <input 
                                                                                type="number" 
                                                                                min="0" max="20" step="0.5"
                                                                                value={editValue}
                                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                                className="w-16 px-2 py-1 text-sm border border-emerald-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                                                                autoFocus
                                                                            />
                                                                            <button 
                                                                                onClick={() => handleScoreSave(result.studentId, 'individual', crit.criterionId)}
                                                                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                                                            >
                                                                                <Check size={16} />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-sm">{crit.score}/20</span>
                                                                            <button 
                                                                                onClick={() => startEditing(result.studentId, 'individual', crit.criterionId, crit.score)}
                                                                                className="text-slate-400 hover:text-emerald-600 transition-colors"
                                                                                title="Modifier la note"
                                                                            >
                                                                                <Edit2 size={14} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <p className="text-sm text-slate-600">{crit.feedback}</p>
                                                            </div>
                                                        )}) : <p className="text-sm text-slate-500 italic">Aucune donnée individuelle.</p>}
                                                    </div>
                                                </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

