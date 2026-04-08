import React from 'react';
import { CriterionEval } from '../../../types';
import { Check, Edit2, Copy, RefreshCw, Users, Calculator } from 'lucide-react';
import { StudentEvalResult, generateGroupPrompt, generateIndividualPrompt, getAverageScore, getFinalGroupScore, getFinalIndividualScore } from './EvaluationUtils';

interface StudentEvaluationDetailsProps {
    result: StudentEvalResult;
    weights: any;
    editingScore: { studentId: string, type: 'group' | 'individual', criterionId: string } | null;
    editValue: string;
    setEditValue: (val: string) => void;
    startEditing: (studentId: string, type: 'group' | 'individual', criterionId: string, currentScore: number) => void;
    handleScoreSave: (studentId: string, type: 'group' | 'individual', criterionId: string) => void;
    toast: (type: 'success' | 'error' | 'info', message: string) => void;
    reEvaluateStudent?: (studentId: string, agencyId: string) => void;
    reEvaluateAgency?: (agencyId: string) => void;
    isEvaluating?: boolean;
}

export const StudentEvaluationDetails: React.FC<StudentEvaluationDetailsProps> = ({
    result,
    weights,
    editingScore,
    editValue,
    setEditValue,
    startEditing,
    handleScoreSave,
    toast,
    reEvaluateStudent,
    reEvaluateAgency,
    isEvaluating
}) => {
    const handleGenerateGroupPrompt = () => {
        const prompt = generateGroupPrompt(result);
        navigator.clipboard.writeText(prompt).then(() => {
            toast('success', "Prompt Groupe copié dans le presse-papier !");
        }).catch(err => {
            console.error('Erreur lors de la copie:', err);
            toast('error', "Erreur lors de la copie du prompt.");
        });
    };

    const handleGenerateIndividualPrompt = () => {
        const prompt = generateIndividualPrompt(result);
        navigator.clipboard.writeText(prompt).then(() => {
            toast('success', "Prompt Individuel copié dans le presse-papier !");
        }).catch(err => {
            console.error('Erreur lors de la copie:', err);
            toast('error', "Erreur lors de la copie du prompt.");
        });
    };

    const groupAiScore = getAverageScore(result.groupEvaluation);
    const individualAiScore = getAverageScore(result.individualEvaluation);
    
    const totalGroupWeight = weights.group.ve + weights.group.budget + weights.group.ai;
    const totalIndivWeight = weights.individual.baseScore + weights.individual.peerReviews + weights.individual.ai;

    const finalGroupScore = getFinalGroupScore(result, weights);
    const finalIndivScore = getFinalIndividualScore(result, weights);

    return (
        <div className="p-6 bg-slate-50 border-t border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <h4 className="font-bold text-slate-800 text-lg">Détails de l'évaluation</h4>
                <div className="flex gap-3">
                    {reEvaluateStudent && (
                        <button 
                            onClick={() => reEvaluateStudent(result.studentId, result.agencyId)}
                            disabled={isEvaluating}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={isEvaluating ? "animate-spin" : ""} />
                            Réévaluer l'étudiant
                        </button>
                    )}
                    {reEvaluateAgency && (
                        <button 
                            onClick={() => reEvaluateAgency(result.agencyId)}
                            disabled={isEvaluating}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium disabled:opacity-50"
                        >
                            <Users size={16} />
                            Réévaluer l'agence
                        </button>
                    )}
                    <button 
                        onClick={handleGenerateGroupPrompt}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm font-medium"
                    >
                        <Copy size={16} />
                        Prompt Groupe
                    </button>
                    <button 
                        onClick={handleGenerateIndividualPrompt}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
                    >
                        <Copy size={16} />
                        Prompt Individuel
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Group Evaluation */}
                <div className="space-y-6">
                    <div>
                        <h5 className="font-semibold text-slate-800 mb-4 flex items-center gap-2 text-lg">
                            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                            Note Groupe : {finalGroupScore.toFixed(1)}/20
                        </h5>
                        
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-6">
                            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
                                <Calculator size={16} className="text-slate-500" />
                                <span className="font-semibold text-slate-700 text-sm">Détail du calcul (Pondération totale: {totalGroupWeight})</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                <div className="flex justify-between items-center p-3 hover:bg-slate-50">
                                    <span className="text-sm text-slate-600">Valeur Économique (VE)</span>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded">Coef: {weights.group.ve}</span>
                                        <span className="font-semibold text-slate-800 w-12 text-right">{result.veScore.toFixed(1)}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center p-3 hover:bg-slate-50">
                                    <span className="text-sm text-slate-600">Gestion du Budget</span>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded">Coef: {weights.group.budget}</span>
                                        <span className="font-semibold text-slate-800 w-12 text-right">{result.budgetScore.toFixed(1)}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center p-3 hover:bg-slate-50">
                                    <span className="text-sm text-slate-600">Évaluation IA (Moyenne)</span>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded">Coef: {weights.group.ai}</span>
                                        <span className="font-bold text-blue-600 w-12 text-right">{groupAiScore.toFixed(1)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <h6 className="font-medium text-slate-700 mb-3 text-sm uppercase tracking-wider">Détail des critères IA</h6>
                        {result.groupEvaluation.length > 0 ? (
                            <div className="space-y-3">
                                {result.groupEvaluation.map(crit => {
                                    const isEditing = editingScore?.studentId === result.studentId && editingScore?.type === 'group' && editingScore?.criterionId === crit.criterionId;
                                    return (
                                        <div key={crit.criterionId} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-semibold text-slate-800">{crit.criterionId}</span>
                                                <div className="flex items-center gap-2">
                                                    {isEditing ? (
                                                        <div className="flex items-center gap-1">
                                                            <input 
                                                                type="number" 
                                                                min="0" max="20" step="0.5"
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                className="w-16 px-2 py-1 text-sm border-2 border-blue-400 rounded focus:outline-none"
                                                                autoFocus
                                                            />
                                                            <button onClick={() => handleScoreSave(result.studentId, 'group', crit.criterionId)} className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
                                                                <Check size={16} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{crit.score.toFixed(1)}/20</span>
                                                            <button onClick={() => startEditing(result.studentId, 'group', crit.criterionId, crit.score)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                                                <Edit2 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed">"{crit.feedback}"</p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-slate-100 p-4 rounded-lg text-center border border-slate-200 border-dashed">
                                <p className="text-sm text-slate-500">Aucune évaluation de groupe générée par l'IA.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Individual Evaluation */}
                <div className="space-y-6">
                    <div>
                        <h5 className="font-semibold text-slate-800 mb-4 flex items-center gap-2 text-lg">
                            <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                            Note Individuelle : {finalIndivScore.toFixed(1)}/20
                        </h5>
                        
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-6">
                            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
                                <Calculator size={16} className="text-slate-500" />
                                <span className="font-semibold text-slate-700 text-sm">Détail du calcul (Pondération totale: {totalIndivWeight})</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                <div className="flex justify-between items-center p-3 hover:bg-slate-50">
                                    <span className="text-sm text-slate-600">Note de base (Manager)</span>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded">Coef: {weights.individual.baseScore}</span>
                                        <span className="font-semibold text-slate-800 w-12 text-right">{result.baseIndividualScore.toFixed(1)}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center p-3 hover:bg-slate-50">
                                    <span className="text-sm text-slate-600">Évaluation par les pairs</span>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded">Coef: {weights.individual.peerReviews}</span>
                                        <span className="font-semibold text-slate-800 w-12 text-right">{result.peerReviewScore.toFixed(1)}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center p-3 hover:bg-slate-50">
                                    <span className="text-sm text-slate-600">Évaluation IA (Moyenne)</span>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-medium bg-purple-100 text-purple-700 px-2 py-1 rounded">Coef: {weights.individual.ai}</span>
                                        <span className="font-bold text-purple-600 w-12 text-right">{individualAiScore.toFixed(1)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Student Feedback */}
                        {result.studentFeedback && (
                            <div className="mb-6 p-5 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-xl shadow-sm">
                                <h6 className="font-semibold text-purple-800 text-sm mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                    Feedback Profiler (IA)
                                </h6>
                                <p className="text-sm text-slate-700 leading-relaxed">{result.studentFeedback}</p>
                            </div>
                        )}

                        <h6 className="font-medium text-slate-700 mb-3 text-sm uppercase tracking-wider">Détail des critères IA</h6>
                        {result.individualEvaluation.length > 0 ? (
                            <div className="space-y-3">
                                {result.individualEvaluation.map(crit => {
                                    const isEditing = editingScore?.studentId === result.studentId && editingScore?.type === 'individual' && editingScore?.criterionId === crit.criterionId;
                                    return (
                                        <div key={crit.criterionId} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:border-purple-300 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-semibold text-slate-800">{crit.criterionId}</span>
                                                <div className="flex items-center gap-2">
                                                    {isEditing ? (
                                                        <div className="flex items-center gap-1">
                                                            <input 
                                                                type="number" 
                                                                min="0" max="20" step="0.5"
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                className="w-16 px-2 py-1 text-sm border-2 border-purple-400 rounded focus:outline-none"
                                                                autoFocus
                                                            />
                                                            <button onClick={() => handleScoreSave(result.studentId, 'individual', crit.criterionId)} className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
                                                                <Check size={16} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{crit.score.toFixed(1)}/20</span>
                                                            <button onClick={() => startEditing(result.studentId, 'individual', crit.criterionId, crit.score)} className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors">
                                                                <Edit2 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed">"{crit.feedback}"</p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-slate-100 p-4 rounded-lg text-center border border-slate-200 border-dashed">
                                <p className="text-sm text-slate-500">Aucune évaluation individuelle générée par l'IA.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
