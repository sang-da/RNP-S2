
import React, { useState } from 'react';
import { Agency, Student, PeerReview } from '../../types';
import { Clock, MessageCircle, Send, Lock, Coins, Award, Star, Wallet, Medal, HelpCircle } from 'lucide-react';
import { Modal } from '../Modal';
import { GAME_RULES } from '../../constants';

interface TeamViewProps {
  agency: Agency;
  onUpdateAgency: (agency: Agency) => void;
}

export const TeamView: React.FC<TeamViewProps> = ({ agency, onUpdateAgency }) => {
  const [selectedMember, setSelectedMember] = useState<Student | null>(null);
  const [reviewMode, setReviewMode] = useState<Student | null>(null);
  const [showSalaryInfo, setShowSalaryInfo] = useState(false);

  // Pour la démo, on considère que l'utilisateur courant est le 1er de la liste (ou logique à adapter selon Auth)
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
                <span className="text-xs text-slate-400 self-center hidden md:block">Connecté en tant que <strong>{currentUser?.name || 'Visiteur'}</strong></span>
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
                                    {/* BADGE DISPLAY */}
                                    {member.badges && member.badges.length > 0 && member.badges.map(b => (
                                        <span key={b.id} title={b.label} className="text-yellow-500 bg-yellow-50 p-1 rounded-full border border-yellow-200">
                                            <Medal size={14}/>
                                        </span>
                                    ))}
                                </h3>
                                
                                {/* SALARY BADGE (CLICKABLE) */}
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

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-2 pt-4 border-t border-slate-50">
                            <button 
                                onClick={() => setSelectedMember(member)}
                                className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                            >
                                Voir Bulletin
                            </button>
                            {member.id !== currentUser?.id && (
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

        {/* MODAL: SALARY RULES */}
        <Modal isOpen={showSalaryInfo} onClose={() => setShowSalaryInfo(false)} title="Règles Salariales">
            <div className="space-y-6">
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-sm text-red-800">
                    <strong className="block mb-2">Le Salaire = Charge pour l'agence.</strong>
                    Chaque étudiant coûte de l'argent à son entreprise chaque semaine.
                    <br/>Plus vous êtes performant (Score élevé), plus votre salaire est haut.
                </div>
                <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex gap-3 items-start">
                        <div className="p-1 bg-slate-100 rounded text-slate-500"><Coins size={16}/></div>
                        <div>
                            <strong>Calcul :</strong> Score Individuel x {GAME_RULES.SALARY_MULTIPLIER} PiXi.
                            <br/><span className="text-xs italic opacity-75">Ex: Score 80 = 800 PiXi/semaine.</span>
                        </div>
                    </li>
                    <li className="flex gap-3 items-start">
                        <div className="p-1 bg-slate-100 rounded text-slate-500"><Wallet size={16}/></div>
                        <div>
                            <strong>Poche Perso :</strong> Vous recevez ce salaire dans votre portefeuille personnel (jusqu'à {GAME_RULES.SALARY_CAP_FOR_STUDENT} PiXi max).
                            <br/><span className="text-xs italic opacity-75">Le surplus éventuel est absorbé par les charges.</span>
                        </div>
                    </li>
                    <li className="flex gap-3 items-start">
                        <div className="p-1 bg-slate-100 rounded text-slate-500"><Award size={16}/></div>
                        <div>
                            <strong>Comment monter son score ?</strong>
                            <ul className="list-disc pl-4 mt-1 space-y-1">
                                <li>Assiduité et Ponctualité (Review des pairs).</li>
                                <li>Qualité du travail rendu.</li>
                                <li>Bonus "Bounty" techniques validés par le prof.</li>
                            </ul>
                        </div>
                    </li>
                </ul>
                <button onClick={() => setShowSalaryInfo(false)} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800">Compris</button>
            </div>
        </Modal>

        {/* MODAL: Détail Note Élève */}
        <Modal isOpen={!!selectedMember} onClose={() => setSelectedMember(null)} title="Bulletin Individuel">
            {selectedMember && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <img src={selectedMember.avatarUrl} className="w-16 h-16 rounded-2xl bg-slate-100" />
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-xl font-bold text-slate-900">{selectedMember.name}</h4>
                                {selectedMember.badges?.map(b => (
                                    <span key={b.id} className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold border border-yellow-200">
                                        {b.label}
                                    </span>
                                ))}
                            </div>
                            <p className="text-slate-500 text-sm">{selectedMember.role}</p>
                            <p className="text-red-500 font-bold text-xs mt-1">Coût salarial: {selectedMember.individualScore * GAME_RULES.SALARY_MULTIPLIER} PiXi / sem</p>
                        </div>
                        <div className="ml-auto text-center">
                            <span className="block text-3xl font-display font-bold text-indigo-600">{selectedMember.individualScore}</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Total / 100</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                             <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                                    <Wallet size={16} className="text-yellow-500" /> Portefeuille Personnel
                                </div>
                                <span className="font-bold text-yellow-600">{selectedMember.wallet || 0} PiXi</span>
                             </div>
                             <p className="text-xs text-slate-400 italic">Accumulé via salaires et bonus.</p>
                        </div>

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
        {reviewMode && currentUser && (
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
            weekId: "1", // Hardcoded for demo, normally from context or active week
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
