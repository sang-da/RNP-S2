import React from 'react';
import { Modal } from '../../../components/Modal';
import { Quiz } from '../../../types';
import { HelpCircle, MessageSquare, Award, Coins, ArrowRight, Play, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

interface QuizSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    quizzes: Quiz[];
    onSelectQuiz: (quiz: Quiz) => void;
}

export const QuizSelectionModal: React.FC<QuizSelectionModalProps> = ({ isOpen, onClose, quizzes, onSelectQuiz }) => {
    const { currentUser } = useAuth();
    
    const getProgress = (quizId: string) => {
        if (!currentUser) return 0;
        const key = `quiz_progress_${quizId}_${currentUser.uid}`;
        try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            return data.currentIndex || 0;
        } catch (e) {
            return 0;
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Activités Disponibles">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {quizzes.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <HelpCircle size={48} className="mx-auto mb-4 opacity-20"/>
                        <p>Aucune activité disponible pour le moment.</p>
                    </div>
                ) : (
                    quizzes.map(quiz => {
                        const progress = getProgress(quiz.id);
                        const isStarted = progress > 0;
                        
                        return (
                            <div 
                                key={quiz.id} 
                                className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
                                onClick={() => onSelectQuiz(quiz)}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-3 rounded-lg ${quiz.type === 'SURVEY' ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                            {quiz.type === 'SURVEY' ? <MessageSquare size={24} /> : <HelpCircle size={24} />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{quiz.title}</h4>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                <span className="bg-slate-100 px-2 py-0.5 rounded-full font-bold uppercase text-[10px]">
                                                    {quiz.type === 'SURVEY' ? 'Sondage' : 'Quiz'}
                                                </span>
                                                <span>• {quiz.questions.length} questions</span>
                                            </div>
                                        </div>
                                    </div>
                                    {isStarted && (
                                        <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                                            <Clock size={12} />
                                            En cours ({progress}/{quiz.questions.length})
                                        </div>
                                    )}
                                </div>
                                
                                <p className="text-sm text-slate-600 mb-4 line-clamp-2">{quiz.description}</p>
                                
                                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                    <div className="flex items-center gap-3">
                                        {quiz.rewardPoints > 0 && (
                                            <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                                <Award size={14}/> +{quiz.rewardPoints} pts
                                            </span>
                                        )}
                                        {quiz.rewardPixi > 0 && (
                                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                                <Coins size={14}/> +{quiz.rewardPixi} 
                                            </span>
                                        )}
                                    </div>
                                    
                                    <button className={`p-2 rounded-full transition-colors ${isStarted ? 'bg-amber-100 text-amber-700 group-hover:bg-amber-200' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                        {isStarted ? <Play size={20} fill="currentColor"/> : <ArrowRight size={20}/>}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </Modal>
    );
};
