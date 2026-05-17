
import React, { useState } from 'react';
import { Student, Agency, Deliverable, PeerReview, QuizAttempt } from '../../../types';
import { User, Wallet, TrendingUp, Trophy, Activity, Star, BarChart2, FileText, Crown, Building2, Settings, ArrowRight, History, StickyNote, Lock, Globe, FileCog, MessageSquare, Play, Mic, Square, Eye, EyeOff, Bot, RefreshCw, Cloud } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';
import { StudentEditModal } from './StudentEditModal';
import { askGroq } from '../../../services/groqService';
import { useGame } from '../../../contexts/GameContext';
import { ReviewDataviz } from '../peer-reviews/ReviewDataviz';
import { S1_AVERAGES } from '../../../config/awards';
import Markdown from 'react-markdown';

interface StudentProfileProps {
    student: Student;
    agency: Agency;
    allAgencies: Agency[];
    timeline: any[];
    behaviorStats: any;
    portfolio: any[];
    chartData: any[];
    gradeDistribution: any[];
    quizAttempts?: QuizAttempt[];
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ student, agency, allAgencies, timeline, behaviorStats, portfolio, chartData, gradeDistribution, quizAttempts = [] }) => {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [playingAudio, setPlayingAudio] = useState<string | null>(null);
    const [expandedQuizzes, setExpandedQuizzes] = useState<Record<string, boolean>>({});
    const [showPrintModal, setShowPrintModal] = useState(false);
    
    // AI Profiler State
    const [aiProfile, setAiProfile] = useState<any | null>(null);
    const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);

    const { reviews: globalReviews } = useGame();

    React.useEffect(() => {
        if (showPrintModal) {
            const originalTitle = document.title;
            document.title = `RNP Studio - Fiche ${student.name.replace(/\s+/g, '_')}`;
            return () => {
                document.title = originalTitle;
            };
        }
    }, [showPrintModal, student.name]);

    const enrichedReviewsForDataviz = React.useMemo(() => {
        return globalReviews.map(review => {
            const ag = allAgencies.find(a => a.id === review.agencyId);
            const target = allAgencies.flatMap(a => a.members).find(m => m.id === review.targetId);
            return {
                ...review,
                agencyName: ag ? ag.name : 'Unknown Agency',
                classId: target ? target.classId : 'Unknown'
            };
        });
    }, [globalReviews, allAgencies]);

    const toggleQuiz = (id: string) => {
        setExpandedQuizzes(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const displayHistory = (student.history && student.history.length > 0) ? [...student.history].sort((a,b) => b.date.localeCompare(a.date)) : [];

    const handlePlayAudio = (url: string) => {
        if (playingAudio === url) {
            setPlayingAudio(null);
        } else {
            setPlayingAudio(url);
            const audio = new Audio(url);
            audio.play();
            audio.onended = () => setPlayingAudio(null);
        }
    };

    const { mvpCount, mainDeliverables, mvpRatio } = React.useMemo(() => {
        const mvpCount = portfolio.filter(p => p.isMvp).length;
        const mainDeliverables = portfolio.filter(p => !p.isSpecial).length;
        const mvpRatio = mainDeliverables > 0 ? Math.round((mvpCount / mainDeliverables) * 100) : 0;
        return { mvpCount, mainDeliverables, mvpRatio };
    }, [portfolio]);

    const handleGenerateProfile = async () => {
        setIsGeneratingProfile(true);
        
        const agenciesKnown = new Set([student.classId, ...(student.history || []).map(h => h.agencyName)]).size;
        const resignations = (student.history || []).filter(h => h.action === 'RESIGNED' || h.action === 'LEFT').length;

        const totalWeeksActive = timeline.length;
        const weeksEvaluatedByPeers = timeline.filter(t => t.reviewsReceived && t.reviewsReceived.length > 0).length;
        const weeksEvaluatedOthers = timeline.filter(t => t.reviewsGiven && t.reviewsGiven.length > 0).length;

        const prompt = `Analyse le profil exhaustif de l'étudiant ${student.name}.
        
        DONNÉES DE L'ÉTUDIANT:
        - Rôle: ${student.role}
        - Score Initial (Moy. S1): ${S1_AVERAGES[student.name] ? S1_AVERAGES[student.name] + '/20' : 'N/A'}
        - Score Actuel: ${student.individualScore}/100
        - Portefeuille: ${student.wallet} PiXi
        - Épargne: ${student.savings || 0} PiXi
        - Prêt/Dette: ${student.loanDebt || 0} PiXi
        - Karma: ${student.karma ?? 50}
        - Agence actuelle: ${agency.name}
        
        STATISTIQUES CALCULÉES PRE-ANALYSE:
        - Agences connues: ${agenciesKnown}
        - Démissions/Départs: ${resignations}
        - Taux de livraison en tant que MVP: ${mvpCount} fois sur ${mainDeliverables} livrables agence éligibles (${mvpRatio}%)
        - Présence aux évaluations par les pairs: Évalué sur ${weeksEvaluatedByPeers} des ${totalWeeksActive} semaines. A évalué les autres sur ${weeksEvaluatedOthers} des ${totalWeeksActive} semaines.
        
        RÉSULTATS DE QUIZ (Théorie & Sondages):
        ${JSON.stringify(quizAttempts.map(q => ({ quizId: q.quizId, score: q.score, transcriptions: q.transcriptions, answers: q.answers })))}
        
        HISTORIQUE DES AGENCES:
        ${JSON.stringify(student.history || [])}
        
        PORTFOLIO (Livrables réalisés):
        Tu ne dois évaluer l'étudiant QUE sur les livrables où il a été déclaré MVP (directement responsable). Ne le pénalise pas pour les livrables de l'agence où il n'a pas contribué directement.
        ${JSON.stringify(portfolio.filter(p => p.isMvp || p.isSpecial).map(p => ({ week: p.week, name: p.name, score: p.score, isMVP: p.isMvp, comments: p.comments, agency: p.agency })))}
        
        ÉVALUATIONS REÇUES (Peer Reviews):
        - Moyenne reçue globale: ${behaviorStats.avgReceived.toFixed(1)}/5
        ${JSON.stringify(timeline.flatMap(t => t.reviewsReceived || []).map(r => ({ week: r.weekId, score: ((r.ratings.quality || 0) + (r.ratings.attendance || 0) + (r.ratings.involvement || 0)) / 3, comment: r.comment })))}
        
        ÉVALUATIONS DONNÉES (Comment il note les autres):
        ${JSON.stringify(timeline.flatMap(t => t.reviewsGiven || []).map(r => ({ week: r.weekId, score: ((r.ratings.quality || 0) + (r.ratings.attendance || 0) + (r.ratings.involvement || 0)) / 3, comment: r.comment })))}
        
        NOTES PÉDAGOGIQUES:
        ${JSON.stringify(student.notes || [])}
        
        Génère un profil psychologique et professionnel complet.
        
        === INSTRUCTIONS POUR LE RÉSUMÉ DU CONSEIL DE CLASSE ===
        Tu dois générer un "class_council_summary" écrit en Markdown riche. Il doit obligatoirement inclure :
        - Un titre/statut percutant qui résume l'analyse comportementale (ex: "👑 Leader naturel mais financierement excessif")
        - Avis des pairs sur l'étudiant : Intègre les stats (${weeksEvaluatedByPeers}/${totalWeeksActive} semaines), résume l'opinion générale et inclus une courte citation (verbatim fort) extraite des avis.
        - Avis de l'étudiant sur ses pairs : Intègre les stats (${weeksEvaluatedOthers}/${totalWeeksActive} semaines), résume son style d'évaluation (sévère, constructif) et inclus un verbatim typique.
        - Factuel : Participation (dépôts en MVP : ${mvpCount}/${mainDeliverables} -> ${mvpRatio}%), démissions (${resignations}), parcours agences.
        - Tendances financières: Analyse de son Portefeuille/Épargne/Dette donnés ci-dessus (économe, panier percé, fourmi...).
        - Contributions & Savoir : N'utilise pas les notes (ex: 4/4), base-toi SURTOUT sur ses réponses (transcriptions/answers) aux questionnaires fournies ci-dessus (s'il y en a) pour extraire des verbatims marquants ou statuer sur son niveau de recul.
        - Points brillants de production : Dans quel type de livrables a-t-il excellé ? (regarde son portfolio)
        - Recommandations : Clair, actionnable pour l'équipe pédagogique.
        
        ATTENTION : TU DOIS RETOURNER UN OBJET JSON VALIDE (réponse JSON pure). N'échappe pas les apostrophes (\').
        Utilise \\n (backslash n) pour représenter un vrai saut de ligne dans le texte de la synthèse (Markdown). N'utilise JAMAIS de vrais sauts de ligne dans les strings pour ne pas casser le JSON_PARSE.
        
        Tu dois retourner UNIQUEMENT un JSON STRICT avec cette structure exacte (SANS AUCUN BLOC MARKDOWN \`\`\`json) :
        {"psychological_profile":"...", "soft_skills":{"leadership":0,"teamwork":0,"reliability":0,"creativity":0}, "strengths":["..."], "weaknesses":["..."], "verdict":"...", "recommendation":"...", "class_council_summary":"..."}
        `;

        try {
            const systemPrompt = "Tu es un profiler RH expert et un analyste pédagogique. Tu dois impérativement retourner un objet JSON avec le format correspondant. Produis ton analyse de manière percutante, dans un JSON valide. N'échappe pas les apostrophes inutilement.";
            const result = await askGroq(prompt, {}, systemPrompt, [], "llama-3.3-70b-versatile", true); // JSON MODE Enabled
            
            // Just in case it wrapped with markdown anyway despite JSON mode:
            let rawStr = result.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
            // Remove any bad escapes like \' that break JSON.parse
            rawStr = rawStr.replace(/(?:\\')/g, "'");

            const parsedProfile = JSON.parse(rawStr);

            // Algorithmic Soft Skills calculation (40% algo, 60% IA)
            const gradesCount = gradeDistribution ? gradeDistribution.reduce((acc: any, g: any) => ({ ...acc, [g.name]: g.value }), {}) : {};
            const algoSoftSkills = {
                leadership: Math.min(100, Math.round(((mvpCount / (totalWeeksActive || 1)) * 100 * 2) || 0)), 
                teamwork: Math.min(100, Math.round((behaviorStats?.avgReceived / 5) * 100) || 50),
                reliability: Math.min(100, Math.round((behaviorStats?.avgReceived / 5) * 100) || 50),
                creativity: Math.min(100, Math.round(((gradesCount?.A || 0) / (mainDeliverables || 1)) * 100 * 1.5))
            };
            
            if (parsedProfile.soft_skills) {
                parsedProfile.soft_skills.leadership = Math.round((algoSoftSkills.leadership * 0.4) + (Number(parsedProfile.soft_skills.leadership || 0) * 0.6));
                parsedProfile.soft_skills.teamwork = Math.round((algoSoftSkills.teamwork * 0.4) + (Number(parsedProfile.soft_skills.teamwork || 0) * 0.6));
                parsedProfile.soft_skills.reliability = Math.round((algoSoftSkills.reliability * 0.4) + (Number(parsedProfile.soft_skills.reliability || 0) * 0.6));
                parsedProfile.soft_skills.creativity = Math.round((algoSoftSkills.creativity * 0.4) + (Number(parsedProfile.soft_skills.creativity || 0) * 0.6));
            }

            setAiProfile(parsedProfile);
        } catch (error) {
            console.error("Erreur IA Profiler:", error);
            alert("Erreur lors de la génération du profil IA.");
        } finally {
            setIsGeneratingProfile(false);
        }
    };

    const handlePrintCouncil = () => {
        setShowPrintModal(true);
    };

    return (
        <>
        <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500 print:hidden">
            {/* ID CARD */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8 items-center md:items-start relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500"></div>
                
                <div className="flex flex-col items-center">
                    <img src={student.avatarUrl} className="w-24 h-24 rounded-full border-4 border-slate-100 shadow-md bg-slate-50" />
                    <div className="mt-2 text-center">
                        <h3 className="text-2xl font-bold text-slate-900">{student.name}</h3>
                        <div className="flex items-center justify-center gap-2 mt-1">
                            <span className="inline-block bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-500">{student.role}</span>
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                                student.classId === 'A' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-purple-50 text-purple-600 border-purple-200'
                            }`}>
                                CLASSE {student.classId}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 w-full">
                    <div className="flex justify-end mb-4 gap-2 print:hidden">
                        {aiProfile && (
                            <button 
                                onClick={handlePrintCouncil}
                                className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                Imprimer Fiche Conseil
                            </button>
                        )}
                        <button 
                            onClick={handleGenerateProfile}
                            disabled={isGeneratingProfile}
                            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isGeneratingProfile ? <RefreshCw size={16} className="animate-spin"/> : <Bot size={16}/>}
                            {isGeneratingProfile ? "Analyse en cours..." : "Générer Profil IA"}
                        </button>
                        <button 
                            onClick={() => setIsEditModalOpen(true)}
                            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95"
                        >
                            <FileCog size={16}/> Gérer le Dossier
                        </button>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatBox icon={<TrendingUp/>} label="Score Actuel" value={student.individualScore} sub="/100" color="bg-indigo-50 text-indigo-600"/>
                        <StatBox icon={<Wallet/>} label="Fortune Perso" value={student.wallet} sub="PiXi" color="bg-emerald-50 text-emerald-600"/>
                        <StatBox icon={<Building2/>} label="Agence Actuelle" value={agency.name} sub="" color="bg-blue-50 text-blue-600"/>
                        <StatBox icon={<Star/>} label="Moy. Reçue" value={behaviorStats.avgReceived.toFixed(1)} sub="/5.0" color="bg-yellow-50 text-yellow-600"/>
                    </div>
                </div>
            </div>

            {/* AI PROFILER RESULT */}
            {aiProfile && (
                <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden animate-in fade-in zoom-in duration-500">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><Bot size={120}/></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm"><Bot size={24} className="text-indigo-300"/></div>
                            <div>
                                <h4 className="text-xl font-bold text-white">Profil IA Exhaustif</h4>
                                <p className="text-indigo-200 text-sm">Analyse basée sur les livrables, évaluations et historique</p>
                            </div>
                            <div className="ml-auto px-4 py-2 bg-white/10 rounded-full border border-white/20 font-black tracking-widest uppercase text-sm">
                                {aiProfile.verdict}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-6">
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                    <h5 className="text-xs font-bold text-indigo-300 uppercase mb-2">Analyse Psychologique</h5>
                                    <p className="text-sm leading-relaxed text-slate-200">{aiProfile.psychological_profile}</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                        <h5 className="text-xs font-bold text-emerald-400 uppercase mb-3">Points Forts</h5>
                                        <ul className="space-y-2">
                                            {aiProfile.strengths?.map((s: string, i: number) => (
                                                <li key={i} className="text-sm flex items-start gap-2 text-slate-200">
                                                    <span className="text-emerald-400 mt-0.5">•</span> {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                        <h5 className="text-xs font-bold text-red-400 uppercase mb-3">Points d'Attention</h5>
                                        <ul className="space-y-2">
                                            {aiProfile.weaknesses?.map((w: string, i: number) => (
                                                <li key={i} className="text-sm flex items-start gap-2 text-slate-200">
                                                    <span className="text-red-400 mt-0.5">•</span> {w}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <div className="bg-indigo-500/20 p-4 rounded-2xl border border-indigo-400/30">
                                    <h5 className="text-xs font-bold text-indigo-300 uppercase mb-2">Recommandation Pédagogique</h5>
                                    <p className="text-sm font-medium text-white">{aiProfile.recommendation}</p>
                                </div>
                                
                                {aiProfile.class_council_summary && (
                                    <div className="bg-amber-500/20 p-5 rounded-2xl border border-amber-400/30">
                                        <h5 className="text-xs font-bold text-amber-300 uppercase mb-4 flex items-center gap-2">
                                            <Crown size={16}/> Mémorandum Conseil de Classe
                                        </h5>
                                        <div className="text-sm text-slate-100 max-w-none [&>h3]:text-amber-300 [&>h3]:font-bold [&>h3]:mb-2 [&>h3]:mt-4 [&>ul]:list-disc [&>ul]:ml-4 [&>ul>li]:mb-2 [&>p]:mb-3 [&>blockquote]:border-l-4 [&>blockquote]:border-amber-400 [&>blockquote]:pl-3 [&>blockquote]:italic [&>blockquote]:text-slate-300 [&>strong]:text-white">
                                            <Markdown>{aiProfile.class_council_summary}</Markdown>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 flex flex-col justify-center">
                                <h5 className="text-xs font-bold text-indigo-300 uppercase mb-6 text-center">Soft Skills (IA)</h5>
                                <div className="space-y-5">
                                    <SkillBar label="Leadership" value={aiProfile.soft_skills?.leadership || 0} color="bg-amber-400" />
                                    <SkillBar label="Travail d'équipe" value={aiProfile.soft_skills?.teamwork || 0} color="bg-blue-400" />
                                    <SkillBar label="Fiabilité" value={aiProfile.soft_skills?.reliability || 0} color="bg-emerald-400" />
                                    <SkillBar label="Créativité" value={aiProfile.soft_skills?.creativity || 0} color="bg-purple-400" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* QUIZ & SONDAGES (NEW SECTION) */}
            {quizAttempts.length > 0 && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-4"><MessageSquare size={20}/> Quiz & Sondages ({quizAttempts.length})</h4>
                    <div className="space-y-4">
                        {quizAttempts?.map(attempt => (
                            <div key={attempt.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 transition-all hover:shadow-md">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => toggleQuiz(attempt.id)}
                                            className="p-2 bg-white rounded-lg border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                                        >
                                            {expandedQuizzes[attempt.id] ? <EyeOff size={16}/> : <Eye size={16}/>}
                                        </button>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${attempt.type === 'SURVEY' ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                    {attempt.type === 'SURVEY' ? 'Sondage' : 'Quiz'}
                                                </span>
                                                <span className="text-xs text-slate-400">{new Date(attempt.date).toLocaleDateString()}</span>
                                            </div>
                                            
                                            {/* REWARDS DISPLAY */}
                                            <div className="flex items-center gap-3 text-xs">
                                                {attempt.rewardsEarned?.points > 0 && (
                                                    <span className="flex items-center gap-1 font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                                        <Trophy size={10}/> +{attempt.rewardsEarned.points} pts
                                                    </span>
                                                )}
                                                {attempt.rewardsEarned?.pixi > 0 && (
                                                    <span className="flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                                        <Wallet size={10}/> +{attempt.rewardsEarned.pixi} PiXi
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-slate-900 text-lg">{attempt.score}/{attempt.maxScore}</span>
                                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Score Final</span>
                                    </div>
                                </div>
                                
                                {/* EXPANDABLE CONTENT */}
                                {expandedQuizzes[attempt.id] && (
                                    <div className="mt-4 pt-4 border-t border-slate-200 animate-in slide-in-from-top-2 duration-300">
                                        
                                        {/* ANSWERS (IF AVAILABLE) */}
                                        {attempt.answers && Object.keys(attempt.answers).length > 0 && (
                                            <div className="mb-4">
                                                <p className="text-[10px] font-bold uppercase text-slate-400 mb-2 flex items-center gap-1"><FileText size={12}/> Réponses</p>
                                                <div className="space-y-2">
                                                    {Object.entries(attempt.answers || {}).map(([qId, answer]) => (
                                                        <div key={qId} className="bg-white p-2 rounded border border-slate-100 text-xs">
                                                            <span className="font-bold text-slate-500 mr-2">Q{qId}:</span>
                                                            <span className="text-slate-700">{answer as string}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* AUDIO & ANALYSIS DISPLAY */}
                                        {attempt.audioUrls && Object.keys(attempt.audioUrls).length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-bold uppercase text-slate-400 mb-2 flex items-center gap-1"><Mic size={12}/> Enregistrements Vocaux & Analyse (Secret)</p>
                                                <div className="space-y-2">
                                                    {Object.entries(attempt.audioUrls || {}).map(([qId, url]) => (
                                                        <div key={qId} className="flex items-center justify-between bg-white p-2 rounded border border-slate-100">
                                                            <div className="flex items-center gap-2">
                                                                <button 
                                                                    onClick={() => handlePlayAudio(url as string)}
                                                                    className={`p-1.5 rounded-full ${playingAudio === url ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`}
                                                                >
                                                                    {playingAudio === url ? <Square size={12} fill="currentColor"/> : <Play size={12} fill="currentColor"/>}
                                                                </button>
                                                                <span className="text-xs font-medium text-slate-600">Question {qId}</span>
                                                            </div>
                                                            {attempt.aiAnalysis && attempt.aiAnalysis[qId] && (
                                                                <div className="text-[10px] text-slate-500 italic">
                                                                    Sentiment: <span className="font-bold text-indigo-600">{attempt.aiAnalysis[qId].sentiment || 'N/A'}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* NOTES PEDAGOGIQUES (NEW) */}
            {student.notes && student.notes.length > 0 && (
                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200 shadow-sm">
                    <h4 className="font-bold text-amber-900 flex items-center gap-2 mb-4"><StickyNote size={20}/> Notes & Suivi Pédagogique</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(student.notes || []).sort((a,b) => b.date.localeCompare(a.date)).map(note => (
                            <div key={note.id} className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm relative overflow-hidden">
                                <div className={`absolute top-0 left-0 w-1 h-full ${note.visibility === 'PRIVATE' ? 'bg-amber-400' : 'bg-blue-400'}`}></div>
                                <div className="flex justify-between items-start mb-2 pl-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{note.date} — {note.authorName}</span>
                                    {note.visibility === 'PRIVATE' ? <Lock size={12} className="text-amber-400"/> : <Globe size={12} className="text-blue-400"/>}
                                </div>
                                <p className="text-sm text-slate-700 pl-3 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ANALYTICS CHARTS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
                
                {/* 1. RADAR CHART (SOFT SKILLS) */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                    <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-2">
                        <Activity size={18} className="text-emerald-500"/> Matrice RH (Soft Skills)
                    </h4>
                    <div className="flex-1 min-h-[250px] relative">
                        {behaviorStats.radarData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={behaviorStats.radarData}>
                                    <PolarGrid stroke="#e2e8f0" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} />
                                    <Radar name="Soft Skills" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 text-xs italic">Données insuffisantes</div>
                        )}
                    </div>
                </div>

                {/* 2. LINE CHART (PROGRESSION) */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                    <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-2">
                        <TrendingUp size={18} className="text-indigo-500"/> Constance Production
                    </h4>
                    <div className="flex-1 min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                <XAxis dataKey="week" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[0, 12]} />
                                <Tooltip contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0'}} />
                                <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} dot={{r:4}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. BAR CHART (DISTRIBUTION) */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                    <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-2">
                        <BarChart2 size={18} className="text-amber-500"/> Répartition Notes
                    </h4>
                    <div className="flex-1 min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={gradeDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px'}} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {gradeDistribution?.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="w-full print:hidden">
                <ReviewDataviz 
                    reviews={enrichedReviewsForDataviz} 
                    initialStudentId={student.id} 
                    hideStudentSelector={true} 
                    mode="progression_only" 
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
                {/* COL 1: TIMELINE DE CARRIÈRE */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-6"><History size={20}/> Parcours Hebdomadaire</h4>
                        
                        {displayHistory?.length > 0 ? (
                            <div className="space-y-6 relative before:absolute before:left-[19px] before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-100">
                                {displayHistory.map(item => (
                                    <div key={item.id} className="relative pl-12">
                                        <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-slate-50 border-4 border-white shadow-sm flex items-center justify-center font-bold text-xs text-slate-500 z-10">
                                            S{item.weekId}
                                        </div>
                                        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
                                            <h5 className="font-bold text-slate-900">{item.agencyName}</h5>
                                            <p className="text-xs text-slate-500 font-bold uppercase mt-1">{item.action}</p>
                                            {item.reason && <p className="text-sm text-slate-600 mt-2 italic">"{item.reason}"</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : timeline?.length > 0 ? (
                            <div className="space-y-6 relative before:absolute before:left-[19px] before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-100">
                                {timeline.map((step, idx) => {
                                    const reviews = step.reviewsReceived || [];
                                    const avgReceived = reviews.length ? (reviews.reduce((a:any,b:any) => a + (b.ratings.quality+b.ratings.attendance+b.ratings.involvement)/3, 0) / reviews.length) : 0;
                                    return (
                                        <div key={step.weekId} className="relative pl-12">
                                            <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-slate-50 border-4 border-white shadow-sm flex items-center justify-center font-bold text-xs text-slate-500 z-10">
                                                S{step.weekId}
                                            </div>
                                            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-all">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h5 className="font-bold text-slate-900">{step.agencyName}</h5>
                                                        <p className="text-xs text-slate-500">Membre actif</p>
                                                    </div>
                                                    {avgReceived > 0 && (
                                                        <div className={`px-2 py-1 rounded text-xs font-bold ${avgReceived < 2.5 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                            Note RH : {avgReceived.toFixed(1)}/5
                                                        </div>
                                                    )}
                                                </div>
                                                {reviews.length > 0 && (
                                                    <div className="mt-3 space-y-2">
                                                        <p className="text-[10px] font-bold uppercase text-slate-400">Feedbacks Reçus</p>
                                                        {reviews.map((r:any) => (
                                                            <div key={r.id} className="text-xs bg-white p-2 rounded border border-slate-100 italic text-slate-600">
                                                                <span className="font-bold not-italic text-indigo-600 mr-1">{r.reviewerName}:</span> 
                                                                "{r.comment}"
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-slate-400 italic text-center py-8">Aucune donnée historique.</p>
                        )}
                    </div>
                </div>

                {/* COL 2: PORTFOLIO & BADGES */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-4"><Trophy size={20}/> Badges & Réussites</h4>
                        <div className="flex flex-wrap gap-2">
                            {(student.badges || []).length > 0 ? student.badges?.map(b => (
                                <div key={b.id} className="px-3 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full text-xs font-bold flex items-center gap-1" title={b.description}>
                                    <Trophy size={12}/> {b.label}
                                </div>
                            )) : <p className="text-xs text-slate-400 italic">Aucun badge.</p>}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-4"><FileText size={20}/> Historique des Rendus</h4>
                        {portfolio?.length === 0 ? (
                            <p className="text-center text-slate-400 italic text-xs py-4">Aucun rendu majeur.</p>
                        ) : (
                            <div className="space-y-3">
                                {portfolio?.map((work, i) => (
                                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="flex justify-between items-start">
                                            <span className={`text-[10px] font-bold px-1.5 rounded ${work.isSpecial ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'}`}>
                                                {work.isSpecial ? 'SPÉCIAL' : `S${work.week}`}
                                            </span>
                                            <div className="flex gap-1">
                                                {work.isMvp && <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 rounded flex items-center gap-1"><Crown size={10}/> MVP</span>}
                                                <span className={`text-[9px] font-bold px-1.5 rounded ${work.score === 'A' ? 'bg-emerald-100 text-emerald-700' : work.score === 'B' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{work.score}</span>
                                            </div>
                                        </div>
                                        <p className="font-bold text-sm text-slate-900 mt-1 truncate">{work.name}</p>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-[10px] text-slate-400 truncate max-w-[100px]">{work.agency}</span>
                                            {work.file && (
                                                <a href={work.file} target="_blank" className="text-[10px] font-bold text-indigo-600 hover:underline">Voir</a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <StudentEditModal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
                student={student} 
                agency={agency} 
                allAgencies={allAgencies}
            />
        </div>

        {/* PRINT VIEW (CLASS COUNCIL SUMMARY) MODAL */}
        {showPrintModal && aiProfile && aiProfile.class_council_summary && (
            <React.Fragment>
            <style>{`
                @media print {
                    body * { visibility: hidden !important; }
                    #print-modal-section, #print-modal-section * { visibility: visible !important; }
                    #print-modal-section { position: absolute !important; left: 0 !important; top: 0 !important; margin: 0 !important; padding: 0 !important; width: 100% !important; min-height: 100vh !important; }
                    @page { margin: 0; }
                }
            `}</style>
            <div id="print-modal-section" className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm overflow-y-auto print:bg-white print:absolute print:inset-0 print:z-50 flex justify-center py-10 print:py-0">
                <div className="absolute top-4 right-4 flex gap-4 print:hidden">
                    <button onClick={() => setShowPrintModal(false)} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-slate-700">Fermer (Échap)</button>
                    <button onClick={() => {
                        window.scrollTo(0,0);
                        setTimeout(() => window.print(), 100);
                    }} className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-indigo-600/30 shadow-lg hover:bg-indigo-500 flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg> Lancer l'impression</button>
                </div>
                <div className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white relative pt-12 pb-24 px-12 text-slate-900 shadow-2xl print:shadow-none print:h-[297mm] print:overflow-hidden">
                    
                    {/* DECORATIVE HEADER */}
                    <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900"></div>
                    <div className="absolute top-0 right-0 p-8 opacity-20"><Cloud size={180} className="text-white"/></div>
                    
                    {/* HEADER CONTENT */}
                    <div className="relative z-10 flex items-end gap-6 mb-12 mt-12">
                        <img src={student.avatarUrl} className="w-32 h-32 rounded-3xl border-4 border-white shadow-xl bg-slate-50 relative z-10" />
                        <div className="pb-2">
                            <h1 className="text-5xl font-black text-white drop-shadow-md mb-3">{student.name}</h1>
                            <div className="flex gap-3 items-center">
                                <span className="bg-white text-indigo-900 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm tracking-wide uppercase">{student.classId === 'A' ? 'Classe A' : 'Classe B'}</span>
                                <span className="bg-amber-400 text-amber-950 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm flex items-center gap-2">
                                    <Crown size={16}/> {aiProfile.verdict}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-8 mb-10">
                        <div className="col-span-1 border-r border-slate-200 pr-6 space-y-6">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ratio de participation</p>
                                <p className="text-4xl font-black text-indigo-600">{mvpCount}/{mainDeliverables}<span className="text-base text-slate-400 font-bold ml-1">({mvpRatio}%)</span></p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Moy. Pair-à-Pair</p>
                                <p className="text-4xl font-black text-yellow-500">{behaviorStats.avgReceived.toFixed(1)}<span className="text-base text-slate-400 font-bold">/5</span></p>
                            </div>
                            
                            <div className="pt-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Finances</p>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center text-xs"><span className="text-slate-500">Portefeuille</span><span className="font-bold text-slate-800">{student.wallet} ¤</span></div>
                                    <div className="flex justify-between items-center text-xs"><span className="text-slate-500">Épargne</span><span className="font-bold text-teal-600">{student.savings || 0} ¤</span></div>
                                    {(student.loanDebt || 0) > 0 && <div className="flex justify-between items-center text-xs"><span className="text-slate-500">Dette</span><span className="font-bold text-red-600">{student.loanDebt} ¤</span></div>}
                                </div>
                            </div>
                            
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Agences Mémorables</p>
                                <div className="flex gap-2 flex-wrap">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold ring-1 ring-slate-200">{agency.name}</span>
                                    {Array.from(new Set(student.history?.map(h => h.agencyName))).filter(name => name !== agency.name).map((name, i) => (
                                        <span key={i} className="bg-white border border-slate-200 text-slate-400 px-2 py-1 rounded text-[10px]">{name}</span>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-200">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Soft Skills (IA)</p>
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between text-[10px] font-bold mb-1"><span className="text-slate-600">Leadership</span><span className="text-slate-900">{aiProfile.soft_skills?.leadership || 0}%</span></div>
                                        <div className="h-2 border border-slate-100 bg-slate-50 rounded-full overflow-hidden"><div className="h-full bg-amber-400 rounded-full" style={{ width: `${aiProfile.soft_skills?.leadership || 0}%` }}></div></div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] font-bold mb-1"><span className="text-slate-600">Coopération</span><span className="text-slate-900">{aiProfile.soft_skills?.teamwork || 0}%</span></div>
                                        <div className="h-2 border border-slate-100 bg-slate-50 rounded-full overflow-hidden"><div className="h-full bg-blue-400 rounded-full" style={{ width: `${aiProfile.soft_skills?.teamwork || 0}%` }}></div></div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] font-bold mb-1"><span className="text-slate-600">Fiabilité</span><span className="text-slate-900">{aiProfile.soft_skills?.reliability || 0}%</span></div>
                                        <div className="h-2 border border-slate-100 bg-slate-50 rounded-full overflow-hidden"><div className="h-full bg-emerald-400 rounded-full" style={{ width: `${aiProfile.soft_skills?.reliability || 0}%` }}></div></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="col-span-3 pb-8">
                            {/* HIGHLIGHT STRENGTHS VISUALLY */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                {aiProfile.strengths?.map((s: string, idx: number) => (
                                    <span key={idx} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                                        <Star size={12} className="text-indigo-500 fill-indigo-200" /> {s}
                                    </span>
                                ))}
                                {aiProfile.weaknesses?.map((w: string, idx: number) => (
                                    <span key={idx} className="bg-rose-50 border border-rose-100 text-rose-700 px-3 py-1 rounded-lg text-xs font-bold shadow-sm">
                                        ⚠️ {w}
                                    </span>
                                ))}
                            </div>

                            <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 ring-1 ring-slate-900/5 shadow-inner">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Bot size={14}/> Synthèse Psychologique IA</h3>
                                <p className="text-sm font-medium text-slate-700 leading-relaxed indent-4">{aiProfile.psychological_profile}</p>
                            </div>
                            
                            <div className="max-w-none text-slate-800
                                [&>h1]:text-2xl [&>h1]:font-black [&>h1]:text-indigo-900 [&>h1]:mb-4 print:[&>h1]:text-lg print:[&>h1]:mb-2
                                [&>h2]:text-base [&>h2]:font-black [&>h2]:text-slate-800 [&>h2]:mb-3 [&>h2]:mt-6 [&>h2]:border-b [&>h2]:border-slate-200 [&>h2]:pb-1 print:[&>h2]:text-sm print:[&>h2]:mt-3 print:[&>h2]:mb-1
                                [&>h3]:text-sm [&>h3]:font-bold [&>h3]:text-indigo-600 [&>h3]:uppercase [&>h3]:tracking-wider [&>h3]:mb-2 [&>h3]:mt-4 print:[&>h3]:text-xs print:[&>h3]:mt-2 print:[&>h3]:mb-1
                                [&>p]:mb-3 [&>p]:leading-relaxed [&>p]:text-slate-600 [&>p]:text-sm print:[&>p]:text-[11px] print:[&>p]:mb-1.5 print:[&>p]:leading-tight
                                [&>ul]:text-slate-600 [&>ul]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:text-sm print:[&>ul]:text-[11px] print:[&>ul]:mb-1.5 print:[&>ul>li]:my-0.5
                                [&>ul>li]:my-1.5
                                [&>strong]:text-slate-900 [&>strong]:font-bold
                                [&>blockquote]:border-l-4 [&>blockquote]:border-amber-400 [&>blockquote]:pl-4 [&>blockquote]:py-2 [&>blockquote]:my-4 [&>blockquote]:italic [&>blockquote]:bg-amber-50/50 [&>blockquote]:text-slate-700 [&>blockquote]:rounded-r-xl print:[&>blockquote]:py-1 print:[&>blockquote]:my-2"
                            >
                                <Markdown>{aiProfile.class_council_summary}</Markdown>
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-12 left-12 right-12 border-t-2 border-slate-100 pt-6">
                        <div className="flex justify-between items-end">
                            <div className="max-w-xl">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Activity size={12}/> Recommandation Pédagogique</p>
                                <p className="text-sm font-bold text-indigo-900 bg-indigo-50/50 p-2 rounded border border-indigo-100 inline-block">{aiProfile.recommendation}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-end gap-1 items-center mb-1"><Cloud size={14} className="text-indigo-300"/> Profiler IA & Analyste</p>
                                <p className="text-[10px] font-medium text-slate-400">Généré le {new Date().toLocaleDateString('fr-FR')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </React.Fragment>
        )}
        </>
    );
};

const StatBox = ({ icon, label, value, sub, color }: any) => (
    <div className={`p-4 rounded-2xl flex flex-col justify-between ${color.split(' ')[0]} bg-opacity-20`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color} bg-opacity-20`}>{icon}</div>
        <div>
            <p className="text-[10px] font-bold uppercase opacity-60">{label}</p>
            <p className={`text-xl font-black ${color.split(' ')[1]}`}>{value} <span className="text-xs opacity-70">{sub}</span></p>
        </div>
    </div>
);

const SkillBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div>
        <div className="flex justify-between text-xs font-bold mb-1">
            <span className="text-slate-300">{label}</span>
            <span className="text-white">{value}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${value}%` }}></div>
        </div>
    </div>
);
