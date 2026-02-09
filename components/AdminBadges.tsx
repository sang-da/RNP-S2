
import React, { useState, useMemo } from 'react';
import { Agency, Badge } from '../types';
import { BADGE_DEFINITIONS } from '../config/awards';
import { useGame } from '../contexts/GameContext';
import { useUI } from '../contexts/UIContext';
import { Medal, Crown, Shield, Zap, Eye, Users, Star, TrendingUp, CheckCircle2, User, Building2, RefreshCw } from 'lucide-react';
import { writeBatch, doc, db } from '../services/firebase';

interface AdminBadgesProps {
    agencies: Agency[];
}

export const AdminBadges: React.FC<AdminBadgesProps> = ({ agencies }) => {
    const { toast, confirm } = useUI();
    const { updateAgency } = useGame();
    const [selectedBadge, setSelectedBadge] = useState<Badge>(BADGE_DEFINITIONS[0]);
    const [targetType, setTargetType] = useState<'AGENCY' | 'STUDENT'>('AGENCY');
    const [searchTarget, setSearchTarget] = useState('');

    // --- 1. SCANNER AUTOMATIQUE ---
    const handleAutoScan = async () => {
        const confirmed = await confirm({
            title: "Lancer le Scan des Trophées ?",
            message: "Le système va analyser toutes les agences pour détecter :\n- Les 100 VE (Légende)\n- Les Trésoreries > 20k (Licorne)\n\nLes badges seront distribués automatiquement.",
            confirmText: "Scanner & Distribuer"
        });

        if (!confirmed) return;

        let awardedCount = 0;
        const batch = writeBatch(db);

        agencies.forEach(agency => {
            if (agency.id === 'unassigned') return;
            let agencyUpdated = false;
            let newAgencyBadges = [...(agency.badges || [])];
            let newMembers = [...agency.members];

            // A. BADGE LÉGENDE (100 VE)
            if (agency.ve_current >= 100) {
                const hasBadge = newAgencyBadges.some(b => b.id === 'legend_100');
                if (!hasBadge) {
                    const def = BADGE_DEFINITIONS.find(b => b.id === 'legend_100');
                    if (def) {
                        newAgencyBadges.push({ ...def, unlockedAt: new Date().toISOString().split('T')[0] });
                        agencyUpdated = true;
                        awardedCount++;
                    }
                }
            }

            // B. BADGE LICORNE (20k Budget)
            // Note: Normalement géré dans la finance, mais double check ici pour les oublis
            if (agency.budget_real >= 20000) {
                newMembers = newMembers.map(m => {
                    const hasBadge = m.badges?.some(b => b.id === 'wealthy');
                    if (!hasBadge) {
                        const def = BADGE_DEFINITIONS.find(b => b.id === 'wealthy');
                        if (def) {
                            awardedCount++;
                            return { 
                                ...m, 
                                badges: [...(m.badges || []), { ...def, unlockedAt: new Date().toISOString().split('T')[0] }] 
                            };
                        }
                    }
                    return m;
                });
                if (newMembers !== agency.members) agencyUpdated = true;
            }

            if (agencyUpdated) {
                const ref = doc(db, "agencies", agency.id);
                batch.update(ref, { 
                    badges: newAgencyBadges,
                    members: newMembers 
                });
            }
        });

        if (awardedCount > 0) {
            await batch.commit();
            toast('success', `${awardedCount} nouveaux badges distribués !`);
        } else {
            toast('info', "Scan terminé. Aucun nouveau lauréat.");
        }
    };

    // --- 2. ATTRIBUTION MANUELLE ---
    const handleManualAward = async (targetId: string, isAgency: boolean) => {
        const agency = isAgency 
            ? agencies.find(a => a.id === targetId)
            : agencies.find(a => a.members.some(m => m.id === targetId));

        if (!agency) return;

        const badgePayload = { ...selectedBadge, unlockedAt: new Date().toISOString().split('T')[0] };

        if (isAgency) {
            // Check doublon
            if (agency.badges.some(b => b.id === selectedBadge.id)) {
                toast('warning', "Cette agence a déjà ce badge.");
                return;
            }
            await updateAgency({
                ...agency,
                badges: [...agency.badges, badgePayload]
            });
            toast('success', `Badge ${selectedBadge.label} décerné à l'agence !`);
        } else {
            const member = agency.members.find(m => m.id === targetId);
            if (!member) return;
            if (member.badges?.some(b => b.id === selectedBadge.id)) {
                toast('warning', "Cet étudiant a déjà ce badge.");
                return;
            }
            const updatedMembers = agency.members.map(m => 
                m.id === targetId ? { ...m, badges: [...(m.badges || []), badgePayload] } : m
            );
            await updateAgency({ ...agency, members: updatedMembers });
            toast('success', `Badge ${selectedBadge.label} décerné à ${member.name} !`);
        }
    };

    // --- 3. HELPERS VISUELS ---
    const getIcon = (iconName: string) => {
        switch(iconName) {
            case 'crown': return <Crown size={24}/>;
            case 'shield': return <Shield size={24}/>;
            case 'zap': return <Zap size={24}/>;
            case 'eye': return <Eye size={24}/>;
            case 'users': return <Users size={24}/>;
            case 'trending-up': return <TrendingUp size={24}/>;
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
                    <p className="text-slate-500 text-sm mt-1">Gérez les badges, les récompenses et les titres honorifiques.</p>
                </div>
                
                <button 
                    onClick={handleAutoScan}
                    className="bg-slate-900 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all"
                >
                    <RefreshCw size={20}/> Scanner & Distribuer Auto
                </button>
            </div>

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
                                <p className="text-xs text-slate-500 line-clamp-1">{badge.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* RIGHT: ACTION PANEL */}
                <div className="lg:col-span-8">
                    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl sticky top-6">
                        
                        {/* BADGE PREVIEW */}
                        <div className="flex items-start gap-6 mb-8 border-b border-slate-100 pb-8">
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-yellow-100 to-amber-200 flex items-center justify-center text-yellow-700 shadow-inner border border-yellow-300">
                                {React.cloneElement(getIcon(selectedBadge.icon) as React.ReactElement<any>, { size: 48 })}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-2xl font-display font-bold text-slate-900 mb-2">{selectedBadge.label}</h3>
                                    <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">ID: {selectedBadge.id}</span>
                                </div>
                                <p className="text-slate-600 text-lg leading-relaxed">{selectedBadge.description}</p>
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
                                            Donner
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
