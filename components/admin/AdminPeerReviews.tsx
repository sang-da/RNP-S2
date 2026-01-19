
import React, { useMemo, useState } from 'react';
import { Agency, PeerReview } from '../../types';
import { HeartHandshake, Search, Calendar, Filter, AlertTriangle } from 'lucide-react';

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

    // 1. APLATISSEMENT DES DONNÉES
    const allReviews = useMemo(() => {
        const reviews: (PeerReview & { agencyName: string, classId: string })[] = [];
        agencies.forEach(agency => {
            if (agency.id === 'unassigned') return;
            (agency.peerReviews || []).forEach(review => {
                reviews.push({
                    ...review,
                    agencyName: agency.name,
                    classId: agency.classId
                });
            });
        });
        // Trier par date décroissante
        return reviews.sort((a, b) => b.date.localeCompare(a.date));
    }, [agencies]);

    // 2. FILTRAGE
    const filteredReviews = useMemo(() => {
        return allReviews.filter(r => {
            const matchesSearch = 
                r.reviewerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.targetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.agencyName.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesClass = filterClass === 'ALL' || r.classId === filterClass;
            const matchesWeek = filterWeek === 'ALL' || r.weekId === filterWeek;

            return matchesSearch && matchesClass && matchesWeek;
        });
    }, [allReviews, searchTerm, filterClass, filterWeek]);

    return (
        <div className="animate-in fade-in duration-500 pb-20 space-y-6">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-rose-100 rounded-xl text-rose-600"><HeartHandshake size={32}/></div>
                        Bilans & Peer Reviews
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Consultez les feedbacks internes et détectez les conflits d'équipe.</p>
                </div>
            </div>

            {/* STATS RAPIDES */}
            <ReviewStats reviews={filteredReviews} />

            {/* FILTRES & RECHERCHE */}
            <ReviewFilters 
                searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                filterClass={filterClass} setFilterClass={setFilterClass}
                filterWeek={filterWeek} setFilterWeek={setFilterWeek}
                availableWeeks={Array.from(new Set(allReviews.map(r => r.weekId))).sort()}
            />

            {/* LISTE DES REVIEWS */}
            <ReviewTable reviews={filteredReviews} />

        </div>
    );
};
