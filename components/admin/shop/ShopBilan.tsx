import React from 'react';
import { ShopItem } from '../../../types';
import { Trophy, ShoppingCart, Gavel } from 'lucide-react';

interface ShopBilanProps {
    items: ShopItem[];
}

export const ShopBilan: React.FC<ShopBilanProps> = ({ items }) => {
    const fixedItems = items.filter(item => item.type === 'FIXED');
    const auctionItems = items.filter(item => item.type === 'AUCTION');

    return (
        <div className="space-y-8">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-xl font-display font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Gavel className="text-amber-500" /> Résultats des Enchères
                </h3>
                <div className="space-y-4">
                    {auctionItems.length === 0 ? (
                        <p className="text-slate-500 italic">Aucune enchère créée.</p>
                    ) : (
                        auctionItems.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                    <h4 className="font-bold text-slate-900">{item.title}</h4>
                                    <p className="text-sm text-slate-500">Prix de départ : {item.startingPrice} PiXi</p>
                                </div>
                                <div className="text-right">
                                    {item.highestBidderName ? (
                                        <>
                                            <div className="font-bold text-amber-600 text-lg">{item.currentPrice} PiXi</div>
                                            <div className="text-sm font-medium text-slate-700">Remporté par : {item.highestBidderName}</div>
                                            <div className="text-xs text-slate-400 mt-1">
                                                {item.isClosed ? 'Enchère clôturée' : 'En cours'}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-slate-400 italic">Aucune offre</div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-xl font-display font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <ShoppingCart className="text-indigo-500" /> Achats Classiques
                </h3>
                <div className="space-y-6">
                    {fixedItems.length === 0 ? (
                        <p className="text-slate-500 italic">Aucun article à prix fixe créé.</p>
                    ) : (
                        fixedItems.map(item => (
                            <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold text-slate-900">{item.title}</h4>
                                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">
                                        {item.purchases?.length || 0} Ventes
                                    </span>
                                </div>
                                
                                {item.purchases && item.purchases.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {item.purchases.map((purchase, idx) => (
                                            <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
                                                <span className="font-medium text-slate-700 truncate">{purchase.agencyName}</span>
                                                <span className="text-xs text-slate-400">{new Date(purchase.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 italic">Aucun achat pour cet article.</p>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
