
import React, { useMemo, useState } from 'react';
import { Agency, PeerReview } from '../types';
import { HeartHandshake, Archive, Activity, Save } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { writeBatch, doc, db } from '../services/firebase';

// SUB-COMPONENTS
import { ReviewFilters } from './peer-reviews/ReviewFilters';
import { ReviewTable } from './peer-reviews/ReviewTable';
import { ReviewStats } from './peer-reviews/ReviewStats';

interface AdminPeerReviewsProps {
    agencies: Agency[];
}

export const AdminPeerReviews: React.FC<AdminPeerReviewsProps> = ({ agencies }) => {
    const { toast, confirm } = useUI();
    const [viewMode, setViewMode] = useState<'ACTIVE' | 'ARCHIVE'>('ACTIVE');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClass, setFilterClass] = useState<'ALL' | 'A' | 'B'>('ALL');
    const [filterWeek, setFilterWeek] = useState<string>('ALL');
    const [filterAgencyId, setFilterAgencyId] = useState<string>('ALL');

    // 1. APLATISSEMENT DES DONNÉES SELON LE MODE
    const reviewsInView = useMemo(() => {
        const reviews: (PeerReview & { agencyName: string, classId: string, agencyId: string })[] = [];
        agencies.forEach(agency => {
            if (agency.id === 'unassigned') return;
            
            // Sélectionner la source selon le mode
            const source = viewMode === 'ACTIVE' ? (agency.peerReviews || []) : (agency.reviewHistory || []);
            
            source.forEach(review => {
                reviews.push({
                    ...review,
                    agencyId: agency.id,
                    agencyName: agency.name,
                    classId: agency.classId
                });
            });
        });
        // Trier par date décroissante
        return reviews.sort((a, b) => b.date.localeCompare(a.date));
    }, [agencies, viewMode]);

    // 2. FILTRAGE
    const filteredReviews = useMemo(() => {
        return reviewsInView.filter(r => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = 
                r.reviewerName.toLowerCase().includes(searchLower) ||
                r.targetName.toLowerCase().includes(searchLower) ||
                r.agencyName.toLowerCase().includes(searchLower);
            
            const matchesClass = filterClass === 'ALL' || r.classId === filterClass;
            const matchesWeek = filterWeek === 'ALL' || r.weekId === filterWeek;
            const matchesAgency = filterAgencyId === 'ALL' || r.agencyId === filterAgencyId;

            return matchesSearch && matchesClass && matchesWeek && matchesAgency;
        });
    }, [reviewsInView, searchTerm, filterClass, filterWeek, filterAgencyId]);

    // 3. SEMAINES DISPONIBLES (Calculées sur la totalité des reviews du mode, pas juste les filtrées)
    const availableWeeks = useMemo(() => 
        Array.from(new Set(reviewsInView.map(r => r.weekId))).sort((a: any, b: any) => parseInt(a) - parseInt(b))
    , [reviewsInView]);

    const handleArchiveActive = async () => {
        const count = reviewsInView.length;
        if (count === 0) return;

        const confirmed = await confirm({
            title: "Archiver la semaine en cours ?",
            message: `Vous allez déplacer ${count} avis actifs vers l'historique.\nIls disparaîtront de la vue "Semaine Active" pour aller dans "Archives".\n\nUtile si vous ne faites pas de bilan financier automatique.`,
            confirmText: "Archiver Maintenant"
        });

        if (!confirmed) return;

        try {
            const batch = writeBatch(db);
            let processed = 0;

            agencies.forEach(a => {
                if (a.peerReviews && a.peerReviews.length > 0) {
                    const newHistory = [...(a.reviewHistory || []), ...a.peerReviews];
                    const ref = doc(db, "agencies", a.id);
                    batch.update(ref, {
                        peerReviews: [], // Vider l'actif
                        reviewHistory: newHistory // Remplir l'archive
                    });
                    processed += a.peerReviews.length;
                }
            });

            await batch.commit();
            toast('success', `${processed} avis archivés avec succès.`);
            // Basculer vers la vue archive pour voir le résultat
            setViewMode('ARCHIVE');
        } catch (e) {
            toast('error', "Erreur lors de l'archivage.");
        }
    };

    const resetFilters = () => {
        setSearchTerm('');
        setFilterClass('ALL');
        setFilterWeek('ALL');
        setFilterAgencyId('ALL');
    };

    return (
        <div className="animate-in fade-in duration-500 pb-20 space-y-6">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-rose-100 rounded-xl text-rose-600"><HeartHandshake size={32}/></div>
                        Bilans RH & Feedbacks
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Surveillez l'ambiance des studios et détectez les conflits internes.</p>
                </div>

                {/* VIEW TOGGLE */}
                <div className="flex bg-slate-200 p-1 rounded-xl">
                    <button 
                        onClick={() => { setViewMode('ACTIVE'); resetFilters(); }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'ACTIVE' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Activity size={16}/> Semaine Active ({viewMode === 'ACTIVE' ? reviewsInView.length : '?'})
                    </button>
                    <button 
                        onClick={() => { setViewMode('ARCHIVE'); resetFilters(); }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'ARCHIVE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Archive size={16}/> Archives ({viewMode === 'ARCHIVE' ? reviewsInView.length : '?'})
                    </button>
                </div>
            </div>

            {/* BANDEAU INFO & ACTION */}
            {viewMode === 'ACTIVE' && reviewsInView.length > 0 && (
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3 text-rose-800 text-sm">
                        <Activity size={20} className="shrink-0"/>
                        <p>
                            <strong>{reviewsInView.length} avis en attente.</strong> Ils seront archivés automatiquement lors du prochain Bilan Financier (Vendredi).
                            <br/>Vous pouvez forcer l'archivage maintenant si nécessaire.
                        </p>
                    </div>
                    <button 
                        onClick={handleArchiveActive}
                        className="px-4 py-2 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition-colors flex items-center gap-2 text-xs shadow-sm"
                    >
                        <Save size={14}/> Archiver Maintenant
                    </button>
                </div>
            )}

            {/* STATS RAPIDES */}
            <ReviewStats reviews={filteredReviews} />

            {/* FILTRES & RECHERCHE */}
            <ReviewFilters 
                searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                filterClass={filterClass} setFilterClass={setFilterClass}
                filterWeek={filterWeek} setFilterWeek={setFilterWeek}
                filterAgencyId={filterAgencyId} setFilterAgencyId={setFilterAgencyId}
                availableWeeks={availableWeeks}
                agencies={agencies.filter(a => a.id !== 'unassigned')}
            />

            {/* LISTE DES REVIEWS */}
            <ReviewTable reviews={filteredReviews} onResetFilters={resetFilters} />

        </div>
    );
};
