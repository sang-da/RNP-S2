
import React from 'react';
import { Agency, MercatoRequest, Student } from '../../../types';
import { Vote, Check, X } from 'lucide-react';

interface AgencyDemocracyProps {
    agency: Agency;
    currentUser: Student | undefined;
    onVote: (request: MercatoRequest, vote: 'APPROVE' | 'REJECT') => void;
}

export const AgencyDemocracy: React.FC<AgencyDemocracyProps> = ({ agency, currentUser, onVote }) => {
    
    // FILTRE CRITIQUE : Seules les demandes d'EMBAUCHE (HIRE) sont visibles ici.
    // Les licenciements et démissions (FIRE) sont masqués pour l'instant.
    const visibleRequests = agency.mercatoRequests.filter(req => req.type === 'HIRE');

    if (visibleRequests.length === 0) return null;

    return (
        <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-700 relative overflow-hidden mb-8">
            <div className="absolute -right-10 -top-10 opacity-10">
                <Vote size={128} />
            </div>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 relative z-10">
                <Vote size={20} className="text-yellow-400"/> Démocratie d'Agence ({visibleRequests.length})
            </h3>
            <div className="space-y-4 relative z-10">
                {visibleRequests.map(req => {
                    const hasVoted = req.votes && currentUser && req.votes[currentUser.id];
                    const approvals = Object.values(req.votes || {}).filter(v => v === 'APPROVE').length;
                    
                    // Logic Threshold for HIRE is 66%
                    const thresholdPercent = 66;
                    const totalVoters = agency.members.length;
                    
                    const currentPercent = Math.round((approvals / totalVoters) * 100);
                    const canVote = currentUser && !hasVoted;

                    return (
                        <div key={req.id} className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-emerald-500 text-white">
                                        Embauche
                                    </span>
                                    <p className="font-bold text-sm mt-1">{req.studentName}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold font-display">{currentPercent}%</div>
                                    <div className="text-[10px] uppercase opacity-70">Approbation (Obj. {thresholdPercent}%)</div>
                                </div>
                            </div>
                            <div className="text-xs italic opacity-80 mb-3">"{req.motivation}"</div>
                            
                            {canVote ? (
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => onVote(req, 'APPROVE')}
                                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                                    >
                                        <Check size={14}/> Pour
                                    </button>
                                    <button 
                                        onClick={() => onVote(req, 'REJECT')}
                                        className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                                    >
                                        <X size={14}/> Contre
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-2 bg-black/20 rounded-lg text-xs font-bold text-white/50">
                                    {hasVoted ? 'A voté' : 'Vote non autorisé'}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    );
};
