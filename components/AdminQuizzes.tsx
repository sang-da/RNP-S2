import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { Quiz, QuizQuestion } from '../types';
import { Plus, Trash2, Save, Edit2, Check, X, HelpCircle, Star, Mic, Type, List, Calendar, Lock, MessageSquare, Award } from 'lucide-react';
import { doc, updateDoc, arrayUnion, runTransaction, db, setDoc } from '../services/firebase';

export const AdminQuizzes: React.FC = () => {
    const { gameConfig } = useGame();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [isEditing, setIsEditing] = useState(false);
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

    const handleSaveQuiz = async () => {
        if (!currentQuiz.title || !currentQuiz.questions?.length) return;

        // Sanitize questions to remove undefined optional fields
        const sanitizedQuestions = currentQuiz.questions.map(q => {
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
            id: currentQuiz.id || `quiz_${Date.now()}`,
            title: currentQuiz.title!,
            description: currentQuiz.description || '',
            questions: sanitizedQuestions as QuizQuestion[],
            rewardPoints: currentQuiz.rewardPoints || 0,
            rewardPixi: currentQuiz.rewardPixi || 0,
            costPixi: currentQuiz.costPixi || 0,
            isVisible: currentQuiz.isVisible || false,
            createdAt: currentQuiz.createdAt || new Date().toISOString(),
            type: currentQuiz.type || 'QUIZ',
            frequency: currentQuiz.frequency || 'ONCE',
            unlockWeek: currentQuiz.unlockWeek || 1
        };

        try {
            const gameConfigRef = doc(db, 'game_config', 'main');
            
            if (currentQuiz.id) {
                // Update existing
                const updatedQuizzes = quizzes.map(q => q.id === newQuiz.id ? newQuiz : q);
                await setDoc(gameConfigRef, { quizzes: updatedQuizzes }, { merge: true });
            } else {
                // Create new
                await setDoc(gameConfigRef, {
                    quizzes: arrayUnion(newQuiz)
                }, { merge: true });
            }
            
            setIsEditing(false);
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
        } catch (error) {
            console.error("Error saving quiz:", error);
            alert("Erreur lors de la sauvegarde: " + (error as any).message);
        }
    };

    const handleDeleteQuiz = async (quizId: string) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce quiz ?")) return;
        
        try {
            const gameConfigRef = doc(db, 'game_config', 'main');
            const updatedQuizzes = quizzes.filter(q => q.id !== quizId);
            await updateDoc(gameConfigRef, { quizzes: updatedQuizzes });
        } catch (error) {
            console.error("Error deleting quiz:", error);
        }
    };

    const addQuestion = () => {
        const newQuestion: QuizQuestion = {
            id: `q_${Date.now()}`,
            text: '',
            type: 'choice',
            options: ['', ''],
            correctOptionIndex: 0
        };
        setCurrentQuiz(prev => ({
            ...prev,
            questions: [...(prev.questions || []), newQuestion]
        }));
    };

    const updateQuestion = (index: number, field: keyof QuizQuestion, value: any) => {
        const updatedQuestions = [...(currentQuiz.questions || [])];
        updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
        setCurrentQuiz(prev => ({ ...prev, questions: updatedQuestions }));
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        const updatedQuestions = [...(currentQuiz.questions || [])];
        const options = [...(updatedQuestions[qIndex].options || [])];
        options[oIndex] = value;
        updatedQuestions[qIndex].options = options;
        setCurrentQuiz(prev => ({ ...prev, questions: updatedQuestions }));
    };

    const addOption = (qIndex: number) => {
        const updatedQuestions = [...(currentQuiz.questions || [])];
        updatedQuestions[qIndex].options = [...(updatedQuestions[qIndex].options || []), ''];
        setCurrentQuiz(prev => ({ ...prev, questions: updatedQuestions }));
    };

    const removeOption = (qIndex: number, oIndex: number) => {
        const updatedQuestions = [...(currentQuiz.questions || [])];
        updatedQuestions[qIndex].options = updatedQuestions[qIndex].options?.filter((_, i) => i !== oIndex);
        setCurrentQuiz(prev => ({ ...prev, questions: updatedQuestions }));
    };

    const removeQuestion = (index: number) => {
        const updatedQuestions = (currentQuiz.questions || []).filter((_, i) => i !== index);
        setCurrentQuiz(prev => ({ ...prev, questions: updatedQuestions }));
    };

    if (isEditing) {
        return (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">
                        {currentQuiz.id ? 'Modifier' : 'Créer'} un {currentQuiz.type === 'SURVEY' ? 'Sondage' : 'Quiz'}
                    </h2>
                    <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-100 rounded-full">
                        <X size={24} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Titre</label>
                            <input
                                type="text"
                                value={currentQuiz.title}
                                onChange={e => setCurrentQuiz(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full p-3 border border-slate-200 rounded-xl"
                                placeholder="Ex: Quiz Culture G ou Feedback S1"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                            <textarea
                                value={currentQuiz.description}
                                onChange={e => setCurrentQuiz(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full p-3 border border-slate-200 rounded-xl h-24 resize-none"
                                placeholder="Instructions pour l'étudiant..."
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Type</label>
                                <select
                                    value={currentQuiz.type}
                                    onChange={e => setCurrentQuiz(prev => ({ ...prev, type: e.target.value as any }))}
                                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50"
                                >
                                    <option value="QUIZ">Quiz (Noté)</option>
                                    <option value="SURVEY">Sondage (Feedback)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Fréquence</label>
                                <select
                                    value={currentQuiz.frequency}
                                    onChange={e => setCurrentQuiz(prev => ({ ...prev, frequency: e.target.value as any }))}
                                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50"
                                >
                                    <option value="ONCE">Une fois</option>
                                    <option value="WEEKLY">Hebdomadaire</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Récompense (Pts)</label>
                                <input
                                    type="number"
                                    value={currentQuiz.rewardPoints}
                                    onChange={e => setCurrentQuiz(prev => ({ ...prev, rewardPoints: parseInt(e.target.value) }))}
                                    className="w-full p-3 border border-slate-200 rounded-xl"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Récompense (PiXi)</label>
                                <input
                                    type="number"
                                    value={currentQuiz.rewardPixi}
                                    onChange={e => setCurrentQuiz(prev => ({ ...prev, rewardPixi: parseInt(e.target.value) }))}
                                    className="w-full p-3 border border-slate-200 rounded-xl"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Débloquer Semaine</label>
                                <input
                                    type="number"
                                    value={currentQuiz.unlockWeek || 1}
                                    onChange={e => setCurrentQuiz(prev => ({ ...prev, unlockWeek: parseInt(e.target.value) }))}
                                    className="w-full p-3 border border-slate-200 rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-4">
                            <input
                                type="checkbox"
                                checked={currentQuiz.isVisible}
                                onChange={e => setCurrentQuiz(prev => ({ ...prev, isVisible: e.target.checked }))}
                                className="w-5 h-5 text-indigo-600 rounded"
                            />
                            <label className="text-sm font-bold text-slate-700">Visible par les étudiants</label>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                        <h3 className="text-lg font-bold text-slate-800">Questions ({currentQuiz.questions?.length})</h3>
                        <button
                            onClick={addQuestion}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold hover:bg-indigo-100"
                        >
                            <Plus size={18} /> Ajouter une question
                        </button>
                    </div>

                    {currentQuiz.questions?.map((q, qIdx) => (
                        <div key={q.id} className="bg-slate-50 p-6 rounded-xl border border-slate-200 relative group">
                            <button
                                onClick={() => removeQuestion(qIdx)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={20} />
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                <div className="md:col-span-3">
                                    <input
                                        type="text"
                                        value={q.text}
                                        onChange={e => updateQuestion(qIdx, 'text', e.target.value)}
                                        className="w-full p-3 border border-slate-200 rounded-lg font-medium"
                                        placeholder="Intitulé de la question..."
                                    />
                                </div>
                                <div>
                                    <select
                                        value={q.type}
                                        onChange={e => updateQuestion(qIdx, 'type', e.target.value)}
                                        className="w-full p-3 border border-slate-200 rounded-lg bg-white"
                                    >
                                        <option value="choice">Choix Multiple</option>
                                        <option value="text">Texte / Audio</option>
                                        <option value="rating">Notation / Évaluation</option>
                                    </select>
                                </div>
                            </div>

                            {q.type === 'choice' && (
                                <div className="space-y-2 pl-4 border-l-2 border-indigo-100">
                                    {q.options?.map((opt, oIdx) => (
                                        <div key={oIdx} className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name={`correct_${q.id}`}
                                                checked={q.correctOptionIndex === oIdx}
                                                onChange={() => updateQuestion(qIdx, 'correctOptionIndex', oIdx)}
                                                className="w-4 h-4 text-indigo-600"
                                                disabled={currentQuiz.type === 'SURVEY'} // Pas de bonne réponse en mode sondage
                                            />
                                            <input
                                                type="text"
                                                value={opt}
                                                onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                                                className="flex-1 p-2 border border-slate-200 rounded bg-white text-sm"
                                                placeholder={`Option ${oIdx + 1}`}
                                            />
                                            <button onClick={() => removeOption(qIdx, oIdx)} className="text-slate-400 hover:text-red-500">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => addOption(qIdx)}
                                        className="text-xs font-bold text-indigo-500 hover:text-indigo-700 mt-2"
                                    >
                                        + Ajouter une option
                                    </button>
                                </div>
                            )}

                            {q.type === 'text' && (
                                <div className="flex items-center gap-2 text-slate-400 text-sm pl-4 border-l-2 border-slate-200">
                                    <div className="flex items-center gap-4">
                                        <span className="flex items-center gap-1"><Type size={16} /> Réponse Texte</span>
                                        <span className="flex items-center gap-1 text-indigo-500"><Mic size={16} /> Audio Activé</span>
                                    </div>
                                </div>
                            )}

                            {q.type === 'rating' && (
                                <div className="space-y-3 pl-4 border-l-2 border-amber-200">
                                    <div className="flex items-center gap-2 text-amber-600 text-sm font-bold">
                                        <Star size={16} fill="currentColor" /> Critères d'évaluation (Optionnel)
                                    </div>
                                    <p className="text-xs text-slate-500">Si vide, une seule note globale (1-5) sera demandée. Sinon, une note par critère.</p>
                                    
                                    {q.criteria?.map((crit, cIdx) => (
                                        <div key={cIdx} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={crit}
                                                onChange={e => {
                                                    const updatedQuestions = [...(currentQuiz.questions || [])];
                                                    const criteria = [...(updatedQuestions[qIdx].criteria || [])];
                                                    criteria[cIdx] = e.target.value;
                                                    updatedQuestions[qIdx].criteria = criteria;
                                                    setCurrentQuiz(prev => ({ ...prev, questions: updatedQuestions }));
                                                }}
                                                className="flex-1 p-2 border border-slate-200 rounded bg-white text-sm"
                                                placeholder={`Critère ${cIdx + 1} (ex: Stress, Cohésion...)`}
                                            />
                                            <button 
                                                onClick={() => {
                                                    const updatedQuestions = [...(currentQuiz.questions || [])];
                                                    updatedQuestions[qIdx].criteria = updatedQuestions[qIdx].criteria?.filter((_, i) => i !== cIdx);
                                                    setCurrentQuiz(prev => ({ ...prev, questions: updatedQuestions }));
                                                }} 
                                                className="text-slate-400 hover:text-red-500"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => {
                                            const updatedQuestions = [...(currentQuiz.questions || [])];
                                            updatedQuestions[qIdx].criteria = [...(updatedQuestions[qIdx].criteria || []), ''];
                                            setCurrentQuiz(prev => ({ ...prev, questions: updatedQuestions }));
                                        }}
                                        className="text-xs font-bold text-amber-600 hover:text-amber-700 mt-2 flex items-center gap-1"
                                    >
                                        <Plus size={12}/> Ajouter un critère
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-100">
                    <button
                        onClick={() => setIsEditing(false)}
                        className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSaveQuiz}
                        className="px-6 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2"
                    >
                        <Save size={20} /> Enregistrer le {currentQuiz.type === 'SURVEY' ? 'Sondage' : 'Quiz'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Gestion des Quiz & Sondages</h2>
                    <p className="text-slate-500">Créez des évaluations ou récoltez du feedback.</p>
                </div>
                <button
                    onClick={() => {
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
                        setIsEditing(true);
                    }}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2"
                >
                    <Plus size={20} /> Nouveau
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
                                onClick={() => {
                                    setCurrentQuiz(quiz);
                                    setIsEditing(true);
                                }}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                                <Edit2 size={20} />
                            </button>
                            <button
                                onClick={() => handleDeleteQuiz(quiz.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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


