
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
