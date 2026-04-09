import React, { useState, useEffect } from 'react';
import { X, Save, BrainCircuit, Plus, Trash2 } from 'lucide-react';

interface DeliverableMappingModalProps {
    isOpen: boolean;
    onClose: () => void;
    mapping: Record<string, string[]>;
    onSave: (newMapping: Record<string, string[]>) => void;
    onGenerate: () => void;
    isGenerating: boolean;
}

export const DeliverableMappingModal: React.FC<DeliverableMappingModalProps> = ({
    isOpen,
    onClose,
    mapping,
    onSave,
    onGenerate,
    isGenerating
}) => {
    const [localMapping, setLocalMapping] = useState<Record<string, string[]>>({});
    const [newDeliverableName, setNewDeliverableName] = useState('');

    useEffect(() => {
        if (isOpen) {
            setLocalMapping(mapping);
        }
    }, [isOpen, mapping]);

    if (!isOpen) return null;

    const handleCriteriaChange = (deliverable: string, value: string) => {
        // Parse comma separated values
        const criteriaArray = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
        setLocalMapping(prev => ({
            ...prev,
            [deliverable]: criteriaArray
        }));
    };

    const handleAddDeliverable = () => {
        if (newDeliverableName.trim() && !localMapping[newDeliverableName.trim()]) {
            setLocalMapping(prev => ({
                ...prev,
                [newDeliverableName.trim()]: []
            }));
            setNewDeliverableName('');
        }
    };

    const handleDeleteDeliverable = (deliverable: string) => {
        setLocalMapping(prev => {
            const newMap = { ...prev };
            delete newMap[deliverable];
            return newMap;
        });
    };

    const handleSave = () => {
        onSave(localMapping);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Matrice Livrables / Critères</h2>
                        <p className="text-sm text-slate-500 mt-1">Associez chaque livrable aux critères du référentiel qu'il impacte.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <button 
                        onClick={onGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                    >
                        <BrainCircuit size={18} className={isGenerating ? "animate-pulse" : ""} />
                        {isGenerating ? "Génération en cours..." : "Générer avec l'IA"}
                    </button>
                    <div className="text-sm text-slate-500">
                        Séparez les identifiants de critères par des virgules (ex: 1.1, 2.3)
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {Object.keys(localMapping).length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            Aucune matrice définie. Générez-la avec l'IA ou ajoutez des livrables manuellement.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(localMapping).map(([deliverable, criteria]) => (
                                <div key={deliverable} className="flex items-start gap-4 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                    <div className="flex-1">
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">{deliverable}</label>
                                        <input 
                                            type="text" 
                                            value={criteria.join(', ')}
                                            onChange={(e) => handleCriteriaChange(deliverable, e.target.value)}
                                            placeholder="Ex: 1.1, 2.3"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteDeliverable(deliverable)}
                                        className="mt-6 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                        title="Supprimer"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-6 flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg border-dashed">
                        <input 
                            type="text" 
                            value={newDeliverableName}
                            onChange={(e) => setNewDeliverableName(e.target.value)}
                            placeholder="Nom du nouveau livrable..."
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddDeliverable()}
                        />
                        <button 
                            onClick={handleAddDeliverable}
                            disabled={!newDeliverableName.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50"
                        >
                            <Plus size={18} />
                            Ajouter
                        </button>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-lg font-medium transition-colors"
                    >
                        Annuler
                    </button>
                    <button 
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium shadow-sm"
                    >
                        <Save size={18} />
                        Enregistrer la matrice
                    </button>
                </div>
            </div>
        </div>
    );
};
