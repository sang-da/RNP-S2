
import React from 'react';
import { Agency, Student } from '../../../types';
import { Modal } from '../../Modal';
import { Users, Gavel, X, Check, Rocket } from 'lucide-react';
import { GAME_RULES } from '../../../constants';

interface VotingSystemProps {
    agency: Agency;
    currentUser: Student;
    onVoteMercato: any;
    onVoteChallenge: any;
}

export const VotingSystem: React.FC<VotingSystemProps> = ({ agency, currentUser, onVoteMercato, onVoteChallenge }) => {
    return (
        <>
            <VotingBooth 
                agency={agency} 
                currentUser={currentUser} 
                onVote={onVoteMercato} 
            />
            <ChallengeVotingBooth 
                agency={agency}
                currentUser={currentUser}
                onVote={onVoteChallenge}
            />
        </>
    );
};

const VotingBooth: React.FC<{agency: Agency, currentUser: Student, onVote: any}> = ({agency, currentUser, onVote}) => {
    const pendingVote = agency.mercatoRequests.find(req => {
        if (req.status !== 'PENDING') return false;
        if (req.votes && req.votes[currentUser.id]) return false;
        if (req.type === 'FIRE' && req.studentId === currentUser.id) return false;
        return true;
    });

    if (!pendingVote) return null;
    const isHire = pendingVote.type === 'HIRE';

    return (
        <Modal isOpen={true} onClose={() => {}} title="Session de Vote en cours">
            <div className="space-y-6">
                <div className={`p-4 rounded-xl border-l-4 ${isHire ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-red-50 border-red-500 text-red-800'}`}>
                    <h4 className="font-bold text-lg mb-1 flex items-center gap-2">
                        {isHire ? <Users size={20}/> : <Gavel size={20}/>}
                        {isHire ? "Proposition de Recrutement" : "Proposition de Départ"}
                    </h4>
                    <p className="text-sm">Votre avis est requis pour valider cette décision d'agence.</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Candidat / Cible</p>
                    <p className="text-xl font-bold text-slate-900">{pendingVote.studentName}</p>
                    
                    <div className="mt-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Motivation / Motif</p>
                        <p className="text-sm italic text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            "{pendingVote.motivation || 'Aucun motif fourni.'}"
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => onVote(agency.id, pendingVote.id, currentUser.id, 'REJECT')}
                        className="py-4 bg-white border-2 border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-600 hover:bg-red-50 font-bold rounded-xl transition-all flex flex-col items-center gap-1"
                    >
                        <X size={24}/>
                        NON (Refuser)
                    </button>
                    <button 
                        onClick={() => onVote(agency.id, pendingVote.id, currentUser.id, 'APPROVE')}
                        className="py-4 bg-slate-900 text-white hover:bg-emerald-600 font-bold rounded-xl transition-all flex flex-col items-center gap-1 shadow-lg"
                    >
                        <Check size={24}/>
                        OUI (Accepter)
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const ChallengeVotingBooth: React.FC<{agency: Agency, currentUser: Student, onVote: any}> = ({agency, currentUser, onVote}) => {
    const pendingChallenge = agency.challenges?.find(c => c.status === 'PENDING_VOTE' && (!c.votes || !c.votes[currentUser.id]));
    if (!pendingChallenge) return null;

    return (
        <Modal isOpen={true} onClose={() => {}} title="⚠️ DÉFI SPÉCIAL DÉTECTÉ">
            <div className="space-y-6">
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <Rocket className="text-yellow-400 animate-pulse"/>
                            <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">Opportunité IA</span>
                        </div>
                        <h3 className="text-2xl font-black mb-4 leading-tight">{pendingChallenge.title}</h3>
                        <p className="text-sm text-indigo-100 leading-relaxed bg-white/10 p-4 rounded-xl border border-white/10">
                            {pendingChallenge.description}
                        </p>
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-sm text-slate-600 mb-4">
                        Si l'équipe accepte ce défi (Majorité &gt; {GAME_RULES.VOTE_THRESHOLD_CHALLENGE * 100}%), une <strong>mission spéciale</strong> sera ajoutée.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => onVote(agency.id, pendingChallenge.id, currentUser.id, 'REJECT')}
                            className="py-4 bg-white border-2 border-slate-200 text-slate-500 hover:text-red-500 hover:border-red-200 font-bold rounded-xl transition-all"
                        >
                            Refuser
                        </button>
                        <button 
                            onClick={() => onVote(agency.id, pendingChallenge.id, currentUser.id, 'APPROVE')}
                            className="py-4 bg-emerald-600 text-white hover:bg-emerald-500 font-bold rounded-xl transition-all shadow-lg shadow-emerald-200"
                        >
                            Accepter le Défi
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
