import React, { useState, useEffect } from 'react';
import { Agency, Student, CriterionEval } from '../../../types';
import { ClipboardCheck, Play, Download, Trophy, ChevronDown, ChevronUp, Settings, Save, BrainCircuit } from 'lucide-react';
import { useUI } from '../../../contexts/UIContext';
import { evaluateAgencyWithGroq, evaluateMemberWithGroq } from '../../../services/groqService';
import referentialRaw from '../../../documentation/REFERENTIAL.md?raw';
import { StudentEvalResult, calculateAlgoScores, getFinalGroupScore, getFinalIndividualScore } from './EvaluationUtils';
import { EvaluationSettings } from './EvaluationSettings';
import { StudentEvaluationDetails } from './StudentEvaluationDetails';

interface AdminEvaluationProps {
    agencies: Agency[];
    onUpdateAgency?: (agency: Agency) => void;
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

    const [weights, setWeights] = useState({
        group: { ve: 2, budget: 2, ai: 6 },
        individual: { baseScore: 3, peerReviews: 2, ai: 5 }
    });

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
                        groupEvaluation: student.evaluation.groupEvaluation || [],
                        individualEvaluation: student.evaluation.individualEvaluation || [],
                        veScore: student.evaluation.veScore,
                        budgetScore: student.evaluation.budgetScore,
                        baseIndividualScore: student.evaluation.baseIndividualScore,
                        peerReviewScore: student.evaluation.peerReviewScore,
                        studentFeedback: student.evaluation.studentFeedback || ""
                    });
                }
            });
        });
        setResults(loadedResults);
    }, [agencies]);

    const runEvaluation = async () => {
        setIsEvaluating(true);
        toast('info', "Analyse IA détaillée en cours pour les agences sélectionnées. Cela peut prendre du temps...");

        try {
            let currentResults: StudentEvalResult[] = [...results];
            const agenciesToEval = selectedAgencyId === 'ALL' 
                ? agencies.filter(a => a.id !== 'unassigned') 
                : agencies.filter(a => a.id === selectedAgencyId);

            for (let i = 0; i < agenciesToEval.length; i++) {
                const agency = agenciesToEval[i];
                try {
                    toast('info', `Évaluation de l'agence ${agency.name} (${i + 1}/${agenciesToEval.length})...`);
                    const groupEvaluation = await evaluateAgencyWithGroq(agency, referentialRules);
                    
                    const updatedAgency = { ...agency };
                    const agencyResults: StudentEvalResult[] = [];

                    // Evaluate each member
                    const updatedMembers = [];
                    for (let j = 0; j < updatedAgency.members.length; j++) {
                        const student = updatedAgency.members[j];
                        toast('info', `Évaluation de l'étudiant ${student.name} (${j + 1}/${updatedAgency.members.length})...`);
                        
                        const memberEvalResult = await evaluateMemberWithGroq(agency, student, referentialRules);
                        const algoScores = calculateAlgoScores(agency, student);
                        
                        const studentResult: StudentEvalResult = {
                            studentId: student.id,
                            studentName: student.name,
                            agencyId: agency.id,
                            agencyName: agency.name,
                            groupEvaluation: groupEvaluation || [],
                            individualEvaluation: memberEvalResult.criteria || [],
                            ...algoScores
                        };
                        
                        agencyResults.push(studentResult);

                        updatedMembers.push({
                            ...student,
                            evaluation: {
                                groupEvaluation: studentResult.groupEvaluation,
                                individualEvaluation: studentResult.individualEvaluation,
                                veScore: studentResult.veScore,
                                budgetScore: studentResult.budgetScore,
                                baseIndividualScore: studentResult.baseIndividualScore,
                                peerReviewScore: studentResult.peerReviewScore,
                                studentFeedback: memberEvalResult.studentFeedback || "",
                                lastUpdated: new Date().toISOString()
                            }
                        });

                        // Add a small delay between members to avoid rate limiting
                        if (j < updatedAgency.members.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                    }
                    
                    updatedAgency.members = updatedMembers;

                    // Update local state progressively
                    currentResults = currentResults.filter(r => r.agencyId !== agency.id).concat(agencyResults);
                    setResults(currentResults);

                    // Save to database immediately
                    if (onUpdateAgency) {
                        onUpdateAgency(updatedAgency);
                    }

                    // Add delay to avoid rate limiting (429), except for the last one
                    if (i < agenciesToEval.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 4000));
                    }

                } catch (error) {
                    console.error("Erreur IA pour l'agence", agency.name, error);
                    toast('error', `L'évaluation a échoué pour l'agence ${agency.name}.`);
                }
            }

            toast('success', "Les résultats détaillés ont été générés et sauvegardés avec succès.");

        } catch (error) {
            console.error("Erreur lors de l'évaluation", error);
            toast('error', "Une erreur est survenue lors de l'évaluation globale.");
        } finally {
            setIsEvaluating(false);
        }
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
        setEditValue("");
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
                                studentFeedback: student.evaluation?.studentFeedback || "", // Preserve existing or empty
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
            r.groupEvaluation.forEach(c => allCriteriaIds.add(`G_${c.criterionId}`));
            r.individualEvaluation.forEach(c => allCriteriaIds.add(`I_${c.criterionId}`));
        });
        const criteriaList = Array.from(allCriteriaIds).sort();

        const headers = [
            "Agence", "Étudiant", 
            "Score VE", "Score Budget", "Score IA Groupe", "Note Finale Groupe",
            "Score Indiv. Base", "Score Pairs", "Score IA Indiv.", "Note Finale Indiv.",
            "Note Globale",
            ...criteriaList
        ];

        const csvContent = [
            headers.join(','),
            ...results.map(r => {
                const finalGroup = getFinalGroupScore(r, weights);
                const finalIndiv = getFinalIndividualScore(r, weights);
                const finalGlobal = (finalGroup + finalIndiv) / 2;

                const row = [
                    `"${r.agencyName}"`, `"${r.studentName}"`,
                    r.veScore.toFixed(2), r.budgetScore.toFixed(2), 
                    (r.groupEvaluation.reduce((acc, c) => acc + c.score, 0) / (r.groupEvaluation.length || 1)).toFixed(2),
                    finalGroup.toFixed(2),
                    r.baseIndividualScore.toFixed(2), r.peerReviewScore.toFixed(2),
                    (r.individualEvaluation.reduce((acc, c) => acc + c.score, 0) / (r.individualEvaluation.length || 1)).toFixed(2),
                    finalIndiv.toFixed(2),
                    finalGlobal.toFixed(2)
                ];

                criteriaList.forEach(c => {
                    if (c.startsWith('G_')) {
                        const critId = c.substring(2);
                        const evalObj = r.groupEvaluation.find(e => e.criterionId === critId);
                        row.push(evalObj ? evalObj.score.toFixed(2) : "");
                    } else {
                        const critId = c.substring(2);
                        const evalObj = r.individualEvaluation.find(e => e.criterionId === critId);
                        row.push(evalObj ? evalObj.score.toFixed(2) : "");
                    }
                });

                return row.join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('url');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `evaluations_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const toggleStudentDetails = (studentId: string) => {
        setExpandedStudentId(prev => prev === studentId ? null : studentId);
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <ClipboardCheck className="text-indigo-600" size={28} />
                        Évaluation Finale
                    </h2>
                    <p className="text-slate-500 mt-1">Générez des bulletins de notes détaillés basés sur le référentiel de compétences.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowSettings(!showSettings)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                    >
                        <Settings size={18} />
                        Paramètres
                    </button>
                    <button 
                        onClick={saveEvaluations}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors font-medium"
                    >
                        <Save size={18} />
                        Sauvegarder
                    </button>
                    <button 
                        onClick={exportToCSV}
                        disabled={results.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 font-medium"
                    >
                        <Download size={18} />
                        Exporter CSV
                    </button>
                </div>
            </div>

            {showSettings && (
                <EvaluationSettings 
                    weights={weights} 
                    setWeights={setWeights} 
                    referentialRules={referentialRules} 
                    setReferentialRules={setReferentialRules} 
                />
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <select 
                            value={selectedAgencyId}
                            onChange={(e) => setSelectedAgencyId(e.target.value)}
                            className="px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="ALL">Toutes les agences</option>
                            {agencies.filter(a => a.id !== 'unassigned').map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                        <button 
                            onClick={runEvaluation}
                            disabled={isEvaluating}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 font-bold shadow-sm"
                        >
                            {isEvaluating ? (
                                <><BrainCircuit className="animate-pulse" size={20} /> Analyse en cours...</>
                            ) : (
                                <><Play size={20} /> Lancer l'Évaluation IA</>
                            )}
                        </button>
                    </div>
                    <div className="text-sm text-slate-500 font-medium">
                        {results.length} étudiants évalués
                    </div>
                </div>

                {results.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-sm">
                                    <th className="p-4 font-semibold">Étudiant</th>
                                    <th className="p-4 font-semibold">Agence</th>
                                    <th className="p-4 font-semibold text-center">Note Groupe</th>
                                    <th className="p-4 font-semibold text-center">Note Indiv.</th>
                                    <th className="p-4 font-semibold text-center">Note Globale</th>
                                    <th className="p-4 font-semibold text-center">Détails</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map(result => {
                                    const finalGroup = getFinalGroupScore(result, weights);
                                    const finalIndiv = getFinalIndividualScore(result, weights);
                                    const finalGlobal = (finalGroup + finalIndiv) / 2;
                                    const isExpanded = expandedStudentId === result.studentId;

                                    return (
                                        <React.Fragment key={result.studentId}>
                                            <tr className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-indigo-50/30' : ''}`}>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                                            {result.studentName.charAt(0)}
                                                        </div>
                                                        <span className="font-medium text-slate-800">{result.studentName}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-slate-600">{result.agencyName}</td>
                                                <td className="p-4 text-center">
                                                    <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-sm">
                                                        {finalGroup.toFixed(1)}/20
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-purple-100 text-purple-800 font-bold text-sm">
                                                        {finalIndiv.toFixed(1)}/20
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-sm border border-emerald-200 shadow-sm">
                                                        {finalGlobal.toFixed(1)}/20
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button 
                                                        onClick={() => toggleStudentDetails(result.studentId)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                                    >
                                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                    </button>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={6} className="p-0">
                                                        <StudentEvaluationDetails 
                                                            result={result}
                                                            editingScore={editingScore}
                                                            editValue={editValue}
                                                            setEditValue={setEditValue}
                                                            startEditing={startEditing}
                                                            handleScoreSave={handleScoreSave}
                                                            toast={toast}
                                                        />
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trophy className="text-slate-400" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 mb-2">Aucune évaluation générée</h3>
                        <p className="text-slate-500 max-w-md mx-auto">
                            Sélectionnez une agence et lancez l'évaluation IA pour générer les bulletins de notes basés sur le référentiel.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
