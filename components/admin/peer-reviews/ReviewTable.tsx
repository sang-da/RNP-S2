
import React from 'react';
import { PeerReview } from '../../../types';
import { Star, MessageCircle, AlertTriangle } from 'lucide-react';

interface ReviewTableProps {
    reviews: (PeerReview & { agencyName: string, classId: string })[];
}

export const ReviewTable: React.FC<ReviewTableProps> = ({ reviews }) => {
    
    const getAvg = (r: PeerReview) => 
        ((r.ratings.attendance + r.ratings.quality + r.ratings.involvement) / 3).toFixed(1);

    const getScoreColor = (score: number) => {
        if (score >= 4.5) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        if (score >= 3.0) return 'text-amber-600 bg-amber-50 border-amber-100';
        return 'text-red-600 bg-red-50 border-red-100';
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
            {reviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                    <Star size={48} className="mb-4"/>
                    <p className="font-bold">Aucune évaluation trouvée.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-100">
                            <tr>
                                <th className="p-4">Sem.</th>
                                <th className="p-4">Auteur (Reviewer)</th>
                                <th className="p-4">Cible (Target)</th>
                                <th className="p-4">Agence</th>
                                <th className="p-4">Notes (A/Q/I)</th>
                                <th className="p-4">Moy.</th>
                                <th className="p-4">Feedback</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {reviews.map((r) => {
                                const avg = parseFloat(getAvg(r));
                                const isWarning = avg < 2.5;

                                return (
                                    <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${isWarning ? 'bg-red-50/30' : ''}`}>
                                        <td className="p-4">
                                            <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded text-slate-500">S{r.weekId}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-900 text-sm">{r.reviewerName}</div>
                                            <div className="text-[10px] text-slate-400 uppercase font-medium">Reviewer</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-900 text-sm">{r.targetName}</div>
                                            <div className="text-[10px] text-rose-500 uppercase font-medium">Cible</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm font-medium text-slate-600">{r.agencyName}</div>
                                            <span className={`text-[9px] font-bold px-1.5 rounded text-white ${r.classId === 'A' ? 'bg-blue-400' : 'bg-purple-400'}`}>CL. {r.classId}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-1">
                                                <RatingBadge val={r.ratings.attendance} label="A"/>
                                                <RatingBadge val={r.ratings.quality} label="Q"/>
                                                <RatingBadge val={r.ratings.involvement} label="I"/>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className={`inline-flex items-center gap-1 font-display font-bold text-lg px-2 py-1 rounded-xl border ${getScoreColor(avg)}`}>
                                                {avg}
                                                {isWarning && <AlertTriangle size={14} className="text-red-600 animate-pulse"/>}
                                            </div>
                                        </td>
                                        <td className="p-4 max-w-xs">
                                            {r.comment ? (
                                                <div className="flex gap-2 items-start bg-slate-50 p-2 rounded-lg text-xs italic text-slate-500 border border-slate-100">
                                                    <MessageCircle size={12} className="shrink-0 mt-0.5 text-slate-400"/>
                                                    <span className="line-clamp-2" title={r.comment}>"{r.comment}"</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-slate-300 italic">Sans commentaire</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const RatingBadge: React.FC<{val: number, label: string}> = ({val, label}) => (
    <div className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center border ${
        val >= 4 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
        val >= 2.5 ? 'bg-amber-50 border-amber-100 text-amber-600' :
        'bg-red-50 border-red-100 text-red-600'
    }`}>
        <span className="text-[8px] font-black leading-none opacity-50">{label}</span>
        <span className="text-xs font-bold leading-none mt-0.5">{val}</span>
    </div>
);
