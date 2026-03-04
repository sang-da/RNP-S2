import React, { useState, useEffect } from 'react';
import { Quiz, QuizAttempt, Student } from '../../../types';
import { ArrowLeft, User, Calendar, Star, Mic, MessageSquare, Download } from 'lucide-react';
import { collection, query, where, getDocs, db } from '../../../services/firebase';
import { useGame } from '../../../contexts/GameContext';

interface QuizResultsProps {
    quiz: Quiz;
    onBack: () => void;
}

export const QuizResults: React.FC<QuizResultsProps> = ({ quiz, onBack }) => {
    const { agencies } = useGame();
    const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<{[key: string]: Student}>({});

    useEffect(() => {
        const fetchResults = async () => {
            setLoading(true);
            try {
                // 1. Fetch Attempts
                const q = query(collection(db, "quiz_attempts"), where("quizId", "==", quiz.id));
                const snapshot = await getDocs(q);
                const fetchedAttempts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizAttempt));
                
                // Sort by date desc
                fetchedAttempts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setAttempts(fetchedAttempts);

                // 2. Map Students
                const studentMap: {[key: string]: Student} = {};
                agencies.forEach(agency => {
                    agency.members.forEach(member => {
                        studentMap[member.id] = member;
                    });
                });
                setStudents(studentMap);

            } catch (error) {
                console.error("Error fetching quiz results:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [quiz.id, agencies]);

    const getStudentName = (id: string) => students[id]?.name || "Étudiant inconnu";
    const getStudentAvatar = (id: string) => students[id]?.avatarUrl || null;

    if (loading) {
        return <div className="p-12 text-center text-slate-500">Chargement des résultats...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft size={24} className="text-slate-500" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Résultats : {quiz.title}</h2>
                        <p className="text-slate-500">{attempts.length} participation(s)</p>
                    </div>
                </div>
                <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-200 flex items-center gap-2">
                    <Download size={16}/> Exporter CSV
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {attempts.map(attempt => (
                    <div key={attempt.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4 border-b border-slate-50 pb-4">
                            <div className="flex items-center gap-3">
                                {getStudentAvatar(attempt.studentId) ? (
                                    <img src={getStudentAvatar(attempt.studentId)!} alt="" className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                        <User size={20} />
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-bold text-slate-900">{getStudentName(attempt.studentId)}</h4>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <Calendar size={12} />
                                        {new Date(attempt.date).toLocaleDateString()} à {new Date(attempt.date).toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-black text-indigo-600">
                                    {attempt.score} <span className="text-sm text-slate-400 font-bold">/ {attempt.maxScore}</span>
                                </div>
                                <div className="text-xs font-bold text-emerald-500">
                                    +{attempt.rewardsEarned.points} pts / +{attempt.rewardsEarned.pixi} PiXi
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {quiz.questions.map((q, idx) => {
                                const answer = attempt.answers?.[q.id];
                                const audioUrl = attempt.audioUrls?.[q.id];

                                return (
                                    <div key={q.id} className="bg-slate-50 p-4 rounded-lg">
                                        <p className="text-sm font-bold text-slate-700 mb-2">
                                            <span className="text-indigo-500 mr-2">Q{idx + 1}.</span>
                                            {q.text}
                                        </p>
                                        
                                        <div className="pl-6">
                                            {q.type === 'choice' && (
                                                <div className="text-sm">
                                                    <span className={`font-medium ${
                                                        q.correctOptionIndex !== undefined && answer === q.correctOptionIndex 
                                                        ? 'text-emerald-600' 
                                                        : q.correctOptionIndex !== undefined ? 'text-red-500' : 'text-slate-600'
                                                    }`}>
                                                        {q.options?.[answer as number] || "Non répondu"}
                                                    </span>
                                                </div>
                                            )}

                                            {(q.type === 'text' || q.type === 'audio') && (
                                                <div className="space-y-2">
                                                    {answer && (
                                                        <p className="text-sm text-slate-600 italic bg-white p-3 rounded border border-slate-200">
                                                            "{answer}"
                                                        </p>
                                                    )}
                                                    {audioUrl && (
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <audio controls src={audioUrl} className="h-8 w-full max-w-xs" />
                                                            <span className="text-xs font-bold text-indigo-500 flex items-center gap-1">
                                                                <Mic size={12}/> Audio
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {q.type === 'rating' && (
                                                <div className="text-sm text-slate-600">
                                                    {typeof answer === 'object' ? (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {Object.entries(answer).map(([crit, val]: any) => (
                                                                <div key={crit} className="flex justify-between bg-white p-2 rounded border border-slate-100">
                                                                    <span>{crit}</span>
                                                                    <span className="font-bold text-indigo-600">{val}/5</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1 text-amber-500 font-bold">
                                                            {answer}/5 <Star size={14} fill="currentColor"/>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {attempts.length === 0 && (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <MessageSquare size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500 font-medium">Aucune réponse pour le moment.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
