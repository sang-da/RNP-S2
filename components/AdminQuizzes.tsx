import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { Quiz } from '../types';
import { doc, setDoc, db, arrayUnion } from '../services/firebase';
import { QuizList } from './admin/quizzes/QuizList';
import { QuizEditor } from './admin/quizzes/QuizEditor';
import { QuizResults } from './admin/quizzes/QuizResults';

export const AdminQuizzes: React.FC = () => {
    const { gameConfig } = useGame();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [view, setView] = useState<'LIST' | 'EDIT' | 'RESULTS'>('LIST');
    const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
    const [currentQuiz, setCurrentQuiz] = useState<Partial<Quiz>>({
        title: '',
        description: '',
        type: 'QUIZ',
        frequency: 'ONCE',
        questions: [],
        rewardPoints: 0,
        rewardPixi: 0,
        costPixi: 0,
        isVisible: false,
        unlockWeek: 1
    });

    useEffect(() => {
        if (gameConfig?.quizzes) {
            setQuizzes(gameConfig.quizzes);
        }
    }, [gameConfig]);

    const handleCreate = () => {
        setCurrentQuiz({
            title: '',
            description: '',
            type: 'QUIZ',
            frequency: 'ONCE',
            questions: [],
            rewardPoints: 0,
            rewardPixi: 0,
            costPixi: 0,
            isVisible: false,
            unlockWeek: 1
        });
        setView('EDIT');
    };

    const handleEdit = (quiz: Quiz) => {
        setCurrentQuiz(quiz);
        setView('EDIT');
    };

    const handleViewResults = (quiz: Quiz) => {
        setSelectedQuiz(quiz);
        setView('RESULTS');
    };

    const handleSaveQuiz = async (quizData: Partial<Quiz>) => {
        if (!quizData.title || !quizData.questions?.length) return;

        // Sanitize questions
        const sanitizedQuestions = quizData.questions.map(q => {
            const cleanQ: any = {
                id: q.id,
                text: q.text,
                type: q.type,
            };
            if (q.options) cleanQ.options = q.options;
            if (q.correctOptionIndex !== undefined) cleanQ.correctOptionIndex = q.correctOptionIndex;
            if (q.criteria) cleanQ.criteria = q.criteria;
            return cleanQ;
        });

        const newQuiz: Quiz = {
            id: quizData.id || `quiz_${Date.now()}`,
            title: quizData.title!,
            description: quizData.description || '',
            questions: sanitizedQuestions as any,
            rewardPoints: quizData.rewardPoints || 0,
            rewardPixi: quizData.rewardPixi || 0,
            costPixi: quizData.costPixi || 0,
            isVisible: quizData.isVisible || false,
            createdAt: quizData.createdAt || new Date().toISOString(),
            type: quizData.type || 'QUIZ',
            frequency: quizData.frequency || 'ONCE',
            unlockWeek: quizData.unlockWeek || 1
        };

        try {
            const gameConfigRef = doc(db, 'config', 'game_state');
            
            if (quizData.id) {
                // Update existing
                const updatedQuizzes = quizzes.map(q => q.id === newQuiz.id ? newQuiz : q);
                await setDoc(gameConfigRef, { quizzes: updatedQuizzes }, { merge: true });
            } else {
                // Create new
                await setDoc(gameConfigRef, {
                    quizzes: arrayUnion(newQuiz)
                }, { merge: true });
            }
            
            setView('LIST');
        } catch (error) {
            console.error("Error saving quiz:", error);
            alert("Erreur lors de la sauvegarde: " + (error as any).message);
        }
    };

    const handleDeleteQuiz = async (quizId: string) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce quiz ?")) return;
        
        try {
            const gameConfigRef = doc(db, 'config', 'game_state');
            const updatedQuizzes = quizzes.filter(q => q.id !== quizId);
            await setDoc(gameConfigRef, { quizzes: updatedQuizzes }, { merge: true });
        } catch (error) {
            console.error("Error deleting quiz:", error);
        }
    };

    if (view === 'RESULTS' && selectedQuiz) {
        return <QuizResults quiz={selectedQuiz} onBack={() => setView('LIST')} />;
    }

    if (view === 'EDIT') {
        return (
            <QuizEditor 
                quiz={currentQuiz} 
                onSave={handleSaveQuiz} 
                onCancel={() => setView('LIST')} 
            />
        );
    }

    return (
        <QuizList 
            quizzes={quizzes} 
            onCreate={handleCreate} 
            onEdit={handleEdit} 
            onDelete={handleDeleteQuiz} 
            onViewResults={handleViewResults}
        />
    );
};


