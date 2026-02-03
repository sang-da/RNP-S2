
import React, { useMemo, useState } from 'react';
import { Agency, PeerReview } from '../types';
import { HeartHandshake, Archive, Activity } from 'lucide-react';

// SUB-COMPONENTS
import { ReviewFilters } from './peer-reviews/ReviewFilters';
import { ReviewTable } from './peer-reviews/ReviewTable';
import { ReviewStats } from './peer-reviews/ReviewStats';

interface AdminPeerReviewsProps {
    agencies: Agency[];
}

export const AdminPeerReviews: React.FC<AdminPeerReviewsProps> = ({ agencies }) => {
    const [viewMode, setViewMode] = useState<'ACTIVE' | 'ARCHIVE'>('ACTIVE');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClass, setFilterClass] = useState<'ALL' | 'A' | 'B'>('ALL');
    const [filterWeek, setFilterWeek] = useState<string>('ALL');
    const [filterAgencyId, setFilterAgencyId] = useState<string>('ALL');

    // 1. SÉPARATION DES DONNÉES
    const { activeReviews, archivedReviews } = useMemo(() => {
        const active: (PeerReview & { agencyName: string, classId: string, agencyId: string })[] = [];
        const archive: (PeerReview & { agencyName: string, classId: string, agencyId: string })[] = [];

        agencies.forEach(agency => {
            if (agency.id === 'unassigned') return;
            
            // Reviews actives (Semaine en cours)
            (agency.peerReviews || []).forEach(review => {
                active.push({ ...review, agencyId: agency.id, agencyName: agency.name, classId: agency.classId });
            });

            // Reviews archivées (Passé)
            (agency.reviewHistory || []).forEach(review => {
                archive.push({ ...review, agencyId: agency.id, agencyName: agency.name, classId: agency.classId });
            });
        });

        return {
            activeReviews: active.sort((a, b) => b.date.localeCompare(a.date)),
            archivedReviews: archive.sort((a, b) => b.date.localeCompare(a.date))
        };
    }, [agencies]);

    // 2. SÉLECTION DE LA SOURCE DE DONNÉES
    const currentSource = viewMode === 'ACTIVE' ? activeReviews : archivedReviews;

    // 3. FILTRAGE
    const filteredReviews = useMemo(() => {
        return currentSource.filter(r => {
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
    }, [currentSource, searchTerm, filterClass, filterWeek, filterAgencyId]);

    const availableWeeks = useMemo(() => 
        Array.from(new Set(currentSource.map(r => r.weekId))).sort((a: any, b: any) => parseInt(a) - parseInt(b))
    , [currentSource]);

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
                        <Activity size={16}/> Semaine Active ({activeReviews.length})
                    </button>
                    <button 
                        onClick={() => { setViewMode('ARCHIVE'); resetFilters(); }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'ARCHIVE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Archive size={16}/> Archives Historiques ({archivedReviews.length})
                    </button>
                </div>
            </div>

            {/* BANDEAU INFO */}
            {viewMode === 'ARCHIVE' && (
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center gap-3 text-indigo-800 text-sm">
                    <Archive size={20} className="shrink-0"/>
                    <p>
                        <strong>Mode Archives :</strong> Vous consultez les {archivedReviews.length} évaluations passées.
                        Ces données sont verrouillées et servent uniquement à l'analyse historique.
                    </p>
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
