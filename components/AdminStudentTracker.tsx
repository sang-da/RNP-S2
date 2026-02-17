
import React, { useState, useMemo } from 'react';
import { Agency, Student, Deliverable, PeerReview } from '../types';
import { User, Search, Filter, Users } from 'lucide-react';
import { TrackerStats } from './admin/tracker/TrackerStats';
import { StudentProfile } from './admin/tracker/StudentProfile';
import { useGame } from '../contexts/GameContext';

interface AdminStudentTrackerProps {
    agencies: Agency[];
}

export const AdminStudentTracker: React.FC<AdminStudentTrackerProps> = ({ agencies }) => {
    const { reviews: globalReviews } = useGame();
    
    // UI State
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [classFilter, setClassFilter] = useState<'ALL' | 'A' | 'B'>('ALL');

    // --- 1. LISTE GLOBALE DES ÉTUDIANTS (Flattened) ---
    const allStudents = useMemo(() => {
        const list: (Student & { currentAgencyName: string, currentAgencyId: string })[] = [];
        agencies.forEach(a => {
            a.members.forEach(m => list.push({ ...m, currentAgencyName: a.name, currentAgencyId: a.id }));
        });
        return list.sort((a,b) => a.name.localeCompare(b.name));
    }, [agencies]);

    // --- 2. FILTRAGE POUR LA SIDEBAR ---
    const filteredStudents = useMemo(() => {
        return allStudents.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  s.currentAgencyName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesClass = classFilter === 'ALL' || s.classId === classFilter;
            return matchesSearch && matchesClass;
        });
    }, [allStudents, searchTerm, classFilter]);

    // --- 3. ANALYTICS MACRO (MATRICE PROMO) ---
    const globalStats = useMemo(() => {
        if (allStudents.length === 0) return null;
        const totalStudents = allStudents.length;
        const totalScore = allStudents.reduce((acc, s) => acc + s.individualScore, 0);
        const avgScore = (totalScore / totalStudents).toFixed(1);
        const totalWealth = allStudents.reduce((acc, s) => acc + (s.wallet || 0), 0);
        const avgWealth = Math.round(totalWealth / totalStudents);
        const countA = allStudents.filter(s => s.classId === 'A').length;
        const countB = allStudents.filter(s => s.classId === 'B').length;
        const top3 = [...allStudents].sort((a,b) => b.individualScore - a.individualScore).slice(0, 3);
        return { totalStudents, avgScore, avgWealth, countA, countB, top3 };
    }, [allStudents]);

    // --- 4. DATA SELECTIONNÉE ---
    const targetStudent = useMemo(() => 
        allStudents.find(s => s.id === selectedStudentId) || null
    , [allStudents, selectedStudentId]);

    const targetAgency = useMemo(() => 
        agencies.find(a => a.id === targetStudent?.currentAgencyId) || null
    , [agencies, targetStudent]);

    // --- 5. RECONSTRUCTION HISTORIQUE (MEMOIZED) ---
    const studentTimeline = useMemo(() => {
        if (!targetStudent) return [];
        const timelineMap: Record<string, { weekId: string; agencyName: string; reviewsReceived: PeerReview[]; reviewsGiven: PeerReview[]; }> = {};

        globalReviews.forEach(r => {
            if (r.targetId === targetStudent.id || r.reviewerId === targetStudent.id) {
                const reviewAgency = agencies.find(a => a.id === r.agencyId);
                const agencyName = reviewAgency ? reviewAgency.name : 'Agence Inconnue';

                if (!timelineMap[r.weekId]) {
                    timelineMap[r.weekId] = { weekId: r.weekId, agencyName: agencyName, reviewsReceived: [], reviewsGiven: [] };
                }
                if (reviewAgency) timelineMap[r.weekId].agencyName = agencyName;
                if (r.targetId === targetStudent.id) timelineMap[r.weekId].reviewsReceived.push(r);
                if (r.reviewerId === targetStudent.id) timelineMap[r.weekId].reviewsGiven.push(r);
            }
        });
        return Object.values(timelineMap).sort((a, b) => parseInt(b.weekId) - parseInt(a.weekId));
    }, [targetStudent, agencies, globalReviews]);

    // --- 6. SOFT SKILLS ---
    const behaviorStats = useMemo(() => {
        if (!studentTimeline.length) return { avgGiven: 0, avgReceived: 0, radarData: [] };
        let countReceived = 0;
        let sumAtt = 0, sumQual = 0, sumInv = 0;
        let totalReceived = 0;

        studentTimeline.forEach(week => {
            week.reviewsReceived.forEach(r => {
                const avg = (r.ratings.attendance + r.ratings.quality + r.ratings.involvement) / 3;
                totalReceived += avg;
                sumAtt += r.ratings.attendance;
                sumQual += r.ratings.quality;
                sumInv += r.ratings.involvement;
                countReceived++;
            });
        });

        const avgReceived = countReceived ? (totalReceived / countReceived) : 0;
        const radarData = countReceived > 0 ? [
            { subject: 'Assiduité', A: parseFloat((sumAtt / countReceived).toFixed(2)), fullMark: 5 },
            { subject: 'Qualité', A: parseFloat((sumQual / countReceived).toFixed(2)), fullMark: 5 },
            { subject: 'Implication', A: parseFloat((sumInv / countReceived).toFixed(2)), fullMark: 5 },
        ] : [];

        return { avgReceived, radarData };
    }, [studentTimeline]);

    // --- 7. PORTFOLIO & PRODUCTION ---
    const { portfolio, chartData, gradeDistribution } = useMemo(() => {
        if (!targetStudent) return { portfolio: [], chartData: [], gradeDistribution: [] };
        const works: any[] = [];
        const performanceByWeek: Record<string, number> = {}; 
        const gradesCount = { A: 0, B: 0, C: 0, REJ: 0 };

        agencies.forEach(a => {
            Object.values(a.progress).forEach((week: any) => {
                week.deliverables.forEach((d: Deliverable) => {
                    const isMvp = d.grading?.mvpId === targetStudent.id;
                    const wasInAgencyThisWeek = studentTimeline.find(t => t.weekId === week.id)?.agencyName === a.name;
                    
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

                        if (!performanceByWeek[week.id]) performanceByWeek[week.id] = 0;
                        let numericScore = 0;
                        if (scoreLabel === 'A') { numericScore = 10; gradesCount.A++; }
                        else if (scoreLabel === 'B') { numericScore = 6; gradesCount.B++; }
                        else if (scoreLabel === 'C') { numericScore = 2; gradesCount.C++; }
                        else { numericScore = 0; gradesCount.REJ++; }
                        
                        performanceByWeek[week.id] = Math.max(performanceByWeek[week.id], numericScore);
                    }
                });
            });
        });

        const chartData = Object.entries(performanceByWeek)
            .map(([week, score]) => ({ week: `S${week}`, score }))
            .sort((a,b) => parseInt(a.week.slice(1)) - parseInt(b.week.slice(1)));

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
        <div className="animate-in fade-in pb-20 h-[calc(100vh-100px)] flex flex-col">
            <div className="mb-6 shrink-0">
                <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-xl text-white"><User size={32}/></div>
                    Dossier Étudiant & Analytique
                </h2>
                <p className="text-slate-500 text-sm mt-1">Analyse 360° : Comportement, Production et Trajectoire.</p>
            </div>

            <div className="shrink-0 mb-6">
                <TrackerStats globalStats={globalStats} />
            </div>

            {/* SPLIT VIEW LAYOUT */}
            <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
                
                {/* --- LEFT SIDEBAR : SEARCH & LIST --- */}
                <div className="w-1/3 md:w-[320px] bg-white rounded-3xl border border-slate-200 flex flex-col shadow-sm">
                    {/* Search Header */}
                    <div className="p-4 border-b border-slate-100 space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                            <input 
                                type="text" 
                                placeholder="Rechercher..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                            />
                        </div>
                        <div className="flex gap-2">
                            {['ALL', 'A', 'B'].map((c) => (
                                <button 
                                    key={c}
                                    onClick={() => setClassFilter(c as any)}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        classFilter === c 
                                        ? 'bg-slate-800 text-white' 
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                >
                                    {c === 'ALL' ? 'Tous' : `Cl. ${c}`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Scrollable List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {filteredStudents.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-xs italic">Aucun étudiant trouvé.</div>
                        ) : (
                            filteredStudents.map(student => {
                                const isSelected = student.id === selectedStudentId;
                                return (
                                    <button 
                                        key={student.id} 
                                        onClick={() => setSelectedStudentId(student.id)}
                                        className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${
                                            isSelected 
                                            ? 'bg-indigo-600 text-white shadow-md' 
                                            : 'hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <div className="relative">
                                            <img src={student.avatarUrl} className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white/20" />
                                            {student.individualScore >= 80 && (
                                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white"></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm truncate">{student.name}</p>
                                            <p className={`text-[10px] truncate ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                {student.currentAgencyName}
                                            </p>
                                        </div>
                                        {/* Score Badge */}
                                        <div className={`text-xs font-bold px-2 py-1 rounded-lg ${
                                            isSelected 
                                            ? 'bg-white/20 text-white' 
                                            : student.individualScore < 50 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {student.individualScore}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                    <div className="p-3 border-t border-slate-100 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {filteredStudents.length} Étudiants
                    </div>
                </div>

                {/* --- RIGHT PANEL : PROFILE --- */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    {targetStudent && targetAgency ? (
                        <div key={targetStudent.id} className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <StudentProfile 
                                student={targetStudent}
                                agency={targetAgency}
                                allAgencies={agencies}
                                timeline={studentTimeline}
                                behaviorStats={behaviorStats}
                                portfolio={portfolio}
                                chartData={chartData}
                                gradeDistribution={gradeDistribution}
                            />
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
                            <Users size={64} className="mb-4 opacity-20"/>
                            <p className="font-bold text-lg">Sélectionnez un dossier</p>
                            <p className="text-sm">Utilisez la liste à gauche pour naviguer.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
