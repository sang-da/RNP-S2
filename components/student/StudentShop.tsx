import React, { useState, useEffect } from 'react';
import { Agency, ShopItem } from '../../types';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { ShoppingCart, Gavel, AlertCircle, Clock, CheckCircle2, Receipt, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGame } from '../../contexts/GameContext';
import { useUI } from '../../contexts/UIContext';
import { Modal } from '../Modal';

interface StudentShopProps {
    agency: Agency;
}

export const StudentShop: React.FC<StudentShopProps> = ({ agency }) => {
    const { currentUser } = useAuth();
    const { executeBuyShopItem, executePlaceBid, gameConfig } = useGame();
    const { toast } = useUI();
    const isJuryModeActive = gameConfig.isJuryModeActive || (gameConfig.juryDeadline && new Date() > new Date(gameConfig.juryDeadline));
    
    const [items, setItems] = useState<ShopItem[]>([]);
    const [bidAmounts, setBidAmounts] = useState<Record<string, number>>({});
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Confirmation Modals State
    const [confirmBuyItem, setConfirmBuyItem] = useState<ShopItem | null>(null);
    const [confirmBidItem, setConfirmBidItem] = useState<{item: ShopItem, amount: number} | null>(null);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'shop_items'), (snapshot) => {
            const fetchedItems = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as ShopItem))
                .filter(item => item.isVisible); // Only show visible items to students
            setItems(fetchedItems);
        });

        return () => unsubscribe();
    }, []);

    const handleBuy = async (item: ShopItem) => {
        if (isJuryModeActive) return;
        if (!currentUser) return;
        setConfirmBuyItem(item);
    };

    const confirmAndExecuteBuy = async () => {
        if (isJuryModeActive) return;
        if (!currentUser || !confirmBuyItem) return;
        
        setIsProcessing(true);
        try {
            await executeBuyShopItem(currentUser.uid, agency.id, confirmBuyItem.id);
            setConfirmBuyItem(null);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBid = async (item: ShopItem) => {
        if (isJuryModeActive) return;
        if (!currentUser) return;
        const amount = bidAmounts[item.id];
        const minBid = (item.currentPrice || item.startingPrice || 0) + 10;
        
        if (!amount || amount < minBid) {
            toast('error', `L'enchère minimum est de ${minBid} PiXi`);
            return;
        }

        setConfirmBidItem({ item, amount });
    };

    const confirmAndExecuteBid = async () => {
        if (isJuryModeActive) return;
        if (!currentUser || !confirmBidItem) return;

        setIsProcessing(true);
        try {
            await executePlaceBid(currentUser.uid, agency.id, confirmBidItem.item.id, confirmBidItem.amount);
            setBidAmounts(prev => ({ ...prev, [confirmBidItem.item.id]: 0 })); // Reset bid input
            setConfirmBidItem(null);
        } finally {
            setIsProcessing(false);
        }
    };

    const fixedItems = items.filter(i => i.type === 'FIXED');
    const auctionItems = items.filter(i => i.type === 'AUCTION');

    // Get items purchased or won by the agency
    const myPurchases = items.filter(item => {
        if (item.type === 'FIXED') {
            return item.purchases?.some(p => p.agencyId === agency.id);
        } else {
            return item.isClosed && item.highestBidderId === agency.id;
        }
    });

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 pb-24">
            <div className="bg-gradient-to-br from-slate-900 to-indigo-900 rounded-3xl p-6 md:p-10 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl md:text-4xl font-display font-black mb-4 flex items-center gap-3">
                        <ShoppingCart className="text-indigo-400" size={36} />
                        Boutique du Jury
                    </h1>
                    <p className="text-indigo-100 text-lg max-w-2xl leading-relaxed">
                        Investissez vos PiXi pour obtenir des avantages stratégiques lors du jury final. 
                        Attention, les enchères sont définitives.
                    </p>
                    <div className="mt-6 inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                        <span className="text-indigo-200">Budget Agence :</span>
                        <span className="font-bold text-xl">{agency.budget_real} PiXi</span>
                    </div>
                </div>
            </div>

            {myPurchases.length > 0 && (
                <div className="space-y-6">
                    <h2 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
                        <Receipt className="text-emerald-500" /> Mes Tickets de Caisse
                    </h2>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="divide-y divide-slate-100">
                            {myPurchases.map(item => {
                                const purchaseInfo = item.type === 'FIXED' 
                                    ? item.purchases?.find(p => p.agencyId === agency.id)
                                    : { amount: item.currentPrice, timestamp: new Date().toISOString() };
                                
                                return (
                                    <div key={`receipt-${item.id}`} className="p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-xl ${item.type === 'FIXED' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                                                {item.type === 'FIXED' ? <ShoppingCart size={24} /> : <Gavel size={24} />}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900">{item.title}</h3>
                                                <p className="text-sm text-slate-500">
                                                    Acquis le {new Date(purchaseInfo?.timestamp || '').toLocaleDateString('fr-FR', { 
                                                        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' 
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right w-full md:w-auto flex flex-row md:flex-col justify-between md:justify-end items-center md:items-end">
                                            <span className="text-sm text-slate-500 md:mb-1">Montant payé</span>
                                            <span className="font-black text-emerald-600 text-lg">
                                                {item.type === 'FIXED' ? item.price : item.currentPrice} PiXi
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {auctionItems.length > 0 && (
                <div className="space-y-6">
                    <h2 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
                        <Gavel className="text-amber-500" /> Ventes aux Enchères
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {auctionItems.map(item => {
                            const minBid = (item.currentPrice || item.startingPrice || 0) + 10;
                            const isWinning = item.highestBidderId === agency.id;
                            
                            return (
                                <div key={item.id} className={`bg-white rounded-2xl p-6 border-2 shadow-sm relative overflow-hidden transition-all ${item.isClosed ? 'border-slate-200 opacity-75' : isWinning ? 'border-emerald-400 shadow-emerald-100' : 'border-amber-200'}`}>
                                    {item.isClosed && (
                                        <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-[1px] z-10 flex items-center justify-center">
                                            <div className="bg-white px-6 py-3 rounded-xl shadow-lg font-bold text-slate-900 flex items-center gap-2 border border-slate-200">
                                                <Clock className="text-slate-400" /> Enchère Terminée
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="font-bold text-xl text-slate-900">{item.title}</h3>
                                        {isWinning && !item.isClosed && (
                                            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                                <CheckCircle2 size={14} /> En tête
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-slate-600 mb-6">{item.description}</p>
                                    
                                    <div className="bg-slate-50 rounded-xl p-4 mb-6">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-slate-500 font-medium">Enchère Actuelle</span>
                                            <span className="text-2xl font-black text-amber-600">{item.currentPrice || item.startingPrice} PiXi</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500">Meilleure offre par</span>
                                            <span className="font-bold text-slate-900">{item.highestBidderName || 'Aucune offre'}</span>
                                        </div>
                                    </div>

                                    {!item.isClosed && (
                                        <div className="flex gap-3">
                                            <input 
                                                type="number" 
                                                value={bidAmounts[item.id] || ''}
                                                onChange={(e) => setBidAmounts(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                                                placeholder={`Min: ${minBid}`}
                                                min={minBid}
                                                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-slate-900"
                                                disabled={isProcessing}
                                            />
                                            <button 
                                                onClick={() => handleBid(item)}
                                                disabled={isProcessing || (bidAmounts[item.id] || 0) < minBid || agency.budget_real < (bidAmounts[item.id] || 0)}
                                                className="px-6 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                            >
                                                <Gavel size={20} /> Enchérir
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {fixedItems.length > 0 && (
                <div className="space-y-6">
                    <h2 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
                        <ShoppingCart className="text-indigo-500" /> Achats Immédiats
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {fixedItems.map(item => {
                            const isOutOfStock = item.stock !== undefined && item.stock <= 0;
                            const canAfford = agency.budget_real >= (item.price || 0);
                            const hasPurchased = item.purchases?.some(p => p.agencyId === agency.id);
                            
                            return (
                                <div key={item.id} className={`bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col ${isOutOfStock ? 'opacity-75' : ''}`}>
                                    <h3 className="font-bold text-lg text-slate-900 mb-2">{item.title}</h3>
                                    <p className="text-slate-600 text-sm mb-6 flex-1">{item.description}</p>
                                    
                                    <div className="flex items-end justify-between mb-6">
                                        <div>
                                            <div className="text-sm text-slate-500 mb-1">Prix</div>
                                            <div className="text-2xl font-black text-indigo-600">{item.price} PiXi</div>
                                        </div>
                                        {item.stock !== undefined && (
                                            <div className="text-right">
                                                <div className="text-sm text-slate-500 mb-1">Stock</div>
                                                <div className={`font-bold ${isOutOfStock ? 'text-red-500' : 'text-slate-900'}`}>
                                                    {item.stock} restants
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {hasPurchased ? (
                                        <div className="w-full py-3 bg-emerald-50 text-emerald-700 font-bold rounded-xl flex items-center justify-center gap-2 border border-emerald-200">
                                            <CheckCircle2 size={20} /> Acquis
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => handleBuy(item)}
                                            disabled={isProcessing || isOutOfStock || !canAfford}
                                            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isOutOfStock ? 'Rupture de stock' : !canAfford ? 'Fonds insuffisants' : 'Acheter'}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {items.length === 0 && (
                <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
                    <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">La boutique est fermée</h3>
                    <p className="text-slate-500">Aucun article n'est disponible pour le moment.</p>
                </div>
            )}

            {/* Confirmation Modals */}
            <Modal
                isOpen={!!confirmBuyItem}
                onClose={() => setConfirmBuyItem(null)}
                title="Confirmer l'achat"
            >
                {confirmBuyItem && (
                    <div className="space-y-6">
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-start gap-3">
                            <Info className="text-indigo-600 mt-1 shrink-0" size={24} />
                            <div>
                                <h4 className="font-bold text-indigo-900">{confirmBuyItem.title}</h4>
                                <p className="text-indigo-700 mt-1">
                                    Voulez-vous vraiment acheter cet article pour <span className="font-bold">{confirmBuyItem.price} PiXi</span> ?
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmBuyItem(null)}
                                disabled={isProcessing}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirmAndExecuteBuy}
                                disabled={isProcessing}
                                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isProcessing ? 'Achat en cours...' : 'Confirmer l\'achat'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={!!confirmBidItem}
                onClose={() => setConfirmBidItem(null)}
                title="Confirmer l'enchère"
            >
                {confirmBidItem && (
                    <div className="space-y-6">
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start gap-3">
                            <Gavel className="text-amber-600 mt-1 shrink-0" size={24} />
                            <div>
                                <h4 className="font-bold text-amber-900">{confirmBidItem.item.title}</h4>
                                <p className="text-amber-700 mt-1">
                                    Confirmez-vous votre enchère de <span className="font-bold">{confirmBidItem.amount} PiXi</span> ?
                                </p>
                                <p className="text-sm text-amber-600 mt-2 italic">
                                    Attention : les enchères sont définitives et les fonds seront bloqués.
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmBidItem(null)}
                                disabled={isProcessing}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirmAndExecuteBid}
                                disabled={isProcessing}
                                className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isProcessing ? 'Enchère en cours...' : 'Confirmer l\'enchère'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
