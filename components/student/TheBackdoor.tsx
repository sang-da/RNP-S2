
import React, { useState, useEffect } from 'react';
import { Agency, Student, Deliverable } from '../../types';
import { useGame } from '../../contexts/GameContext';
import { useUI } from '../../contexts/UIContext';
import { Terminal, ShieldAlert, Eye, Vote, Lock, FileX, Skull, TrendingUp } from 'lucide-react';

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

export const TheBackdoor: React.FC<TheBackdoorProps> = ({ agency, allAgencies, currentUser, onClose }) => {
    const { performBlackOp } = useGame();
    const { confirm, toast } = useUI();
    const [terminalOutput, setTerminalOutput] = useState<string[]>(["Initialisation protocole 22-04...", "Connexion sécurisée établie."]);
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [targetId, setTargetId] = useState<string>("");
    const [doxxResult, setDoxxResult] = useState<string | null>(null);

    // Filter Targets
    const rivalAgencies = allAgencies.filter(a => a.id !== 'unassigned' && a.id !== agency.id);
    
    const addToTerminal = (text: string) => {
        setTerminalOutput(prev => [...prev, `> ${text}`]);
    };

    const handleBuy = async () => {
        if (!selectedItem) return;

        let opType: any = '';
        let payload: any = {};
        let cost = 0;

        if (selectedItem === 'SHORT_SELL') {
            if (!targetId) { addToTerminal("ERREUR: Cible manquante."); return; }
            opType = 'SHORT_SELL';
            payload = { targetId };
            cost = 500;
        } 
        else if (selectedItem === 'DOXXING') {
            opType = 'DOXXING';
            payload = {}; // Self agency check
            cost = 600;
        }
        else if (selectedItem === 'FAKE_CERT') {
            // Find a late deliverable
            let lateDeliv: {weekId: string, delId: string} | null = null;
            Object.values(agency.progress).forEach(w => {
                w.deliverables.forEach(d => {
                    if (d.grading && d.grading.daysLate > 0) lateDeliv = { weekId: w.id, delId: d.id };
                });
            });
            
            if (!lateDeliv) {
                addToTerminal("ERREUR: Aucun retard détecté à effacer.");
                return;
            }
            opType = 'FAKE_CERT';
            payload = { weekId: lateDeliv.weekId, deliverableId: lateDeliv.delId };
            cost = 500;
        }
        else if (selectedItem === 'BUY_VOTE') {
            if (!targetId) { addToTerminal("ERREUR: Requête cible manquante."); return; }
            opType = 'BUY_VOTE';
            payload = { requestId: targetId };
            cost = 200;
        }
        else if (selectedItem === 'AUDIT_HOSTILE') {
            if (!targetId) { addToTerminal("ERREUR: Cible manquante."); return; }
            opType = 'AUDIT_HOSTILE';
            payload = { targetId };
            cost = 500;
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
            const badReviews = agency.peerReviews.filter(r => 
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
        }
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
                    
                    <div className="mb-2 text-xs uppercase opacity-50">--- ROTATION OFFRES (72H) ---</div>

                    {/* ITEM 1: SHORT SELL */}
                    <div 
                        onClick={() => { setSelectedItem('SHORT_SELL'); setTargetId(""); }}
                        className={`p-4 border border-[#00ff41]/50 cursor-pointer hover:bg-[#00ff41]/10 transition-all ${selectedItem === 'SHORT_SELL' ? 'bg-[#00ff41]/20 border-[#00ff41]' : ''}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg flex items-center gap-2"><TrendingUp size={20} className="rotate-180"/> Short Selling</h3>
                            <span className="font-bold">500 PiXi</span>
                        </div>
                        <p className="text-sm opacity-80 mb-2">Parier sur la chute d'une agence. Si elle perd de la VE au prochain bilan, vous gagnez 1000 PiXi.</p>
                        {selectedItem === 'SHORT_SELL' && (
                            <select 
                                className="w-full bg-black border border-[#00ff41] p-2 text-sm mt-2 focus:outline-none"
                                onChange={(e) => setTargetId(e.target.value)}
                            >
                                <option value="">-- CIBLE À SHORTER --</option>
                                {rivalAgencies.map(a => <option key={a.id} value={a.id}>{a.name} (VE: {a.ve_current})</option>)}
                            </select>
                        )}
                    </div>

                    {/* ITEM 2: DOXXING RH */}
                    <div 
                        onClick={() => { setSelectedItem('DOXXING'); setTargetId(""); }}
                        className={`p-4 border border-[#00ff41]/50 cursor-pointer hover:bg-[#00ff41]/10 transition-all ${selectedItem === 'DOXXING' ? 'bg-[#00ff41]/20 border-[#00ff41]' : ''}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg flex items-center gap-2"><Eye size={20}/> Doxxing RH</h3>
                            <span className="font-bold">600 PiXi</span>
                        </div>
                        <p className="text-sm opacity-80">Révèle l'identité des auteurs de mauvaises notes (< 3/5) dans votre agence cette semaine.</p>
                        {doxxResult && selectedItem === 'DOXXING' && (
                            <div className="mt-2 p-2 border border-red-500 text-red-500 text-xs whitespace-pre-line bg-red-900/10">
                                {doxxResult}
                            </div>
                        )}
                    </div>

                    {/* ITEM 3: FAUX CERTIFICAT */}
                    <div 
                        onClick={() => { setSelectedItem('FAKE_CERT'); setTargetId(""); }}
                        className={`p-4 border border-[#00ff41]/50 cursor-pointer hover:bg-[#00ff41]/10 transition-all ${selectedItem === 'FAKE_CERT' ? 'bg-[#00ff41]/20 border-[#00ff41]' : ''}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg flex items-center gap-2"><FileX size={20}/> Faux Certificat</h3>
                            <span className="font-bold">500 PiXi</span>
                        </div>
                        <p className="text-sm opacity-80">Efface rétroactivement un retard noté sur un livrable. Risque de détection: 20%.</p>
                    </div>

                    {/* ITEM 4: ACHAT DE VOTE */}
                    <div 
                        onClick={() => { setSelectedItem('BUY_VOTE'); setTargetId(""); }}
                        className={`p-4 border border-[#00ff41]/50 cursor-pointer hover:bg-[#00ff41]/10 transition-all ${selectedItem === 'BUY_VOTE' ? 'bg-[#00ff41]/20 border-[#00ff41]' : ''}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg flex items-center gap-2"><Vote size={20}/> Bourrage d'Urne</h3>
                            <span className="font-bold">200 PiXi</span>
                        </div>
                        <p className="text-sm opacity-80">Ajoute un vote "APPROVE" fantôme sur une demande Mercato active.</p>
                        {selectedItem === 'BUY_VOTE' && (
                            <select 
                                className="w-full bg-black border border-[#00ff41] p-2 text-sm mt-2 focus:outline-none"
                                onChange={(e) => setTargetId(e.target.value)}
                            >
                                <option value="">-- SÉLECTIONNER VOTE --</option>
                                {allAgencies.flatMap(a => a.mercatoRequests).filter(r => r.status === 'PENDING').map(r => (
                                    <option key={r.id} value={r.id}>{r.type} : {r.studentName}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* ITEM 5: AUDIT HOSTILE */}
                    <div 
                        onClick={() => { setSelectedItem('AUDIT_HOSTILE'); setTargetId(""); }}
                        className={`p-4 border border-[#00ff41]/50 cursor-pointer hover:bg-[#00ff41]/10 transition-all ${selectedItem === 'AUDIT_HOSTILE' ? 'bg-[#00ff41]/20 border-[#00ff41]' : ''}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-lg flex items-center gap-2"><Skull size={20}/> Audit Hostile</h3>
                            <span className="font-bold">500 PiXi</span>
                        </div>
                        <p className="text-sm opacity-80">Attaque la crédibilité d'une agence adverse fragile. (-10 VE si succès).</p>
                        {selectedItem === 'AUDIT_HOSTILE' && (
                            <select 
                                className="w-full bg-black border border-[#00ff41] p-2 text-sm mt-2 focus:outline-none"
                                onChange={(e) => setTargetId(e.target.value)}
                            >
                                <option value="">-- CIBLE À ATTAQUER --</option>
                                {rivalAgencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        )}
                    </div>

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