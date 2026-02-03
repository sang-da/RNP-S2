import React, { useState, useMemo, useEffect } from 'react';
import { EyeOff, Clock, RotateCw, Terminal, ShoppingBag, ShieldAlert } from 'lucide-react';
import { BLACK_MARKET_ITEMS } from '../constants';
import { useUI } from '../contexts/UIContext';

// 72 Hours in milliseconds (Same as student view logic)
const ROTATION_DURATION = 72 * 60 * 60 * 1000; 

export const AdminBlackMarket: React.FC = () => {
    const { toast } = useUI();
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [forceRotationIndex, setForceRotationIndex] = useState(0); // Offset pour simuler une rotation

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    // --- REPLICATED ROTATION LOGIC (WITH ADMIN OFFSET) ---
    const activeStock = useMemo(() => {
        const currentCycle = Math.floor(currentTime / ROTATION_DURATION) + forceRotationIndex;
        
        const seededRandom = (seed: number) => {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        };

        const shuffled = [...BLACK_MARKET_ITEMS].sort((a, b) => {
            const seedA = currentCycle + a.price; 
            const seedB = currentCycle + b.price;
            return seededRandom(seedA) - seededRandom(seedB);
        });

        return shuffled.slice(0, 3);
    }, [currentTime, forceRotationIndex]);

    const nextRotationTime = useMemo(() => {
        return (Math.floor(currentTime / ROTATION_DURATION) + 1) * ROTATION_DURATION;
    }, [currentTime]);

    const timeLeft = nextRotationTime - currentTime;
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const minsLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    const handleForceRotation = () => {
        setForceRotationIndex(prev => prev + 1);
        toast('info', "Rotation simulée (Vue Admin uniquement).");
    };

    return (
        <div className="animate-in fade-in duration-500 pb-20">
            <div className="mb-8">
                <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-slate-900 rounded-xl text-emerald-400"><EyeOff size={32}/></div>
                    Backdoor 22-04 (Market Control)
                </h2>
                <p className="text-slate-500 text-sm mt-1">Supervision des outils de triche et de guerre économique.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* SETTINGS PANEL */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-fit">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Terminal size={20}/> Paramètres Système
                    </h3>
                    
                    <div className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Cycle de Rotation</label>
                            <div className="flex items-center gap-2 text-2xl font-mono font-bold text-indigo-600">
                                <Clock size={24}/> 72 Heures
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Les items changent automatiquement tous les 3 jours.</p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Prochaine Rotation</label>
                            <div className="text-xl font-mono font-bold text-slate-700">
                                Dans {hoursLeft}h {minsLeft}m
                            </div>
                        </div>

                        <button 
                            onClick={handleForceRotation}
                            className="w-full py-3 bg-slate-900 text-emerald-400 font-bold font-mono rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                        >
                            <RotateCw size={18}/> FORCE ROTATION (TEST)
                        </button>
                    </div>
                </div>

                {/* ACTIVE STOCK */}
                <div className="lg:col-span-2">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <ShoppingBag size={20}/> En Rayon Actuellement (Ce que voient les étudiants)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {activeStock.map(item => (
                            <div key={item.id} className="bg-slate-900 text-emerald-400 p-5 rounded-2xl border border-emerald-900 shadow-lg relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity">
                                    <item.icon size={64}/>
                                </div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-lg">{item.label}</h4>
                                        <span className="bg-emerald-900/50 px-2 py-1 rounded text-xs font-mono">{item.price} px</span>
                                    </div>
                                    <p className="text-xs text-emerald-200/70 leading-relaxed mb-4 min-h-[40px]">{item.desc}</p>
                                    <div className="flex gap-2">
                                        <span className="text-[9px] uppercase border border-emerald-800 px-2 py-1 rounded">{item.category}</span>
                                        {item.requiresTarget && <span className="text-[9px] uppercase border border-emerald-800 px-2 py-1 rounded">CIBLAGE REQUIS</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <ShieldAlert size={20}/> Catalogue Complet (Réserve)
                    </h3>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-100">
                                <tr>
                                    <th className="p-3">Item</th>
                                    <th className="p-3">Catégorie</th>
                                    <th className="p-3">Prix</th>
                                    <th className="p-3">Effet</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {BLACK_MARKET_ITEMS.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="p-3 font-bold flex items-center gap-2">
                                            <item.icon size={16} className="text-slate-400"/> {item.label}
                                        </td>
                                        <td className="p-3"><span className="text-[10px] bg-slate-100 px-2 py-1 rounded font-bold text-slate-500">{item.category}</span></td>
                                        <td className="p-3 font-mono font-bold text-indigo-600">{item.price}</td>
                                        <td className="p-3 text-slate-500 text-xs">{item.desc}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};