import React from 'react';
import { CriterionEval, Agency } from '../../../types';
import { Check, Edit2, Copy, RefreshCw, Users, Calculator, Eye, EyeOff } from 'lucide-react';
import { StudentEvalResult, generateGroupPrompt, generateIndividualPrompt, getAverageScore, getFinalGroupScore, getFinalIndividualScore, getWeightedGroupCriterionScore, getWeightedIndividualCriterionScore, calculateDeliverableScore } from './EvaluationUtils';

interface StudentEvaluationDetailsProps {
    result: StudentEvalResult;
    weights: any;
    agency?: Agency;
    deliverableMapping?: Record<string, string[]>;
    editingScore: { studentId: string, type: 'group' | 'individual', criterionId: string } | null;
    editValue: string;
    setEditValue: (val: string) => void;
    startEditing: (studentId: string, type: 'group' | 'individual', criterionId: string, currentScore: number) => void;
    handleScoreSave: (studentId: string, type: 'group' | 'individual', criterionId: string) => void;
    handleFeedbackSave?: (studentId: string, agencyId: string, newFeedback: string) => void;
    handleCriterionFeedbackSave?: (studentId: string, agencyId: string, type: 'group' | 'individual', criterionId: string, newFeedback: string) => void;
    toast: (type: 'success' | 'error' | 'info', message: string) => void;
    reEvaluateStudent?: (studentId: string, agencyId: string) => void;
    reEvaluateAgency?: (agencyId: string) => void;
    isEvaluating?: boolean;
    togglePublish?: (studentId: string, agencyId: string, currentStatus: boolean) => void;
}

export const StudentEvaluationDetails: React.FC<StudentEvaluationDetailsProps> = ({
    result,
    weights,
    agency,
    deliverableMapping,
    editingScore,
    editValue,
    setEditValue,
    startEditing,
    handleScoreSave,
    handleFeedbackSave,
    handleCriterionFeedbackSave,
    toast,
    reEvaluateStudent,
    reEvaluateAgency,
    isEvaluating,
    togglePublish
}) => {
    const [isEditingFeedback, setIsEditingFeedback] = React.useState(false);
    const [feedbackEditValue, setFeedbackEditValue] = React.useState(result.studentFeedback || "");
    const [editingCriterionFeedback, setEditingCriterionFeedback] = React.useState<{type: 'group' | 'individual', criterionId: string} | null>(null);
    const [criterionFeedbackEditValue, setCriterionFeedbackEditValue] = React.useState("");

    const onSaveFeedback = () => {
        if (handleFeedbackSave) {
            handleFeedbackSave(result.studentId, result.agencyId, feedbackEditValue);
            setIsEditingFeedback(false);
        }
    };

    const startEditingCriterionFeedback = (type: 'group' | 'individual', criterionId: string, currentFeedback: string) => {
        setEditingCriterionFeedback({ type, criterionId });
        setCriterionFeedbackEditValue(currentFeedback);
    };

    const saveCriterionFeedback = () => {
        if (handleCriterionFeedbackSave && editingCriterionFeedback) {
            handleCriterionFeedbackSave(
                result.studentId, 
                result.agencyId, 
                editingCriterionFeedback.type, 
                editingCriterionFeedback.criterionId, 
                criterionFeedbackEditValue
            );
            setEditingCriterionFeedback(null);
        }
    };
    const handleGenerateGroupPrompt = () => {
        const prompt = generateGroupPrompt(result, weights, agency, deliverableMapping);
        navigator.clipboard.writeText(prompt).then(() => {
            toast('success', "Prompt Groupe copié dans le presse-papier !");
        }).catch(err => {
            console.error('Erreur lors de la copie:', err);
            toast('error', "Erreur lors de la copie du prompt.");
        });
    };

    const handleGenerateIndividualPrompt = () => {
        const prompt = generateIndividualPrompt(result, weights, agency, deliverableMapping);
        navigator.clipboard.writeText(prompt).then(() => {
            toast('success', "Prompt Individuel copié dans le presse-papier !");
        }).catch(err => {
            console.error('Erreur lors de la copie:', err);
            toast('error', "Erreur lors de la copie du prompt.");
        });
    };

    const groupAiScore = getAverageScore(result.groupEvaluation);
    const individualAiScore = getAverageScore(result.individualEvaluation);
    
    const totalGroupWeight = weights.group.ve + weights.group.budget + weights.group.ai + (weights.group.deliverables || 0);
    const totalIndivWeight = weights.individual.baseScore + weights.individual.peerReviews + weights.individual.ai + (weights.individual.deliverables || 0);

    const finalGroupScore = getFinalGroupScore(result, weights, agency, deliverableMapping);
    const finalIndivScore = getFinalIndividualScore(result, weights, agency, deliverableMapping);

    const student = agency?.members.find(m => m.id === result.studentId);
    const isPublished = student?.evaluation?.isPublished || false;

    return (
        <div className="p-6 bg-slate-50 border-t border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <h4 className="font-bold text-slate-800 text-lg">Détails de l'évaluation</h4>
                <div className="flex gap-3">
                    {togglePublish && (
                        <button 
                            onClick={() => togglePublish(result.studentId, result.agencyId, isPublished)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${isPublished ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                        >
                            {isPublished ? <Eye size={16} /> : <EyeOff size={16} />}
                            {isPublished ? 'Bulletin Publié' : 'Publier le bulletin'}
                        </button>
                    )}
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
                                <span className="font-semibold text-slate-700 text-sm">Synthèse des Justifications (Groupe)</span>
                            </div>
                            <div className="p-4 max-h-60 overflow-y-auto">
                                {result.groupEvaluation.length > 0 ? (
                                    <ul className="space-y-3 text-sm text-slate-700">
                                        {result.groupEvaluation.map(c => {
                                            const isEditingThis = editingCriterionFeedback?.type === 'group' && editingCriterionFeedback?.criterionId === c.criterionId;
                                            return (
                                                <li key={c.criterionId} className="flex gap-2 group relative">
                                                    <span className="font-bold text-slate-900 shrink-0 mt-1">{c.criterionId}:</span>
                                                    {isEditingThis ? (
                                                        <div className="flex-1 flex gap-2">
                                                            <textarea 
                                                                value={criterionFeedbackEditValue}
                                                                onChange={(e) => setCriterionFeedbackEditValue(e.target.value)}
                                                                className="flex-1 p-2 text-sm border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                                                rows={2}
                                                            />
                                                            <div className="flex flex-col gap-1">
                                                                <button onClick={saveCriterionFeedback} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200" title="Enregistrer">
                                                                    <Check size={14} />
                                                                </button>
                                                                <button onClick={() => setEditingCriterionFeedback(null)} className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200" title="Annuler">
                                                                    <span className="text-xs font-bold px-0.5">X</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex-1 flex justify-between items-start">
                                                            <span className="italic mt-1">"{c.feedback}"</span>
                                                            {handleCriterionFeedbackSave && (
                                                                <button 
                                                                    onClick={() => startEditingCriterionFeedback('group', c.criterionId, c.feedback)}
                                                                    className="p-1 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors opacity-0 group-hover:opacity-100 shrink-0 ml-2"
                                                                    title="Modifier la justification"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-slate-500 italic">Aucune justification générée.</p>
                                )}
                            </div>
                        </div>

                        <h6 className="font-medium text-slate-700 mb-3 text-sm uppercase tracking-wider">Détail des notes par critère</h6>
                        {result.groupEvaluation.length > 0 ? (
                            <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">Critère</th>
                                            <th className="px-4 py-3 font-semibold">VE <span className="text-xs font-normal text-slate-400">(Coef {weights.group.ve})</span></th>
                                            <th className="px-4 py-3 font-semibold">Budget <span className="text-xs font-normal text-slate-400">(Coef {weights.group.budget})</span></th>
                                            <th className="px-4 py-3 font-semibold text-emerald-700">Livrables <span className="text-xs font-normal text-emerald-400">(Coef {weights.group.deliverables || 0})</span></th>
                                            <th className="px-4 py-3 font-semibold text-blue-700">Note IA <span className="text-xs font-normal text-blue-400">(Coef {weights.group.ai})</span></th>
                                            <th className="px-4 py-3 font-bold text-slate-800">Moyenne Pondérée</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {result.groupEvaluation.map(crit => {
                                            const specificDelivScore = agency && deliverableMapping ? calculateDeliverableScore(agency, crit.criterionId, deliverableMapping) : result.deliverableScore;
                                            const finalScore = getWeightedGroupCriterionScore(result, crit.score, weights, specificDelivScore);
                                            const isEditing = editingScore?.studentId === result.studentId && editingScore?.type === 'group' && editingScore?.criterionId === crit.criterionId;
                                            return (
                                                <tr key={crit.criterionId} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-slate-800">{crit.criterionId}</td>
                                                    <td className="px-4 py-3 text-slate-600">{result.veScore.toFixed(1)}</td>
                                                    <td className="px-4 py-3 text-slate-600">{result.budgetScore.toFixed(1)}</td>
                                                    <td className="px-4 py-3 text-emerald-600 font-medium">{specificDelivScore >= 0 ? specificDelivScore.toFixed(1) : '-'}</td>
                                                    <td className="px-4 py-3">
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
                                                            <div className="flex items-center gap-2 group">
                                                                <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{crit.score.toFixed(1)}</span>
                                                                <button onClick={() => startEditing(result.studentId, 'group', crit.criterionId, crit.score)} className="p-1 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors opacity-0 group-hover:opacity-100">
                                                                    <Edit2 size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-slate-800">{finalScore.toFixed(1)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
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
                        
                        {/* Student Feedback */}
                        {result.studentFeedback && (
                            <div className="mb-6 p-5 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-xl shadow-sm relative group">
                                <div className="flex justify-between items-start mb-3">
                                    <h6 className="font-semibold text-purple-800 text-sm flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                        Feedback Profiler (IA)
                                    </h6>
                                    {!isEditingFeedback && handleFeedbackSave && (
                                        <button 
                                            onClick={() => {
                                                setFeedbackEditValue(result.studentFeedback || "");
                                                setIsEditingFeedback(true);
                                            }} 
                                            className="p-1.5 text-purple-400 hover:text-purple-700 hover:bg-purple-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                                            title="Modifier le feedback"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                </div>
                                
                                {isEditingFeedback ? (
                                    <div className="space-y-3">
                                        <textarea 
                                            value={feedbackEditValue}
                                            onChange={(e) => setFeedbackEditValue(e.target.value)}
                                            className="w-full p-3 text-sm text-slate-700 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none min-h-[100px]"
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => setIsEditingFeedback(false)}
                                                className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
                                            >
                                                Annuler
                                            </button>
                                            <button 
                                                onClick={onSaveFeedback}
                                                className="px-3 py-1.5 text-sm bg-purple-600 text-white hover:bg-purple-700 rounded-md transition-colors flex items-center gap-1"
                                            >
                                                <Check size={14} /> Enregistrer
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{result.studentFeedback}</p>
                                )}
                            </div>
                        )}

                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-6">
                            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
                                <Calculator size={16} className="text-slate-500" />
                                <span className="font-semibold text-slate-700 text-sm">Synthèse des Justifications (Individuel)</span>
                            </div>
                            <div className="p-4 max-h-60 overflow-y-auto">
                                {result.individualEvaluation.length > 0 ? (
                                    <ul className="space-y-3 text-sm text-slate-700">
                                        {result.individualEvaluation.map(c => {
                                            const isEditingThis = editingCriterionFeedback?.type === 'individual' && editingCriterionFeedback?.criterionId === c.criterionId;
                                            return (
                                                <li key={c.criterionId} className="flex gap-2 group relative">
                                                    <span className="font-bold text-slate-900 shrink-0 mt-1">{c.criterionId}:</span>
                                                    {isEditingThis ? (
                                                        <div className="flex-1 flex gap-2">
                                                            <textarea 
                                                                value={criterionFeedbackEditValue}
                                                                onChange={(e) => setCriterionFeedbackEditValue(e.target.value)}
                                                                className="flex-1 p-2 text-sm border border-purple-300 rounded focus:ring-1 focus:ring-purple-500 outline-none"
                                                                rows={2}
                                                            />
                                                            <div className="flex flex-col gap-1">
                                                                <button onClick={saveCriterionFeedback} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200" title="Enregistrer">
                                                                    <Check size={14} />
                                                                </button>
                                                                <button onClick={() => setEditingCriterionFeedback(null)} className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200" title="Annuler">
                                                                    <span className="text-xs font-bold px-0.5">X</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex-1 flex justify-between items-start">
                                                            <span className="italic mt-1">"{c.feedback}"</span>
                                                            {handleCriterionFeedbackSave && (
                                                                <button 
                                                                    onClick={() => startEditingCriterionFeedback('individual', c.criterionId, c.feedback)}
                                                                    className="p-1 text-slate-300 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors opacity-0 group-hover:opacity-100 shrink-0 ml-2"
                                                                    title="Modifier la justification"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-slate-500 italic">Aucune justification générée.</p>
                                )}
                            </div>
                        </div>

                        <h6 className="font-medium text-slate-700 mb-3 text-sm uppercase tracking-wider">Détail des notes par critère</h6>
                        {result.individualEvaluation.length > 0 ? (
                            <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">Critère</th>
                                            <th className="px-4 py-3 font-semibold">Manager <span className="text-xs font-normal text-slate-400">(Coef {weights.individual.baseScore})</span></th>
                                            <th className="px-4 py-3 font-semibold">Pairs <span className="text-xs font-normal text-slate-400">(Coef {weights.individual.peerReviews})</span></th>
                                            <th className="px-4 py-3 font-semibold text-emerald-700">Livrables <span className="text-xs font-normal text-emerald-400">(Coef {weights.individual.deliverables || 0})</span></th>
                                            <th className="px-4 py-3 font-semibold text-purple-700">Note IA <span className="text-xs font-normal text-purple-400">(Coef {weights.individual.ai})</span></th>
                                            <th className="px-4 py-3 font-bold text-slate-800">Moyenne Pondérée</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {result.individualEvaluation.map(crit => {
                                            const specificDelivScore = agency && deliverableMapping ? calculateDeliverableScore(agency, crit.criterionId, deliverableMapping) : result.deliverableScore;
                                            const finalScore = getWeightedIndividualCriterionScore(result, crit.score, weights, specificDelivScore);
                                            const isEditing = editingScore?.studentId === result.studentId && editingScore?.type === 'individual' && editingScore?.criterionId === crit.criterionId;
                                            return (
                                                <tr key={crit.criterionId} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-slate-800">{crit.criterionId}</td>
                                                    <td className="px-4 py-3 text-slate-600">{result.baseIndividualScore.toFixed(1)}</td>
                                                    <td className="px-4 py-3 text-slate-600">{result.peerReviewScore.toFixed(1)}</td>
                                                    <td className="px-4 py-3 text-emerald-600 font-medium">{specificDelivScore >= 0 ? specificDelivScore.toFixed(1) : '-'}</td>
                                                    <td className="px-4 py-3">
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
                                                            <div className="flex items-center gap-2 group">
                                                                <span className="font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{crit.score.toFixed(1)}</span>
                                                                <button onClick={() => startEditing(result.studentId, 'individual', crit.criterionId, crit.score)} className="p-1 text-slate-300 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors opacity-0 group-hover:opacity-100">
                                                                    <Edit2 size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-slate-800">{finalScore.toFixed(1)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
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
