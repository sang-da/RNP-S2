import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/Modal';
import { Quiz, QuizQuestion } from '../../../types';
import { CheckCircle2, XCircle, HelpCircle, Coins, Award, ArrowRight } from 'lucide-react';
import { useGame } from '../../../contexts/GameContext';
import { useAuth } from '../../../contexts/AuthContext';
import { doc, updateDoc, arrayUnion, getDoc, runTransaction, db } from '../../../services/firebase';

interface QuizModalProps {
    quiz: Quiz;
    onClose: () => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({ quiz, onClose }) => {
    const { currentUser } = useAuth();
    const { agencies, updateAgency } = useGame();
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [answers, setAnswers] = useState<number[]>([]); // Store selected indices
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

    const handleNext = () => {
        if (selectedOption === null) return;
        setAnswers([...answers, selectedOption]);
        setSelectedOption(null);
        
        if (isLastQuestion) {
            calculateScore([...answers, selectedOption]);
        } else {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const calculateScore = async (finalAnswers: number[]) => {
        setIsSubmitting(true);
        let correctCount = 0;
        finalAnswers.forEach((ans, idx) => {
            if (ans === quiz.questions[idx].correctOptionIndex) {
                correctCount++;
            }
        });
        setScore(correctCount);

        // Submit results
        if (currentUser) {
            try {
                await submitQuizResult(correctCount);
            } catch (error) {
                console.error("Error submitting quiz:", error);
            }
        }
        setIsSubmitted(true);
        setIsSubmitting(false);
    };

    const submitQuizResult = async (finalScore: number) => {
        if (!currentUser) return;

        // Calculate rewards
        // Pro-rata based on score? Or all-or-nothing? 
        // Let's do pro-rata: (score / total) * reward
        const ratio = finalScore / quiz.questions.length;
        const pointsEarned = Math.floor(quiz.rewardPoints * ratio);
        const pixiEarned = Math.floor(quiz.rewardPixi * ratio);

        await runTransaction(db, async (transaction) => {
            // Find student agency
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

            // Record attempt in user profile or separate collection?
            // For simplicity, let's store it in a 'quizAttempts' collection or inside user doc if we had one accessible.
            // But we only have 'agencies' readily available in context.
            // Let's just update the member stats for now.
            // Ideally we should track "already taken" status.
            
            // We need to store that this user took this quiz to prevent retakes.
            // Let's add it to the user's 'history' or a new field 'quizAttempts' on the member object.
            // We'll assume 'quizAttempts' array exists on Student or we add it. 
            // Since we can't easily change Student type globally right now without breaking things, 
            // let's store it in a separate collection `quiz_attempts`.
            
            const attemptRef = doc(db, "quiz_attempts", `${quiz.id}_${currentUser.uid}`);
            transaction.set(attemptRef, {
                quizId: quiz.id,
                studentId: currentUser.uid,
                score: finalScore,
                maxScore: quiz.questions.length,
                date: new Date().toISOString(),
                rewardsEarned: { points: pointsEarned, pixi: pixiEarned }
            });

            transaction.update(agencyRef, { members: updatedMembers });
        });
    };

    if (isSubmitted) {
        return (
            <Modal isOpen={true} onClose={onClose} title="Résultats du Quiz">
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
                            {score} / {quiz.questions.length}
                        </h3>
                        <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Bonnes Réponses</p>
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
                    <h4 className="text-lg font-bold text-slate-900 mb-6 leading-relaxed">
                        <span className="text-indigo-500 mr-2">#{currentQuestionIndex + 1}</span>
                        {currentQuestion.text}
                    </h4>

                    <div className="space-y-3">
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
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-400 uppercase">
                        Question {currentQuestionIndex + 1} / {quiz.questions.length}
                    </span>
                    <button
                        onClick={handleNext}
                        disabled={selectedOption === null || isSubmitting}
                        className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                            selectedOption !== null && !isSubmitting
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/25'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        {isLastQuestion ? 'Terminer' : 'Suivant'} <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        </Modal>
    );
};
