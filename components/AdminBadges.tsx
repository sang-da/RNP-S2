
import React, { useState, useMemo } from 'react';
import { Agency, Badge, GameEvent } from '../types';
import { BADGE_DEFINITIONS } from '../config/awards';
import { useGame } from '../contexts/GameContext';
import { useUI } from '../contexts/UIContext';
import { Modal } from './Modal';
import { Medal, Crown, Shield, Zap, Eye, Users, Star, TrendingUp, CheckCircle2, User, Building2, RefreshCw, Gift, ArrowRight, Mountain, Gem, Briefcase, HeartHandshake, Clock, UserPlus, Flag, Flame, Glasses, Swords } from 'lucide-react';
import { writeBatch, doc, db } from '../services/firebase';

interface AdminBadgesProps {
    agencies: Agency[];
}

// Structure temporaire pour l'affichage dans la modale
interface PendingAward {
    targetId: string;
    targetName: string;
    type: 'AGENCY' | 'STUDENT';
    badge: Badge;
    reason: string;
    agencyName?: string; // Pour les étudiants
}

export const AdminBadges: React.FC<AdminBadgesProps> = ({ agencies }) => {
    const { toast, confirm } = useUI();
    const { updateAgency } = useGame();
    
    // UI State
    const [selectedBadge, setSelectedBadge] = useState<Badge>(BADGE_DEFINITIONS[0]);
    const [targetType, setTargetType] = useState<'AGENCY' | 'STUDENT'>('AGENCY');
    const [searchTarget, setSearchTarget] = useState('');

    // Scan State
    const [isScanPreviewOpen, setIsScanPreviewOpen] = useState(false);
    const [pendingAwards, setPendingAwards] = useState<PendingAward[]>([]);

    // --- 1. SIMULATION DU SCAN (LECTURE SEULE) ---
    const handleSimulateScan = () => {
        const detectedAwards: PendingAward[] = [];

        agencies.forEach(agency => {
            if (agency.id === 'unassigned') return;

            // A. BADGE LÉGENDE (100 VE)
            if (agency.ve_current >= 100) {
                const hasBadge = agency.badges?.some(b => b.id === 'legend_100');
                if (!hasBadge) {
                    const def = BADGE_DEFINITIONS.find(b => b.id === 'legend_100');
                    if (def) {
                        detectedAwards.push({
                            targetId: agency.id,
                            targetName: agency.name,
                            type: 'AGENCY',
                            badge: def,
                            reason: "A atteint 100 VE"
                        });
                    }
                }
            }

            // B. BADGE LICORNE (20k Budget)
            if (agency.budget_real >= 20000) {
                agency.members.forEach(m => {
                    const hasBadge = m.badges?.some(b => b.id === 'wealthy');
                    if (!hasBadge) {
                        const def = BADGE_DEFINITIONS.find(b => b.id === 'wealthy');
                        if (def) {
                            detectedAwards.push({
                                targetId: m.id,
                                targetName: m.name,
                                type: 'STUDENT',
                                badge: def,
                                reason: "Trésorerie Agence > 20k",
                                agencyName: agency.name
                            });
                        }
                    }
                });
            }
            
            // C. BADGE PIONNIER (100 SCORE)
            agency.members.forEach(m => {
                if (m.individualScore >= 100) {
                    const hasBadge = m.badges?.some(b => b.id === 'score_100');
                    if (!hasBadge) {
                        const def = BADGE_DEFINITIONS.find(b => b.id === 'score_100');
                        if (def) {
                            detectedAwards.push({
                                targetId: m.id,
                                targetName: m.name,
                                type: 'STUDENT',
                                badge: def,
                                reason: "A atteint 100/100 Score Individuel",
                                agencyName: agency.name
                            });
                        }
                    }
                }
            });
        });

        if (detectedAwards.length === 0) {
            toast('info', "Scan terminé. Aucun nouveau lauréat détecté.");
        } else {
            setPendingAwards(detectedAwards);
            setIsScanPreviewOpen(true);
        }
    };

    // --- 2. EXÉCUTION RÉELLE (ÉCRITURE BATCH) ---
    const executeDistribution = async () => {
        if (pendingAwards.length === 0) return;

        const batch = writeBatch(db);
        const today = new Date().toISOString().split('T')[0];
        
        // On regroupe les updates par agence pour éviter d'écraser des données
        // Map<AgencyId, AgencyObject>
        const agencyUpdates = new Map<string, Agency>();

        // On initialise la map avec les copies des agences concernées
        pendingAwards.forEach(award => {
            const agencyId = award.type === 'AGENCY' 
                ? award.targetId 
                : agencies.find(a => a.members.some(m => m.id === award.targetId))?.id;
            
            if (agencyId && !agencyUpdates.has(agencyId)) {
                const original = agencies.find(a => a.id === agencyId);
                if (original) agencyUpdates.set(agencyId, JSON.parse(JSON.stringify(original)));
            }
        });

        // On applique les modifs sur les objets en mémoire
        pendingAwards.forEach(award => {
            const agencyId = award.type === 'AGENCY' 
                ? award.targetId 
                : agencies.find(a => a.members.some(m => m.id === award.targetId))?.id;
            
            if (!agencyId) return;
            const agency = agencyUpdates.get(agencyId);
            if (!agency) return;

            const badgePayload = { ...award.badge, unlockedAt: today };
            const rewards = award.badge.rewards || {};

            if (award.type === 'AGENCY') {
                // Add Badge
                agency.badges.push(badgePayload);
                
                // Apply Rewards - BATCH NE GÈRE PAS OVERCAP DIRECTEMENT ICI,
                // MAIS LE CALCUL MANUEL ICI PERMET DE DÉPASSER LE CAP PUISQU'ON SET LA VALEUR
                if (rewards.ve) agency.ve_current += rewards.ve;
                if (rewards.budget) agency.budget_real += rewards.budget;

                // Log
                agency.eventLog.push({
                    id: `badge-auto-${Date.now()}-${Math.random()}`,
                    date: today,
                    type: 'INFO',
                    label: `Trophée : ${award.badge.label}`,
                    description: `Automatique : ${award.reason}. Bonus appliqués.`
                });

            } else {
                // Student Update
                agency.members = agency.members.map(m => {
                    if (m.id === award.targetId) {
                        let newScore = m.individualScore;
                        let newWallet = m.wallet || 0;
                        if (rewards.score) newScore = Math.min(100, newScore + rewards.score);
                        if (rewards.wallet) newWallet += rewards.wallet;

                        return {
                            ...m,
                            individualScore: newScore,
                            wallet: newWallet,
                            badges: [...(m.badges || []), badgePayload]
                        };
                    }
                    return m;
                });
                
                agency.eventLog.push({
                    id: `badge-auto-${Date.now()}-${Math.random()}`,
                    date: today,
                    type: 'INFO',
                    label: `Trophée : ${award.badge.label} (${award.targetName})`,
                    description: `Automatique : ${award.reason}.`
                });
            }
        });

        // Conversion en Batch Firestore
        agencyUpdates.forEach((updatedAgency, id) => {
            const ref = doc(db, "agencies", id);
            batch.set(ref, updatedAgency); 
        });

        try {
            await batch.commit();
            toast('success', `${pendingAwards.length} badges distribués avec succès !`);
            setIsScanPreviewOpen(false);
            setPendingAwards([]);
        } catch (error) {
            console.error(error);
            toast('error', "Erreur lors de la distribution.");
        }
    };

    // --- 3. ATTRIBUTION MANUELLE ---
    const handleManualAward = async (targetId: string, isAgency: boolean) => {
        const agency = isAgency 
            ? agencies.find(a => a.id === targetId)
            : agencies.find(a => a.members.some(m => m.id === targetId));

        if (!agency) return;

        const badgePayload = { ...selectedBadge, unlockedAt: new Date().toISOString().split('T')[0] };
        
        let bonusText = "";
        const rewards = selectedBadge.rewards || {};

        if (isAgency) {
            // Check doublon
            if (agency.badges.some(b => b.id === selectedBadge.id)) {
                toast('warning', "Cette agence a déjà ce badge.");
                return;
            }

            // Apply Agency Rewards
            let newVE = agency.ve_current;
            let newBudget = agency.budget_real;
            
            if (rewards.ve) { newVE += rewards.ve; bonusText += `+${rewards.ve} VE `; }
            if (rewards.budget) { newBudget += rewards.budget; bonusText += `+${rewards.budget} PiXi `; }

            await updateAgency({
                ...agency,
                badges: [...agency.badges, badgePayload],
                ve_current: newVE,
                budget_real: newBudget,
                eventLog: [...agency.eventLog, {
                    id: `badge-manual-${Date.now()}`,
                    date: new Date().toISOString().split('T')[0],
                    type: 'INFO',
                    label: `Trophée : ${selectedBadge.label}`,
                    description: `Badge décerné manuellement. ${bonusText}`
                }]
            }, true); // TRUE = ALLOW OVER CAP
            toast('success', `Badge ${selectedBadge.label} décerné à l'agence ! ${bonusText}`);
        } else {
            const member = agency.members.find(m => m.id === targetId);
            if (!member) return;
            if (member.badges?.some(b => b.id === selectedBadge.id)) {
                toast('warning', "Cet étudiant a déjà ce badge.");
                return;
            }

            // Apply Student Rewards
            const updatedMembers = agency.members.map(m => {
                if (m.id === targetId) {
                    let newScore = m.individualScore;
                    let newWallet = m.wallet || 0;
                    let newKarma = m.karma || 50;
                    
                    if (rewards.score) { newScore = Math.min(100, newScore + rewards.score); bonusText += `+${rewards.score} Score `; }
                    if (rewards.wallet) { newWallet += rewards.wallet; bonusText += `+${rewards.wallet} PiXi `; }
                    if (rewards.karma) { newKarma += rewards.karma; bonusText += `+${rewards.karma} Karma `; }
                    
                    return { 
                        ...m, 
                        individualScore: newScore,
                        wallet: newWallet,
                        karma: newKarma,
                        badges: [...(m.badges || []), badgePayload] 
                    };
                }
                return m;
            });

            await updateAgency({ 
                ...agency, 
                members: updatedMembers,
                eventLog: [...agency.eventLog, {
                    id: `badge-manual-${Date.now()}`,
                    date: new Date().toISOString().split('T')[0],
                    type: 'INFO',
                    label: `Trophée : ${selectedBadge.label} (${member.name})`,
                    description: `Badge décerné à ${member.name}. ${bonusText}`
                }]
            }, true); // TRUE = ALLOW OVER CAP
            toast('success', `Badge décerné à ${member.name} ! ${bonusText}`);
        }
    };

    // --- 4. HELPERS VISUELS ---
    const getIcon = (iconName: string) => {
        switch(iconName) {
            case 'crown': return <Crown size={24}/>;
            case 'shield': return <Shield size={24}/>;
            case 'zap': return <Zap size={24}/>;
            case 'eye': return <Eye size={24}/>;
            case 'users': return <Users size={24}/>;
            case 'trending-up': return <TrendingUp size={24}/>;
            case 'mountain': return <Mountain size={24}/>;
            case 'gem': return <Gem size={24}/>;
            case 'briefcase': return <Briefcase size={24}/>;
            case 'heart-handshake': return <HeartHandshake size={24}/>;
            case 'clock': return <Clock size={24}/>;
            case 'check-circle': return <CheckCircle2 size={24}/>;
            case 'user-plus': return <UserPlus size={24}/>;
            case 'flag': return <Flag size={24}/>;
            case 'flame': return <Flame size={24}/>;
            case 'glasses': return <Glasses size={24}/>;
            case 'swords': return <Swords size={24}/>;
            default: return <Medal size={24}/>;
        }
    };

    const targets = useMemo(() => {
        if (targetType === 'AGENCY') {
            return agencies.filter(a => a.id !== 'unassigned' && a.name.toLowerCase().includes(searchTarget.toLowerCase()));
        } else {
            const list: any[] = [];
            agencies.forEach(a => {
                a.members.forEach(m => {
                    if (m.name.toLowerCase().includes(searchTarget.toLowerCase())) {
                        list.push({ ...m, agencyName: a.name });
                    }
                });
            });
            return list;
        }
    }, [agencies, targetType, searchTarget]);

    return (
        <div className="animate-in fade-in duration-500 pb-20">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-xl text-yellow-600"><Medal size={32}/></div>
                        Salle des Trophées
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Gérez les badges et leurs récompenses associées.</p>
                </div>
                
                <button 
                    onClick={handleSimulateScan}
                    className="bg-slate-900 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all"
                >
                    <RefreshCw size={20}/> Scanner & Distribuer Auto
                </button>
            </div>

            {/* PREVIEW MODAL */}
            <Modal isOpen={isScanPreviewOpen} onClose={() => setIsScanPreviewOpen(false)} title={`Résultat du Scan (${pendingAwards.length})`}>
                <div className="space-y-6">
                    <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-xl text-sm text-indigo-900">
                        <p>Voici les récompenses qui seront distribuées. Vérifiez la liste avant de valider.</p>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {pendingAwards.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-3 bg-white border border-slate-200 rounded-xl">
                                <div className="p-2 bg-yellow-100 text-yellow-700 rounded-lg">
                                    {getIcon(item.badge.icon)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <h4 className="font-bold text-slate-900 text-sm">{item.targetName}</h4>
                                        <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500">{item.type === 'AGENCY' ? 'AGENCE' : 'ÉTUDIANT'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span className="font-bold text-indigo-600">{item.badge.label}</span>
                                        <span>• {item.reason}</span>
                                    </div>
                                    
                                    {/* SHOW BONUS */}
                                    <div className="flex gap-2 mt-1">
                                        {item.badge.rewards?.ve && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded">+{item.badge.rewards.ve} VE</span>}
                                        {item.badge.rewards?.score && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded">+{item.badge.rewards.score} Score</span>}
                                        {item.badge.rewards?.budget && <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-1.5 rounded">+{item.badge.rewards.budget} PiXi</span>}
                                        {item.badge.rewards?.wallet && <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-1.5 rounded">+{item.badge.rewards.wallet} PiXi</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                        <button 
                            onClick={() => setIsScanPreviewOpen(false)}
                            className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200"
                        >
                            Annuler
                        </button>
                        <button 
                            onClick={executeDistribution}
                            className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 size={18}/> Tout Valider
                        </button>
                    </div>
                </div>
            </Modal>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT: BADGE LIST */}
                <div className="lg:col-span-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar pr-2">
                    {BADGE_DEFINITIONS.map(badge => (
                        <div 
                            key={badge.id}
                            onClick={() => setSelectedBadge(badge)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4 ${
                                selectedBadge.id === badge.id 
                                ? 'bg-indigo-50 border-indigo-500 shadow-md' 
                                : 'bg-white border-slate-200 hover:border-indigo-200'
                            }`}
                        >
                            <div className={`p-3 rounded-full ${selectedBadge.id === badge.id ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                {getIcon(badge.icon)}
                            </div>
                            <div>
                                <h4 className={`font-bold ${selectedBadge.id === badge.id ? 'text-indigo-900' : 'text-slate-700'}`}>{badge.label}</h4>
                                <div className="flex gap-2 text-[10px] uppercase font-bold mt-1">
                                    {badge.rewards?.score && <span className="text-emerald-600">+{badge.rewards.score} Score</span>}
                                    {badge.rewards?.wallet && <span className="text-yellow-600">+{badge.rewards.wallet} PiXi</span>}
                                    {badge.rewards?.ve && <span className="text-purple-600">+{badge.rewards.ve} VE</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* RIGHT: ACTION PANEL */}
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl sticky top-6">
                        
                        {/* BADGE PREVIEW */}
                        <div className="flex items-start gap-6 mb-8 border-b border-slate-100 pb-8">
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-yellow-100 to-amber-200 flex items-center justify-center text-yellow-700 shadow-inner border border-yellow-300 shrink-0">
                                {React.cloneElement(getIcon(selectedBadge.icon) as React.ReactElement<any>, { size: 48 })}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-2xl font-display font-bold text-slate-900 mb-2">{selectedBadge.label}</h3>
                                    <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">ID: {selectedBadge.id}</span>
                                </div>
                                <p className="text-slate-600 text-lg leading-relaxed mb-4">{selectedBadge.description}</p>
                                
                                {/* REWARDS DISPLAY */}
                                <div className="flex flex-wrap gap-3">
                                    {selectedBadge.rewards?.score && (
                                        <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-emerald-200 flex items-center gap-2">
                                            <TrendingUp size={16}/> +{selectedBadge.rewards.score} Score Individuel
                                        </div>
                                    )}
                                    {selectedBadge.rewards?.wallet && (
                                        <div className="bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-yellow-200 flex items-center gap-2">
                                            <Gift size={16}/> +{selectedBadge.rewards.wallet} PiXi (Wallet)
                                        </div>
                                    )}
                                    {selectedBadge.rewards?.ve && (
                                        <div className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-purple-200 flex items-center gap-2">
                                            <TrendingUp size={16}/> +{selectedBadge.rewards.ve} VE (Agence)
                                        </div>
                                    )}
                                    {selectedBadge.rewards?.budget && (
                                        <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-bold border border-blue-200 flex items-center gap-2">
                                            <Building2 size={16}/> +{selectedBadge.rewards.budget} Budget (Agence)
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ASSIGNATION */}
                        <div>
                            <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Star size={20} className="text-indigo-500"/> Attribuer ce badge
                            </h4>
                            
                            <div className="flex gap-4 mb-4">
                                <button 
                                    onClick={() => setTargetType('AGENCY')}
                                    className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-2 transition-all ${
                                        targetType === 'AGENCY' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500'
                                    }`}
                                >
                                    <Building2 size={18}/> À une Agence
                                </button>
                                <button 
                                    onClick={() => setTargetType('STUDENT')}
                                    className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-2 transition-all ${
                                        targetType === 'STUDENT' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-500'
                                    }`}
                                >
                                    <User size={18}/> À un Étudiant
                                </button>
                            </div>

                            <input 
                                type="text"
                                placeholder="Rechercher..."
                                value={searchTarget}
                                onChange={(e) => setSearchTarget(e.target.value)}
                                className="w-full p-3 border border-slate-200 rounded-xl mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {targets.map((t: any) => (
                                    <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all group">
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{t.name}</p>
                                            {t.agencyName && <p className="text-[10px] text-slate-500">{t.agencyName}</p>}
                                            {/* CHECK IF ALREADY HAS */}
                                            {t.badges?.some((b: any) => b.id === selectedBadge.id) && (
                                                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 size={10}/> Déjà acquis</span>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => handleManualAward(t.id, targetType === 'AGENCY')}
                                            disabled={t.badges?.some((b: any) => b.id === selectedBadge.id)}
                                            className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Donner (+Bonus)
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};
