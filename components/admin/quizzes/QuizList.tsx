import React from 'react';
import { Quiz, QuizAttempt } from '../../../types';
import { MessageSquare, HelpCircle, Calendar, List, Award, Lock, Edit2, Trash2, Eye, Users, BarChart2 } from 'lucide-react';
import { useGame } from '../../../contexts/GameContext';

interface QuizListProps {
    quizzes: Quiz[];
    attempts: {[quizId: string]: QuizAttempt[]};
    onEdit: (quiz: Quiz) => void;
    onDelete: (id: string) => void;
    onViewResults: (quiz: Quiz) => void;
    onCreate: () => void;
}

export const QuizList: React.FC<QuizListProps> = ({ quizzes, attempts, onEdit, onDelete, onViewResults, onCreate }) => {
    const { agencies } = useGame();

    // Helper to get student name
    const getStudentName = (studentId: string) => {
        for (const agency of agencies) {
            const member = agency.members.find(m => m.id === studentId);
            if (member) return member.name;
        }
        return 'Inconnu';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Gestion des Quiz & Sondages</h2>
                    <p className="text-slate-500">Créez des évaluations ou récoltez du feedback.</p>
                </div>
                <button
                    onClick={onCreate}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2"
                >
                    <span className="text-xl">+</span> Nouveau
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {quizzes.map(quiz => {
                    const quizAttempts = attempts[quiz.id] || [];
                    const responseCount = quizAttempts.length;
                    const avgScore = quizAttempts.length > 0 
                        ? (quizAttempts.reduce((acc, curr) => acc + curr.score, 0) / quizAttempts.length).toFixed(1)
                        : '-';

                    return (
                        <div key={quiz.id} className="group relative bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-all hover:shadow-md">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-lg ${quiz.type === 'SURVEY' ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                        {quiz.type === 'SURVEY' ? <MessageSquare size={24} /> : <HelpCircle size={24} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-lg text-slate-900">{quiz.title}</h3>
                                            {!quiz.isVisible && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase rounded-full">Caché</span>
                                            )}
                                            {quiz.frequency === 'WEEKLY' && (
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-bold uppercase rounded-full flex items-center gap-1">
                                                    <Calendar size={10} /> Hebdo
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500 mb-1">{quiz.description}</p>
                                        <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                                            <span className="flex items-center gap-1"><List size={14}/> {quiz.questions.length} questions</span>
                                            <span className="flex items-center gap-1"><Award size={14}/> {quiz.rewardPoints} pts</span>
                                            <span className="flex items-center gap-1"><Lock size={14}/> Semaine {quiz.unlockWeek || 1}+</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    {/* Stats Badge - Hoverable */}
                                    <div className="relative group/stats cursor-help">
                                        <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 group-hover/stats:border-indigo-200 group-hover/stats:bg-indigo-50 transition-colors">
                                            <div className="flex items-center gap-1.5 text-slate-600 group-hover/stats:text-indigo-600">
                                                <Users size={16} />
                                                <span className="font-bold">{responseCount}</span>
                                            </div>
                                            {quiz.type === 'QUIZ' && (
                                                <>
                                                    <div className="w-px h-4 bg-slate-200 group-hover/stats:bg-indigo-200"></div>
                                                    <div className="flex items-center gap-1.5 text-slate-600 group-hover/stats:text-indigo-600">
                                                        <BarChart2 size={16} />
                                                        <span className="font-bold">{avgScore}/{quiz.questions.length}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Hover Tooltip */}
                                        <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-900 text-white text-xs rounded-lg py-2 px-3 opacity-0 invisible group-hover/stats:opacity-100 group-hover/stats:visible transition-all z-10 shadow-xl pointer-events-none">
                                            <div className="font-bold mb-2 border-b border-slate-700 pb-1">Dernières réponses :</div>
                                            {quizAttempts.length > 0 ? (
                                                <ul className="space-y-1">
                                                    {quizAttempts.slice(0, 5).map(attempt => (
                                                        <li key={attempt.id} className="flex justify-between items-center">
                                                            <span className="truncate max-w-[120px]">{getStudentName(attempt.studentId)}</span>
                                                            <span className={`font-mono ${attempt.score >= attempt.maxScore / 2 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                {attempt.score}/{attempt.maxScore}
                                                            </span>
                                                        </li>
                                                    ))}
                                                    {quizAttempts.length > 5 && (
                                                        <li className="text-slate-400 pt-1 italic text-center">
                                                            + {quizAttempts.length - 5} autres...
                                                        </li>
                                                    )}
                                                </ul>
                                            ) : (
                                                <p className="text-slate-400 italic">Aucune réponse pour le moment.</p>
                                            )}
                                            {/* Arrow */}
                                            <div className="absolute top-full right-6 -mt-1 border-4 border-transparent border-t-slate-900"></div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => onViewResults(quiz)}
                                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                            title="Voir les résultats"
                                        >
                                            <Eye size={20} />
                                        </button>
                                        <button
                                            onClick={() => onEdit(quiz)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Modifier"
                                        >
                                            <Edit2 size={20} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(quiz.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Supprimer"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {quizzes.length === 0 && (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <HelpCircle size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500 font-medium">Aucun quiz ou sondage créé.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
