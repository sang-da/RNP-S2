import React, { useState, useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';
import { useAuth } from '../../contexts/AuthContext';
import { Quiz } from '../../types';
import { HelpCircle, CheckCircle2 } from 'lucide-react';
import { QuizModal } from './modals/QuizModal';
import { collection, query, where, getDocs, db } from '../../services/firebase';

export const QuizButton: React.FC = () => {
    const { gameConfig } = useGame();
    const { currentUser } = useAuth();
    const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
    const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
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

    useEffect(() => {
        if (gameConfig.quizzes) {
            // Filter visible quizzes that haven't been completed
            const visible = gameConfig.quizzes.filter(q => q.isVisible && !completedQuizIds.includes(q.id));
            setAvailableQuizzes(visible);
        }
    }, [gameConfig.quizzes, completedQuizIds]);

    if (availableQuizzes.length === 0) return null;

    // Show only the first available quiz or a list?
    // User said "small pop-up that appears in the corner... next to the capsule you put in or the card you put in for Pixie."
    // Let's show a button with a notification badge if there are quizzes.
    
    return (
        <>
            <button 
                onClick={() => setSelectedQuiz(availableQuizzes[0])}
                className="fixed bottom-24 right-6 bg-white p-3 rounded-full shadow-xl border-2 border-indigo-100 hover:scale-110 transition-transform z-40 group animate-in slide-in-from-bottom-4 duration-500"
                title="Quiz Disponible !"
            >
                <div className="relative">
                    <HelpCircle size={28} className="text-indigo-600" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                </div>
                <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-indigo-900 text-white text-xs font-bold px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Quiz Disponible !
                </div>
            </button>

            {selectedQuiz && (
                <QuizModal 
                    quiz={selectedQuiz} 
                    onClose={() => {
                        setSelectedQuiz(null);
                        // Refresh completed list locally to hide button immediately
                        setCompletedQuizIds(prev => [...prev, selectedQuiz.id]);
                    }} 
                />
            )}
        </>
    );
};
