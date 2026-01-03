
import React, { useState } from 'react';
import { Agency, Student, PeerReview } from '../../types';
import { Clock, MessageCircle, Send, Lock, Coins, Award, Star } from 'lucide-react';
import { Modal } from '../Modal';
import { GAME_RULES } from '../../constants';

interface TeamViewProps {
  agency: Agency;
  onUpdateAgency: (agency: Agency) => void;
}

export const TeamView: React.FC<TeamViewProps> = ({ agency, onUpdateAgency }) => {
  const [selectedMember, setSelectedMember] = useState<Student | null>(null);
  const [reviewMode, setReviewMode] = useState<Student | null>(null);

  // Pour la démo, on considère que l'utilisateur courant est le 1er de la liste
  const currentUser = agency.members[0];

  const handlePeerReview = (review: PeerReview) => {
    onUpdateAgency({
        ...agency,
        peerReviews: [...agency.peerReviews, review]
    });
    setReviewMode(null);
  };

  return (
    <div className="animate-in slide-in-from-right-4 duration-500 pb-20">
        
        {/* Header Action */}
        <div className="flex justify-between items-center mb-6">
             <h3 className="text-xl font-bold text-slate-900">Membres du Studio</h3>
             <div className="flex gap-2">
                <span className="text-xs text-slate-400 self-center hidden md:block">Connecté en tant que <strong>{currentUser.name}</strong></span>
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {agency.members.map(member => {
                const salary = member.individualScore * GAME_RULES.SALARY_MULTIPLIER;
                
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
                                    {member.id === currentUser.id && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 rounded-full">Moi</span>}
                                </h3>
                                
                                {/* SALARY BADGE */}
                                <div className="flex flex-col items-start mt-1 gap-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{member.role}</span>
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 border border-red-100 rounded-full text-xs font-bold text-red-600">
                                        <Coins size={12} />
                                        -{salary} € / sem
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block text-4xl font-display font-bold text-indigo-600">{member.individualScore}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Score</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-2 pt-4 border-t border-slate-50">
                            <button 
                                onClick={() => setSelectedMember(member)}
                                className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                Voir Bulletin
                            </button>
                            {member.id !== currentUser.id && (
                                <button 
                                    onClick={() => setReviewMode(member)}
                                    className="flex-1 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <MessageCircle size={14}/> Évaluer
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>

        {/* MODAL: Détail Note Élève */}
        <Modal isOpen={!!selectedMember} onClose={() => setSelectedMember(null)} title="Bulletin Individuel">
            {selectedMember && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <img src={selectedMember.avatarUrl} className="w-16 h-16 rounded-2xl bg-slate-100" />
                        <div>
                            <h4 className="text-xl font-bold text-slate-900">{selectedMember.name}</h4>
                            <p className="text-slate-500 text-sm">{selectedMember.role}</p>
                            <p className="text-red-500 font-bold text-xs mt-1">Coût salarial: {selectedMember.individualScore * GAME_RULES.SALARY_MULTIPLIER} € / sem</p>
                        </div>
                        <div className="ml-auto text-center">
                            <span className="block text-3xl font-display font-bold text-indigo-600">{selectedMember.individualScore}</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Total / 100</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Mock Breakdown Data for visualization */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                             <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                                    <Clock size={16} className="text-emerald-500" /> Assiduité & Ponctualité
                                </div>
                                <span className="font-bold text-emerald-600">20/20</span>
                             </div>
                             <div className="w-full bg-slate-200 rounded-full h-2">
                                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                             </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                             <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                                    <Award size={16} className="text-amber-500" /> Qualité des Rendus (Perso)
                                </div>
                                <span className="font-bold text-amber-600">{(selectedMember.individualScore || 0) - 25}/60</span>
                             </div>
                             <div className="w-full bg-slate-200 rounded-full h-2">
                                <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${((selectedMember.individualScore - 25)/60)*100}%` }}></div>
                             </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                             <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                                    <Star size={16} className="text-indigo-500" /> Bonus Rôle & Implication
                                </div>
                                <span className="font-bold text-indigo-600">5/20</span>
                             </div>
                             <div className="w-full bg-slate-200 rounded-full h-2">
                                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </Modal>

        {/* MODAL: Peer Review Form */}
        {reviewMode && (
            <PeerReviewForm 
                reviewer={currentUser}
                target={reviewMode}
                onClose={() => setReviewMode(null)}
                onSubmit={handlePeerReview}
            />
        )}
    </div>
  );
};

// ----------------------------------------------------------------------
// INTERNAL: Peer Review Form Component
// ----------------------------------------------------------------------
interface PeerReviewFormProps {
    reviewer: Student;
    target: Student;
    onClose: () => void;
    onSubmit: (review: PeerReview) => void;
}

const PeerReviewForm: React.FC<PeerReviewFormProps> = ({ reviewer, target, onClose, onSubmit }) => {
    const [attendance, setAttendance] = useState(3);
    const [quality, setQuality] = useState(3);
    const [involvement, setInvolvement] = useState(3);
    const [comment, setComment] = useState("");

    const handleSubmit = () => {
        const review: PeerReview = {
            id: `rev-${Date.now()}`,
            weekId: "1", // Hardcoded for demo, normally from context
            date: new Date().toISOString().split('T')[0],
            reviewerId: reviewer.id,
            reviewerName: reviewer.name,
            targetId: target.id,
            targetName: target.name,
            ratings: { attendance, quality, involvement },
            comment
        };
        onSubmit(review);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Évaluation Hebdo: ${target.name}`}>
            <div className="space-y-6">
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-sm text-indigo-800">
                    Soyez honnête et constructif. Ces notes impactent le score individuel de votre collègue.
                    <br/><strong>Attention :</strong> Les abus ou notes de complaisance seront sanctionnés par l'administration.
                </div>

                <div className="space-y-4">
                    <RangeInput label="Assiduité / Ponctualité" value={attendance} onChange={setAttendance} icon={<Clock size={16} className="text-emerald-500"/>} />
                    <RangeInput label="Qualité du travail" value={quality} onChange={setQuality} icon={<Award size={16} className="text-amber-500"/>} />
                    <RangeInput label="Implication / Esprit d'équipe" value={involvement} onChange={setInvolvement} icon={<Star size={16} className="text-indigo-500"/>} />
                </div>

                <div>
                    <div className="flex justify-between items-end mb-2">
                        <label className="block text-sm font-bold text-slate-700">Feedback Privé (Optionnel)</label>
                        <span className="text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 text-[10px]">
                            <Lock size={10} /> Visible uniquement par l'admin
                        </span>
                    </div>
                    <textarea 
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="Ex: Excellent travail sur le lighting, mais attention aux retards le matin..."
                        className="w-full p-3 rounded-xl border border-slate-200 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                    />
                </div>

                <button 
                    onClick={handleSubmit}
                    className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-indigo-600 transition-colors flex justify-center items-center gap-2"
                >
                    <Send size={18} />
                    Envoyer l'évaluation
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
        <input 
            type="range" 
            min="1" 
            max="5" 
            step="0.5"
            value={value} 
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase mt-1">
            <span>Médiocre</span>
            <span>Excellent</span>
        </div>
    </div>
);
