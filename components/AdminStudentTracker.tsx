
import React, { useState, useMemo } from 'react';
import { Agency, Student, GameEvent, Deliverable, PeerReview } from '../types';
import { User, Wallet, History, FileText, AlertTriangle, MessageCircle, Building2, TrendingUp, Trophy } from 'lucide-react';

interface AdminStudentTrackerProps {
    agencies: Agency[];
}

export const AdminStudentTracker: React.FC<AdminStudentTrackerProps> = ({ agencies }) => {
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');

    // --- AGGREGATION DES DONNÉES ---
    const allStudents = useMemo(() => {
        const list: (Student & { currentAgencyName: string })[] = [];
        agencies.forEach(a => {
            a.members.forEach(m => list.push({ ...m, currentAgencyName: a.name }));
        });
        return list.sort((a,b) => a.name.localeCompare(b.name));
    }, [agencies]);

    const targetStudent = allStudents.find(s => s.id === selectedStudentId);

    // 1. CARRIÈRE (Timeline Agences)
    const careerHistory = useMemo(() => {
        if (!targetStudent) return [];
        const history: {date: string, agency: string, action: string}[] = [];
        
        // Scan de tous les logs de toutes les agences
        agencies.forEach(a => {
            a.eventLog.forEach(e => {
                // Recherche naïve dans les descriptions
                if (e.description?.includes(targetStudent.name)) {
                    if (e.type === 'VE_DELTA' && e.label === 'Recrutement Validé') {
                        history.push({ date: e.date, agency: a.name, action: "RECRUTÉ" });
                    }
                    if (e.label.includes('Départ') || e.label.includes('Renvoi')) {
                        history.push({ date: e.date, agency: a.name, action: "DÉPART" });
                    }
                }
            });
        });
        return history.sort((a,b) => b.date.localeCompare(a.date));
    }, [targetStudent, agencies]);

    // 2. CASIER (Black Ops & Suspicious Activity)
    const suspicionLog = useMemo(() => {
        if (!targetStudent) return [];
        const logs: GameEvent[] = [];
        agencies.forEach(a => {
            // Check Black Ops initiated by student
            // Note: Currently Black Ops logs don't store studentID explicitly in EventLog, 
            // but we might infer from description or updates. 
            // Here we look for peer reviews given/received that are extreme.
        });
        return logs;
    }, [targetStudent]);

    // 3. PORTFOLIO (Travaux rendus)
    const portfolio = useMemo(() => {
        if (!targetStudent) return [];
        const works: { week: string, name: string, status: string, score: string, file: string, feedback: string, agency: string }[] = [];
        
        agencies.forEach(a => {
            // Est-ce qu'il était membre à ce moment ? (Approximation : On prend tout ce que l'agence a fait)
            // Idéalement il faudrait vérifier l'historique d'appartenance.
            const isMemberNow = a.members.some(m => m.id === targetStudent.id);
            if (!isMemberNow) return; 

            Object.values(a.progress).forEach(week => {
                week.deliverables.forEach(d => {
                    if (d.status === 'validated' || d.status === 'rejected') {
                        // Check if MVP
                        const isMVP = d.grading?.mvpId === targetStudent.id;
                        works.push({
                            week: week.id,
                            name: d.name + (isMVP ? " (MVP 👑)" : ""),
                            status: d.status,
                            score: d.grading?.quality || '?',
                            file: d.fileUrl || '',
                            feedback: d.feedback || '',
                            agency: a.name
                        });
                    }
                });
            });
        });
        return works.sort((a,b) => parseInt(b.week) - parseInt(a.week));
    }, [targetStudent, agencies]);

    // 4. NOTES RH (Radar Data) - INCLUT HISTORIQUE MAINTENANT
    const reviewsReceived = useMemo(() => {
        if (!targetStudent) return [];
        const revs: PeerReview[] = [];
        agencies.forEach(a => {
            const allReviews = [...(a.peerReviews || []), ...(a.reviewHistory || [])];
            revs.push(...allReviews.filter(r => r.targetId === targetStudent.id));
        });
        return revs;
    }, [targetStudent, agencies]);

    return (
        <div className="animate-in fade-in pb-20">
            <div className="mb-8">
                <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-xl text-white"><User size={32}/></div>
                    Dossier Étudiant
                </h2>
                <p className="text-slate-500 text-sm mt-1">Traçabilité complète : Parcours, productions et comportement.</p>
            </div>

            {/* SELECTOR */}
            <div className="mb-8 max-w-md">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Rechercher un dossier</label>
                <select 
                    className="w-full p-3 rounded-xl border border-slate-200 font-bold bg-white focus:ring-2 focus:ring-indigo-500"
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    value={selectedStudentId}
                >
                    <option value="">-- Sélectionner --</option>
                    {allStudents.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.currentAgencyName})</option>
                    ))}
                </select>
            </div>

            {targetStudent ? (
                <div className="space-y-8">
                    
                    {/* ID CARD */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8">
                        <div className="flex flex-col items-center">
                            <img src={targetStudent.avatarUrl} className="w-32 h-32 rounded-full border-4 border-slate-100 shadow-md" />
                            <div className="mt-4 text-center">
                                <h3 className="text-2xl font-bold text-slate-900">{targetStudent.name}</h3>
                                <span className="inline-block bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-500 mt-1">{targetStudent.role}</span>
                            </div>
                        </div>
                        
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatBox icon={<TrendingUp/>} label="Score Actuel" value={targetStudent.individualScore} sub="/100" color="bg-indigo-50 text-indigo-600"/>
                            <StatBox icon={<Wallet/>} label="Fortune Perso" value={targetStudent.wallet} sub="PiXi" color="bg-emerald-50 text-emerald-600"/>
                            <StatBox icon={<Building2/>} label="Agence" value={targetStudent.currentAgencyName} sub="Actuelle" color="bg-blue-50 text-blue-600"/>
                            <StatBox icon={<Trophy/>} label="Badges" value={(targetStudent.badges || []).length} sub="Débloqués" color="bg-yellow-50 text-yellow-600"/>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* COL 1: PARCOURS & CASIER */}
                        <div className="space-y-8">
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-4"><History size={20}/> Historique Carrière</h4>
                                {careerHistory.length === 0 ? (
                                    <p className="text-sm text-slate-400 italic">Aucun mouvement majeur.</p>
                                ) : (
                                    <div className="space-y-4 relative border-l-2 border-slate-100 ml-3 pl-6">
                                        {careerHistory.map((evt, i) => (
                                            <div key={i} className="relative">
                                                <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-slate-300 border-2 border-white"></div>
                                                <p className="text-xs font-bold text-slate-400">{evt.date}</p>
                                                <p className="font-bold text-slate-800 text-sm">{evt.action} <span className="text-indigo-600">@ {evt.agency}</span></p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                                <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-4"><AlertTriangle size={20}/> Signalements RH</h4>
                                {reviewsReceived.filter(r => ((r.ratings.attendance+r.ratings.quality+r.ratings.involvement)/3) < 2.5).length > 0 ? (
                                    <div className="space-y-2">
                                        {reviewsReceived.filter(r => ((r.ratings.attendance+r.ratings.quality+r.ratings.involvement)/3) < 2.5).map(r => (
                                            <div key={r.id} className="p-3 bg-red-100 rounded-xl text-red-800 text-xs border border-red-200">
                                                <strong>S{r.weekId} (Moy: {((r.ratings.attendance+r.ratings.quality+r.ratings.involvement)/3).toFixed(1)}) :</strong> {r.comment}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold">
                                        <CheckIcon/> Dossier Vierge (Aucune note &lt; 2.5)
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* COL 2 & 3: PORTFOLIO */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-6"><FileText size={20}/> Portfolio de Production (Contributions)</h4>
                            
                            {portfolio.length === 0 ? (
                                <p className="text-center text-slate-400 italic py-10">Aucun travail validé pour le moment.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {portfolio.map((work, i) => (
                                        <div key={i} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-md transition-all group">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-black uppercase bg-slate-200 text-slate-500 px-2 py-1 rounded">Semaine {work.week}</span>
                                                <span className={`text-sm font-bold px-2 rounded ${work.score === 'A' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{work.score}</span>
                                            </div>
                                            <h5 className="font-bold text-slate-900 mb-1 truncate">{work.name}</h5>
                                            <p className="text-xs text-slate-500 mb-3">{work.agency}</p>
                                            
                                            {work.feedback && (
                                                <div className="text-xs italic text-slate-500 bg-white p-2 rounded border border-slate-100 mb-3">
                                                    <MessageCircle size={10} className="inline mr-1"/> "{work.feedback}"
                                                </div>
                                            )}

                                            {work.file && (
                                                <a href={work.file} target="_blank" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                                                    Voir le fichier
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-100 rounded-3xl border-2 border-dashed border-slate-300">
                    <User size={48} className="mx-auto text-slate-300 mb-4"/>
                    <p className="text-slate-500 font-bold">Sélectionnez un étudiant pour ouvrir son dossier.</p>
                </div>
            )}
        </div>
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

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);
