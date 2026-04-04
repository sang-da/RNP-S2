import React, { useState, useEffect } from 'react';
import { Agency, Student } from '../../../types';
import { ClipboardCheck, Play, Download, Trophy, ChevronDown, ChevronUp, User, Users, Edit2, Check } from 'lucide-react';
import { useUI } from '../../../contexts/UIContext';
import { evaluateAgencyAndMembersWithGroq, CriterionEval } from '../../../services/groqService';
import referentialRaw from '../../../documentation/REFERENTIAL.md?raw';

interface AdminEvaluationProps {
    agencies: Agency[];
}

interface StudentEvalResult {
    studentId: string;
    studentName: string;
    agencyName: string;
    groupEvaluation: CriterionEval[];
    individualEvaluation: CriterionEval[];
}

export const AdminEvaluation: React.FC<AdminEvaluationProps> = ({ agencies }) => {
    const { toast } = useUI();
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [results, setResults] = useState<StudentEvalResult[]>([]);
    const [referentialRules, setReferentialRules] = useState<string>(referentialRaw || 'Évaluez la pertinence du projet, la gestion financière et la cohésion d\'équipe.');
    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
    const [editingScore, setEditingScore] = useState<{ studentId: string, type: 'group' | 'individual', criterionId: string } | null>(null);
    const [editValue, setEditValue] = useState<string>("");

    const runEvaluation = async () => {
        setIsEvaluating(true);
        toast({
            title: "Évaluation en cours",
            description: "Analyse IA détaillée en cours pour chaque agence et membre...",
            type: "info"
        });

        try {
            const newResults: StudentEvalResult[] = [];

            for (const agency of agencies) {
                if (agency.id === 'unassigned') continue;

                try {
                    const aiResult = await evaluateAgencyAndMembersWithGroq(agency, referentialRules);
                    
                    for (const student of agency.members) {
                        newResults.push({
                            studentId: student.id,
                            studentName: student.name,
                            agencyName: agency.name,
                            groupEvaluation: aiResult.groupEvaluation || [],
                            individualEvaluation: aiResult.membersEvaluation[student.id] || []
                        });
                    }
                } catch (error) {
                    console.error("Erreur IA pour l'agence", agency.name, error);
                    toast({
                        title: `Erreur pour ${agency.name}`,
                        description: "L'évaluation a échoué pour cette agence.",
                        type: "error"
                    });
                }
            }

            setResults(newResults);

            toast({
                title: "Évaluation terminée",
                description: "Les résultats détaillés ont été générés avec succès.",
                type: "success"
            });

        } catch (error) {
            console.error("Erreur lors de l'évaluation", error);
            toast({
                title: "Erreur",
                description: "Une erreur est survenue lors de l'évaluation globale.",
                type: "error"
            });
        } finally {
            setIsEvaluating(false);
        }
    };

    const getAverageScore = (evals: CriterionEval[]) => {
        if (!evals || evals.length === 0) return 0;
        const sum = evals.reduce((acc, curr) => acc + curr.score, 0);
        return sum / evals.length;
    };

    const handleScoreSave = (studentId: string, type: 'group' | 'individual', criterionId: string) => {
        const numValue = parseFloat(editValue);
        if (isNaN(numValue) || numValue < 0 || numValue > 20) {
            toast({
                title: "Note invalide",
                description: "La note doit être comprise entre 0 et 20.",
                type: "error"
            });
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
        toast({
            title: "Note modifiée",
            description: "La note a été mise à jour avec succès.",
            type: "success"
        });
    };

    const startEditing = (studentId: string, type: 'group' | 'individual', criterionId: string, currentScore: number) => {
        setEditingScore({ studentId, type, criterionId });
        setEditValue(currentScore.toString());
    };

    const exportToCSV = () => {
        if (results.length === 0) return;

        // Collect all unique criteria IDs
        const allCriteriaIds = new Set<string>();
        results.forEach(r => {
            r.groupEvaluation.forEach(e => allCriteriaIds.add(e.criterionId));
            r.individualEvaluation.forEach(e => allCriteriaIds.add(e.criterionId));
        });
        const criteriaList = Array.from(allCriteriaIds).sort();

        const headers = [
            'Étudiant', 
            'Agence', 
            'Moyenne Groupe (/20)', 
            'Moyenne Individuelle (/20)',
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
                    getAverageScore(r.groupEvaluation).toFixed(2),
                    getAverageScore(r.individualEvaluation).toFixed(2)
                ];

                // Group scores and feedback
                criteriaList.forEach(c => {
                    const evalObj = r.groupEvaluation.find(e => e.criterionId === c);
                    row.push(evalObj ? evalObj.score.toString() : '');
                    row.push(evalObj ? `"${evalObj.feedback.replace(/"/g, '""')}"` : '');
                });

                // Individual scores and feedback
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
                    <p className="text-slate-500">Évaluation critère par critère pour le groupe et l'individuel.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Règles du Référentiel</h2>
                        <textarea
                            value={referentialRules}
                            onChange={(e) => setReferentialRules(e.target.value)}
                            className="w-full h-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                            placeholder="Collez ici les règles de votre referential.md..."
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            L'IA lira ce référentiel et notera chaque critère (ex: C1.1, C2.1) sur 20 pour le groupe et pour chaque individu.
                        </p>
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
                        Lancer l'Évaluation Détaillée
                    </button>
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
                                <button 
                                    onClick={exportToCSV}
                                    className="text-sm text-indigo-600 font-medium flex items-center gap-1 hover:text-indigo-800"
                                >
                                    <Download size={16} /> Exporter CSV Complet
                                </button>
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
                                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Moy. Groupe</p>
                                                    <p className="font-bold text-indigo-700">{getAverageScore(result.groupEvaluation).toFixed(1)} / 20</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Moy. Indiv</p>
                                                    <p className="font-bold text-emerald-700">{getAverageScore(result.individualEvaluation).toFixed(1)} / 20</p>
                                                </div>
                                                {expandedStudentId === result.studentId ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                                            </div>
                                        </div>
                                        
                                        {expandedStudentId === result.studentId && (
                                            <div className="p-4 bg-white border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Group Evaluation Details */}
                                                <div>
                                                    <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                                                        <Users size={16} className="text-indigo-500" />
                                                        Évaluation Groupe (VE & Projet)
                                                    </h4>
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
                                                        Évaluation Individuelle (Score & Rôle)
                                                    </h4>
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

