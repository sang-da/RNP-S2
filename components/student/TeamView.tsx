
import React, { useState } from 'react';
import { Agency, Student, PeerReview } from '../../types';
import { Clock, MessageCircle, Send, Lock, Coins, Award, Star, Wallet, Medal, HelpCircle, CheckCircle2, User } from 'lucide-react';
import { Modal } from '../Modal';
import { GAME_RULES } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { useGame } from '../../contexts/GameContext';
import { SoloPanel } from './team/SoloPanel';
import { doc, setDoc, db } from '../../services/firebase'; // Direct Write for Reviews

interface TeamViewProps {
  agency: Agency;
  onUpdateAgency: (agency: Agency) => void;
}

export const TeamView: React.FC<TeamViewProps> = ({ agency, onUpdateAgency }) => {
  const [selectedMember, setSelectedMember] = useState<Student | null>(null);
  const [reviewMode, setReviewMode] = useState<Student | null>(null);
  const [showSalaryInfo, setShowSalaryInfo] = useState(false);

  const { currentUser: firebaseUser } = useAuth();
  const { getCurrentGameWeek, reviews } = useGame(); // On récupère les reviews globales
  
  const currentUser = agency.members.find(m => m.id === firebaseUser?.uid);
  const currentWeek = getCurrentGameWeek();
  const isSoloMode = agency.members.length === 1;

  // NOUVELLE FONCTION D'ENVOI
  const handlePeerReview = async (review: PeerReview) => {
    try {
        await setDoc(doc(db, "reviews", review.id), review);
        setReviewMode(null);
    } catch (e) {
        console.error("Erreur envoi review", e);
        alert("Erreur lors de l'envoi de l'évaluation.");
    }
  };

  const hasReviewedMemberThisWeek = (targetId: string) => {
      if (!currentUser) return false;
      // On cherche dans la collection globale filtrée par le contexte
      return reviews.some(r => 
          r.reviewerId === currentUser.id && 
          r.targetId === targetId && 
          r.weekId === currentWeek.toString()
      );
  };

  if (isSoloMode && currentUser) {
      return <SoloPanel agency={agency} student={currentUser} />;
  }

  return (
    <div className="animate-in slide-in-from-right-4 duration-500 pb-20">
        <div className="flex justify-between items-center mb-6">
             <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <User size={24}/> Membres du Studio
                </h3>
                <p className="text-xs text-slate-500">Semaine {currentWeek} en cours</p>
             </div>
             <div className="flex gap-2">
                <span className="text-xs text-slate-400 self-center hidden md:block">Connecté en tant que <strong>{currentUser?.name || 'Visiteur'}</strong></span>
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {agency.members.map(member => {
                const salary = member.individualScore * GAME_RULES.SALARY_MULTIPLIER;
                const isMe = member.id === currentUser?.id;
                const alreadyReviewed = hasReviewedMemberThisWeek(member.id);
                
                return (
                    <div 
                        key={member.id} 
                        className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4 group hover:shadow-md transition-all relative overflow-hidden"
                    >
                        <div className="flex items-center gap-6 cursor-pointer" onClick={() => setSelectedMember(member)}>
                            <img src={member.avatarUrl} className="w-20 h-20 rounded-2xl bg-slate-100 group-hover:scale-105 transition-transform" alt={member.name} />
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                                    {member.name}
                                    {member.badges && member.badges.length > 0 && member.badges.map(b => (
                                        <span key={b.id} title={b.label} className="text-yellow-500 bg-yellow-50 p-1 rounded-full border border-yellow-200">
                                            <Medal size={14}/>
                                        </span>
                                    ))}
                                </h3>
                                
                                <div className="flex flex-col items-start mt-1 gap-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{member.role}</span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setShowSalaryInfo(true); }}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 border border-red-100 rounded-full text-xs font-bold text-red-600 hover:bg-red-100 transition-colors"
                                    >
                                        <Coins size={12} />
                                        -{salary} PiXi / sem
                                        <HelpCircle size={10} className="opacity-50"/>
                                    </button>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                                <div>
                                    <span className="block text-4xl font-display font-bold text-indigo-600 leading-none">{member.individualScore}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Score</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-100">
                                    <Wallet size={10}/> {member.wallet || 0}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-2 pt-4 border-t border-slate-50">
                            <button 
                                onClick={() => setSelectedMember(member)}
                                className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                Voir Bulletin
                            </button>
                            {!isMe && currentUser && (
                                alreadyReviewed ? (
                                    <button disabled className="flex-1 py-2 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl cursor-not-allowed flex items-center justify-center gap-2">
                                        <CheckCircle2 size={14}/> Évalué
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => setReviewMode(member)}
                                        className="flex-1 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <MessageCircle size={14}/> Évaluer
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                );
            })}
        </div>

        {showSalaryInfo && (
            <Modal isOpen={true} onClose={() => setShowSalaryInfo(false)} title="Règles Salariales">
               {/* Contenu identique... */}
               <button onClick={() => setShowSalaryInfo(false)} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl">Compris</button>
            </Modal>
        )}

        {reviewMode && currentUser && (
            <PeerReviewForm 
                reviewer={currentUser}
                target={reviewMode}
                weekId={currentWeek.toString()}
                agencyId={agency.id} // IMPORTANT
                onClose={() => setReviewMode(null)}
                onSubmit={handlePeerReview}
            />
        )}
    </div>
  );
};

interface PeerReviewFormProps {
    reviewer: Student;
    target: Student;
    weekId: string;
    agencyId: string;
    onClose: () => void;
    onSubmit: (review: PeerReview) => void;
}

const PeerReviewForm: React.FC<PeerReviewFormProps> = ({ reviewer, target, weekId, agencyId, onClose, onSubmit }) => {
    const [attendance, setAttendance] = useState(3);
    const [quality, setQuality] = useState(3);
    const [involvement, setInvolvement] = useState(3);
    const [comment, setComment] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = () => {
        if (comment.trim().length < 10) {
            setError("La justification doit faire au moins 10 caractères.");
            return;
        }

        const review: PeerReview = {
            id: `rev-${Date.now()}`,
            weekId: weekId, 
            date: new Date().toISOString().split('T')[0],
            reviewerId: reviewer.id,
            reviewerName: reviewer.name,
            targetId: target.id,
            targetName: target.name,
            agencyId: agencyId, // LINKED TO AGENCY
            ratings: { attendance, quality, involvement },
            comment: comment.trim()
        };
        onSubmit(review);
    };

    const isCommentValid = comment.trim().length >= 10;

    return (
        <Modal isOpen={true} onClose={onClose} title={`Évaluation Hebdo (Sem ${weekId}): ${target.name}`}>
            <div className="space-y-6">
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-sm text-indigo-800">
                    Soyez honnête et constructif. Ces notes impactent le score individuel de votre collègue.
                </div>
                <div className="space-y-4">
                    <RangeInput label="Assiduité / Ponctualité" value={attendance} onChange={setAttendance} icon={<Clock size={16} className="text-emerald-500"/>} />
                    <RangeInput label="Qualité du travail" value={quality} onChange={setQuality} icon={<Award size={16} className="text-amber-500"/>} />
                    <RangeInput label="Implication / Esprit d'équipe" value={involvement} onChange={setInvolvement} icon={<Star size={16} className="text-indigo-500"/>} />
                </div>
                <div>
                    <div className="flex justify-between items-end mb-2">
                        <label className="block text-sm font-bold text-slate-700">
                            Justification / Feedback Privé <span className="text-red-500">*</span>
                        </label>
                        <span className="text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 text-[10px]"><Lock size={10} /> Admin only</span>
                    </div>
                    <textarea 
                        value={comment} 
                        onChange={e => { setComment(e.target.value); if(error) setError(null); }} 
                        placeholder="Pourquoi cette note ? Justifiez l'investissement de votre collègue..."
                        className={`w-full p-3 rounded-xl border ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} text-sm min-h-[80px] focus:ring-2 focus:ring-indigo-500 outline-none resize-none`} 
                    />
                    {error && <p className="text-[10px] text-red-500 font-bold mt-1 animate-pulse">{error}</p>}
                </div>
                <button 
                    onClick={handleSubmit} 
                    disabled={!isCommentValid}
                    className={`w-full font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-all ${
                        isCommentValid 
                        ? 'bg-slate-900 text-white hover:bg-indigo-600 shadow-lg' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                >
                    <Send size={18} /> Envoyer
                </button>
            </div>
        </Modal>
    );
};

const RangeInput: React.FC<{label: string, value: number, onChange: (v: number) => void, icon: React.ReactNode}> = ({label, value, onChange, icon}) => (
    <div>
        <div className="flex justify-between mb-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">{icon} {label}</label>
            <span className="font-bold text-slate-900">{value}/5</span>
        </div>
        <input type="range" min="1" max="5" step="0.5" value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
    </div>
);
