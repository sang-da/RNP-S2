
import React, { useState, useMemo } from 'react';
import { Agency, Student, GameEvent, Deliverable, PeerReview } from '../types';
import { User, Wallet, History, FileText, AlertTriangle, MessageCircle, Building2, TrendingUp, Trophy, ArrowRight, ArrowLeft, Star, Gavel, Crown, BarChart2, PieChart, Activity } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';

interface AdminStudentTrackerProps {
    agencies: Agency[];
}

export const AdminStudentTracker: React.FC<AdminStudentTrackerProps> = ({ agencies }) => {
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');

    // --- 1. LISTE GLOBALE DES ÉTUDIANTS ---
    const allStudents = useMemo(() => {
        const list: (Student & { currentAgencyName: string })[] = [];
        agencies.forEach(a => {
            a.members.forEach(m => list.push({ ...m, currentAgencyName: a.name }));
        });
        return list.sort((a,b) => a.name.localeCompare(b.name));
    }, [agencies]);

    const targetStudent = allStudents.find(s => s.id === selectedStudentId);

    // --- 2. RECONSTRUCTION DE L'HISTORIQUE (TIMELINE) ---
    const studentTimeline = useMemo(() => {
        if (!targetStudent) return [];

        const timelineMap: Record<string, {
            weekId: string;
            agencyName: string;
            reviewsReceived: PeerReview[];
            reviewsGiven: PeerReview[];
            deliverables: Deliverable[];
        }> = {};

        // On scanne TOUTES les agences pour retrouver des traces de l'étudiant
        agencies.forEach(agency => {
            // A. Récupérer les Reviews (Actives + Archivées)
            const allReviews = [...(agency.peerReviews || []), ...(agency.reviewHistory || [])];

            allReviews.forEach(r => {
                // Si l'étudiant est concerné (Cible ou Reviewer)
                if (r.targetId === targetStudent.id || r.reviewerId === targetStudent.id) {
                    if (!timelineMap[r.weekId]) {
                        timelineMap[r.weekId] = { weekId: r.weekId, agencyName: agency.name, reviewsReceived: [], reviewsGiven: [], deliverables: [] };
                    }
                    // Important : Si on trouve une review dans cette agence, c'est qu'il y était cette semaine-là
                    timelineMap[r.weekId].agencyName = agency.name;

                    if (r.targetId === targetStudent.id) timelineMap[r.weekId].reviewsReceived.push(r);
                    if (r.reviewerId === targetStudent.id) timelineMap[r.weekId].reviewsGiven.push(r);
                }
            });
        });

        // Convertir en tableau trié
        return Object.values(timelineMap).sort((a, b) => parseInt(b.weekId) - parseInt(a.weekId));
    }, [targetStudent, agencies]);

    // --- 3. ANALYSE COMPORTEMENTALE (SOFT SKILLS) ---
    const behaviorStats = useMemo(() => {
        if (!studentTimeline.length) return { avgGiven: 0, avgReceived: 0, severity: 'Neutre', radarData: [] };

        let totalGiven = 0, countGiven = 0;
        let totalReceived = 0, countReceived = 0;
        
        // Radar Data Accumulators
        let sumAtt = 0, sumQual = 0, sumInv = 0;

        studentTimeline.forEach(week => {
            week.reviewsGiven.forEach(r => {
                totalGiven += (r.ratings.attendance + r.ratings.quality + r.ratings.involvement) / 3;
                countGiven++;
            });
            week.reviewsReceived.forEach(r => {
                const avg = (r.ratings.attendance + r.ratings.quality + r.ratings.involvement) / 3;
                totalReceived += avg;
                sumAtt += r.ratings.attendance;
                sumQual += r.ratings.quality;
                sumInv += r.ratings.involvement;
                countReceived++;
            });
        });

        const avgGiven = countGiven ? (totalGiven / countGiven) : 0;
        const avgReceived = countReceived ? (totalReceived / countReceived) : 0;

        let severity = "Juste";
        if (avgGiven > 4.5) severity = "Bienveillant / Complaisant";
        if (avgGiven < 2.5) severity = "Sévère / Critique";

        const radarData = countReceived > 0 ? [
            { subject: 'Assiduité', A: parseFloat((sumAtt / countReceived).toFixed(2)), fullMark: 5 },
            { subject: 'Qualité', A: parseFloat((sumQual / countReceived).toFixed(2)), fullMark: 5 },
            { subject: 'Implication', A: parseFloat((sumInv / countReceived).toFixed(2)), fullMark: 5 },
        ] : [];

        return { avgGiven, avgReceived, severity, countGiven, countReceived, radarData };
    }, [studentTimeline]);

    // --- 4. PORTFOLIO & ANALYTICS PRODUCTION ---
    const { portfolio, chartData, gradeDistribution } = useMemo(() => {
        if (!targetStudent) return { portfolio: [], chartData: [], gradeDistribution: [] };
        const works: any[] = [];
        const performanceByWeek: Record<string, number> = {}; // weekId -> score VE total
        const gradesCount = { A: 0, B: 0, C: 0, REJ: 0 };

        // On parcourt les agences actuelles et passées
        agencies.forEach(a => {
            Object.values(a.progress).forEach(week => {
                week.deliverables.forEach(d => {
                    const isMvp = d.grading?.mvpId === targetStudent.id;
                    // Si MVP ou si membre actuel de l'agence (Approximation pour l'historique de prod)
                    // Pour être précis sur l'historique, on vérifie si l'étudiant était dans cette agence via la timeline
                    const wasInAgencyThisWeek = studentTimeline.find(t => t.weekId === week.id)?.agencyName === a.name;
                    
                    // On inclut le travail si validé ET (soit MVP, soit faisait partie de l'agence à ce moment)
                    if ((d.status === 'validated' || d.status === 'rejected') && (isMvp || wasInAgencyThisWeek || a.members.some(m => m.id === targetStudent.id))) {
                        
                        const scoreLabel = d.grading?.quality || (d.status === 'rejected' ? 'REJECTED' : '?');
                        
                        works.push({
                            week: week.id,
                            name: d.name,
                            isMvp,
                            score: scoreLabel,
                            agency: a.name,
                            file: d.fileUrl,
                            finalDelta: d.grading?.finalDelta || 0
                        });

                        // Chart Data Accumulation
                        if (!performanceByWeek[week.id]) performanceByWeek[week.id] = 0;
                        // On attribue une valeur numérique arbitraire pour le graph de qualité
                        let numericScore = 0;
                        if (scoreLabel === 'A') { numericScore = 10; gradesCount.A++; }
                        else if (scoreLabel === 'B') { numericScore = 6; gradesCount.B++; }
                        else if (scoreLabel === 'C') { numericScore = 2; gradesCount.C++; }
                        else { numericScore = 0; gradesCount.REJ++; }
                        
                        // On prend la moyenne si plusieurs rendus la même semaine, ou le max ? Prenons la somme capée.
                        performanceByWeek[week.id] = Math.max(performanceByWeek[week.id], numericScore);
                    }
                });
            });
        });

        // Format Chart Data
        const chartData = Object.entries(performanceByWeek)
            .map(([week, score]) => ({ week: `S${week}`, score }))
            .sort((a,b) => parseInt(a.week.slice(1)) - parseInt(b.week.slice(1)));

        // Format Grade Distribution
        const gradeData = [
            { name: 'A', value: gradesCount.A, color: '#10b981' },
            { name: 'B', value: gradesCount.B, color: '#f59e0b' },
            { name: 'C', value: gradesCount.C, color: '#ef4444' },
            { name: 'Rejet', value: gradesCount.REJ, color: '#64748b' },
        ];

        return { 
            portfolio: works.sort((a,b) => parseInt(b.week) - parseInt(a.week)),
            chartData,
            gradeDistribution: gradeData
        };
    }, [targetStudent, agencies, studentTimeline]);

    return (
        <div className="animate-in fade-in pb-20">
            <div className="mb-8">
                <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-xl text-white"><User size={32}/></div>
                    Dossier Étudiant & Analytique
                </h2>
                <p className="text-slate-500 text-sm mt-1">Analyse 360° : Comportement, Production et Trajectoire.</p>
            </div>

            {/* SELECTOR */}
            <div className="mb-8 max-w-md">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Rechercher un étudiant</label>
                <select 
                    className="w-full p-3 rounded-xl border border-slate-200 font-bold bg-white focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    value={selectedStudentId}
                >
                    <option value="">-- Sélectionner dans la promo --</option>
                    {allStudents.map(s => (
                        <option key={s.id} value={s.id}>{s.name} (Actuellement : {s.currentAgencyName})</option>
                    ))}
                </select>
            </div>

            {targetStudent ? (
                <div className="space-y-8">
                    
                    {/* ID CARD */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-8 items-center md:items-start">
                        <div className="flex flex-col items-center">
                            <img src={targetStudent.avatarUrl} className="w-24 h-24 rounded-full border-4 border-slate-100 shadow-md bg-slate-50" />
                            <div className="mt-2 text-center">
                                <h3 className="text-2xl font-bold text-slate-900">{targetStudent.name}</h3>
                                <span className="inline-block bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-500 mt-1">{targetStudent.role}</span>
                            </div>
                        </div>
                        
                        <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                            <StatBox icon={<TrendingUp/>} label="Score Actuel" value={targetStudent.individualScore} sub="/100" color="bg-indigo-50 text-indigo-600"/>
                            <StatBox icon={<Wallet/>} label="Fortune Perso" value={targetStudent.wallet} sub="PiXi" color="bg-emerald-50 text-emerald-600"/>
                            <StatBox icon={<Building2/>} label="Agence Actuelle" value={targetStudent.currentAgencyName} sub="" color="bg-blue-50 text-blue-600"/>
                            <StatBox icon={<Star/>} label="Moy. Reçue" value={behaviorStats.avgReceived.toFixed(1)} sub="/5.0" color="bg-yellow-50 text-yellow-600"/>
                        </div>
                    </div>

                    {/* --- SECTION ANALYTIQUE (MATRICES) --- */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
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
                                            {gradeDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* COL 1: TIMELINE DE CARRIÈRE */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-6"><History size={20}/> Parcours Hebdomadaire</h4>
                                
                                {studentTimeline.length === 0 ? (
                                    <p className="text-slate-400 italic text-center py-8">Aucune donnée historique trouvée.</p>
                                ) : (
                                    <div className="space-y-6 relative before:absolute before:left-[19px] before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-100">
                                        {studentTimeline.map((step, idx) => {
                                            const avgReceived = step.reviewsReceived.length ? (step.reviewsReceived.reduce((a,b) => a + (b.ratings.quality+b.ratings.attendance+b.ratings.involvement)/3, 0) / step.reviewsReceived.length) : 0;
                                            const avgGiven = step.reviewsGiven.length ? (step.reviewsGiven.reduce((a,b) => a + (b.ratings.quality+b.ratings.attendance+b.ratings.involvement)/3, 0) / step.reviewsGiven.length) : 0;

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

                                                        {/* FEEDBACKS RECUS */}
                                                        {step.reviewsReceived.length > 0 && (
                                                            <div className="mt-3 space-y-2">
                                                                <p className="text-[10px] font-bold uppercase text-slate-400">Feedbacks Reçus</p>
                                                                {step.reviewsReceived.map(r => (
                                                                    <div key={r.id} className="text-xs bg-white p-2 rounded border border-slate-100 italic text-slate-600">
                                                                        <span className="font-bold not-italic text-indigo-600 mr-1">{r.reviewerName}:</span> 
                                                                        "{r.comment}"
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* STATS DONNÉES */}
                                                        <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2 text-[10px] text-slate-400">
                                                            <ArrowRight size={12}/>
                                                            A émis {step.reviewsGiven.length} évaluation(s) cette semaine (Moy: {avgGiven.toFixed(1)}/5).
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* COL 2: PORTFOLIO & BADGES */}
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-4"><Trophy size={20}/> Badges & Réussites</h4>
                                <div className="flex flex-wrap gap-2">
                                    {(targetStudent.badges || []).length > 0 ? targetStudent.badges?.map(b => (
                                        <div key={b.id} className="px-3 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full text-xs font-bold flex items-center gap-1" title={b.description}>
                                            <Trophy size={12}/> {b.label}
                                        </div>
                                    )) : <p className="text-xs text-slate-400 italic">Aucun badge.</p>}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-4"><FileText size={20}/> Historique des Rendus</h4>
                                {portfolio.length === 0 ? (
                                    <p className="text-center text-slate-400 italic text-xs py-4">Aucun rendu majeur.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {portfolio.map((work, i) => (
                                            <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-1.5 rounded">S{work.week}</span>
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
