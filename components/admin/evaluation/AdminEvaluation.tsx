import React, { useState, useEffect } from 'react';
import { Agency, Student, CriterionEval } from '../../../types';
import { ClipboardCheck, Play, Download, Settings, Save, BrainCircuit } from 'lucide-react';
import { useUI } from '../../../contexts/UIContext';
import { evaluateAgencyWithGroq, evaluateMemberWithGroq } from '../../../services/groqService';
import referentialRaw from '../../../documentation/REFERENTIAL.md?raw';
import { StudentEvalResult, calculateAlgoScores, getFinalGroupScore, getFinalIndividualScore } from './EvaluationUtils';
import { EvaluationSettings } from './EvaluationSettings';
import { EvaluationTable } from './EvaluationTable';

interface AdminEvaluationProps {
    agencies: Agency[];
    onUpdateAgency?: (agency: Agency) => void;
}

export const AdminEvaluation: React.FC<AdminEvaluationProps> = ({ agencies, onUpdateAgency }) => {
    const { toast, confirm } = useUI();
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [results, setResults] = useState<StudentEvalResult[]>([]);
    const [referentialRules, setReferentialRules] = useState<string>(referentialRaw || 'Évaluez la pertinence du projet, la gestion financière et la cohésion d\'équipe.');
    const [groupPrompt, setGroupPrompt] = useState<string>(`En tant que jury final, évaluez l'agence sur CHAQUE CRITÈRE (C1.1, C2.1, etc.) du référentiel fourni.

INSTRUCTIONS IMPORTANTES :
1. Vous devez faire une évaluation de l'ENTREPRISE (Groupe) basée sur la VE, le budget et le projet.
2. Pour chaque critère (C1.1, C2.1, etc.) trouvé dans le référentiel, donnez une note sur 20.
3. Prenez impérativement en compte la VE (Objectif: 100) et le Budget (Objectif: 5000€) dans votre notation des compétences liées à la gestion et la performance. Si la VE ou le budget sont faibles, les notes de gestion doivent être sévèrement impactées.

Retournez UNIQUEMENT un objet JSON avec cette structure exacte :
{
    "groupEvaluation": [
        { "criterionId": "C1.1", "score": 15, "feedback": "Justification courte" }
    ]
}`);
    const [individualPrompt, setIndividualPrompt] = useState<string>(`En tant que jury final et profiler RH expert, évaluez l'étudiant.

INSTRUCTIONS IMPORTANTES :
1. Évaluez l'étudiant sur CHAQUE CRITÈRE (C1.1, C2.1, etc.) du référentiel fourni, en donnant une note sur 20.
2. Prenez en compte son rôle, son score individuel, les retours de ses pairs et les notes de l'admin.
3. Générez également un "studentFeedback" : un commentaire global (3-4 phrases) sur le travail de l'étudiant, son évolution, son profil psychologique et professionnel (comme un profiler RH).

Retournez UNIQUEMENT un objet JSON avec cette structure exacte :
{
    "criteria": [
        { "criterionId": "C1.1", "score": 14, "feedback": "Justification courte" }
    ],
    "studentFeedback": "Analyse détaillée du comportement, de l'évolution et du travail de l'étudiant..."
}`);
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
                    const groupEvaluation = await evaluateAgencyWithGroq(agency, referentialRules, groupPrompt);
                    
                    const updatedAgency = { ...agency };
                    const agencyResults: StudentEvalResult[] = [];

                    // Evaluate each member
                    const updatedMembers = [];
                    for (let j = 0; j < updatedAgency.members.length; j++) {
                        const student = updatedAgency.members[j];
                        toast('info', `Évaluation de l'étudiant ${student.name} (${j + 1}/${updatedAgency.members.length})...`);
                        
                        const memberEvalResult = await evaluateMemberWithGroq(agency, student, referentialRules, individualPrompt);
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
                            await new Promise(resolve => setTimeout(resolve, 8000));
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
                        await new Promise(resolve => setTimeout(resolve, 15000));
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

    const reEvaluateStudent = async (studentId: string, agencyId: string) => {
        setIsEvaluating(true);
        toast('info', "Réévaluation de l'étudiant en cours...");

        try {
            const agency = agencies.find(a => a.id === agencyId);
            if (!agency) throw new Error("Agence non trouvée.");
            
            const student = agency.members.find(m => m.id === studentId);
            if (!student) throw new Error("Étudiant non trouvé.");

            const memberEvalResult = await evaluateMemberWithGroq(agency, student, referentialRules, individualPrompt);
            const algoScores = calculateAlgoScores(agency, student);
            
            // We need the existing group evaluation for this student, or we fetch a new one if it doesn't exist
            const existingResult = results.find(r => r.studentId === studentId);
            const groupEvaluation = existingResult?.groupEvaluation || [];

            const studentResult: StudentEvalResult = {
                studentId: student.id,
                studentName: student.name,
                agencyId: agency.id,
                agencyName: agency.name,
                groupEvaluation: groupEvaluation,
                individualEvaluation: memberEvalResult.criteria || [],
                ...algoScores,
                studentFeedback: memberEvalResult.studentFeedback || ""
            };

            // Update local state
            setResults(prev => prev.map(r => r.studentId === studentId ? studentResult : r));

            // Update agency and save
            const updatedAgency = { ...agency };
            updatedAgency.members = updatedAgency.members.map(m => {
                if (m.id === studentId) {
                    return {
                        ...m,
                        evaluation: {
                            groupEvaluation: studentResult.groupEvaluation,
                            individualEvaluation: studentResult.individualEvaluation,
                            veScore: studentResult.veScore,
                            budgetScore: studentResult.budgetScore,
                            baseIndividualScore: studentResult.baseIndividualScore,
                            peerReviewScore: studentResult.peerReviewScore,
                            studentFeedback: studentResult.studentFeedback,
                            lastUpdated: new Date().toISOString()
                        }
                    };
                }
                return m;
            });

            if (onUpdateAgency) {
                onUpdateAgency(updatedAgency);
            }

            toast('success', `L'étudiant ${student.name} a été réévalué avec succès.`);
        } catch (error) {
            console.error("Erreur lors de la réévaluation", error);
            toast('error', "La réévaluation a échoué.");
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
                    groupPrompt={groupPrompt}
                    setGroupPrompt={setGroupPrompt}
                    individualPrompt={individualPrompt}
                    setIndividualPrompt={setIndividualPrompt}
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

                <EvaluationTable 
                    results={results}
                    weights={weights}
                    expandedStudentId={expandedStudentId}
                    toggleStudentDetails={toggleStudentDetails}
                    editingScore={editingScore}
                    editValue={editValue}
                    setEditValue={setEditValue}
                    startEditing={startEditing}
                    handleScoreSave={handleScoreSave}
                    toast={toast}
                    reEvaluateStudent={reEvaluateStudent}
                    isEvaluating={isEvaluating}
                />
            </div>
        </div>
    );
};
