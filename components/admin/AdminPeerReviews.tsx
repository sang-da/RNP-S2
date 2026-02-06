
import React, { useMemo, useState } from 'react';
import { Agency, PeerReview } from '../../types';
import { HeartHandshake } from 'lucide-react';
import { useGame } from '../../contexts/GameContext'; // USE GLOBAL REVIEWS

// SUB-COMPONENTS
import { ReviewFilters } from './peer-reviews/ReviewFilters';
import { ReviewTable } from './peer-reviews/ReviewTable';
import { ReviewStats } from './peer-reviews/ReviewStats';

interface AdminPeerReviewsProps {
    agencies: Agency[];
}

export const AdminPeerReviews: React.FC<AdminPeerReviewsProps> = ({ agencies }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClass, setFilterClass] = useState<'ALL' | 'A' | 'B'>('ALL');
    const [filterWeek, setFilterWeek] = useState<string>('ALL');
    const [filterAgencyId, setFilterAgencyId] = useState<string>('ALL');
    const { reviews: globalReviews } = useGame(); // GET GLOBAL REVIEWS

    // 1. ENRICHISSEMENT DES DONNÉES (Pour l'affichage)
    const enrichedReviews = useMemo(() => {
        return globalReviews.map(review => {
            const agency = agencies.find(a => a.id === review.agencyId);
            return {
                ...review,
                agencyName: agency?.name || 'Agence Inconnue',
                classId: agency?.classId || '?'
            };
        }).sort((a, b) => b.date.localeCompare(a.date));
    }, [globalReviews, agencies]);

    // 2. FILTRAGE COMPLET
    const filteredReviews = useMemo(() => {
        return enrichedReviews.filter(r => {
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
    }, [enrichedReviews, searchTerm, filterClass, filterWeek, filterAgencyId]);

    const availableWeeks = useMemo(() => 
        Array.from(new Set(enrichedReviews.map(r => r.weekId))).sort((a: any, b: any) => parseInt(a) - parseInt(b))
    , [enrichedReviews]);

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
                    <p className="text-slate-500 text-sm mt-1">
                        Centralisation de toutes les évaluations. 
                        <span className="font-bold text-slate-700 ml-1">{globalReviews.length} avis enregistrés.</span>
                    </p>
                </div>
            </div>

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
