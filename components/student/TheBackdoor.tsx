
import React, { useState, useEffect, useMemo } from 'react';
import { Agency, Student } from '../../types';
import { useGame } from '../../contexts/GameContext';
import { useUI } from '../../contexts/UIContext';
import { Clock } from 'lucide-react';
import { BLACK_MARKET_ITEMS } from '../../constants';

interface TheBackdoorProps {
    agency: Agency;
    allAgencies: Agency[];
    currentUser: Student;
    onClose: () => void;
}

// Pseudo-random user obfuscation
const generateAlias = (name: string) => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `User-${hash.toString(16).toUpperCase().slice(0,4)}`;
};

// 72 Hours in milliseconds
const ROTATION_DURATION = 72 * 60 * 60 * 1000; 

export const TheBackdoor: React.FC<TheBackdoorProps> = ({ agency, allAgencies, currentUser, onClose }) => {
    const { performBlackOp, reviews } = useGame();
    const { toast } = useUI();
    
    const [terminalOutput, setTerminalOutput] = useState<string[]>(["Initialisation protocole 22-04...", "Connexion sécurisée établie."]);
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [targetId, setTargetId] = useState<string>("");
    const [doxxResult, setDoxxResult] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState("");

    // Filter Targets
    const rivalAgencies = allAgencies.filter(a => a.id !== 'unassigned' && a.id !== agency.id);

    // --- ROTATION LOGIC ---
    const stock = useMemo(() => {
        const now = Date.now();
        const currentCycle = Math.floor(now / ROTATION_DURATION);
        
        // Deterministic Random based on Cycle
        const seededRandom = (seed: number) => {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        };

        // Shuffle ALL_ITEMS based on seed
        const shuffled = [...BLACK_MARKET_ITEMS].sort((a, b) => {
            const seedA = currentCycle + a.price; // Simple variation
            const seedB = currentCycle + b.price;
            return seededRandom(seedA) - seededRandom(seedB);
        });

        // Pick Top 3
        return shuffled.slice(0, 3);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            const now = Date.now();
            const nextRotation = (Math.floor(now / ROTATION_DURATION) + 1) * ROTATION_DURATION;
            const diff = nextRotation - now;
            
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            setTimeLeft(`${h}h ${m}m`);
        }, 60000);
        return () => clearInterval(timer);
    }, []);
    
    const addToTerminal = (text: string) => {
        setTerminalOutput(prev => [...prev, `> ${text}`]);
    };

    const handleBuy = async () => {
        if (!selectedItem) return;

        let opType: any = selectedItem;
        let payload: any = {};
        let cost = BLACK_MARKET_ITEMS.find(i => i.id === selectedItem)?.price || 0;

        if (selectedItem === 'SHORT_SELL') {
            if (!targetId) { addToTerminal("ERREUR: Cible manquante."); return; }
            payload = { targetId };
        } 
        else if (selectedItem === 'DOXXING' || selectedItem === 'LEAK') {
            payload = {}; // Self action
        }
        else if (selectedItem === 'FAKE_CERT') {
            // Find a late deliverable
            let lateDeliv: {weekId: string, delId: string} | null = null;
            Object.values(agency.progress).forEach((w: any) => {
                w.deliverables.forEach((d: any) => {
                    if (d.grading && d.grading.daysLate > 0) lateDeliv = { weekId: w.id, delId: d.id };
                });
            });
            
            if (!lateDeliv) {
                addToTerminal("ERREUR: Aucun retard détecté à effacer.");
                return;
            }
            payload = { weekId: lateDeliv.weekId, deliverableId: lateDeliv.delId };
        }
        else if (selectedItem === 'BUY_VOTE') {
            if (!targetId) { addToTerminal("ERREUR: Requête cible manquante."); return; }
            payload = { requestId: targetId };
        }
        else if (selectedItem === 'AUDIT_HOSTILE') {
            if (!targetId) { addToTerminal("ERREUR: Cible manquante."); return; }
            payload = { targetId };
        }

        if ((currentUser.wallet || 0) < cost) {
            addToTerminal("ERREUR: Fonds insuffisants (PiXi).");
            return;
        }

        // EXECUTE
        addToTerminal(`Exécution ${opType}...`);
        await performBlackOp(currentUser.id, agency.id, opType, payload);
        addToTerminal("Transaction terminée. Trace effacée (partiellement).");

        // UI FEEDBACK SPECIFIC
        if (opType === 'DOXXING') {
            // Filter reviews for THIS agency only
            const agencyReviews = reviews.filter(r => r.agencyId === agency.id);
            const badReviews = agencyReviews.filter(r => 
                ((r.ratings.attendance + r.ratings.quality + r.ratings.involvement)/3) < 3
            );
            if (badReviews.length > 0) {
                const reveal = badReviews.map(r => `${r.reviewerName} a noté ${r.targetName} (Moy: ${((r.ratings.attendance+r.ratings.quality+r.ratings.involvement)/3).toFixed(1)})`).join('\n');
                setDoxxResult(reveal);
                addToTerminal("RÉSULTAT DOXXING OBTENU.");
            } else {
                setDoxxResult("Aucune mauvaise note (< 3/5) détectée cette semaine.");
                addToTerminal("Rien à signaler.");
            }
        } else if (opType === 'LEAK') {
            addToTerminal("INFO RÉCUPÉRÉE : Surveillez vos notifications système.");
        }
    };

    const getTargetSelector = (itemId: string) => {
        if (itemId === 'SHORT_SELL' || itemId === 'AUDIT_HOSTILE') {
            return (
                <select 
                    className="w-full bg-black border border-[#00ff41] p-2 text-sm mt-2 focus:outline-none"
                    onChange={(e) => setTargetId(e.target.value)}
                >
                    <option value="">-- SÉLECTIONNER CIBLE --</option>
                    {rivalAgencies.map(a => <option key={a.id} value={a.id}>{a.name} (VE: {a.ve_current})</option>)}
                </select>
            );
        }
        if (itemId === 'BUY_VOTE') {
            return (
                <select 
                    className="w-full bg-black border border-[#00ff41] p-2 text-sm mt-2 focus:outline-none"
                    onChange={(e) => setTargetId(e.target.value)}
                >
                    <option value="">-- SÉLECTIONNER VOTE --</option>
                    {allAgencies.flatMap(a => a.mercatoRequests).filter(r => r.status === 'PENDING').map(r => (
                        <option key={r.id} value={r.id}>{r.type} : {r.studentName}</option>
                    ))}
                </select>
            );
        }
        return null;
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black text-[#00ff41] font-mono p-4 md:p-8 flex flex-col overflow-hidden animate-in fade-in duration-300">
            {/* HEADER */}
            <div className="flex justify-between items-center border-b border-[#00ff41] pb-4 mb-4">
                <div>
                    <h1 className="text-2xl md:text-4xl font-bold tracking-widest uppercase glitch-text">THE BACKDOOR // 22-04</h1>
                    <p className="text-xs opacity-70">Connexion cryptée : {generateAlias(currentUser.name)}</p>
                </div>
                <button onClick={onClose} className="text-red-500 hover:text-red-400 border border-red-500 px-4 py-2 rounded uppercase text-xs font-bold hover:bg-red-900/20 transition-colors">
                    Fermer la connexion
                </button>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8 overflow-hidden">
                
                {/* LEFT: MARKET ITEMS */}
                <div className="md:col-span-2 overflow-y-auto custom-scrollbar border-r border-[#00ff41]/30 pr-4 space-y-6">
                    
                    <div className="mb-2 flex justify-between items-center text-xs uppercase opacity-50 border-b border-[#00ff41]/30 pb-2">
                        <span>--- STOCK DISPONIBLE (3 ITEMS MAX) ---</span>
                        <span className="flex items-center gap-1"><Clock size={12}/> REFRESH DANS : {timeLeft}</span>
                    </div>

                    {stock.map(item => (
                        <div 
                            key={item.id}
                            onClick={() => { setSelectedItem(item.id); setTargetId(""); setDoxxResult(null); }}
                            className={`p-4 border border-[#00ff41]/50 cursor-pointer hover:bg-[#00ff41]/10 transition-all ${selectedItem === item.id ? 'bg-[#00ff41]/20 border-[#00ff41]' : ''}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <item.icon size={20} /> {item.label}
                                </h3>
                                <span className="font-bold">{item.price} PiXi</span>
                            </div>
                            <p className="text-sm opacity-80 mb-2">{item.desc}</p>
                            
                            {/* DYNAMIC INPUTS */}
                            {selectedItem === item.id && getTargetSelector(item.id)}

                            {/* DOXXING RESULT */}
                            {selectedItem === 'DOXXING' && item.id === 'DOXXING' && doxxResult && (
                                <div className="mt-2 p-2 border border-red-500 text-red-500 text-xs whitespace-pre-line bg-red-900/10 animate-in fade-in">
                                    {doxxResult}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* FILLER FOR EMPTY SLOTS VISUAL */}
                    {[...Array(3 - stock.length)].map((_, i) => (
                        <div key={i} className="p-4 border border-[#00ff41]/10 opacity-30 flex items-center justify-center h-24">
                            <span className="text-xs uppercase">[ RUPTURE DE STOCK ]</span>
                        </div>
                    ))}

                </div>

                {/* RIGHT: TERMINAL & WALLET */}
                <div className="flex flex-col gap-4">
                    <div className="border border-[#00ff41] p-4 bg-[#001100]">
                        <h4 className="text-xs uppercase font-bold mb-2 opacity-70">Wallet Caché (Non-traçable)</h4>
                        <div className="text-3xl font-bold">{currentUser.wallet} PiXi</div>
                    </div>

                    <div className="flex-1 border border-[#00ff41] p-4 bg-black font-mono text-xs overflow-y-auto flex flex-col-reverse">
                        {terminalOutput.map((line, i) => (
                            <div key={i} className="mb-1 opacity-80">{line}</div>
                        ))}
                    </div>

                    <button 
                        onClick={handleBuy}
                        disabled={!selectedItem}
                        className={`w-full py-4 font-bold text-black text-lg transition-all uppercase tracking-widest ${
                            selectedItem ? 'bg-[#00ff41] hover:bg-white cursor-pointer' : 'bg-[#004411] cursor-not-allowed text-[#008822]'
                        }`}
                    >
                        {selectedItem ? `CONFIRMER ACHAT` : 'SÉLECTIONNER OFFRE'}
                    </button>
                    
                    <div className="text-[10px] text-center opacity-50">
                        Attention : Le Karma ne dort jamais.
                    </div>
                </div>
            </div>
            
            <style>{`
                .glitch-text {
                    text-shadow: 2px 0 #ff0000, -2px 0 #0000ff;
                }
            `}</style>
        </div>
    );
};
