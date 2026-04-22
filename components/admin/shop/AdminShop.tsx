import React, { useState, useEffect } from 'react';
import { Agency, ShopItem } from '../../../types';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { Plus, Edit, Trash2, Eye, EyeOff, Gavel, ShoppingCart, Trophy } from 'lucide-react';
import { useUI } from '../../../contexts/UIContext';
import { ShopItemModal } from './ShopItemModal';
import { ShopBilan } from './ShopBilan';

interface AdminShopProps {
    agencies: Agency[];
    readOnly?: boolean;
    hideTitle?: boolean;
}

export const AdminShop: React.FC<AdminShopProps> = ({ agencies, readOnly, hideTitle }) => {
    const { toast } = useUI();
    const [items, setItems] = useState<ShopItem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
    const [activeTab, setActiveTab] = useState<'ITEMS' | 'BILAN'>('ITEMS');

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'shop_items'), (snapshot) => {
            const fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShopItem));
            setItems(fetchedItems);
        }, (error) => {
            console.error("Error fetching shop items:", error);
            toast('error', "Erreur lors du chargement de la boutique.");
        });

        return () => unsubscribe();
    }, []);

    const handleSaveItem = async (item: Partial<ShopItem>) => {
        if (readOnly) return;
        try {
            if (editingItem) {
                await updateDoc(doc(db, 'shop_items', editingItem.id), item);
                toast('success', "Article mis à jour.");
            } else {
                const newItemRef = doc(collection(db, 'shop_items'));
                await setDoc(newItemRef, { ...item, id: newItemRef.id });
                toast('success', "Article créé.");
            }
            setIsModalOpen(false);
            setEditingItem(null);
        } catch (error: any) {
            console.error("Error saving item:", error);
            toast('error', `Erreur: ${error.message}`);
        }
    };

    const handleDeleteItem = async (id: string) => {
        if (readOnly) return;
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet article ?")) return;
        try {
            await deleteDoc(doc(db, 'shop_items', id));
            toast('success', "Article supprimé.");
        } catch (error: any) {
            console.error("Error deleting item:", error);
            toast('error', `Erreur: ${error.message}`);
        }
    };

    const toggleVisibility = async (item: ShopItem) => {
        if (readOnly) return;
        try {
            await updateDoc(doc(db, 'shop_items', item.id), { isVisible: !item.isVisible });
            toast('success', `Article ${!item.isVisible ? 'visible' : 'masqué'}.`);
        } catch (error: any) {
            console.error("Error toggling visibility:", error);
            toast('error', `Erreur: ${error.message}`);
        }
    };

    const closeAuction = async (item: ShopItem) => {
        if (readOnly) return;
        if (!window.confirm("Êtes-vous sûr de vouloir clore cette enchère ? Le gagnant actuel remportera l'objet.")) return;
        try {
            await updateDoc(doc(db, 'shop_items', item.id), { isClosed: true });
            toast('success', "Enchère clôturée.");
        } catch (error: any) {
            console.error("Error closing auction:", error);
            toast('error', `Erreur: ${error.message}`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                {!hideTitle && (
                <div>
                    <h2 className="text-2xl font-display font-bold text-slate-900">Boutique du Jury</h2>
                    <p className="text-slate-500">Gérez les avantages et les enchères pour le jury final.</p>
                </div>
                )}
                {!readOnly && (
                    <button 
                        onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                        <Plus size={20} /> Nouvel Article
                    </button>
                )}
            </div>

            <div className="flex gap-4 border-b border-slate-200">
                <button 
                    onClick={() => setActiveTab('ITEMS')}
                    className={`pb-3 px-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'ITEMS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <div className="flex items-center gap-2"><ShoppingCart size={18} /> Gestion Boutique</div>
                </button>
                <button 
                    onClick={() => setActiveTab('BILAN')}
                    className={`pb-3 px-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'BILAN' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <div className="flex items-center gap-2"><Trophy size={18} /> Bilan du Jour J</div>
                </button>
            </div>

            {activeTab === 'ITEMS' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map(item => (
                        <div key={item.id} className={`bg-white rounded-2xl p-5 border-2 ${item.type === 'AUCTION' ? 'border-amber-200' : 'border-slate-100'} shadow-sm relative overflow-hidden`}>
                            {item.type === 'AUCTION' && (
                                <div className="absolute top-0 right-0 bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1">
                                    <Gavel size={12} /> ENCHÈRE
                                </div>
                            )}
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-slate-900 pr-20">{item.title}</h3>
                            </div>
                            <p className="text-slate-500 text-sm mb-4 line-clamp-2">{item.description}</p>
                            
                            <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-2">
                                {item.type === 'FIXED' ? (
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Prix unitaire</span>
                                            <span className="font-bold text-indigo-600">{item.price} PiXi</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Stock</span>
                                            <span className="font-bold text-slate-900">{item.stock !== undefined ? item.stock : 'Illimité'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Vendus</span>
                                            <span className="font-bold text-slate-900">{item.purchases?.length || 0}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Prix de départ</span>
                                            <span className="font-bold text-slate-900">{item.startingPrice} PiXi</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Enchère actuelle</span>
                                            <span className="font-bold text-amber-600">{item.currentPrice || item.startingPrice} PiXi</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Meilleur enchérisseur</span>
                                            <span className="font-bold text-slate-900 truncate max-w-[120px]">{item.highestBidderName || '-'}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {!readOnly && (
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                    <button 
                                        onClick={() => toggleVisibility(item)}
                                        className={`p-2 rounded-lg transition-colors flex-1 flex justify-center ${item.isVisible ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                        title={item.isVisible ? "Masquer" : "Rendre visible"}
                                    >
                                        {item.isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </button>
                                    <button 
                                        onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                                        className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors flex-1 flex justify-center"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex-1 flex justify-center"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                    {item.type === 'AUCTION' && !item.isClosed && (
                                        <button 
                                            onClick={() => closeAuction(item)}
                                            className="p-2 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg transition-colors flex-1 flex justify-center font-bold text-xs"
                                        >
                                            Clore
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {items.length === 0 && (
                        <div className="col-span-full py-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
                            <ShoppingCart size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Boutique vide</h3>
                            <p className="text-slate-500">Créez votre premier article ou enchère pour le jury.</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'BILAN' && (
                <ShopBilan items={items} />
            )}

            {isModalOpen && (
                <ShopItemModal 
                    item={editingItem} 
                    onClose={() => { setIsModalOpen(false); setEditingItem(null); }} 
                    onSave={handleSaveItem} 
                />
            )}
        </div>
    );
};
