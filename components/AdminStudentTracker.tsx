
import React, { useState, useMemo } from 'react';
import { Agency, Student, Deliverable, PeerReview } from '../types';
import { User } from 'lucide-react';
import { TrackerStats } from './admin/tracker/TrackerStats';
import { StudentProfile } from './admin/tracker/StudentProfile';

interface AdminStudentTrackerProps {
    agencies: Agency[];
}

export const AdminStudentTracker: React.FC<AdminStudentTrackerProps> = ({ agencies }) => {
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');

    // --- 1. LISTE GLOBALE DES ÉTUDIANTS ---
    const allStudents = useMemo(() => {
        const list: (Student & { currentAgencyName: string, currentAgencyId: string })[] = [];
        agencies.forEach(a => {
            a.members.forEach(m => list.push({ ...m, currentAgencyName: a.name, currentAgencyId: a.id }));
        });
        return list.sort((a,b) => a.name.localeCompare(b.name));
    }, [agencies]);

    // --- 2. ANALYTICS MACRO (MATRICE PROMO) ---
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

    const targetStudent = allStudents.find(s => s.id === selectedStudentId);
    const targetAgency = agencies.find(a => a.id === targetStudent?.currentAgencyId);

    // --- 3. RECONSTRUCTION DE L'HISTORIQUE (TIMELINE) ---
    const studentTimeline = useMemo(() => {
        if (!targetStudent) return [];
        const timelineMap: Record<string, { weekId: string; agencyName: string; reviewsReceived: PeerReview[]; reviewsGiven: PeerReview[]; }> = {};

        agencies.forEach(agency => {
            const allReviews = [...(agency.peerReviews || []), ...(agency.reviewHistory || [])];
            allReviews.forEach(r => {
                if (r.targetId === targetStudent.id || r.reviewerId === targetStudent.id) {
                    if (!timelineMap[r.weekId]) {
                        timelineMap[r.weekId] = { weekId: r.weekId, agencyName: agency.name, reviewsReceived: [], reviewsGiven: [] };
                    }
                    timelineMap[r.weekId].agencyName = agency.name;
                    if (r.targetId === targetStudent.id) timelineMap[r.weekId].reviewsReceived.push(r);
                    if (r.reviewerId === targetStudent.id) timelineMap[r.weekId].reviewsGiven.push(r);
                }
            });
        });
        return Object.values(timelineMap).sort((a, b) => parseInt(b.weekId) - parseInt(a.weekId));
    }, [targetStudent, agencies]);

    // --- 4. ANALYSE COMPORTEMENTALE (SOFT SKILLS) ---
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

    // --- 5. PORTFOLIO & ANALYTICS PRODUCTION ---
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
        <div className="animate-in fade-in pb-20">
            <div className="mb-8">
                <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-xl text-white"><User size={32}/></div>
                    Dossier Étudiant & Analytique
                </h2>
                <p className="text-slate-500 text-sm mt-1">Analyse 360° : Comportement, Production et Trajectoire.</p>
            </div>

            <TrackerStats globalStats={globalStats} />

            {/* SELECTOR */}
            <div className="mb-8 p-1 bg-slate-200 rounded-2xl flex items-center gap-4 max-w-2xl shadow-inner">
                <div className="px-4 font-bold text-slate-500 uppercase text-xs">Rechercher :</div>
                <select 
                    className="flex-1 p-3 rounded-xl border-none font-bold bg-white focus:ring-2 focus:ring-indigo-500 shadow-sm outline-none cursor-pointer hover:bg-slate-50 transition-colors text-slate-900"
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    value={selectedStudentId}
                >
                    <option value="">-- Sélectionner un dossier --</option>
                    {allStudents.map(s => (
                        <option key={s.id} value={s.id}>{s.name} (Classe {s.classId}) - {s.currentAgencyName}</option>
                    ))}
                </select>
            </div>

            {targetStudent && targetAgency ? (
                <StudentProfile 
                    student={targetStudent}
                    agency={targetAgency}
                    timeline={studentTimeline}
                    behaviorStats={behaviorStats}
                    portfolio={portfolio}
                    chartData={chartData}
                    gradeDistribution={gradeDistribution}
                />
            ) : (
                <div className="text-center py-20 bg-slate-100 rounded-3xl border-2 border-dashed border-slate-300">
                    <User size={48} className="mx-auto text-slate-300 mb-4"/>
                    <p className="text-slate-500 font-bold">Sélectionnez un étudiant pour ouvrir son dossier.</p>
                </div>
            )}
        </div>
    );
};
