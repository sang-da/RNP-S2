
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

        // Check for globally unique badges
        const anyAgencyHasLegend = agencies.some(a => a.badges?.some(b => b.id === 'legend_100'));
        const anyStudentHasPioneer = agencies.some(a => a.members?.some(m => m.badges?.some(b => b.id === 'score_100')));

        let legendAssignedInThisScan = false;
        let pioneerAssignedInThisScan = false;

        agencies.forEach(agency => {
            if (agency.id === 'unassigned') return;

            // --- AGENCY BADGES ---
            // A. BADGE LÉGENDE (100 VE) - UNIQUE
            if (agency.ve_current >= 100 && !anyAgencyHasLegend && !legendAssignedInThisScan) {
                const def = BADGE_DEFINITIONS.find(b => b.id === 'legend_100');
                if (def && !agency.badges?.some(b => b.id === 'legend_100')) {
                    detectedAwards.push({ targetId: agency.id, targetName: agency.name, type: 'AGENCY', badge: def, reason: "Première agence à atteindre 100 VE" });
                    legendAssignedInThisScan = true;
                }
            }

            // SHARK (OPA)
            const hasMerger = agency.eventLog.some(e => e.type === 'MERGER' || e.label === 'Acquisition');
            if (hasMerger) {
                const def = BADGE_DEFINITIONS.find(b => b.id === 'shark');
                if (def && !agency.badges?.some(b => b.id === 'shark')) {
                    detectedAwards.push({ targetId: agency.id, targetName: agency.name, type: 'AGENCY', badge: def, reason: "Acquisition réussie" });
                }
            }

            // PHOENIX (Remontada: was in crisis but now > 70 VE)
            const hadCrisis = agency.eventLog.some(e => e.type === 'CRISIS' && (e.deltaVE || 0) <= -10);
            if (agency.ve_current >= 70 && hadCrisis) {
                const def = BADGE_DEFINITIONS.find(b => b.id === 'phoenix');
                if (def && !agency.badges?.some(b => b.id === 'phoenix')) {
                    detectedAwards.push({ targetId: agency.id, targetName: agency.name, type: 'AGENCY', badge: def, reason: "Remontada impressionnante" });
                }
            }

            // BANKRUPT (Too Big To Fail: was deep in debt, now > 0)
            const wasInDebt = agency.eventLog.some(e => e.type === 'CRISIS' && e.label === 'Dette' && (e.deltaVE || 0) <= -5); // Approximation
            if (agency.budget_real >= 0 && wasInDebt) {
                const def = BADGE_DEFINITIONS.find(b => b.id === 'bankrupt');
                if (def && !agency.badges?.some(b => b.id === 'bankrupt')) {
                    detectedAwards.push({ targetId: agency.id, targetName: agency.name, type: 'AGENCY', badge: def, reason: "A survécu à un taux d'endettement critique et redressé la barre" });
                }
            }
            
            // SURVIVOR: ve >= 40 and survived crisis
            if (agency.ve_current >= 40 && hadCrisis) {
                const def = BADGE_DEFINITIONS.find(b => b.id === 'survivor');
                if (def && !agency.badges?.some(b => b.id === 'survivor')) {
                    detectedAwards.push({ targetId: agency.id, targetName: agency.name, type: 'AGENCY', badge: def, reason: "A survécu à de graves crises avec une VE résiliente" });
                }
            }

            // B. BADGE LICORNE (20k Budget) -> Given to all students
            if (agency.budget_real >= 20000) {
                agency.members.forEach(m => {
                    const hasBadge = m.badges?.some(b => b.id === 'wealthy');
                    if (!hasBadge) {
                        const def = BADGE_DEFINITIONS.find(b => b.id === 'wealthy');
                        if (def) {
                            detectedAwards.push({ targetId: m.id, targetName: m.name, type: 'STUDENT', badge: def, reason: "Trésorerie Agence > 20k", agencyName: agency.name });
                        }
                    }
                });
            }

            // --- STUDENT BADGES ---
            agency.members.forEach(m => {
                // C. PIONNIER (100 SCORE) - UNIQUE
                if (m.individualScore >= 100 && !anyStudentHasPioneer && !pioneerAssignedInThisScan) {
                    const def = BADGE_DEFINITIONS.find(b => b.id === 'score_100');
                    if (def && !m.badges?.some(b => b.id === 'score_100')) {
                        detectedAwards.push({ targetId: m.id, targetName: m.name, type: 'STUDENT', badge: def, reason: "Premier à atteindre 100/100 Score Individuel", agencyName: agency.name });
                        pioneerAssignedInThisScan = true;
                    }
                }
                
                // MAGNAT (5000+ PiXi cumulé: Wallet + Épargne)
                const totalWealth = (m.wallet || 0) + (m.savings || 0);
                if (totalWealth >= 5000) {
                    const def = BADGE_DEFINITIONS.find(b => b.id === 'tycoon');
                    if (def && !m.badges?.some(b => b.id === 'tycoon')) {
                        detectedAwards.push({ targetId: m.id, targetName: m.name, type: 'STUDENT', badge: def, reason: "Fortune (Wallet + Banque) >= 5000", agencyName: agency.name });
                    }
                }

                // INVESTOR (A injecté de l'argent)
                if (m.cumulativeInjection && m.cumulativeInjection > 0) {
                    const def = BADGE_DEFINITIONS.find(b => b.id === 'investor');
                    if (def && !m.badges?.some(b => b.id === 'investor')) {
                        detectedAwards.push({ targetId: m.id, targetName: m.name, type: 'STUDENT', badge: def, reason: "A injecté du capital personnel", agencyName: agency.name });
                    }
                }

                // VISIONARY (Streak >= 3)
                if (m.streak && m.streak >= 3) {
                    const def = BADGE_DEFINITIONS.find(b => b.id === 'visionary');
                    if (def && !m.badges?.some(b => b.id === 'visionary')) {
                        detectedAwards.push({ targetId: m.id, targetName: m.name, type: 'STUDENT', badge: def, reason: "3 cycles consécutifs d'excellence (Streak >= 3)", agencyName: agency.name });
                    }
                }

                // TEAMWORK (>90 indivScore + streak > 0)
                if (m.individualScore >= 90 && (m.streak || 0) > 0) {
                    const def = BADGE_DEFINITIONS.find(b => b.id === 'teamwork');
                    if (def && !m.badges?.some(b => b.id === 'teamwork')) {
                        detectedAwards.push({ targetId: m.id, targetName: m.name, type: 'STUDENT', badge: def, reason: "Participation collective exceptionnelle (Score > 90)", agencyName: agency.name });
                    }
                }

                // PATRON / PHILANTHROPE (Dons aux collègues)
                // Crude check: how many Virement P2P (Sortant) did this student make?
                const donations = agency.eventLog.filter(e => e.label === 'Virement P2P (Sortant)' && e.description?.includes(`${m.name} ->`)).length;
                if (donations >= 1) {
                    const def = BADGE_DEFINITIONS.find(b => b.id === 'patron');
                    if (def && !m.badges?.some(b => b.id === 'patron')) {
                        detectedAwards.push({ targetId: m.id, targetName: m.name, type: 'STUDENT', badge: def, reason: "A fait un don généreux", agencyName: agency.name });
                    }
                }
                if (donations >= 3) {
                    const def = BADGE_DEFINITIONS.find(b => b.id === 'philanthropist');
                    if (def && !m.badges?.some(b => b.id === 'philanthropist')) {
                        detectedAwards.push({ targetId: m.id, targetName: m.name, type: 'STUDENT', badge: def, reason: "A effectué plusieurs dons importants", agencyName: agency.name });
                    }
                }

                // HACKER (Utilisé backdoor / Intelligence)
                const blackOps = agency.eventLog.filter(e => e.type === 'BLACK_OP' && e.description?.includes(m.name)).length;
                if ((m.karma && m.karma < 30) || blackOps > 0) {
                    const def = BADGE_DEFINITIONS.find(b => b.id === 'hacker');
                    if (def && !m.badges?.some(b => b.id === 'hacker')) {
                        detectedAwards.push({ targetId: m.id, targetName: m.name, type: 'STUDENT', badge: def, reason: "A exploré le côté obscur des affaires (Karma < 30 ou Opération Spéciale)", agencyName: agency.name });
                    }
                }

                // SPY MASTER (Multiple ops)
                const agencyOps = agency.eventLog.filter(e => e.type === 'BLACK_OP').length;
                if (agencyOps >= 3 && m.individualScore > 50) { // Give it to performing members if agency did 3 ops
                    const def = BADGE_DEFINITIONS.find(b => b.id === 'spy_master');
                    if (def && !m.badges?.some(b => b.id === 'spy_master')) {
                        detectedAwards.push({ targetId: m.id, targetName: m.name, type: 'STUDENT', badge: def, reason: "A opéré à l'ombre de son agence (Multiples Opérations)", agencyName: agency.name });
                    }
                }

                // TECH WIZARD (MVP Technique désigné)
                const isMVP = agency.eventLog.filter(e => e.description?.includes(`MVP: ${m.name}`)).length;
                if (isMVP >= 1) {
                    const def = BADGE_DEFINITIONS.find(b => b.id === 'tech_wizard');
                    if (def && !m.badges?.some(b => b.id === 'tech_wizard')) {
                        detectedAwards.push({ targetId: m.id, targetName: m.name, type: 'STUDENT', badge: def, reason: "A été désigné MVP sur un livrable", agencyName: agency.name });
                    }
                }
            });

            // --- AGENCY BADGES ---

            // PIXEL PERFECT & STAKHANOV
            let hasPixelPerfectCycle = false;
            let hasStakhanovCycle = false;

            Object.values(agency.progress || {}).forEach(week => {
                if (week.deliverables && week.deliverables.length > 0) {
                    const allValidated = week.deliverables.every(d => d.status === 'validated');
                    if (allValidated) {
                        const allPerfect = week.deliverables.every(d => d.grading && d.grading.quality !== 'C' && (d.grading.daysLate === 0 || !d.grading.daysLate));
                        if (allPerfect) hasPixelPerfectCycle = true;

                        const allEarly = week.deliverables.every(d => {
                            // Find log for this specific deliverable to see if it had 'Avance'
                            const logEntry = agency.eventLog.find(e => e.label.includes(d.name) && e.description?.includes('(Avance)'));
                            return !!logEntry;
                        });
                        if (allEarly) hasStakhanovCycle = true;
                    }
                }
            });

            if (hasPixelPerfectCycle) {
                const def = BADGE_DEFINITIONS.find(b => b.id === 'pixel_perfect');
                if (def && !agency.badges?.some(b => b.id === 'pixel_perfect')) {
                    detectedAwards.push({ targetId: agency.id, targetName: agency.name, type: 'AGENCY', badge: def, reason: "A rendu un cycle complet sans rejet ni retard" });
                }
            }

            if (hasStakhanovCycle) {
                const def = BADGE_DEFINITIONS.find(b => b.id === 'stakhanov');
                if (def && !agency.badges?.some(b => b.id === 'stakhanov')) {
                    detectedAwards.push({ targetId: agency.id, targetName: agency.name, type: 'AGENCY', badge: def, reason: "A rendu tous les livrables d'un cycle en avance" });
                }
            }

            // HEADHUNTER
            const hasRecruited = agency.eventLog.some(e => e.label === 'Recrutement Validé');
            if (hasRecruited) {
                const def = BADGE_DEFINITIONS.find(b => b.id === 'headhunter');
                if (def && !agency.badges?.some(b => b.id === 'headhunter')) {
                    detectedAwards.push({ targetId: agency.id, targetName: agency.name, type: 'AGENCY', badge: def, reason: "A recruté avec succès un talent" });
                }
            }
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
                agency.badges = [...(agency.badges || []), badgePayload];
                
                // Apply Rewards
                if (rewards.ve) agency.ve_current += rewards.ve;
                if (rewards.budget) agency.budget_real += rewards.budget;

                // If badge has individual rewards, give them to all members
                agency.members = agency.members.map(m => {
                    let newScore = m.individualScore;
                    let newWallet = m.wallet || 0;
                    let newKarma = m.karma || 50;

                    if (rewards.score) newScore = Math.min(100, newScore + rewards.score);
                    if (rewards.wallet) newWallet += rewards.wallet;
                    if (rewards.karma) newKarma += rewards.karma;

                    return { ...m, individualScore: newScore, wallet: newWallet, karma: newKarma };
                });

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
                        let newKarma = m.karma || 50;

                        if (rewards.score) newScore = Math.min(100, newScore + rewards.score);
                        if (rewards.wallet) newWallet += rewards.wallet;
                        if (rewards.karma) newKarma += rewards.karma;

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
        
        // CHECK GLOBAL UNIQUENESS FOR SPECIFIC BADGES
        if (selectedBadge.id === 'legend_100') {
            const hasLegend = agencies.some(a => a.badges?.some(b => b.id === 'legend_100'));
            if (hasLegend) {
                toast('error', "Ce trophée (Légende) est UNIQUE et a déjà été attribué.");
                return;
            }
        }
        if (selectedBadge.id === 'score_100') {
            const hasPioneer = agencies.some(a => a.members.some(m => m.badges?.some(b => b.id === 'score_100')));
            if (hasPioneer) {
                toast('error', "Ce trophée (Pionnier) est UNIQUE et a déjà été attribué.");
                return;
            }
        }

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

            const updatedMembers = agency.members.map(m => {
                let newScore = m.individualScore;
                let newWallet = m.wallet || 0;
                let newKarma = m.karma || 50;

                if (rewards.score) newScore = Math.min(100, newScore + rewards.score);
                if (rewards.wallet) newWallet += rewards.wallet;
                if (rewards.karma) newKarma += rewards.karma;

                return { ...m, individualScore: newScore, wallet: newWallet, karma: newKarma };
            });

            await updateAgency({
                ...agency,
                members: updatedMembers,
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
