import React, { useMemo } from 'react';
import { PeerReview, Agency } from '../../../types';
import { AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface ReviewAuditProps {
    reviews: PeerReview[];
    agencies: Agency[];
}

export const ReviewAudit: React.FC<ReviewAuditProps> = ({ reviews, agencies }) => {
    const anomalies = useMemo(() => {
        const issues: { type: 'warning' | 'danger', title: string, description: string, reviewerName: string, agencyName: string }[] = [];
        
        // Group reviews by reviewer and week
        const reviewsByReviewerAndWeek: Record<string, PeerReview[]> = {};
        reviews.forEach(r => {
            const key = `${r.reviewerId}-${r.weekId}`;
            if (!reviewsByReviewerAndWeek[key]) reviewsByReviewerAndWeek[key] = [];
            reviewsByReviewerAndWeek[key].push(r);
        });

        Object.values(reviewsByReviewerAndWeek).forEach(reviewerReviews => {
            if (reviewerReviews.length < 2) return; // Need at least 2 reviews to find patterns

            const reviewerName = reviewerReviews[0].reviewerName;
            const agencyId = reviewerReviews[0].agencyId;
            const agencyName = agencies.find(a => a.id === agencyId)?.name || 'Agence Inconnue';
            
            // Calculate average and variance for this reviewer this week
            const scores = reviewerReviews.map(r => r.totalScore);
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            const isAllSame = scores.every(s => s === scores[0]);

            if (isAllSame) {
                issues.push({
                    type: 'danger',
                    title: 'Évaluations Identiques',
                    description: `A donné exactement la même note (${scores[0]}/20) à tous ses collègues.`,
                    reviewerName,
                    agencyName
                });
            } else if (avg > 18) {
                issues.push({
                    type: 'warning',
                    title: 'Surnotation (Copinage ?)',
                    description: `Moyenne des notes données très élevée (${avg.toFixed(1)}/20).`,
                    reviewerName,
                    agencyName
                });
            } else if (avg < 5) {
                issues.push({
                    type: 'warning',
                    title: 'Sous-notation (Vengeance ?)',
                    description: `Moyenne des notes données très basse (${avg.toFixed(1)}/20).`,
                    reviewerName,
                    agencyName
                });
            }
        });

        return issues;
    }, [reviews, agencies]);

    if (anomalies.length === 0) {
        return (
            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-4">
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
                    <CheckCircle2 size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-emerald-800">Aucune anomalie détectée</h3>
                    <p className="text-emerald-600 text-sm">Les évaluations semblent cohérentes et normales.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="text-rose-500" size={24} />
                <h3 className="text-lg font-bold text-slate-800">Audit des Anomalies ({anomalies.length})</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {anomalies.map((anomaly, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border ${anomaly.type === 'danger' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
                        <div className="flex items-start gap-3">
                            <AlertTriangle className={`mt-0.5 ${anomaly.type === 'danger' ? 'text-rose-500' : 'text-amber-500'}`} size={18} />
                            <div>
                                <h4 className={`font-bold text-sm ${anomaly.type === 'danger' ? 'text-rose-800' : 'text-amber-800'}`}>
                                    {anomaly.title}
                                </h4>
                                <p className={`text-xs mt-1 ${anomaly.type === 'danger' ? 'text-rose-600' : 'text-amber-700'}`}>
                                    {anomaly.description}
                                </p>
                                <div className="mt-3 pt-3 border-t border-black/5">
                                    <p className="text-xs font-semibold text-slate-700">{anomaly.reviewerName}</p>
                                    <p className="text-[10px] text-slate-500">{anomaly.agencyName}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
