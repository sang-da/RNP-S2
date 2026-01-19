
import React from 'react';
import { PeerReview } from '../../../types';
import { Star, AlertTriangle, Users } from 'lucide-react';

interface ReviewStatsProps {
    reviews: PeerReview[];
}

export const ReviewStats: React.FC<ReviewStatsProps> = ({ reviews }) => {
    
    const stats = React.useMemo(() => {
        if (reviews.length === 0) return { avg: 0, criticalCount: 0 };
        
        const total = reviews.reduce((acc, r) => 
            acc + ((r.ratings.attendance + r.ratings.quality + r.ratings.involvement) / 3), 0);
        
        const critical = reviews.filter(r => 
            ((r.ratings.attendance + r.ratings.quality + r.ratings.involvement) / 3) < 2.5
        ).length;

        return {
            avg: (total / reviews.length).toFixed(2),
            criticalCount: critical
        };
    }, [reviews]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600"><Users size={24}/></div>
                <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Évaluations</p>
                    <p className="text-2xl font-bold text-slate-900">{reviews.length}</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-rose-50 rounded-xl text-rose-600"><Star size={24}/></div>
                <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Moyenne Générale</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.avg} <span className="text-xs text-slate-400">/5</span></p>
                </div>
            </div>

            <div className={`p-4 rounded-2xl border flex items-center gap-4 transition-all ${
                stats.criticalCount > 0 ? 'bg-red-50 border-red-200 shadow-lg ring-4 ring-red-100' : 'bg-white border-slate-200 opacity-50'
            }`}>
                <div className={`p-3 rounded-xl ${stats.criticalCount > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                    <AlertTriangle size={24}/>
                </div>
                <div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${stats.criticalCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>Tensions détectées</p>
                    <p className={`text-2xl font-bold ${stats.criticalCount > 0 ? 'text-red-700' : 'text-slate-900'}`}>{stats.criticalCount} alertes</p>
                </div>
            </div>
        </div>
    );
};
