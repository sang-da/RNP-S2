import React, { useState, useEffect } from 'react';
import { useGame } from '../../../contexts/GameContext';
import { useUI } from '../../../contexts/UIContext';
import { JuryPortfolioItem } from '../../../types';
import { Eye, EyeOff, Save, GripVertical, AlertCircle } from 'lucide-react';

interface JuryPortfolioConfigProps {
    readOnly?: boolean;
}

export const JuryPortfolioConfig: React.FC<JuryPortfolioConfigProps> = ({ readOnly }) => {
    const { gameConfig, updateGameConfig, weeks } = useGame();
    const { toast } = useUI();
    
    const [portfolioItems, setPortfolioItems] = useState<JuryPortfolioItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Initialize or load configuration
    useEffect(() => {
        // Collect all unique deliverables from the weeks
        const allDeliverableNames = new Set<string>();
        Object.values(weeks).forEach(week => {
            week.deliverables.forEach(d => allDeliverableNames.add(d.name));
        });

        const currentConfig = gameConfig.juryPortfolio || [];
        
        // Rebuild the list: include what we have in config, add missing ones at the end
        const newPortfolio: JuryPortfolioItem[] = [];
        
        // Add from config first to maintain order
        let orderCounter = 0;
        currentConfig.forEach(item => {
            if (allDeliverableNames.has(item.name)) {
                newPortfolio.push({ ...item, order: orderCounter++ });
                allDeliverableNames.delete(item.name);
            }
        });
        
        // Add remaining deliverables that were not in the config (new ones) visible by default
        Array.from(allDeliverableNames).forEach(name => {
            newPortfolio.push({ name, isVisible: true, order: orderCounter++ });
        });

        setPortfolioItems(newPortfolio.sort((a, b) => a.order - b.order));
    }, [gameConfig.juryPortfolio, weeks]);

    const handleToggleVisibility = (name: string) => {
        if (readOnly) return;
        setPortfolioItems(prev => prev.map(item => 
            item.name === name ? { ...item, isVisible: !item.isVisible } : item
        ));
    };

    const handleMoveItem = (index: number, direction: 'up' | 'down') => {
        if (readOnly) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === portfolioItems.length - 1) return;

        const newItems = [...portfolioItems];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        
        // Swap
        const temp = newItems[index];
        newItems[index] = newItems[swapIndex];
        newItems[swapIndex] = temp;
        
        // Update order values
        newItems.forEach((item, idx) => item.order = idx);
        
        setPortfolioItems(newItems);
    };

    const handleSave = async () => {
        if (readOnly) return;
        setIsSaving(true);
        try {
            await updateGameConfig({
                juryPortfolio: portfolioItems
            });
            toast('success', "Configuration du Portfolio Jury enregistrée !");
        } catch (e) {
            toast('error', "Erreur lors de la sauvegarde du portfolio.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-3xl">
            <h3 className="font-bold text-slate-800 mb-2">Visibilité & Ordre des Livrables</h3>
            <p className="text-sm text-slate-500 mb-6">
                Le jury n'a pas besoin de consulter tous les livrables. Déterminez quels fichiers leur seront présentés, 
                et dans quel ordre d'importance (les plus pertinents en premier).
            </p>

            <div className="space-y-3 mb-6">
                {portfolioItems.length === 0 ? (
                    <div className="p-4 bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center gap-2">
                        <AlertCircle size={18} /> Aucun livrable trouvé dans les cycles.
                    </div>
                ) : (
                    portfolioItems.map((item, index) => (
                        <div key={item.name} className={`flex items-center justify-between p-3 rounded-xl border ${item.isVisible ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-dashed border-slate-200 opacity-60'}`}>
                            
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col gap-1 items-center justify-center mr-2">
                                    <button 
                                        onClick={() => handleMoveItem(index, 'up')} 
                                        disabled={index === 0 || readOnly}
                                        className="text-slate-300 hover:text-indigo-500 disabled:opacity-20 cursor-pointer p-0.5"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                                    </button>
                                    <button 
                                        onClick={() => handleMoveItem(index, 'down')} 
                                        disabled={index === portfolioItems.length - 1 || readOnly}
                                        className="text-slate-300 hover:text-indigo-500 disabled:opacity-20 cursor-pointer p-0.5"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                    </button>
                                </div>
                                <div className="font-medium text-slate-800 text-sm">{item.name}</div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 w-16 text-right">
                                    {item.isVisible ? 'Visible' : 'Masqué'}
                                </span>
                                <button
                                    onClick={() => handleToggleVisibility(item.name)}
                                    disabled={readOnly}
                                    className={`p-2 rounded-lg transition-colors ${item.isVisible ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                                >
                                    {item.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {!readOnly && (
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full flex justify-center items-center gap-2 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                >
                    <Save size={18} /> {isSaving ? "Sauvegarde..." : "Enregistrer l'ordre et la visibilité"}
                </button>
            )}
        </div>
    );
};
