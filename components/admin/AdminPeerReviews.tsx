
import React, { useMemo, useState } from 'react';
import { Agency, PeerReview } from '../../types';
import { HeartHandshake, RefreshCw, ShieldAlert, Download, BarChart2, List, FileJson, FileText } from 'lucide-react';
import { useGame } from '../../contexts/GameContext'; // USE GLOBAL REVIEWS

// SUB-COMPONENTS
import { ReviewFilters } from './peer-reviews/ReviewFilters';
import { ReviewTable } from './peer-reviews/ReviewTable';
import { ReviewStats } from './peer-reviews/ReviewStats';
import { ReviewAudit } from './peer-reviews/ReviewAudit';
import { ReviewDataviz } from './peer-reviews/ReviewDataviz';

interface AdminPeerReviewsProps {
    agencies: Agency[];
}

export const AdminPeerReviews: React.FC<AdminPeerReviewsProps> = ({ agencies }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClass, setFilterClass] = useState<'ALL' | 'A' | 'B'>('ALL');
    const [filterWeek, setFilterWeek] = useState<string>('ALL');
    const [filterAgencyId, setFilterAgencyId] = useState<string>('ALL');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showAudit, setShowAudit] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'dataviz'>('list');
    const { reviews: globalReviews } = useGame(); // GET GLOBAL REVIEWS

    const handleRefresh = () => {
        setIsRefreshing(true);
        // Simulate a refresh delay since data is synced via onSnapshot
        setTimeout(() => setIsRefreshing(false), 800);
    };

    const handleExportCSV = () => {
        const headers = ["ID", "Semaine", "Date", "Reviewer_ID", "Reviewer_Nom", "Cible_ID", "Cible_Nom", "Agence", "Assiduité", "Qualité", "Implication", "Score_Total", "Commentaire"];
        
        const rows = enrichedReviews.map(r => [
            r.id,
            r.weekId,
            r.date,
            r.reviewerId,
            r.reviewerName,
            r.targetId,
            r.targetName,
            r.agencyName,
            r.ratings.attendance,
            r.ratings.quality,
            r.ratings.involvement,
            r.totalScore || 0,
            `"${(r.comment || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        downloadFile(csvContent, 'bilans_rh_export.csv', 'text/csv;charset=utf-8;');
    };

    const handleExportJSON = () => {
        const jsonContent = JSON.stringify(enrichedReviews, null, 2);
        downloadFile(jsonContent, 'bilans_rh_export.json', 'application/json');
    };

    const downloadFile = (content: string, fileName: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
                <div className="flex gap-2 flex-wrap justify-end">
                    <button 
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                        title="Exporter en CSV"
                    >
                        <Download size={16} />
                        <span className="font-medium hidden sm:inline">CSV</span>
                    </button>
                    <button 
                        onClick={handleExportJSON}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                        title="Exporter en JSON"
                    >
                        <FileJson size={16} />
                        <span className="font-medium hidden sm:inline">JSON</span>
                    </button>
                    <button 
                        onClick={() => setShowAudit(!showAudit)}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-xl transition-colors shadow-sm font-medium ${showAudit ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <ShieldAlert size={16} />
                        <span className="hidden sm:inline">Audit</span>
                    </button>
                    <button 
                        onClick={handleRefresh}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                        title="Rafraîchir"
                    >
                        <RefreshCw size={16} className={isRefreshing ? "animate-spin text-indigo-600" : ""} />
                        <span className="font-medium hidden sm:inline">Rafraîchir</span>
                    </button>
                </div>
            </div>

            {/* VIEW MODE TABS */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-max mx-auto overflow-x-auto hide-scrollbar">
                <button 
                    onClick={() => setViewMode('list')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                    <List size={18} />
                    <span>Vue Liste d'avis</span>
                </button>
                <button 
                    onClick={() => setViewMode('dataviz')}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${viewMode === 'dataviz' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                    <BarChart2 size={18} />
                    <span>Mode Dataviz</span>
                </button>
            </div>

            {showAudit && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in slide-in-from-top-4">
                    <ReviewAudit reviews={enrichedReviews} agencies={agencies} />
                </div>
            )}

            {/* STATS RAPIDES */}
            <ReviewStats reviews={filteredReviews} />

            {viewMode === 'dataviz' ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <ReviewDataviz reviews={filteredReviews} />
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
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
            )}

        </div>
    );
};
