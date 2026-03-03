import React, { useState } from 'react';
import { useGame } from '../contexts/GameContext';
import { Quiz, QuizQuestion } from '../types';
import { Plus, Trash2, Save, Eye, EyeOff, HelpCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from './Modal';

interface QuizEditorProps {
    initialQuiz: Quiz | null;
    onSave: (quiz: Quiz) => void;
    onClose: () => void;
}

const QuizEditor: React.FC<QuizEditorProps> = ({ initialQuiz, onSave, onClose }) => {
    const [title, setTitle] = useState(initialQuiz?.title || "");
    const [description, setDescription] = useState(initialQuiz?.description || "");
    const [rewardPixi, setRewardPixi] = useState(initialQuiz?.rewardPixi || 100);
    const [rewardPoints, setRewardPoints] = useState(initialQuiz?.rewardPoints || 5);
    const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuiz?.questions || []);

    const handleAddQuestion = () => {
        setQuestions([...questions, {
            id: `q-${Date.now()}`,
            text: "",
            options: ["", "", "", ""],
            correctOptionIndex: 0
        }]);
    };

    const updateQuestion = (index: number, field: keyof QuizQuestion, value: any) => {
        const newQuestions = [...questions];
        // @ts-ignore
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...questions];
        const newOptions = [...newQuestions[qIndex].options];
        newOptions[oIndex] = value;
        newQuestions[qIndex] = { ...newQuestions[qIndex], options: newOptions };
        setQuestions(newQuestions);
    };

    const handleSave = () => {
        if (!title || questions.length === 0) return alert("Titre et au moins une question requis.");
        
        const quiz: Quiz = {
            id: initialQuiz?.id || `quiz-${Date.now()}`,
            title,
            description,
            rewardPixi,
            rewardPoints,
            costPixi: 0,
            isVisible: initialQuiz?.isVisible || false,
            createdAt: initialQuiz?.createdAt || new Date().toISOString(),
            questions
        };
        onSave(quiz);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={initialQuiz ? "Modifier Quiz" : "Nouveau Quiz"}>
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-full">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Titre</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl font-bold" placeholder="Ex: Culture Générale Design" />
                    </div>
                    <div className="col-span-full">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-sm" placeholder="Courte description..." />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Récompense PiXi</label>
                        <input type="number" value={rewardPixi} onChange={e => setRewardPixi(Number(e.target.value))} className="w-full p-3 border border-slate-200 rounded-xl font-bold" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Récompense Score</label>
                        <input type="number" value={rewardPoints} onChange={e => setRewardPoints(Number(e.target.value))} className="w-full p-3 border border-slate-200 rounded-xl font-bold" />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h4 className="font-bold text-slate-900">Questions ({questions.length})</h4>
                        <button onClick={handleAddQuestion} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg hover:bg-indigo-100">+ Ajouter</button>
                    </div>

                    {questions.map((q, qIdx) => (
                        <div key={q.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative group">
                            <button 
                                onClick={() => setQuestions(questions.filter((_, i) => i !== qIdx))}
                                className="absolute top-2 right-2 text-slate-300 hover:text-red-500"
                            >
                                <Trash2 size={16}/>
                            </button>
                            
                            <div className="mb-3">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Question {qIdx + 1}</label>
                                <input 
                                    type="text" 
                                    value={q.text} 
                                    onChange={e => updateQuestion(qIdx, 'text', e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm font-medium"
                                    placeholder="Intitulé de la question..."
                                />
                            </div>

                            <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                                {q.options.map((opt, oIdx) => (
                                    <div key={oIdx} className="flex items-center gap-2">
                                        <input 
                                            type="radio" 
                                            name={`correct-${q.id}`}
                                            checked={q.correctOptionIndex === oIdx}
                                            onChange={() => updateQuestion(qIdx, 'correctOptionIndex', oIdx)}
                                            className="accent-emerald-500"
                                        />
                                        <input 
                                            type="text" 
                                            value={opt} 
                                            onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                                            className="flex-1 p-2 border border-slate-200 rounded-lg text-xs"
                                            placeholder={`Option ${oIdx + 1}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <button onClick={handleSave} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                    <Save size={18}/> Enregistrer le Quiz
                </button>
            </div>
        </Modal>
    );
};

export const AdminQuizzes: React.FC = () => {
    const { gameConfig, updateGameConfig } = useGame();
    const [isCreating, setIsCreating] = useState(false);
    const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

    const handleSaveQuiz = async (quiz: Quiz) => {
        const currentQuizzes = gameConfig.quizzes || [];
        let newQuizzes;
        
        if (currentQuizzes.find(q => q.id === quiz.id)) {
            newQuizzes = currentQuizzes.map(q => q.id === quiz.id ? quiz : q);
        } else {
            newQuizzes = [...currentQuizzes, quiz];
        }

        await updateGameConfig({ quizzes: newQuizzes });
        setIsCreating(false);
        setEditingQuiz(null);
    };

    const handleDeleteQuiz = async (id: string) => {
        if (!confirm("Supprimer ce quiz ?")) return;
        const newQuizzes = (gameConfig.quizzes || []).filter(q => q.id !== id);
        await updateGameConfig({ quizzes: newQuizzes });
    };

    const toggleVisibility = async (quiz: Quiz) => {
        const newQuizzes = (gameConfig.quizzes || []).map(q => 
            q.id === quiz.id ? { ...q, isVisible: !q.isVisible } : q
        );
        await updateGameConfig({ quizzes: newQuizzes });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <HelpCircle className="text-indigo-600"/> Gestion des Quiz
                    </h2>
                    <p className="text-slate-500">Créez des questionnaires rémunérés pour les étudiants.</p>
                </div>
                <button 
                    onClick={() => setIsCreating(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg hover:shadow-indigo-500/25"
                >
                    <Plus size={18}/> Nouveau Quiz
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(gameConfig.quizzes || []).map(quiz => (
                    <div key={quiz.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${quiz.isVisible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                {quiz.isVisible ? 'Publié' : 'Brouillon'}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => toggleVisibility(quiz)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600" title={quiz.isVisible ? "Masquer" : "Publier"}>
                                    {quiz.isVisible ? <EyeOff size={16}/> : <Eye size={16}/>}
                                </button>
                                <button onClick={() => setEditingQuiz(quiz)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600" title="Éditer">
                                    <CheckCircle2 size={16}/>
                                </button>
                                <button onClick={() => handleDeleteQuiz(quiz.id)} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600" title="Supprimer">
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        </div>

                        <h3 className="font-bold text-lg text-slate-900 mb-2">{quiz.title}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2 mb-4">{quiz.description || "Pas de description"}</p>

                        <div className="flex items-center gap-4 text-xs font-bold text-slate-400 border-t border-slate-100 pt-4">
                            <span className="flex items-center gap-1"><HelpCircle size={14}/> {quiz.questions.length} Q</span>
                            <span className="flex items-center gap-1 text-emerald-600"><div className="w-2 h-2 bg-emerald-500 rounded-full"/> +{quiz.rewardPixi} PiXi</span>
                            <span className="flex items-center gap-1 text-indigo-600"><div className="w-2 h-2 bg-indigo-500 rounded-full"/> +{quiz.rewardPoints} Pts</span>
                        </div>
                    </div>
                ))}

                {(gameConfig.quizzes || []).length === 0 && (
                    <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                        <HelpCircle size={48} className="mx-auto mb-4 opacity-20"/>
                        <p>Aucun quiz configuré.</p>
                    </div>
                )}
            </div>

            {(isCreating || editingQuiz) && (
                <QuizEditor 
                    initialQuiz={editingQuiz} 
                    onSave={handleSaveQuiz} 
                    onClose={() => { setIsCreating(false); setEditingQuiz(null); }} 
                />
            )}
        </div>
    );
};
