import React from 'react';
import { Settings } from 'lucide-react';

interface EvaluationSettingsProps {
    weights: {
        group: { ve: number, budget: number, ai: number },
        individual: { baseScore: number, peerReviews: number, ai: number }
    };
    setWeights: React.Dispatch<React.SetStateAction<{
        group: { ve: number, budget: number, ai: number },
        individual: { baseScore: number, peerReviews: number, ai: number }
    }>>;
    referentialRules: string;
    setReferentialRules: (rules: string) => void;
}

export const EvaluationSettings: React.FC<EvaluationSettingsProps> = ({
    weights,
    setWeights,
    referentialRules,
    setReferentialRules
}) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 animate-in slide-in-from-top-4">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Settings size={20} className="text-slate-500" />
                Paramètres d'évaluation
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                        <div className="text-right text-xs text-slate-500">Poids: {weights.group.ve}</div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Score Budget (PiXi)</label>
                        <input 
                            type="range" min="0" max="10" step="1" 
                            value={weights.group.budget} 
                            onChange={(e) => setWeights(prev => ({...prev, group: {...prev.group, budget: parseInt(e.target.value)}}))}
                            className="w-full"
                        />
                        <div className="text-right text-xs text-slate-500">Poids: {weights.group.budget}</div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Évaluation IA (Référentiel)</label>
                        <input 
                            type="range" min="0" max="10" step="1" 
                            value={weights.group.ai} 
                            onChange={(e) => setWeights(prev => ({...prev, group: {...prev.group, ai: parseInt(e.target.value)}}))}
                            className="w-full"
                        />
                        <div className="text-right text-xs text-slate-500">Poids: {weights.group.ai}</div>
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
                        <div className="text-right text-xs text-slate-500">Poids: {weights.individual.baseScore}</div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Évaluation par les pairs</label>
                        <input 
                            type="range" min="0" max="10" step="1" 
                            value={weights.individual.peerReviews} 
                            onChange={(e) => setWeights(prev => ({...prev, individual: {...prev.individual, peerReviews: parseInt(e.target.value)}}))}
                            className="w-full"
                        />
                        <div className="text-right text-xs text-slate-500">Poids: {weights.individual.peerReviews}</div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Évaluation IA (Référentiel)</label>
                        <input 
                            type="range" min="0" max="10" step="1" 
                            value={weights.individual.ai} 
                            onChange={(e) => setWeights(prev => ({...prev, individual: {...prev.individual, ai: parseInt(e.target.value)}}))}
                            className="w-full"
                        />
                        <div className="text-right text-xs text-slate-500">Poids: {weights.individual.ai}</div>
                    </div>
                </div>
            </div>

            {/* Référentiel */}
            <div className="mt-8">
                <h4 className="font-semibold text-slate-700 border-b pb-2 mb-4">Référentiel de Compétences (Prompt IA)</h4>
                <textarea 
                    className="w-full h-64 p-4 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={referentialRules}
                    onChange={(e) => setReferentialRules(e.target.value)}
                    placeholder="Collez ici les règles d'évaluation ou le référentiel de compétences..."
                />
                <p className="text-xs text-slate-500 mt-2">
                    Ce texte sera utilisé comme contexte principal par l'IA pour évaluer les agences et les étudiants.
                </p>
            </div>
        </div>
    );
};
