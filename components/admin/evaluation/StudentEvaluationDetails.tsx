import React from 'react';
import { CriterionEval } from '../../../types';
import { Check, Edit2, Copy, RefreshCw } from 'lucide-react';
import { StudentEvalResult, generatePrompt } from './EvaluationUtils';

interface StudentEvaluationDetailsProps {
    result: StudentEvalResult;
    editingScore: { studentId: string, type: 'group' | 'individual', criterionId: string } | null;
    editValue: string;
    setEditValue: (val: string) => void;
    startEditing: (studentId: string, type: 'group' | 'individual', criterionId: string, currentScore: number) => void;
    handleScoreSave: (studentId: string, type: 'group' | 'individual', criterionId: string) => void;
    toast: (type: 'success' | 'error' | 'info', message: string) => void;
    reEvaluateStudent?: (studentId: string, agencyId: string) => void;
    isEvaluating?: boolean;
}

export const StudentEvaluationDetails: React.FC<StudentEvaluationDetailsProps> = ({
    result,
    editingScore,
    editValue,
    setEditValue,
    startEditing,
    handleScoreSave,
    toast,
    reEvaluateStudent,
    isEvaluating
}) => {
    const handleGeneratePrompt = () => {
        const prompt = generatePrompt(result);
        navigator.clipboard.writeText(prompt).then(() => {
            toast('success', "Prompt copié dans le presse-papier !");
        }).catch(err => {
            console.error('Erreur lors de la copie:', err);
            toast('error', "Erreur lors de la copie du prompt.");
        });
    };

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
                    <button 
                        onClick={handleGeneratePrompt}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm font-medium"
                    >
                        <Copy size={16} />
                        Générer Prompt IA
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Group Evaluation */}
                <div>
                    <h5 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Évaluation Groupe (IA)
                    </h5>
                    {result.groupEvaluation.length > 0 ? (
                        <div className="space-y-4">
                            {result.groupEvaluation.map(crit => {
                                const isEditing = editingScore?.studentId === result.studentId && editingScore?.type === 'group' && editingScore?.criterionId === crit.criterionId;
                                return (
                                    <div key={crit.criterionId} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-medium text-slate-800">{crit.criterionId}</span>
                                            <div className="flex items-center gap-2">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-1">
                                                        <input 
                                                            type="number" 
                                                            min="0" max="20" step="0.5"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            className="w-16 px-2 py-1 text-sm border rounded"
                                                        />
                                                        <button onClick={() => handleScoreSave(result.studentId, 'group', crit.criterionId)} className="text-green-600 hover:text-green-800">
                                                            <Check size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-blue-600">{crit.score.toFixed(1)}/20</span>
                                                        <button onClick={() => startEditing(result.studentId, 'group', crit.criterionId, crit.score)} className="text-slate-400 hover:text-slate-600">
                                                            <Edit2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-600 italic">"{crit.feedback}"</p>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 italic">Aucune évaluation de groupe générée.</p>
                    )}
                </div>

                {/* Individual Evaluation */}
                <div>
                    <h5 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        Évaluation Individuelle (IA)
                    </h5>
                    
                    {/* Student Feedback */}
                    {result.studentFeedback && (
                        <div className="mb-6 p-4 bg-purple-50 border border-purple-100 rounded-lg">
                            <h6 className="font-semibold text-purple-800 text-sm mb-2">Feedback Profiler (IA)</h6>
                            <p className="text-sm text-purple-900 italic">{result.studentFeedback}</p>
                        </div>
                    )}

                    {result.individualEvaluation.length > 0 ? (
                        <div className="space-y-4">
                            {result.individualEvaluation.map(crit => {
                                const isEditing = editingScore?.studentId === result.studentId && editingScore?.type === 'individual' && editingScore?.criterionId === crit.criterionId;
                                return (
                                    <div key={crit.criterionId} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-medium text-slate-800">{crit.criterionId}</span>
                                            <div className="flex items-center gap-2">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-1">
                                                        <input 
                                                            type="number" 
                                                            min="0" max="20" step="0.5"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            className="w-16 px-2 py-1 text-sm border rounded"
                                                        />
                                                        <button onClick={() => handleScoreSave(result.studentId, 'individual', crit.criterionId)} className="text-green-600 hover:text-green-800">
                                                            <Check size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-purple-600">{crit.score.toFixed(1)}/20</span>
                                                        <button onClick={() => startEditing(result.studentId, 'individual', crit.criterionId, crit.score)} className="text-slate-400 hover:text-slate-600">
                                                            <Edit2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-600 italic">"{crit.feedback}"</p>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 italic">Aucune évaluation individuelle générée.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
