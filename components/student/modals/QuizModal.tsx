import React, { useState, useRef } from 'react';
import { Modal } from '../../../components/Modal';
import { Quiz, QuizQuestion } from '../../../types';
import { CheckCircle2, XCircle, HelpCircle, Coins, Award, ArrowRight, Mic, Square, Play, Star, Loader2, Trash2 } from 'lucide-react';
import { useGame } from '../../../contexts/GameContext';
import { useAuth } from '../../../contexts/AuthContext';
import { doc, runTransaction, db, storage, ref, uploadBytes, getDownloadURL } from '../../../services/firebase';
import { transcribeAudioWithGroq } from '../../../services/groqService';

interface QuizModalProps {
    quiz: Quiz;
    onClose: () => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({ quiz, onClose }) => {
    const { currentUser } = useAuth();
    const { agencies } = useGame();
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    
    // State pour les réponses
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [textAnswer, setTextAnswer] = useState('');
    const [ratingAnswer, setRatingAnswer] = useState<number>(0);
    
    // Accumulateurs
    const [allAnswers, setAllAnswers] = useState<any>({}); // { qId: value }
    const [audioBlobs, setAudioBlobs] = useState<{[key: string]: Blob}>({}); // Stockage temporaire pour analyse sentiment (caché)

    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [transcribing, setTranscribing] = useState(false);

    // Audio Recorder State
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: BlobPart[] = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
                
                // 1. Transcription Live
                setTranscribing(true);
                try {
                    const text = await transcribeAudioWithGroq(blob, "Transcription de réponse étudiant");
                    setTextAnswer(prev => prev ? `${prev}\n${text}` : text);
                    
                    // 2. Stockage du Blob pour analyse sentiment (Admin Only)
                    // On ne le stocke que si c'est une question texte qui autorise l'audio
                    // Ici on considère que tout champ texte peut avoir de l'audio
                    setAudioBlobs(prev => ({ ...prev, [currentQuestion.id]: blob }));
                    
                } catch (e) {
                    console.error("Transcription error", e);
                    alert("Erreur de transcription. Veuillez réessayer ou taper votre texte.");
                } finally {
                    setTranscribing(false);
                }
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
            
            // Timer
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Mic error", err);
            alert("Accès micro refusé. Vérifiez vos permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const handleNext = () => {
        // Sauvegarde de la réponse courante
        let answerValue: any = null;

        if (currentQuestion.type === 'choice') {
            if (selectedOption === null) return;
            answerValue = selectedOption;
            setSelectedOption(null);
        } 
        else if (currentQuestion.type === 'text') {
            if (!textAnswer.trim()) return;
            answerValue = textAnswer;
            setTextAnswer('');
        }
        else if (currentQuestion.type === 'rating') {
            if (ratingAnswer === 0) return;
            answerValue = ratingAnswer;
            setRatingAnswer(0);
        }

        const newAnswers = { ...allAnswers, [currentQuestion.id]: answerValue };
        setAllAnswers(newAnswers);
        
        if (isLastQuestion) {
            submitQuiz(newAnswers);
        } else {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const submitQuiz = async (finalAnswers: any) => {
        setIsSubmitting(true);
        
        // 1. Calcul du Score (Uniquement pour QUIZ, pour SURVEY c'est 100%)
        let finalScore = 0;
        if (quiz.type === 'QUIZ') {
            quiz.questions.forEach(q => {
                if (q.type === 'choice' && q.correctOptionIndex !== undefined) {
                    if (finalAnswers[q.id] === q.correctOptionIndex) {
                        finalScore++;
                    }
                }
            });
        } else {
            finalScore = quiz.questions.length; // 100% completion
        }
        setScore(finalScore);

        // 2. Upload Audio Blobs (Secret)
        const audioUrls: { [key: string]: string } = {};
        const aiAnalysis: { [key: string]: any } = {};

        try {
            const uploadPromises = Object.entries(audioBlobs).map(async ([qId, blob]) => {
                if (!currentUser) return;
                const storageRef = ref(storage, `quizzes/${quiz.id}/${currentUser.uid}/${qId}_${Date.now()}.webm`);
                await uploadBytes(storageRef, blob);
                const url = await getDownloadURL(storageRef);
                audioUrls[qId] = url;
                
                // Mock AI Analysis (since we don't have a backend function ready)
                // In a real scenario, we would trigger a Cloud Function here
                aiAnalysis[qId] = {
                    sentiment: "pending_analysis", // To be processed by Admin later
                    transcription_length: finalAnswers[qId]?.length || 0
                };
            });

            await Promise.all(uploadPromises);
        } catch (e) {
            console.error("Error uploading audio:", e);
            // Continue even if upload fails, we still want to save the quiz
        }

        // 3. Enregistrement Firebase
        if (currentUser) {
            try {
                await saveResultsToFirebase(finalScore, finalAnswers, audioUrls, aiAnalysis);
            } catch (error) {
                console.error("Error submitting quiz:", error);
            }
        }
        
        setIsSubmitted(true);
        setIsSubmitting(false);
    };

    const saveResultsToFirebase = async (finalScore: number, finalAnswers: any, audioUrls: any, aiAnalysis: any) => {
        if (!currentUser) return;

        const ratio = finalScore / quiz.questions.length;
        const pointsEarned = Math.floor(quiz.rewardPoints * ratio);
        const pixiEarned = Math.floor(quiz.rewardPixi * ratio);

        await runTransaction(db, async (transaction) => {
            const agency = agencies.find(a => a.members.some(m => m.id === currentUser.uid));
            if (!agency) throw new Error("Agence introuvable");

            const agencyRef = doc(db, "agencies", agency.id);
            const agencyDoc = await transaction.get(agencyRef);
            if (!agencyDoc.exists()) throw new Error("Agence introuvable");

            const agencyData = agencyDoc.data();
            const updatedMembers = agencyData.members.map((m: any) => {
                if (m.id === currentUser.uid) {
                    return {
                        ...m,
                        individualScore: Math.min(100, (m.individualScore || 0) + pointsEarned),
                        wallet: (m.wallet || 0) + pixiEarned
                    };
                }
                return m;
            });

            // Sauvegarde de la tentative complète
            let attemptId = `${quiz.id}_${currentUser.uid}`;
            if (quiz.frequency === 'WEEKLY') {
                attemptId += `_${Date.now()}`;
            }

            const attemptRef = doc(db, "quiz_attempts", attemptId);
            transaction.set(attemptRef, {
                quizId: quiz.id,
                studentId: currentUser.uid,
                score: finalScore,
                maxScore: quiz.questions.length,
                date: new Date().toISOString(),
                rewardsEarned: { points: pointsEarned, pixi: pixiEarned },
                answers: finalAnswers,
                audioUrls: audioUrls,
                aiAnalysis: aiAnalysis,
                type: quiz.type || 'QUIZ'
            });

            transaction.update(agencyRef, { members: updatedMembers });
        });
    };

    // RENDER HELPERS
    const isNextDisabled = () => {
        if (isSubmitting || transcribing || isRecording) return true;
        if (currentQuestion.type === 'choice') return selectedOption === null;
        if (currentQuestion.type === 'text') return !textAnswer.trim();
        if (currentQuestion.type === 'rating') return ratingAnswer === 0;
        return false;
    };

    if (isSubmitted) {
        return (
            <Modal isOpen={true} onClose={onClose} title={quiz.type === 'SURVEY' ? "Merci pour ton retour !" : "Résultats du Quiz"}>
                <div className="flex flex-col items-center justify-center py-8 space-y-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-20"></div>
                        <div className="bg-white p-4 rounded-full shadow-xl border-4 border-indigo-50 relative z-10">
                            {score === quiz.questions.length ? (
                                <Award size={64} className="text-yellow-500" />
                            ) : score > 0 ? (
                                <Award size={64} className="text-indigo-500" />
                            ) : (
                                <XCircle size={64} className="text-slate-300" />
                            )}
                        </div>
                    </div>
                    
                    <div className="text-center">
                        <h3 className="text-2xl font-black text-slate-900 mb-1">
                            {quiz.type === 'SURVEY' ? "Mission Accomplie" : `${score} / ${quiz.questions.length}`}
                        </h3>
                        <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">
                            {quiz.type === 'SURVEY' ? "Réponses enregistrées" : "Bonnes Réponses"}
                        </p>
                    </div>

                    <div className="flex gap-4 w-full max-w-xs">
                        <div className="flex-1 bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex flex-col items-center">
                            <Coins size={24} className="text-emerald-500 mb-2"/>
                            <span className="text-xl font-black text-emerald-700">+{Math.floor(quiz.rewardPixi * (score / quiz.questions.length))}</span>
                            <span className="text-[10px] font-bold text-emerald-400 uppercase">PiXi</span>
                        </div>
                        <div className="flex-1 bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex flex-col items-center">
                            <Award size={24} className="text-indigo-500 mb-2"/>
                            <span className="text-xl font-black text-indigo-700">+{Math.floor(quiz.rewardPoints * (score / quiz.questions.length))}</span>
                            <span className="text-[10px] font-bold text-indigo-400 uppercase">Score</span>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-colors"
                    >
                        Fermer
                    </button>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={true} onClose={onClose} title={quiz.title}>
            <div className="space-y-6">
                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                        className="bg-indigo-600 h-full transition-all duration-300 ease-out"
                        style={{ width: `${((currentQuestionIndex) / quiz.questions.length) * 100}%` }}
                    />
                </div>

                <div className="min-h-[200px]">
                    <h4 className="text-lg font-bold text-slate-900 mb-2 leading-relaxed">
                        <span className="text-indigo-500 mr-2">#{currentQuestionIndex + 1}</span>
                        {currentQuestion.text}
                    </h4>
                    
                    {/* TYPE: CHOICE */}
                    {currentQuestion.type === 'choice' && currentQuestion.options && (
                        <div className="space-y-3 mt-6">
                            {currentQuestion.options.map((option, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedOption(idx)}
                                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between group ${
                                        selectedOption === idx 
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-md' 
                                        : 'border-slate-100 bg-white text-slate-600 hover:border-indigo-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <span className="font-medium">{option}</span>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                        selectedOption === idx ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                                    }`}>
                                        {selectedOption === idx && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* TYPE: TEXT (AVEC AUDIO OPTIONNEL) */}
                    {(currentQuestion.type === 'text' || currentQuestion.type === 'audio') && (
                        <div className="mt-6 space-y-4">
                            <div className="relative">
                                <textarea
                                    value={textAnswer}
                                    onChange={(e) => setTextAnswer(e.target.value)}
                                    placeholder="Écris ta réponse ici ou utilise le micro..."
                                    className="w-full h-40 p-4 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-0 resize-none text-slate-700 pr-12"
                                    disabled={isRecording || transcribing}
                                />
                                <div className="absolute bottom-4 right-4 flex gap-2">
                                    {textAnswer && (
                                        <button 
                                            onClick={() => setTextAnswer('')}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            title="Effacer le texte"
                                        >
                                            <Trash2 size={18}/>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* AUDIO RECORDER INTEGRATED */}
                            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={isRecording ? stopRecording : startRecording}
                                        disabled={transcribing}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                            isRecording 
                                            ? 'bg-red-500 text-white animate-pulse' 
                                            : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                                        } ${transcribing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {isRecording ? <Square size={16} fill="currentColor"/> : <Mic size={20}/>}
                                    </button>
                                    
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-700 uppercase">
                                            {isRecording ? 'Enregistrement...' : transcribing ? 'Transcription IA...' : 'Dictée Vocale'}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {isRecording ? `00:${recordingTime < 10 ? `0${recordingTime}` : recordingTime}` : 'Cliquez pour parler'}
                                        </span>
                                    </div>
                                </div>

                                {transcribing && (
                                    <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold animate-pulse">
                                        <Loader2 size={14} className="animate-spin"/>
                                        Transcription...
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TYPE: RATING */}
                    {currentQuestion.type === 'rating' && (
                        <div className="mt-8 flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRatingAnswer(star)}
                                    className={`p-2 transition-transform hover:scale-110 ${
                                        ratingAnswer >= star ? 'text-amber-400' : 'text-slate-200'
                                    }`}
                                >
                                    <Star size={40} fill={ratingAnswer >= star ? "currentColor" : "none"} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-400 uppercase">
                        Question {currentQuestionIndex + 1} / {quiz.questions.length}
                    </span>
                    <button
                        onClick={handleNext}
                        disabled={isNextDisabled()}
                        className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                            !isNextDisabled()
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/25'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        {transcribing ? (
                            <><Loader2 size={18} className="animate-spin"/> Traitement...</>
                        ) : (
                            <>{isLastQuestion ? 'Terminer' : 'Suivant'} <ArrowRight size={18} /></>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
