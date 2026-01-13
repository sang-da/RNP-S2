
import React from 'react';
import { WeekModule, Deliverable } from '../../../types';
import { CheckSquare, Plus, Trash2, Globe } from 'lucide-react';

interface ContentFormProps {
    contentForm: WeekModule;
    setContentForm: (form: WeekModule) => void;
    addDeliverable: () => void;
    removeDeliverable: (index: number) => void;
}

export const ContentForm: React.FC<ContentFormProps> = ({ contentForm, setContentForm, addDeliverable, removeDeliverable }) => {
    
    const handleContentChange = (field: string, value: any) => {
        setContentForm({ ...contentForm, [field]: value });
    };

    const handleDeliverableChange = (index: number, field: keyof Deliverable, value: any) => {
        const newDeliverables = [...contentForm.deliverables];
        newDeliverables[index] = { ...newDeliverables[index], [field]: value };
        setContentForm({ ...contentForm, deliverables: newDeliverables });
    };

    return (
        <div className="mb-6 space-y-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">Titre Semaine</label>
                    <input type="text" value={contentForm.title} onChange={(e) => handleContentChange('title', e.target.value)} className="w-full p-2 rounded-lg border border-slate-300 font-bold"/>
                </div>
                <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">Type</label>
                    <select value={contentForm.type} onChange={(e) => handleContentChange('type', e.target.value)} className="w-full p-2 rounded-lg border border-slate-300 bg-white">
                        <option value="FUN/CHILL">FUN/CHILL</option>
                        <option value="THÉORIE">THÉORIE</option>
                        <option value="TECHNIQUE">TECHNIQUE</option>
                        <option value="JURY">JURY</option>
                    </select>
                </div>
            </div>

            <div>
                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2 text-sm"><CheckSquare size={16}/> Livrables (Missions)</h4>
                <div className="space-y-3">
                    {contentForm.deliverables.map((del, idx) => (
                        <div key={idx} className="flex gap-3 items-start bg-white p-3 rounded-xl border border-slate-200">
                            <div className="flex-1 space-y-2">
                                <input 
                                type="text" 
                                value={del.name} 
                                onChange={(e) => handleDeliverableChange(idx, 'name', e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold placeholder-slate-300"
                                placeholder="Nom de la mission"
                                />
                                <textarea 
                                value={del.description} 
                                onChange={(e) => handleDeliverableChange(idx, 'description', e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg text-xs min-h-[40px] placeholder-slate-300"
                                placeholder="Description..."
                                />
                                <div className="flex gap-2">
                                    <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-1 rounded font-mono">ID: {del.id}</span>
                                </div>
                            </div>
                            <button onClick={() => removeDeliverable(idx)} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>
                <button onClick={addDeliverable} className="mt-3 w-full py-2 border-2 border-dashed border-slate-300 text-slate-400 font-bold rounded-xl hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 flex items-center justify-center gap-2 text-sm">
                    <Plus size={16}/> Ajouter une Mission
                </button>
            </div>
            
            <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-xs flex gap-2 items-center">
                <Globe size={16}/>
                En cliquant sur "Publier & Sync", toutes les agences recevront instantanément cette nouvelle structure.
            </div>
        </div>
    );
};
