import React, { useState, useEffect } from 'react';
import { useGame } from '../../../contexts/GameContext';
import { useUI } from '../../../contexts/UIContext';
import { JuryPortfolioItem } from '../../../types';
import { Eye, EyeOff, Save, GripVertical, AlertCircle, FileText, Image as ImageIcon, Link as LinkIcon, Download, Presentation, Gavel, ExternalLink } from 'lucide-react';

interface JuryPortfolioConfigProps {
    readOnly?: boolean;
}

export const JuryPortfolioConfig: React.FC<JuryPortfolioConfigProps> = ({ readOnly }) => {
    const { gameConfig, updateGameConfig, weeks } = useGame();
    const { toast } = useUI();
    
    const [portfolioItems, setPortfolioItems] = useState<JuryPortfolioItem[]>([]);
    const [deliverableTypes, setDeliverableTypes] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [draggedItem, setDraggedItem] = useState<string | null>(null);

    // Initialize or load configuration
    useEffect(() => {
        const allDelivTypes: Record<string, string> = {};
        const allDeliverableNames = new Set<string>();
        Object.values(weeks).forEach(week => {
            week.deliverables.forEach(d => {
                allDeliverableNames.add(d.name);
                allDelivTypes[d.name] = d.type;
            });
        });
        setDeliverableTypes(allDelivTypes);

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
        
        // Add remaining deliverables (new ones) visible by default
        Array.from(allDeliverableNames).forEach(name => {
            newPortfolio.push({ name, isVisible: true, order: orderCounter++ });
        });

        setPortfolioItems(newPortfolio.sort((a, b) => a.order - b.order));
    }, [gameConfig.juryPortfolio, weeks]);

    const handleToggleVisibility = (name: string) => {
        if (readOnly) return;
        setPortfolioItems(prev => {
            const newItems = prev.map(item => 
                item.name === name ? { ...item, isVisible: !item.isVisible } : item
            );
            // Re-order so toggled items go to the end of their respective lists conceptually
            // Though keeping order mostly intact is fine, dragging covers full order control
            return newItems;
        });
    };

    const handleMoveByDirection = (name: string, direction: 'up' | 'down') => {
        if (readOnly) return;
        setPortfolioItems(prev => {
            const newItems = [...prev];
            const itemIdx = newItems.findIndex(i => i.name === name);
            if (itemIdx === -1) return prev;
            const isVisible = newItems[itemIdx].isVisible;
            
            const groupIndices = newItems.map((item, idx) => ({ item, idx }))
                                    .filter(x => x.item.isVisible === isVisible)
                                    .map(x => x.idx);
            
            const positionInGroup = groupIndices.indexOf(itemIdx);
            if (direction === 'up' && positionInGroup === 0) return prev;
            if (direction === 'down' && positionInGroup === groupIndices.length - 1) return prev;
            
            const swapWithGroupPos = direction === 'up' ? positionInGroup - 1 : positionInGroup + 1;
            const swapWithAbsoluteIdx = groupIndices[swapWithGroupPos];
            
            const temp = newItems[itemIdx];
            newItems[itemIdx] = newItems[swapWithAbsoluteIdx];
            newItems[swapWithAbsoluteIdx] = temp;
            
            newItems.forEach((item, idx) => item.order = idx);
            return newItems;
        });
    };

    // --- Drag and Drop Handlers ---
    const handleDragStart = (e: React.DragEvent, name: string) => {
        if (readOnly) return;
        setDraggedItem(name);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => {
            const el = document.getElementById(`deliv-${name}`);
            if (el) el.classList.add('opacity-40');
        }, 0);
    };

    const handleDragEnd = (name: string) => {
        setDraggedItem(null);
        const el = document.getElementById(`deliv-${name}`);
        if (el) el.classList.remove('opacity-40');
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDropOnItem = (e: React.DragEvent, targetName: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!draggedItem || draggedItem === targetName || readOnly) {
            if (draggedItem) handleDragEnd(draggedItem);
            return;
        }

        setPortfolioItems(prev => {
            const newItems = [...prev];
            const sourceIdx = newItems.findIndex(i => i.name === draggedItem);
            if (sourceIdx === -1) return prev;

            const [removed] = newItems.splice(sourceIdx, 1);
            
            const adjustedTargetIdx = newItems.findIndex(i => i.name === targetName);
            if (adjustedTargetIdx === -1) {
                newItems.push(removed);
            } else {
                removed.isVisible = newItems[adjustedTargetIdx].isVisible;
                newItems.splice(adjustedTargetIdx, 0, removed);
            }
            
            newItems.forEach((item, idx) => item.order = idx);
            return newItems;
        });
        handleDragEnd(draggedItem);
    };

    const handleDropOnList = (e: React.DragEvent, isVisibleList: boolean) => {
        e.preventDefault();
        if (!draggedItem || readOnly) {
            if (draggedItem) handleDragEnd(draggedItem);
            return;
        }

        setPortfolioItems(prev => {
            const newItems = [...prev];
            const sourceIdx = newItems.findIndex(i => i.name === draggedItem);
            if (sourceIdx === -1) return prev;
            
            const [removed] = newItems.splice(sourceIdx, 1);
            removed.isVisible = isVisibleList;
            
            if (isVisibleList) {
                let insertAt = 0;
                for(let i=0; i<newItems.length; i++) {
                    if (newItems[i].isVisible) insertAt = i + 1;
                }
                newItems.splice(insertAt, 0, removed);
            } else {
                newItems.push(removed);
            }

            newItems.forEach((item, idx) => item.order = idx);
            return newItems;
        });
        handleDragEnd(draggedItem);
    };

    const handleSave = async () => {
        if (readOnly) return;
        setIsSaving(true);
        try {
            await updateGameConfig({
                juryPortfolio: portfolioItems
            });
            toast('success', "Ordre et visibilité enregistrés avec succès !");
        } catch (e) {
            toast('error', "Erreur lors de la sauvegarde du portfolio.");
        } finally {
            setIsSaving(false);
        }
    };

    const visibleItems = portfolioItems.filter(i => i.isVisible);
    const hiddenItems = portfolioItems.filter(i => !i.isVisible);

    const renderIcon = (type?: string) => {
        switch (type) {
            case 'document': return <FileText size={20} />;
            case 'image': return <ImageIcon size={20} />;
            case 'link': return <LinkIcon size={20} />;
            case 'presentation': return <Presentation size={20} />;
            default: return <FileText size={20} />;
        }
    };

    const renderConfigItem = (item: JuryPortfolioItem, isVisible: boolean, indexInGroup: number, totalInGroup: number) => (
        <div 
            key={item.name} 
            id={`deliv-${item.name}`}
            draggable={!readOnly}
            onDragStart={(e) => handleDragStart(e, item.name)}
            onDragEnd={() => handleDragEnd(item.name)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropOnItem(e, item.name)}
            className={`flex items-center justify-between p-3 rounded-xl border mb-2 transition-all cursor-grab active:cursor-grabbing ${isVisible ? 'bg-white border-slate-200 shadow-sm hover:shadow-md' : 'bg-slate-50 border-dashed border-slate-200 hover:bg-slate-100 hover:border-slate-300'}`}
        >
            <div className="flex flex-col gap-0 border-r border-slate-100 pr-2 mr-3 shrink-0">
                <button 
                    onClick={() => handleMoveByDirection(item.name, 'up')} 
                    disabled={indexInGroup === 0 || readOnly}
                    className="text-slate-300 hover:text-indigo-500 disabled:opacity-20 p-0.5"
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                </button>
                <div className="flex justify-center text-slate-300 items-center h-4">
                    <GripVertical size={16} />
                </div>
                <button 
                    onClick={() => handleMoveByDirection(item.name, 'down')} 
                    disabled={indexInGroup === totalInGroup - 1 || readOnly}
                    className="text-slate-300 hover:text-indigo-500 disabled:opacity-20 p-0.5"
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>
            </div>

            <div className="font-bold text-slate-800 text-sm leading-tight flex-1">
                {item.name}
            </div>
            
            <div className="flex items-center gap-2 pl-3">
                <button
                    onClick={() => handleToggleVisibility(item.name)}
                    disabled={readOnly}
                    title={isVisible ? "Masquer ce livrable" : "Afficher ce livrable"}
                    className={`p-2 shrink-0 rounded-lg transition-colors ${isVisible ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-slate-300 text-slate-600 hover:bg-slate-400'}`}
                >
                    {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
            </div>
        </div>
    );

    const renderPreviewCard = (item: JuryPortfolioItem) => {
        const type = deliverableTypes[item.name] || 'document';
        return (
            <div key={item.name} className="flex flex-col p-4 bg-white rounded-2xl border border-slate-200 shadow-sm opacity-95 transition-all w-full">
                <div className="flex items-start justify-between mb-2">
                    <div className="p-2 bg-slate-100/80 rounded-xl text-slate-500">
                        {renderIcon(type)}
                    </div>
                    <div className="flex gap-1.5 mt-1">
                        <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                        <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                        <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                    </div>
                </div>
                <div className="font-bold text-slate-800 text-sm leading-tight truncate">{item.name}</div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>Aperçu Document</span>
                    <ExternalLink size={12}/>
                </div>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start mb-8 animate-in fade-in">
            {/* Left Col: Setup */}
            <div className="xl:col-span-3 space-y-6">
                <div>
                    <h3 className="font-bold text-slate-800 mb-2">Structure du Portfolio</h3>
                    <p className="text-sm text-slate-500">
                        Glissez-déposez les livrables dans la section de votre choix pour définir leur visibilité, 
                        et réorganisez-les pour créer un flux cohérent lors de la soutenance.
                    </p>
                </div>
                
                {/* Lists Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* VISIBLE LIST */}
                    <div 
                        className="bg-indigo-50/30 p-4 rounded-3xl border border-indigo-100 shadow-sm min-h-[300px] flex flex-col"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnList(e, true)}
                    >
                        <h4 className="font-bold text-indigo-900 mb-4 flex items-center justify-between border-b border-indigo-100/50 pb-3">
                            <span className="flex items-center gap-2"><Eye size={18} className="text-indigo-500" /> Ordre Jury</span>
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{visibleItems.length}</span>
                        </h4>
                        <div className="flex-1">
                            {visibleItems.length === 0 ? (
                                <div className="text-sm text-indigo-300 font-medium italic text-center p-8 border-2 border-dashed border-indigo-100 rounded-xl">Glissez des éléments ici pour les rendre visibles</div>
                            ) : (
                                visibleItems.map((item, idx) => renderConfigItem(item, true, idx, visibleItems.length))
                            )}
                        </div>
                    </div>

                    {/* HIDDEN LIST */}
                    <div 
                        className="bg-slate-100/50 p-4 rounded-3xl border border-slate-200 min-h-[300px] flex flex-col"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnList(e, false)}
                    >
                        <h4 className="font-bold text-slate-600 mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                            <span className="flex items-center gap-2"><EyeOff size={18} className="text-slate-400" /> Archives / Masqués</span>
                            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{hiddenItems.length}</span>
                        </h4>
                        <div className="flex-1">
                            {hiddenItems.length === 0 ? (
                                <div className="text-sm text-slate-400 font-medium italic text-center p-8 border-2 border-dashed border-slate-200 rounded-xl">Tous les livrables sont configurés pour être visibles.</div>
                            ) : (
                                hiddenItems.map((item, idx) => renderConfigItem(item, false, idx, hiddenItems.length))
                            )}
                        </div>
                    </div>
                </div>

                {!readOnly && (
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full flex justify-center items-center gap-2 py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 hover:shadow-md transition-all active:scale-[0.99]"
                    >
                        <Save size={20} /> {isSaving ? "Sauvegarde en cours..." : "Enregistrer la structure du Portfolio"}
                    </button>
                )}
            </div>

            {/* Right Col: Live Preview */}
            <div className="xl:col-span-2 bg-slate-100/80 p-6 sm:p-8 rounded-3xl border border-slate-200 sticky top-24 shadow-inner">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-1">
                            <span className="p-1.5 bg-pink-100 text-pink-600 rounded-lg"><Gavel size={18}/></span> 
                            Simulation Interface Jury
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">Visualisation de la grille projetée aux investisseurs</p>
                    </div>
                </div>
                
                {/* MOCK UI Container mimicking the jury dashboard */}
                <div className="bg-slate-50 rounded-2xl shadow border border-slate-200 overflow-hidden transform-gpu">
                    {/* Header Mock */}
                    <div className="bg-white/80 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center border border-pink-200">
                                <Gavel size={16} />
                            </div>
                            <div className="font-bold text-slate-800 text-sm">Dashboard Jury</div>
                        </div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Aperçu</div>
                    </div>

                    {/* Content Mock */}
                    <div className="p-4 max-h-[450px] overflow-y-auto hidden-scrollbar">
                        {visibleItems.length === 0 ? (
                            <div className="p-6 text-center bg-slate-100/50 rounded-xl border border-slate-200 border-dashed">
                                <FileText className="mx-auto text-slate-300 mb-2" size={24} />
                                <p className="text-xs text-slate-400 italic">Plateforme vide.<br/>Aucun rendu à analyser.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {visibleItems.map(renderPreviewCard)}
                            </div>
                        )}
                    </div>
                </div>
                <p className="text-center text-[10px] text-slate-400 mt-4 uppercase tracking-widest font-bold">Uniquement les cartes visibles ({visibleItems.length})</p>
            </div>
        </div>
    );
};
