import React from 'react';
import { Settings } from 'lucide-react';

interface EvaluationSettingsProps {
    weights: {
        group: { ve: number, budget: number, deliverables?: number, ai: number, budgetMaxPixi?: number },
        individual: { baseScore: number, peerReviews: number, deliverables?: number, ai: number }
    };
    setWeights: React.Dispatch<React.SetStateAction<{
        group: { ve: number, budget: number, deliverables?: number, ai: number, budgetMaxPixi?: number },
        individual: { baseScore: number, peerReviews: number, deliverables?: number, ai: number }
    }>>;
    referentialRules: string;
    setReferentialRules: (rules: string) => void;
    groupPrompt: string;
    setGroupPrompt: (prompt: string) => void;
    individualPrompt: string;
    setIndividualPrompt: (prompt: string) => void;
    dataConfig: any;
    setDataConfig: any;
}

export const EvaluationSettings: React.FC<EvaluationSettingsProps> = ({
    weights,
    setWeights,
    referentialRules,
    setReferentialRules,
    groupPrompt,
    setGroupPrompt,
    individualPrompt,
    setIndividualPrompt,
    dataConfig,
    setDataConfig
}) => {
    const handleDataConfigChange = (type: 'group' | 'individual', field: string) => {
        setDataConfig((prev: any) => ({
            ...prev,
            [type]: {
                ...prev[type],
                [field]: !prev[type][field]
            }
        }));
    };

    const totalGroupWeight = weights.group.ve + weights.group.budget + (weights.group.deliverables || 0) + weights.group.ai;
    const totalIndivWeight = weights.individual.baseScore + weights.individual.peerReviews + (weights.individual.deliverables || 0) + weights.individual.ai;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 animate-in slide-in-from-top-4">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Settings size={20} className="text-slate-500" />
                Paramètres d'évaluation
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Poids Groupe */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-slate-700 border-b pb-2">Pondération Groupe</h4>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Score VE (Vitalité)</label>
                        <input 
                            type="range" min="0" max="10" step="1" 
                            value={weights.group.ve} 
                            onChange={(e) => setWeights(prev => ({...prev, group: {...prev.group, ve: parseInt(e.target.value)}}))}
                            className="w-full"
                        />
                        <div className="text-right text-xs text-slate-500">Coef: {weights.group.ve} {totalGroupWeight > 0 ? `(${Math.round((weights.group.ve / totalGroupWeight) * 100)}%)` : ''}</div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Score Budget (PiXi)</label>
                        <input 
                            type="range" min="0" max="10" step="1" 
                            value={weights.group.budget} 
                            onChange={(e) => setWeights(prev => ({...prev, group: {...prev.group, budget: parseInt(e.target.value)}}))}
                            className="w-full"
                        />
                        <div className="text-right text-xs text-slate-500">Coef: {weights.group.budget} {totalGroupWeight > 0 ? `(${Math.round((weights.group.budget / totalGroupWeight) * 100)}%)` : ''}</div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                            <span>Plafond Budget (PiXi pour 20/20)</span>
                            <span className="text-xs font-normal text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Paramètre Algo</span>
                        </label>
                        <input 
                            type="number" min="100" step="100" 
                            value={weights.group.budgetMaxPixi || 5000} 
                            onChange={(e) => setWeights(prev => ({...prev, group: {...prev.group, budgetMaxPixi: parseInt(e.target.value) || 5000}}))}
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-slate-50"
                        />
                        <div className="text-xs text-slate-500 mt-1">Si l'agence a ≥ {weights.group.budgetMaxPixi || 5000} PiXi, elle aura 20/20 à la note de budget. (Défaut: 5000)</div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Livrables (Contrôle Continu)</label>
                        <input 
                            type="range" min="0" max="10" step="1" 
                            value={weights.group.deliverables || 0} 
                            onChange={(e) => setWeights(prev => ({...prev, group: {...prev.group, deliverables: parseInt(e.target.value)}}))}
                            className="w-full"
                        />
                        <div className="text-right text-xs text-slate-500">Coef: {weights.group.deliverables || 0} {totalGroupWeight > 0 ? `(${Math.round(((weights.group.deliverables || 0) / totalGroupWeight) * 100)}%)` : ''}</div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Évaluation IA (Référentiel)</label>
                        <input 
                            type="range" min="0" max="10" step="1" 
                            value={weights.group.ai} 
                            onChange={(e) => setWeights(prev => ({...prev, group: {...prev.group, ai: parseInt(e.target.value)}}))}
                            className="w-full"
                        />
                        <div className="text-right text-xs text-slate-500">Coef: {weights.group.ai} {totalGroupWeight > 0 ? `(${Math.round((weights.group.ai / totalGroupWeight) * 100)}%)` : ''}</div>
                    </div>
                </div>

                {/* Poids Individuel */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-slate-700 border-b pb-2">Pondération Individuelle</h4>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Score Individuel de Base</label>
                        <input 
                            type="range" min="0" max="10" step="1" 
                            value={weights.individual.baseScore} 
                            onChange={(e) => setWeights(prev => ({...prev, individual: {...prev.individual, baseScore: parseInt(e.target.value)}}))}
                            className="w-full"
                        />
                        <div className="text-right text-xs text-slate-500">Coef: {weights.individual.baseScore} {totalIndivWeight > 0 ? `(${Math.round((weights.individual.baseScore / totalIndivWeight) * 100)}%)` : ''}</div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Évaluation par les pairs</label>
                        <input 
                            type="range" min="0" max="10" step="1" 
                            value={weights.individual.peerReviews} 
                            onChange={(e) => setWeights(prev => ({...prev, individual: {...prev.individual, peerReviews: parseInt(e.target.value)}}))}
                            className="w-full"
                        />
                        <div className="text-right text-xs text-slate-500">Coef: {weights.individual.peerReviews} {totalIndivWeight > 0 ? `(${Math.round((weights.individual.peerReviews / totalIndivWeight) * 100)}%)` : ''}</div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Livrables (Contrôle Continu)</label>
                        <input 
                            type="range" min="0" max="10" step="1" 
                            value={weights.individual.deliverables || 0} 
                            onChange={(e) => setWeights(prev => ({...prev, individual: {...prev.individual, deliverables: parseInt(e.target.value)}}))}
                            className="w-full"
                        />
                        <div className="text-right text-xs text-slate-500">Coef: {weights.individual.deliverables || 0} {totalIndivWeight > 0 ? `(${Math.round(((weights.individual.deliverables || 0) / totalIndivWeight) * 100)}%)` : ''}</div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Évaluation IA (Référentiel)</label>
                        <input 
                            type="range" min="0" max="10" step="1" 
                            value={weights.individual.ai} 
                            onChange={(e) => setWeights(prev => ({...prev, individual: {...prev.individual, ai: parseInt(e.target.value)}}))}
                            className="w-full"
                        />
                        <div className="text-right text-xs text-slate-500">Coef: {weights.individual.ai} {totalIndivWeight > 0 ? `(${Math.round((weights.individual.ai / totalIndivWeight) * 100)}%)` : ''}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Données fournies à l'IA - Groupe */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-slate-700 border-b pb-2">Données fournies (Agence)</h4>
                    <div className="space-y-2">
                        {Object.entries({
                            ve: "Valeur d'Entreprise (VE)",
                            budget: "Budget (PiXi)",
                            projectDef: "Définition du Projet (Concept, Cible, Problème)",
                            deliverables: "Livrables (Feedback & Commentaires)",
                            events: "Événements (Log)"
                        }).map(([key, label]) => (
                            <label key={key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={dataConfig.group[key as keyof typeof dataConfig.group]}
                                    onChange={() => handleDataConfigChange('group', key)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                {label}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Données fournies à l'IA - Individuel */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-slate-700 border-b pb-2">Données fournies (Étudiant)</h4>
                    <div className="space-y-2">
                        {Object.entries({
                            role: "Rôle dans l'agence",
                            individualScore: "Score Individuel",
                            wallet: "Portefeuille (PiXi)",
                            history: "Historique des agences",
                            peerReviews: "Évaluations des pairs",
                            adminNotes: "Notes pédagogiques (Admin)"
                        }).map(([key, label]) => (
                            <label key={key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={dataConfig.individual[key as keyof typeof dataConfig.individual]}
                                    onChange={() => handleDataConfigChange('individual', key)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                {label}
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Référentiel */}
            <div className="mt-8 space-y-6">
                <div>
                    <h4 className="font-semibold text-slate-700 border-b pb-2 mb-4">Référentiel de Compétences</h4>
                    <textarea 
                        className="w-full h-48 p-4 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        value={referentialRules}
                        onChange={(e) => setReferentialRules(e.target.value)}
                        placeholder="Collez ici les règles d'évaluation ou le référentiel de compétences..."
                    />
                    <p className="text-xs text-slate-500 mt-2">
                        Ce texte sera utilisé comme contexte principal par l'IA pour évaluer les agences et les étudiants.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-semibold text-slate-700 border-b pb-2 mb-4">Prompt Évaluation Groupe</h4>
                        <textarea 
                            className="w-full h-64 p-4 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={groupPrompt}
                            onChange={(e) => setGroupPrompt(e.target.value)}
                            placeholder="Prompt pour l'évaluation de l'agence..."
                        />
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-700 border-b pb-2 mb-4">Prompt Évaluation Individuelle</h4>
                        <textarea 
                            className="w-full h-64 p-4 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={individualPrompt}
                            onChange={(e) => setIndividualPrompt(e.target.value)}
                            placeholder="Prompt pour l'évaluation de l'étudiant..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
