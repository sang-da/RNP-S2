
import React, { useState } from 'react';
import { Agency, Student, PeerReview } from '../../types';
import { Clock, MessageCircle, Send, Lock, Coins, Award, Star, Wallet, Medal, HelpCircle, CheckCircle2, User, X, TrendingUp, History, FileText, Mic, Square, Loader2 } from 'lucide-react';
import { Modal } from '../Modal';
import { GAME_RULES } from '../../constants';
import { useAuth } from '../../contexts/AuthContext';
import { useGame } from '../../contexts/GameContext';
import { SoloPanel } from './team/SoloPanel';
import { doc, setDoc, db } from '../../services/firebase'; // Direct Write for Reviews

interface TeamViewProps {
  agency: Agency;
  onUpdateAgency: (agency: Agency) => void;
  currentUserOverride?: Student;
}

export const TeamView: React.FC<TeamViewProps> = ({ agency, onUpdateAgency, currentUserOverride }) => {
  const [selectedMember, setSelectedMember] = useState<Student | null>(null);
  const [reviewMode, setReviewMode] = useState<Student | null>(null);
  const [showSalaryInfo, setShowSalaryInfo] = useState(false);

  const { currentUser: firebaseUser } = useAuth();
  const { getCurrentGameWeek, reviews } = useGame(); // On récupère les reviews globales
  
  const currentUser = currentUserOverride || agency.members.find(m => m.id === firebaseUser?.uid);
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
                        <img src={selectedMember.avatarUrl} className="w-16 h-16 rounded-xl bg-white shadow-sm" alt={selectedMember.name} />
                        <div>
                            <h4 className="font-bold text-lg text-slate-900">{selectedMember.name}</h4>
                            <p className="text-xs text-slate-500 font-bold uppercase">{selectedMember.role}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Score Individuel</p>
                            <p className="text-2xl font-black text-indigo-600">{selectedMember.individualScore}</p>
                        </div>
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Fortune</p>
                            <p className="text-2xl font-black text-emerald-600">{selectedMember.wallet} <span className="text-xs">PiXi</span></p>
                        </div>
                    </div>

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
                            <span className="text-lg font-black">{selectedMember.individualScore * GAME_RULES.SALARY_MULTIPLIER} PiXi</span>
                        </div>
                        <p className="text-[10px] opacity-50 leading-relaxed">
                            Le salaire est calculé sur la base du score individuel. Maintenez un score élevé pour maximiser vos revenus.
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
    const [error, setError] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: Blob[] = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                await transcribeAudio(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setError("Impossible d'accéder au micro.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            setIsRecording(false);
        }
    };

    const transcribeAudio = async (blob: Blob) => {
        setIsTranscribing(true);
        try {
            const formData = new FormData();
            // IMPORTANT: Append fields BEFORE the file to ensure req.body is populated in all environments
            formData.append('reviewerName', reviewer.name);
            formData.append('targetName', target.name);
            formData.append('agencyName', agencyName);
            formData.append('file', blob, 'recording.webm');

            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || 'Transcription failed');
            }

            const data = await response.json();
            if (data.text) {
                setComment(prev => prev ? `${prev} ${data.text}` : data.text);
            }
        } catch (err: any) {
            console.error("Transcription error:", err);
            setError(err.message || "Erreur lors de la transcription vocale.");
        } finally {
            setIsTranscribing(false);
        }
    };

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
                            onChange={e => { setComment(e.target.value); if(error) setError(null); }} 
                            placeholder="Pourquoi cette note ? Justifiez l'investissement de votre collègue..."
                            className={`w-full p-4 rounded-2xl border ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'} text-sm min-h-[120px] focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-white shadow-inner transition-all`} 
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
