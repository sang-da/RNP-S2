import React from 'react';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { StudentEvalResult, getFinalGroupScore, getFinalIndividualScore } from './EvaluationUtils';
import { StudentEvaluationDetails } from './StudentEvaluationDetails';
import { Agency } from '../../../types';

interface EvaluationTableProps {
    results: StudentEvalResult[];
    weights: any;
    agencies: Agency[];
    deliverableMapping: Record<string, string[]>;
    expandedStudentId: string | null;
    toggleStudentDetails: (studentId: string) => void;
    editingScore: { studentId: string, type: 'group' | 'individual', criterionId: string } | null;
    editValue: string;
    setEditValue: (val: string) => void;
    startEditing: (studentId: string, type: 'group' | 'individual', criterionId: string, currentScore: number) => void;
    handleScoreSave: (studentId: string, type: 'group' | 'individual', criterionId: string) => void;
    handleFeedbackSave: (studentId: string, agencyId: string, newFeedback: string) => void;
    handleCriterionFeedbackSave: (studentId: string, agencyId: string, type: 'group' | 'individual', criterionId: string, newFeedback: string) => void;
    toast: (type: 'success' | 'error' | 'info', message: string) => void;
    reEvaluateStudent: (studentId: string, agencyId: string) => void;
    reEvaluateAgency: (agencyId: string) => void;
    isEvaluating: boolean;
    togglePublish: (studentId: string, agencyId: string, currentStatus: boolean) => void;
}

export const EvaluationTable: React.FC<EvaluationTableProps> = ({
    results,
    weights,
    agencies,
    deliverableMapping,
    expandedStudentId,
    toggleStudentDetails,
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
    if (results.length === 0) {
        return (
            <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="text-slate-400" size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-2">Aucune évaluation générée</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                    Sélectionnez une agence et lancez l'évaluation IA pour générer les bulletins de notes basés sur le référentiel.
                </p>
            </div>
        );
    }

    const groupedResults = results.reduce((acc, result) => {
        if (!acc[result.agencyId]) acc[result.agencyId] = [];
        acc[result.agencyId].push(result);
        return acc;
    }, {} as Record<string, StudentEvalResult[]>);

    return (
        <div className="space-y-8">
            {Object.entries(groupedResults).map(([agencyId, agencyResults]) => {
                const agency = agencies.find(a => a.id === agencyId);
                
                // Calculate agency averages
                let sumGroup = 0;
                let sumIndiv = 0;
                let sumGlobal = 0;
                
                agencyResults.forEach(r => {
                    const g = getFinalGroupScore(r, weights, agency, deliverableMapping);
                    const i = getFinalIndividualScore(r, weights, agency, deliverableMapping);
                    sumGroup += g;
                    sumIndiv += i;
                    sumGlobal += (g + i) / 2;
                });
                
                const avgGroup = agencyResults.length ? sumGroup / agencyResults.length : 0;
                const avgIndiv = agencyResults.length ? sumIndiv / agencyResults.length : 0;
                const avgGlobal = agencyResults.length ? sumGlobal / agencyResults.length : 0;

                return (
                    <div key={agencyId} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {/* Agency Header */}
                        <div className="bg-slate-50 border-b border-slate-200 p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center font-bold text-xl text-indigo-700">
                                    {agency?.name ? agency.name.charAt(0) : '?'}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">{agency?.name || 'Agence Inconnue'}</h3>
                                    <span className="text-sm font-medium text-slate-500">
                                        {agencyResults.length} étudiant{agencyResults.length > 1 ? 's' : ''} évalué{agencyResults.length > 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Agency Averages */}
                            <div className="flex bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-4 py-2 border-r border-slate-100 flex flex-col items-center">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Moy. Groupe</span>
                                    <span className="text-sm font-bold text-blue-700">{avgGroup.toFixed(1)}/20</span>
                                </div>
                                <div className="px-4 py-2 border-r border-slate-100 flex flex-col items-center">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Moy. Indiv.</span>
                                    <span className="text-sm font-bold text-purple-700">{avgIndiv.toFixed(1)}/20</span>
                                </div>
                                <div className="px-4 py-2 bg-indigo-50 flex flex-col items-center">
                                    <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Moy. Globale</span>
                                    <span className="text-sm font-black text-indigo-700">{avgGlobal.toFixed(1)}/20</span>
                                </div>
                            </div>
                        </div>

                        {/* Students Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                                        <th className="p-4 font-semibold">Étudiant</th>
                                        <th className="p-4 font-semibold text-center w-32 hidden md:table-cell">Note Groupe</th>
                                        <th className="p-4 font-semibold text-center w-32 hidden md:table-cell">Note Indiv.</th>
                                        <th className="p-4 font-semibold text-center w-32">Note Globale</th>
                                        <th className="p-4 font-semibold text-center w-24">Détails</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agencyResults.map(result => {
                                        const finalGroup = getFinalGroupScore(result, weights, agency, deliverableMapping);
                                        const finalIndiv = getFinalIndividualScore(result, weights, agency, deliverableMapping);
                                        const finalGlobal = (finalGroup + finalIndiv) / 2;
                                        const isExpanded = expandedStudentId === result.studentId;

                                        return (
                                            <React.Fragment key={result.studentId}>
                                                <tr className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-indigo-50/10' : ''}`}>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                                                                {result.studentName.charAt(0)}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-slate-800 flex items-center gap-2">
                                                                    {result.studentName}
                                                                    {agency?.members.find(m => m.id === result.studentId)?.evaluation?.isPublished && (
                                                                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase tracking-wider">Publié</span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center hidden md:table-cell">
                                                        <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-sm">
                                                            {finalGroup.toFixed(1)}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center hidden md:table-cell">
                                                        <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-purple-100 text-purple-800 font-bold text-sm">
                                                            {finalIndiv.toFixed(1)}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-sm border border-emerald-200 shadow-sm">
                                                            {finalGlobal.toFixed(1)}
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
                                                        <td colSpan={5} className="p-0 bg-slate-50/50">
                                                            <StudentEvaluationDetails 
                                                                result={result}
                                                                weights={weights}
                                                                agency={agency}
                                                                deliverableMapping={deliverableMapping}
                                                                editingScore={editingScore}
                                                                editValue={editValue}
                                                                setEditValue={setEditValue}
                                                                startEditing={startEditing}
                                                                handleScoreSave={handleScoreSave}
                                                                handleFeedbackSave={handleFeedbackSave}
                                                                handleCriterionFeedbackSave={handleCriterionFeedbackSave}
                                                                toast={toast}
                                                                reEvaluateStudent={reEvaluateStudent}
                                                                reEvaluateAgency={reEvaluateAgency}
                                                                isEvaluating={isEvaluating}
                                                                togglePublish={togglePublish}
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
                    </div>
                );
            })}
        </div>
    );
};
