
import React from 'react';
import { Agency, MercatoRequest, Student } from '../../../types';
import { Vote, Check, X, UserPlus, Info } from 'lucide-react';

interface AgencyDemocracyProps {
    agency: Agency;
    currentUser: Student | undefined;
    onVote: (request: MercatoRequest, vote: 'APPROVE' | 'REJECT') => void;
}

export const AgencyDemocracy: React.FC<AgencyDemocracyProps> = ({ agency, currentUser, onVote }) => {
    
    // Show HIRE requests (external applications) and FIRE requests (resignations or team moves)
    const visibleRequests = agency.mercatoRequests.filter(req => req.status === 'PENDING');

    if (visibleRequests.length === 0) return null;

    return (
        <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-700 relative overflow-hidden mb-8">
            <div className="absolute -right-10 -top-10 opacity-10">
                <Vote size={128} />
            </div>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 relative z-10">
                <Vote size={20} className="text-yellow-400"/> Decisions d'Agence ({visibleRequests.length})
            </h3>
            <div className="space-y-4 relative z-10">
                {visibleRequests.map(req => {
                    const hasVoted = req.votes && currentUser && req.votes[currentUser.id];
                    const approvals = Object.values(req.votes || {}).filter(v => v === 'APPROVE').length;
                    
                    // Logic Threshold: HIRE = 66%, FIRE = 75%
                    const isHire = req.type === 'HIRE';
                    const thresholdPercent = isHire ? 66 : 75;
                    const totalVoters = isHire ? agency.members.length : Math.max(1, agency.members.length - 1);
                    
                    const currentPercent = totalVoters > 0 ? Math.round((approvals / totalVoters) * 100) : 0;
                    const canVote = currentUser && !hasVoted && (isHire || req.studentId !== currentUser.id);

                    return (
                        <div key={req.id} className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${isHire ? 'bg-emerald-500' : 'bg-red-500'} text-white`}>
                                            {isHire ? 'Candidature Entrante' : 'Demande de Départ'}
                                        </span>
                                        {!isHire && req.requesterId === req.studentId && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-amber-500 text-white">
                                                Démission
                                            </span>
                                        )}
                                    </div>
                                    <p className="font-bold text-sm mt-2 flex items-center gap-2">
                                        {isHire && <UserPlus size={14} className="text-emerald-400"/>}
                                        {req.studentName}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold font-display">{currentPercent}%</div>
                                    <div className="text-[10px] uppercase opacity-70">Approbation (Obj. {thresholdPercent}%)</div>
                                </div>
                            </div>
                            
                            <div className="bg-black/20 p-3 rounded-lg text-xs italic opacity-90 mb-3 border border-white/5">
                                <Info size={12} className="inline mr-2 opacity-50"/>
                                "{req.motivation || 'Aucun message fourni.'}"
                            </div>
                            
                            {canVote ? (
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => onVote(req, 'APPROVE')}
                                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                                    >
                                        <Check size={14}/> Voter Pour
                                    </button>
                                    <button 
                                        onClick={() => onVote(req, 'REJECT')}
                                        className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                                    >
                                        <X size={14}/> Voter Contre
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-2 bg-black/20 rounded-lg text-xs font-bold text-white/50 border border-white/5">
                                    {hasVoted ? '✓ Vote enregistré' : req.studentId === currentUser?.id ? 'Attente du vote de vos collègues' : 'Action non autorisée'}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    );
};
