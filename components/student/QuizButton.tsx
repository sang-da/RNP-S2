import React, { useState, useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useAuth } from '../../contexts/AuthContext';
import { Quiz } from '../../types';
import { HelpCircle, CheckCircle2 } from 'lucide-react';
import { QuizModal } from './modals/QuizModal';
import { QuizSelectionModal } from './modals/QuizSelectionModal';
import { collection, query, where, getDocs, db } from '../../services/firebase';

export const QuizButton: React.FC = () => {
    const { gameConfig } = useGame();
    const { currentUser } = useAuth();
    const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
    const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
    const [isSelectionOpen, setIsSelectionOpen] = useState(false);
    const [completedQuizIds, setCompletedQuizIds] = useState<string[]>([]);

    useEffect(() => {
        const fetchAttempts = async () => {
            if (!currentUser) return;
            // Fetch attempts for this user
            const q = query(collection(db, "quiz_attempts"), where("studentId", "==", currentUser.uid));
            const snapshot = await getDocs(q);
            const ids = snapshot.docs.map(doc => doc.data().quizId);
            setCompletedQuizIds(ids);
        };
        fetchAttempts();
    }, [currentUser]);

    const isJuryModeActive = gameConfig.isJuryModeActive || (gameConfig.juryDeadline && new Date() > new Date(gameConfig.juryDeadline));

    useEffect(() => {
        if (gameConfig.quizzes && !isJuryModeActive) {
            // Filter visible quizzes that haven't been completed
            const visible = gameConfig.quizzes.filter(q => q.isVisible && !completedQuizIds.includes(q.id));
            setAvailableQuizzes(visible);
        } else {
            setAvailableQuizzes([]);
        }
    }, [gameConfig.quizzes, completedQuizIds, isJuryModeActive]);

    if (availableQuizzes.length === 0) return null;

    return (
        <>
            <button 
                onClick={() => setIsSelectionOpen(true)}
                className="fixed bottom-24 right-6 bg-white p-3 rounded-full shadow-xl border-2 border-indigo-100 hover:scale-110 transition-transform z-40 group animate-in slide-in-from-bottom-4 duration-500"
                title="Quiz Disponible !"
            >
                <div className="relative">
                    <HelpCircle size={28} className="text-indigo-600" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                </div>
                <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-indigo-900 text-white text-xs font-bold px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {availableQuizzes.length} Activité{availableQuizzes.length > 1 ? 's' : ''} !
                </div>
            </button>

            {isSelectionOpen && (
                <QuizSelectionModal 
                    isOpen={isSelectionOpen} 
                    onClose={() => setIsSelectionOpen(false)} 
                    quizzes={availableQuizzes}
                    onSelectQuiz={(quiz) => {
                        setSelectedQuiz(quiz);
                        setIsSelectionOpen(false);
                    }}
                />
            )}

            {selectedQuiz && (
                <QuizModal 
                    quiz={selectedQuiz} 
                    onClose={(completed) => {
                        setSelectedQuiz(null);
                        if (completed) {
                            setCompletedQuizIds(prev => [...prev, selectedQuiz.id]);
                        } else {
                            // If not completed, maybe re-open selection? Or just close.
                            // User asked for "pre-modal", so maybe re-open selection is nice.
                            setIsSelectionOpen(true);
                        }
                    }} 
                />
            )}
        </>
    );
};
