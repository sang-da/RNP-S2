import React, { useState, useEffect } from 'react';
import { ShopItem, ShopItemType } from '../../../types';
import { X, Gavel, ShoppingCart } from 'lucide-react';

interface ShopItemModalProps {
    item: ShopItem | null;
    onClose: () => void;
    onSave: (item: Partial<ShopItem>) => void;
}

export const ShopItemModal: React.FC<ShopItemModalProps> = ({ item, onClose, onSave }) => {
    const [title, setTitle] = useState(item?.title || '');
    const [description, setDescription] = useState(item?.description || '');
    const [type, setType] = useState<ShopItemType>(item?.type || 'FIXED');
    const [price, setPrice] = useState(item?.price || 0);
    const [stock, setStock] = useState<number | undefined>(item?.stock);
    const [startingPrice, setStartingPrice] = useState(item?.startingPrice || 0);
    const [isVisible, setIsVisible] = useState(item?.isVisible ?? true);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const baseItem = { title, description, type, isVisible };
        if (type === 'FIXED') {
            onSave({ ...baseItem, price, stock: stock === undefined || isNaN(stock) ? undefined : stock });
        } else {
            onSave({ ...baseItem, startingPrice, currentPrice: item?.currentPrice || startingPrice });
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-display font-bold text-slate-900">
                        {item ? 'Modifier l\'article' : 'Nouvel Article'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <form id="shop-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Type d'article</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setType('FIXED')}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-colors ${type === 'FIXED' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-indigo-300 text-slate-600'}`}
                                >
                                    <ShoppingCart size={24} />
                                    <span className="font-bold">Achat Classique</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('AUCTION')}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-colors ${type === 'AUCTION' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 hover:border-amber-300 text-slate-600'}`}
                                >
                                    <Gavel size={24} />
                                    <span className="font-bold">Enchère</span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Titre</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Ex: Temps de présentation supplémentaire"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all min-h-[100px]"
                                    placeholder="Détails de l'avantage..."
                                    required
                                />
                            </div>

                            {type === 'FIXED' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Prix (PiXi)</label>
                                        <input
                                            type="number"
                                            value={price}
                                            onChange={(e) => setPrice(Number(e.target.value))}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                            min="0"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Stock (Optionnel)</label>
                                        <input
                                            type="number"
                                            value={stock === undefined ? '' : stock}
                                            onChange={(e) => setStock(e.target.value ? Number(e.target.value) : undefined)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="Illimité"
                                            min="0"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Prix de départ (PiXi)</label>
                                    <input
                                        type="number"
                                        value={startingPrice}
                                        onChange={(e) => setStartingPrice(Number(e.target.value))}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                        min="0"
                                        required
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-3 pt-2">
                                <input
                                    type="checkbox"
                                    id="isVisible"
                                    checked={isVisible}
                                    onChange={(e) => setIsVisible(e.target.checked)}
                                    className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                />
                                <label htmlFor="isVisible" className="text-sm font-medium text-slate-700">
                                    Visible par les étudiants
                                </label>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        form="shop-form"
                        className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                        Enregistrer
                    </button>
                </div>
            </div>
        </div>
    );
};
