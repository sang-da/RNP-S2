
import React, { useState, useEffect, useMemo } from 'react';
import { Agency, Student, PeerReview } from '../../types';
import { Clock, MessageCircle, Send, Lock, Coins, Award, Star, Wallet, Medal, HelpCircle, CheckCircle2, User, X, TrendingUp, History, FileText, Mic, Square, Loader2, Edit2, Save, ShoppingBag, Crown, ClipboardCheck } from 'lucide-react';
import { Modal } from '../Modal';
import { GAME_RULES } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { useGame } from '../../contexts/GameContext';
import { SoloPanel } from './team/SoloPanel';
import { doc, setDoc, db } from '../../services/firebase'; // Direct Write for Reviews

import { transcribeAudioWithGroq, askGroq } from '../../services/groqService';

interface TeamViewProps {
  agency: Agency;
  onUpdateAgency: (agency: Agency) => void;
  currentUserOverride?: Student;
}

export const TeamView: React.FC<TeamViewProps> = ({ agency, onUpdateAgency, currentUserOverride }) => {
  const [selectedMember, setSelectedMember] = useState<Student | null>(null);
  const [reviewMode, setReviewMode] = useState<Student | null>(null);
  const [showSalaryInfo, setShowSalaryInfo] = useState(false);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [editedRole, setEditedRole] = useState("");

  const { currentUser: firebaseUser } = useAuth();
  const { getCurrentGameWeek, reviews } = useGame(); // On récupère les reviews globales
  
  const currentUser = currentUserOverride || agency.members.find(m => m.id === firebaseUser?.uid);
  const currentWeek = getCurrentGameWeek();
  const isSoloMode = agency.members.length === 1;

  useEffect(() => {
    if (selectedMember) {
      setEditedRole(selectedMember.role);
      setIsEditingRole(false);
    }
  }, [selectedMember]);

  const handleSaveRole = () => {
    if (!selectedMember || !currentUser) return;
    
    const updatedMembers = agency.members.map(m => 
        m.id === selectedMember.id ? { ...m, role: editedRole } : m
    );
    
    onUpdateAgency({ ...agency, members: updatedMembers });
    setSelectedMember({ ...selectedMember, role: editedRole });
    setIsEditingRole(false);
  };

  const memberReviews = useMemo(() => {
      if (!selectedMember) return [];
      return reviews.filter(r => r.targetId === selectedMember.id);
  }, [selectedMember, reviews]);

  const radarData = useMemo(() => {
      if (memberReviews.length === 0) return [];
      
      const total = memberReviews.reduce((acc, r) => ({
          attendance: acc.attendance + (r.ratings.attendance || 0),
          quality: acc.quality + (r.ratings.quality || 0),
          involvement: acc.involvement + (r.ratings.involvement || 0)
      }), { attendance: 0, quality: 0, involvement: 0 });

      const count = memberReviews.length;
      return [
          { subject: 'Assiduité', A: parseFloat((total.attendance / count).toFixed(1)), fullMark: 5 },
          { subject: 'Qualité', A: parseFloat((total.quality / count).toFixed(1)), fullMark: 5 },
          { subject: 'Implication', A: parseFloat((total.involvement / count).toFixed(1)), fullMark: 5 },
      ];
  }, [memberReviews]);

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
                const rawSalary = member.individualScore * GAME_RULES.SALARY_MULTIPLIER;
                const salary = Math.min(rawSalary, GAME_RULES.SALARY_CAP_FOR_STUDENT);
                const isMe = member.id === currentUser?.id;
                const alreadyReviewed = hasReviewedMemberThisWeek(member.id);
                const isOwner = !member.role.toLowerCase().includes('employé') && !member.role.toLowerCase().includes('employee') && !member.role.toLowerCase().includes('salarié');
                
                return (
                    <div 
                        key={member.id} 
                        className={`bg-white p-6 rounded-3xl border ${isOwner ? 'border-amber-200 shadow-amber-100/50' : 'border-slate-100'} shadow-sm flex flex-col gap-4 group hover:shadow-md transition-all relative overflow-hidden`}
                    >
                        {isOwner && (
                            <div className="absolute top-0 right-0 bg-gradient-to-bl from-amber-400 to-amber-500 text-white p-2 rounded-bl-2xl shadow-sm">
                                <Crown size={16} className="drop-shadow-sm" />
                            </div>
                        )}
                        <div className="flex items-center gap-6 cursor-pointer" onClick={() => setSelectedMember(member)}>
                            <div className="relative">
                                <img src={member.avatarUrl} className={`w-20 h-20 rounded-2xl bg-slate-100 group-hover:scale-105 transition-transform ${isOwner ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`} alt={member.name} />
                            </div>
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
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isOwner ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {member.role}
                                    </span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setShowSalaryInfo(true); }}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 border border-red-100 rounded-full text-xs font-bold text-red-600 hover:bg-red-100 transition-colors"
                                    >
                                        <Coins size={12} />
                                        -{salary.toFixed(0)} PiXi / sem
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
                                    <Wallet size={10}/> {(member.wallet || 0).toFixed(0)}
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
                <div className="space-y-6 py-4">
                    <section>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
                            <Coins className="w-5 h-5 text-yellow-500" />
                            Revenus & Salaires (PiXi)
                        </h3>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 text-sm text-slate-600">
                            <div>
                                <p className="font-bold text-slate-900">1. Calcul du Salaire Brut</p>
                                <p>Votre Score Individuel × {GAME_RULES.SALARY_MULTIPLIER} PiXi.</p>
                            </div>
                            <div>
                                <p className="font-bold text-slate-900">2. Plafond de Rémunération</p>
                                <p>Le salaire est capé à <span className="text-emerald-600 font-bold">{GAME_RULES.SALARY_CAP_FOR_STUDENT} PiXi</span>.</p>
                                <p className="text-[10px] italic text-slate-400 mt-1">L'excédent au-delà du plafond est conservé par l'agence pour ses frais de structure.</p>
                            </div>
                            <div className="pt-2 border-t border-slate-200">
                                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Exemple :</p>
                                <p className="text-xs">Si score = 80 → 80 × {GAME_RULES.SALARY_MULTIPLIER} = {80 * GAME_RULES.SALARY_MULTIPLIER} PiXi (Capped à {GAME_RULES.SALARY_CAP_FOR_STUDENT}).</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 text-indigo-500" />
                            Impact sur la Valeur (VE)
                        </h3>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 text-sm text-slate-600">
                            <div>
                                <p className="font-bold text-slate-900">Croissance de l'Agence</p>
                                <p>Chaque point de score individuel contribue à la <span className="text-indigo-600 font-bold">VE Marché</span> de l'agence.</p>
                            </div>
                            <div>
                                <p className="font-bold text-slate-900">Le "Bouclier Marché"</p>
                                <p>Si votre VE Marché dépasse le plafond de l'agence, elle sert de <span className="text-emerald-600 font-bold">bouclier</span> : vos pertes futures ne feront pas baisser votre VE actuelle tant que vous avez du surplus en réserve.</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
                            <ShoppingBag className="w-5 h-5 text-red-500" />
                            Dépenses & Coût de la Vie
                        </h3>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 text-sm text-slate-600">
                            <div>
                                <p className="font-bold text-slate-900">Taxe de Vie Hebdomadaire</p>
                                <p><span className="text-red-600 font-bold">-{GAME_RULES.COST_OF_LIVING} PiXi</span> sont prélevés automatiquement sur votre portefeuille chaque semaine.</p>
                            </div>
                            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                                <p className="text-xs font-bold text-red-700 uppercase mb-1">Attention : Malus de Pauvreté</p>
                                <p className="text-xs text-red-600">Si votre solde tombe en dessous de 0, vous subissez un malus de <span className="font-bold">-{GAME_RULES.POVERTY_SCORE_PENALTY} points</span> sur votre score la semaine suivante.</p>
                            </div>
                        </div>
                    </section>
                </div>
                <button onClick={() => setShowSalaryInfo(false)} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors">
                    J'ai compris
                </button>
            </Modal>
        )}

        {reviewMode && currentUser && (
            <PeerReviewForm 
                reviewer={currentUser}
                target={reviewMode}
                weekId={currentWeek.toString()}
                agencyId={agency.id}
                agencyName={agency.name}
                onClose={() => setReviewMode(null)}
                onSubmit={handlePeerReview}
            />
        )}

        {selectedMember && (
            <Modal 
                isOpen={true} 
                onClose={() => setSelectedMember(null)} 
                title={`Bulletin : ${selectedMember.name}`}
            >
                <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="relative">
                            <img src={selectedMember.avatarUrl} className={`w-16 h-16 rounded-xl bg-white shadow-sm ${!selectedMember.role.toLowerCase().includes('employé') && !selectedMember.role.toLowerCase().includes('employee') && !selectedMember.role.toLowerCase().includes('salarié') ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`} alt={selectedMember.name} />
                            {!selectedMember.role.toLowerCase().includes('employé') && !selectedMember.role.toLowerCase().includes('employee') && !selectedMember.role.toLowerCase().includes('salarié') && (
                                <div className="absolute -top-2 -right-2 bg-gradient-to-bl from-amber-400 to-amber-500 text-white p-1 rounded-full shadow-sm">
                                    <Crown size={12} className="drop-shadow-sm" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-lg text-slate-900">{selectedMember.name}</h4>
                            
                            {selectedMember.id === currentUser?.id ? (
                                isEditingRole ? (
                                    <div className="flex items-center gap-2 mt-1">
                                        <input 
                                            type="text" 
                                            value={editedRole} 
                                            onChange={(e) => setEditedRole(e.target.value)}
                                            className="text-xs font-bold uppercase p-1 border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none w-full max-w-[150px] bg-white text-slate-700"
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveRole()}
                                        />
                                        <button onClick={handleSaveRole} className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"><Save size={12}/></button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 group cursor-pointer w-fit mt-1" onClick={() => setIsEditingRole(true)} title="Modifier votre rôle">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${!selectedMember.role.toLowerCase().includes('employé') && !selectedMember.role.toLowerCase().includes('employee') && !selectedMember.role.toLowerCase().includes('salarié') ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {selectedMember.role}
                                        </span>
                                        <Edit2 size={10} className="text-slate-300 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"/>
                                    </div>
                                )
                            ) : (
                                <div className="mt-1">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${!selectedMember.role.toLowerCase().includes('employé') && !selectedMember.role.toLowerCase().includes('employee') && !selectedMember.role.toLowerCase().includes('salarié') ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {selectedMember.role}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Score Individuel</p>
                            <p className="text-2xl font-black text-indigo-600">{selectedMember.individualScore}</p>
                        </div>
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Fortune</p>
                            <p className="text-2xl font-black text-emerald-600">{(selectedMember.wallet || 0).toFixed(0)} <span className="text-xs">PiXi</span></p>
                        </div>
                    </div>

                    {/* LOLLIPOP BARS (PRIVATE) */}
                    {selectedMember.id === currentUser?.id && radarData.length > 0 && (
                        <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-5">
                                <TrendingUp size={80} />
                            </div>
                            <h5 className="text-sm font-bold text-slate-700 mb-5 flex items-center gap-2 relative z-10">
                                <TrendingUp size={16} className="text-indigo-500"/> Analyse 360° (Privé)
                            </h5>
                            
                            <div className="space-y-5 relative z-10">
                                {radarData.map((item, idx) => {
                                    const colors = [
                                        { bar: 'bg-indigo-100', dot: 'bg-indigo-500', text: 'text-indigo-600' },
                                        { bar: 'bg-emerald-100', dot: 'bg-emerald-500', text: 'text-emerald-600' },
                                        { bar: 'bg-amber-100', dot: 'bg-amber-500', text: 'text-amber-600' }
                                    ];
                                    const color = colors[idx % colors.length];
                                    const percentage = (item.A / 5) * 100;

                                    return (
                                        <div key={item.subject} className="space-y-1.5">
                                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                <span>{item.subject}</span>
                                                <span className={color.text}>{item.A} / 5</span>
                                            </div>
                                            <div className="relative h-1.5 w-full bg-slate-50 rounded-full overflow-visible">
                                                <div 
                                                    className={`absolute top-0 left-0 h-full rounded-full ${color.bar} transition-all duration-1000`}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                                <div 
                                                    className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm ${color.dot} transition-all duration-1000`}
                                                    style={{ left: `calc(${percentage}% - 6px)` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <p className="text-[10px] text-center text-slate-400 mt-6 italic relative z-10">
                                Basé sur les évaluations anonymes de vos collègues
                            </p>
                        </div>
                    )}

                    {selectedMember.evaluation && selectedMember.evaluation.isPublished && (
                        <div className="space-y-4 mt-6 border-t border-slate-100 pt-6">
                            <h5 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <ClipboardCheck size={16} className="text-indigo-500"/> Bilan de Compétences
                            </h5>
                            
                            {selectedMember.evaluation.studentFeedback && (
                                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 text-sm text-indigo-900 italic">
                                    "{selectedMember.evaluation.studentFeedback}"
                                </div>
                            )}

                            <div className="space-y-3">
                                <h6 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Évaluation Individuelle</h6>
                                {selectedMember.evaluation.individualEvaluation?.map((crit: any, idx: number) => (
                                    <div key={idx} className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-slate-700 text-sm">{crit.criterionId}</span>
                                            <span className={`font-bold text-sm ${crit.score >= 10 ? 'text-emerald-600' : 'text-rose-600'}`}>{crit.score}/20</span>
                                        </div>
                                        <p className="text-xs text-slate-500">{crit.feedback}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3">
                                <h6 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Évaluation de l'Agence</h6>
                                {selectedMember.evaluation.groupEvaluation?.map((crit: any, idx: number) => (
                                    <div key={idx} className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-slate-700 text-sm">{crit.criterionId}</span>
                                            <span className={`font-bold text-sm ${crit.score >= 10 ? 'text-emerald-600' : 'text-rose-600'}`}>{crit.score}/20</span>
                                        </div>
                                        <p className="text-xs text-slate-500">{crit.feedback}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <h5 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <History size={16} className="text-slate-400"/> Historique & Badges
                        </h5>
                        <div className="flex flex-wrap gap-2">
                            {(selectedMember.badges || []).length > 0 ? selectedMember.badges?.map(b => (
                                <div key={b.id} className="px-3 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full text-[10px] font-bold flex items-center gap-1">
                                    <Award size={10}/> {b.label}
                                </div>
                            )) : (
                                <p className="text-xs text-slate-400 italic">Aucun badge obtenu pour le moment.</p>
                            )}
                        </div>
                    </div>

                    <div className="p-4 bg-slate-900 rounded-2xl text-white">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold opacity-60 uppercase tracking-widest">Salaire Hebdo</span>
                            <span className="text-lg font-black">{Math.round(Math.min(selectedMember.individualScore * GAME_RULES.SALARY_MULTIPLIER, GAME_RULES.SALARY_CAP_FOR_STUDENT))} PiXi</span>
                        </div>
                        <p className="text-[10px] opacity-50 leading-relaxed">
                            Le salaire est calculé sur la base du score individuel (Score x {GAME_RULES.SALARY_MULTIPLIER}). Le salaire maximum est plafonné à {GAME_RULES.SALARY_CAP_FOR_STUDENT} PiXi par semaine.
                        </p>
                    </div>

                    <button 
                        onClick={() => setSelectedMember(null)}
                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors"
                    >
                        Fermer
                    </button>
                </div>
            </Modal>
        )}
    </div>
  );
};

import { useVoiceDictation } from '@/hooks/useVoiceDictation';

interface PeerReviewFormProps {
    reviewer: Student;
    target: Student;
    weekId: string;
    agencyId: string;
    agencyName: string;
    onClose: () => void;
    onSubmit: (review: PeerReview) => void;
}

const PeerReviewForm: React.FC<PeerReviewFormProps> = ({ reviewer, target, weekId, agencyId, agencyName, onClose, onSubmit }) => {
    const [attendance, setAttendance] = useState(3);
    const [quality, setQuality] = useState(3);
    const [involvement, setInvolvement] = useState(3);
    const [comment, setComment] = useState("");
    const [formError, setFormError] = useState<string | null>(null);

    const {
        isRecording,
        isTranscribing,
        error: dictationError,
        startRecording,
        stopRecording,
        clearError
    } = useVoiceDictation({
        onTranscriptionComplete: (text) => {
            setComment(prev => prev ? `${prev}\n\n${text}` : text);
        },
        promptContext: `Feedback de ${reviewer.name} pour ${target.name} dans l'agence ${agencyName}.`,
        systemPrompt: `Tu es un assistant RH professionnel. 
            Ton rôle est de nettoyer et de professionnaliser une transcription audio de feedback entre étudiants.
            - Corrige les erreurs de transcription (ex: "euh", "bah", hésitations).
            - Améliore la syntaxe et la clarté tout en gardant le sens exact.
            - Garde le ton constructif.
            - Ne rajoute pas d'informations qui ne sont pas dans l'audio.
            - Renvoie UNIQUEMENT le texte corrigé, sans introduction ni conclusion.`,
        contextData: {
            reviewer: reviewer.name,
            target: target.name,
            agency: agencyName
        }
    });

    const handleSubmit = () => {
        if (comment.trim().length < 10) {
            setFormError("La justification doit faire au moins 10 caractères.");
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
    const displayError = formError || dictationError;

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
                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <label className="block text-sm font-bold text-slate-700">
                            Justification / Feedback Privé <span className="text-red-500">*</span>
                        </label>
                        <span className="text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 text-[10px]"><Lock size={10} /> Admin only</span>
                    </div>

                    <div className="relative group">
                        <textarea 
                            value={comment} 
                            onChange={e => { setComment(e.target.value); if(displayError) { setFormError(null); clearError(); } }} 
                            placeholder="Pourquoi cette note ? Justifiez l'investissement de votre collègue..."
                            className={`w-full p-4 rounded-2xl border ${displayError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} text-sm min-h-[120px] focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-white shadow-inner transition-all`} 
                        />
                        
                        {/* Improved Recording UI */}
                        {isRecording && (
                            <div className="absolute bottom-3 left-3 right-3 bg-red-600 text-white p-3 rounded-xl flex items-center justify-between shadow-lg animate-in slide-in-from-bottom-2 duration-300 z-20">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1">
                                        {[1,2,3].map(i => (
                                            <div key={i} className="w-1 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                                        ))}
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Enregistrement...</span>
                                </div>
                                <button 
                                    onClick={stopRecording}
                                    className="bg-white text-red-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-red-50 transition-colors shadow-sm"
                                >
                                    Terminer
                                </button>
                            </div>
                        )}

                        {isTranscribing && (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center z-10 animate-in fade-in duration-200">
                                <div className="flex flex-col items-center gap-3 bg-white p-6 rounded-3xl shadow-xl border border-slate-100">
                                    <Loader2 size={32} className="text-indigo-600 animate-spin" />
                                    <p className="text-indigo-600 font-bold text-sm">Analyse par l'IA...</p>
                                </div>
                            </div>
                        )}

                        {/* Floating Mic Button when NOT recording */}
                        {!isRecording && !isTranscribing && (
                            <button
                                type="button"
                                onClick={startRecording}
                                className="absolute bottom-4 right-4 p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100 flex items-center gap-2 group-hover:scale-105"
                            >
                                <Mic size={18} />
                                <span className="text-xs font-bold">Dicter</span>
                            </button>
                        )}
                    </div>
                    {displayError && <p className="text-[10px] text-red-500 font-bold mt-1 animate-pulse">{displayError}</p>}
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
