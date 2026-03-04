import React from 'react';
import { Quiz } from '../../../types';
import { MessageSquare, HelpCircle, Calendar, List, Award, Lock, Edit2, Trash2, Eye } from 'lucide-react';

interface QuizListProps {
    quizzes: Quiz[];
    onEdit: (quiz: Quiz) => void;
    onDelete: (id: string) => void;
    onViewResults: (quiz: Quiz) => void;
    onCreate: () => void;
}

export const QuizList: React.FC<QuizListProps> = ({ quizzes, onEdit, onDelete, onViewResults, onCreate }) => {
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
                {quizzes.map(quiz => (
                    <div key={quiz.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center hover:border-indigo-200 transition-colors">
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
                ))}

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
