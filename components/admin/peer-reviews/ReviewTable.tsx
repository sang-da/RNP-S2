
import React from 'react';
import { PeerReview } from '../../../types';
import { Star, MessageCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface ReviewTableProps {
    reviews: (PeerReview & { agencyName: string, classId: string })[];
    onResetFilters: () => void;
}

export const ReviewTable: React.FC<ReviewTableProps> = ({ reviews, onResetFilters }) => {
    
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
                <div className="flex flex-col items-center justify-center py-32 text-center px-6">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <Star size={32} className="text-slate-300"/>
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">Aucune évaluation trouvée</h3>
                    <p className="text-slate-400 text-sm max-w-xs mt-2 mb-6">
                        Essayez de modifier vos filtres ou de sélectionner une autre semaine pour voir les résultats.
                    </p>
                    <button 
                        onClick={onResetFilters}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
                    >
                        <RefreshCw size={16}/> Voir toutes les entrées
                    </button>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-100">
                            <tr>
                                <th className="p-4">Sem.</th>
                                <th className="p-4">Auteur / Reviewer</th>
                                <th className="p-4">Cible / Élève</th>
                                <th className="p-4">Studio</th>
                                <th className="p-4 text-center">Notes (A/Q/I)</th>
                                <th className="p-4 text-center">Moy.</th>
                                <th className="p-4">Feedback Privé</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {reviews.map((r) => {
                                const avg = parseFloat(getAvg(r));
                                const isWarning = avg < 2.5;

                                return (
                                    <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${isWarning ? 'bg-red-50/40' : ''}`}>
                                        <td className="p-4">
                                            <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded text-slate-500">S{r.weekId}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-900 text-sm">{r.reviewerName}</div>
                                            <div className="text-[9px] text-slate-400 uppercase font-medium">Par</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-indigo-900 text-sm">{r.targetName}</div>
                                            <div className="text-[9px] text-rose-500 uppercase font-medium">Pour</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm font-medium text-slate-700">{r.agencyName}</div>
                                            <span className={`text-[9px] font-bold px-1.5 rounded text-white ${r.classId === 'A' ? 'bg-blue-400' : 'bg-purple-400'}`}>CL. {r.classId}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-1 justify-center">
                                                <RatingBadge val={r.ratings.attendance} label="A"/>
                                                <RatingBadge val={r.ratings.quality} label="Q"/>
                                                <RatingBadge val={r.ratings.involvement} label="I"/>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className={`inline-flex items-center gap-1 font-display font-bold text-lg px-2.5 py-1 rounded-xl border shadow-sm ${getScoreColor(avg)}`}>
                                                {avg}
                                                {isWarning && <AlertTriangle size={14} className="text-red-600 animate-pulse"/>}
                                            </div>
                                        </td>
                                        <td className="p-4 max-w-xs">
                                            {r.comment ? (
                                                <div className="flex gap-2 items-start bg-slate-50 p-2.5 rounded-xl text-xs italic text-slate-600 border border-slate-100 shadow-inner">
                                                    <MessageCircle size={14} className="shrink-0 mt-0.5 text-slate-400"/>
                                                    <span className="line-clamp-3 leading-relaxed" title={r.comment}>"{r.comment}"</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-slate-300 italic">Aucun commentaire</span>
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
    <div className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center border shadow-sm ${
        val >= 4 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
        val >= 2.5 ? 'bg-amber-50 border-amber-100 text-amber-700' :
        'bg-red-50 border-red-100 text-red-700'
    }`}>
        <span className="text-[7px] font-black leading-none opacity-40">{label}</span>
        <span className="text-xs font-bold leading-none mt-0.5">{val}</span>
    </div>
);
