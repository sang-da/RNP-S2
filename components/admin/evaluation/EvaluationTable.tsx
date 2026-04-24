import React, { useState } from 'react';
import { Trophy, ChevronDown, ChevronUp, Search, LayoutGrid, List, Copy, Check } from 'lucide-react';
import { StudentEvalResult, getFinalGroupScore, getFinalIndividualScore, generateGroupPrompt, generateIndividualPrompt } from './EvaluationUtils';
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
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
    const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
    const [collapsedAgencies, setCollapsedAgencies] = useState<Record<string, boolean>>({});

    const toggleAgencyCollapse = (agencyId: string) => {
        setCollapsedAgencies(prev => ({ ...prev, [agencyId]: !prev[agencyId] }));
    };

    const handleCopy = (text: string, key: string, name: string, type: string) => {
        navigator.clipboard.writeText(text);
        setCopiedStates(prev => ({ ...prev, [key]: true }));
        toast('success', `Prompt ${type} copié pour ${name}`);
        setTimeout(() => setCopiedStates(prev => ({ ...prev, [key]: false })), 2000);
    };

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

    const filteredResults = results.filter(r => 
        r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.agencyName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupedResults = filteredResults.reduce((acc, result) => {
        if (!acc[result.agencyId]) acc[result.agencyId] = [];
        acc[result.agencyId].push(result);
        return acc;
    }, {} as Record<string, StudentEvalResult[]>);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text"
                        placeholder="Rechercher un étudiant ou une agence..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <List size={18} /> Liste
                    </button>
                    <button
                        onClick={() => setViewMode('card')}
                        className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${viewMode === 'card' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <LayoutGrid size={18} /> Cartes
                    </button>
                </div>
            </div>

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
                        <div 
                            className="bg-slate-50 border-b border-slate-200 p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-slate-100 transition-colors"
                            onClick={() => toggleAgencyCollapse(agencyId)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 text-slate-400">
                                    {collapsedAgencies[agencyId] ? <ChevronDown size={24} /> : <ChevronUp size={24} />}
                                </div>
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

                        {/* Students Table or Cards */}
                        { !collapsedAgencies[agencyId] && (
                            viewMode === 'list' ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                                            <th className="p-4 font-semibold">Étudiant</th>
                                            <th className="p-4 font-semibold text-center w-32 hidden md:table-cell">Note Groupe</th>
                                            <th className="p-4 font-semibold text-center w-32 hidden md:table-cell">Note Indiv.</th>
                                            <th className="p-4 font-semibold text-center w-32">Note Globale</th>
                                            <th className="p-4 font-semibold text-center w-48">Prompts</th>
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
                                                        <td className="p-4 text-center hidden sm:table-cell">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={() => handleCopy(generateGroupPrompt(result, weights, agency, deliverableMapping), `${result.studentId}-grp`, result.studentName, 'Groupe')}
                                                                    className="flex items-center justify-center p-1.5 rounded-md hover:bg-slate-200 text-slate-600 transition-colors"
                                                                    title="Copier le Prompt Groupe"
                                                                >
                                                                    {copiedStates[`${result.studentId}-grp`] ? <Check size={16} className="text-emerald-500"/> : <Copy size={16} />}
                                                                    <span className="ml-1 text-[10px] font-bold">GRP</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleCopy(generateIndividualPrompt(result, weights, agency, deliverableMapping), `${result.studentId}-ind`, result.studentName, 'Individuel')}
                                                                    className="flex items-center justify-center p-1.5 rounded-md hover:bg-slate-200 text-slate-600 transition-colors"
                                                                    title="Copier le Prompt Individuel"
                                                                >
                                                                    {copiedStates[`${result.studentId}-ind`] ? <Check size={16} className="text-emerald-500"/> : <Copy size={16} />}
                                                                    <span className="ml-1 text-[10px] font-bold">IND</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <button 
                                                                onClick={() => toggleStudentDetails(result.studentId)}
                                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                                                title="Voir les détails"
                                                            >
                                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr>
                                                            <td colSpan={6} className="p-0 bg-slate-50/50">
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
                        ) : (
                            <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {agencyResults.map(result => {
                                    const finalGroup = getFinalGroupScore(result, weights, agency, deliverableMapping);
                                    const finalIndiv = getFinalIndividualScore(result, weights, agency, deliverableMapping);
                                    const finalGlobal = (finalGroup + finalIndiv) / 2;
                                    const isExpanded = expandedStudentId === result.studentId;

                                    return (
                                        <div key={result.studentId} className={`flex flex-col border rounded-2xl transition-all ${isExpanded ? 'border-indigo-400 shadow-md ring-2 ring-indigo-50' : 'border-slate-200 hover:border-slate-300 shadow-sm'}`}>
                                            <div className="p-5 flex-1 cursor-pointer" onClick={() => toggleStudentDetails(result.studentId)}>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg shrink-0">
                                                            {result.studentName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-800">{result.studentName}</h4>
                                                            {agency?.members.find(m => m.id === result.studentId)?.evaluation?.isPublished ? (
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Publié</span>
                                                            ) : (
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Brouillon</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="w-12 h-12 rounded-full border-4 border-indigo-100 flex items-center justify-center">
                                                        <span className="text-sm font-black text-indigo-700">{finalGlobal.toFixed(1)}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-2 mb-4">
                                                    <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                                                        <div className="text-[10px] uppercase font-bold text-blue-500 mb-1">Groupe</div>
                                                        <div className="font-bold text-blue-800">{finalGroup.toFixed(1)} <span className="text-xs font-normal text-blue-600/50">/20</span></div>
                                                    </div>
                                                    <div className="bg-purple-50/50 p-2 rounded-lg border border-purple-100">
                                                        <div className="text-[10px] uppercase font-bold text-purple-500 mb-1">Individuel</div>
                                                        <div className="font-bold text-purple-800">{finalIndiv.toFixed(1)} <span className="text-xs font-normal text-purple-600/50">/20</span></div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-2 rounded-b-2xl">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleCopy(generateGroupPrompt(result, weights, agency, deliverableMapping), `${result.studentId}-grp-card`, result.studentName, 'Groupe'); }}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors text-xs font-medium shadow-sm"
                                                    >
                                                        {copiedStates[`${result.studentId}-grp-card`] ? <Check size={14} className="text-emerald-500"/> : <Copy size={14} />} Prompt Grp
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleCopy(generateIndividualPrompt(result, weights, agency, deliverableMapping), `${result.studentId}-ind-card`, result.studentName, 'Individuel'); }}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors text-xs font-medium shadow-sm"
                                                    >
                                                        {copiedStates[`${result.studentId}-ind-card`] ? <Check size={14} className="text-emerald-500"/> : <Copy size={14} />} Prompt Ind
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {isExpanded && (
                                                <div className="border-t border-indigo-100 bg-white p-0 rounded-b-2xl overflow-hidden mt-[-1px]">
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
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
};

