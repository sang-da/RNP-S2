
import React, { useEffect } from 'react';
import { WeekModule, Deliverable, DeliverableType } from '../../../types';
import { CheckSquare, Plus, Trash2, Globe, Settings2, Calculator, AlertTriangle, Target } from 'lucide-react';

interface ContentFormProps {
    contentForm: WeekModule;
    setContentForm: (form: WeekModule) => void;
    addDeliverable: () => void;
    removeDeliverable: (index: number) => void;
}

const DELIVERABLE_TYPES: { value: DeliverableType, label: string }[] = [
    { value: 'FILE', label: '📄 Fichier Standard' },
    { value: 'LINK', label: '🔗 Lien Externe' },
    { value: 'SPECIAL_LOGO', label: '🎨 Logo Agence' },
    { value: 'SPECIAL_BANNER', label: '🖼️ Bannière Agence' },
    { value: 'FORM_CHARTER', label: '📝 Charte Projet' },
    { value: 'FORM_NAMING', label: '🏷️ Nom du Studio' },
];

export const ContentForm: React.FC<ContentFormProps> = ({ contentForm, setContentForm, addDeliverable, removeDeliverable }) => {
    
    useEffect(() => {
        if (!contentForm.scoring) {
            setContentForm({
                ...contentForm,
                scoring: {
                    pointsA: 10,
                    pointsB: 4,
                    penaltyLatePerDay: 5,
                    penaltyConstraint: 10,
                    expectedTargetVE: 10
                }
            });
        }
    }, []);

    const handleContentChange = (field: string, value: any) => {
        setContentForm({ ...contentForm, [field]: value });
    };

    const handleScoringChange = (field: string, value: number) => {
        if (!contentForm.scoring) return;
        setContentForm({
            ...contentForm,
            scoring: {
                ...contentForm.scoring,
                [field]: value
            }
        });
    };

    const handleMissingReviewPenaltyChange = (field: string, value: any) => {
        if (!contentForm.scoring) return;
        const currentPenalty = contentForm.scoring.missingReviewPenalty || { enabled: false, amount: 0, type: 'VE' };
        
        setContentForm({
            ...contentForm,
            scoring: {
                ...contentForm.scoring,
                missingReviewPenalty: {
                    ...currentPenalty,
                    [field]: value
                }
            }
        });
    };

    const handleDeliverableChange = (index: number, field: keyof Deliverable, value: any) => {
        const newDeliverables = [...contentForm.deliverables];
        newDeliverables[index] = { ...newDeliverables[index], [field]: value };
        setContentForm({ ...contentForm, deliverables: newDeliverables });
    };

    return (
        <div className="mb-6 space-y-6 animate-in slide-in-from-top-4">
            {/* PARAMETRES ECONOMIQUES */}
            {contentForm.scoring && (
                <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-700 shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-indigo-500 rounded-lg text-white"><Calculator size={18}/></div>
                            <h4 className="font-bold text-lg">Algorithme de Notation</h4>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                            <Target size={14} className="text-yellow-400"/>
                            <label className="text-[10px] font-bold uppercase text-slate-300">Points Attendus :</label>
                            <input 
                                type="number" 
                                value={contentForm.scoring.expectedTargetVE} 
                                onChange={(e) => handleScoringChange('expectedTargetVE', Number(e.target.value))}
                                className="w-12 bg-transparent text-center font-bold text-yellow-400 focus:outline-none"
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Gain Grade A</label>
                            <input 
                                type="number" 
                                value={contentForm.scoring.pointsA} 
                                onChange={(e) => handleScoringChange('pointsA', Number(e.target.value))}
                                className="w-full p-2 bg-white/5 border border-white/10 rounded-xl text-center font-bold text-emerald-400 focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Gain Grade B</label>
                            <input 
                                type="number" 
                                value={contentForm.scoring.pointsB} 
                                onChange={(e) => handleScoringChange('pointsB', Number(e.target.value))}
                                className="w-full p-2 bg-white/5 border border-white/10 rounded-xl text-center font-bold text-amber-400 focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Malus Retard (/j)</label>
                            <input 
                                type="number" 
                                value={contentForm.scoring.penaltyLatePerDay} 
                                onChange={(e) => handleScoringChange('penaltyLatePerDay', Number(e.target.value))}
                                className="w-full p-2 bg-white/5 border border-white/10 rounded-xl text-center font-bold text-red-400 focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Malus Contrainte</label>
                            <input 
                                type="number" 
                                value={contentForm.scoring.penaltyConstraint} 
                                onChange={(e) => handleScoringChange('penaltyConstraint', Number(e.target.value))}
                                className="w-full p-2 bg-white/5 border border-white/10 rounded-xl text-center font-bold text-red-400 focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* PENALITE PEER REVIEW */}
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={16} className="text-orange-400"/>
                                <h5 className="font-bold text-sm text-slate-200">Pénalité Peer Review Manquante</h5>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={contentForm.scoring.missingReviewPenalty?.enabled || false}
                                    onChange={(e) => handleMissingReviewPenaltyChange('enabled', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                        
                        {(contentForm.scoring.missingReviewPenalty?.enabled) && (
                            <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl">
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Montant</label>
                                    <input 
                                        type="number" 
                                        value={contentForm.scoring.missingReviewPenalty?.amount || 0} 
                                        onChange={(e) => handleMissingReviewPenaltyChange('amount', Number(e.target.value))}
                                        className="w-full p-2 bg-slate-800 border border-white/10 rounded-xl text-center font-bold text-orange-400 focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Type</label>
                                    <select 
                                        value={contentForm.scoring.missingReviewPenalty?.type || 'VE'} 
                                        onChange={(e) => handleMissingReviewPenaltyChange('type', e.target.value)}
                                        className="w-full p-2 bg-slate-800 border border-white/10 rounded-xl text-center font-bold text-white focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="VE">VE (Agence)</option>
                                        <option value="score">Note (Individuel)</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Titre de la Phase</label>
                        <input type="text" value={contentForm.title} onChange={(e) => handleContentChange('title', e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"/>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Type de Contenu</label>
                        <select value={contentForm.type} onChange={(e) => handleContentChange('type', e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm">
                            <option value="FUN/CHILL">FUN/CHILL</option>
                            <option value="THÉORIE">THÉORIE</option>
                            <option value="TECHNIQUE">TECHNIQUE</option>
                            <option value="JURY">JURY</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm"><CheckSquare size={16} className="text-indigo-600"/> Missions & Livrables attendus</h4>
                <div className="space-y-4">
                    {contentForm.deliverables.map((del, idx) => (
                        <div key={idx} className="flex gap-4 items-start bg-slate-50 p-4 rounded-2xl border border-slate-200 group">
                            <div className="flex-1 space-y-3">
                                <div className="flex gap-3">
                                    <input 
                                        type="text" 
                                        value={del.name} 
                                        onChange={(e) => handleDeliverableChange(idx, 'name', e.target.value)}
                                        className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-sm font-bold shadow-inner"
                                        placeholder="Nom du livrable"
                                    />
                                    <select 
                                        value={del.type || 'FILE'} 
                                        onChange={(e) => handleDeliverableChange(idx, 'type', e.target.value)}
                                        className="w-40 p-2 border border-slate-200 rounded-lg text-xs font-bold bg-white"
                                    >
                                        {DELIVERABLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <textarea 
                                    value={del.description} 
                                    onChange={(e) => handleDeliverableChange(idx, 'description', e.target.value)}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs min-h-[60px] shadow-inner"
                                    placeholder="Précisez les attentes pour ce livrable..."
                                />
                            </div>
                            <button onClick={() => removeDeliverable(idx)} className="text-slate-300 hover:text-red-500 p-2 transition-colors"><Trash2 size={20}/></button>
                        </div>
                    ))}
                </div>
                <button onClick={addDeliverable} className="mt-6 w-full py-4 border-2 border-dashed border-slate-200 text-slate-400 font-bold rounded-2xl hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                    <Plus size={20}/> Ajouter un Livrable à la Phase
                </button>
            </div>
            
            <div className="bg-indigo-50 text-indigo-700 p-4 rounded-2xl text-xs flex gap-3 items-center border border-indigo-100">
                <Globe size={18} className="shrink-0"/>
                <p>En enregistrant, ces paramètres de notation et missions seront appliqués à <strong>toutes les agences</strong>. Utilisez cela pour augmenter la difficulté globale du semestre au fur et à mesure.</p>
            </div>
        </div>
    );
};
