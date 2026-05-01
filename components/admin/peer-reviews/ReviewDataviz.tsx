import React, { useMemo, useState } from 'react';
import { PeerReview } from '../../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface EnrichedReview extends PeerReview {
    agencyName: string;
    classId: string;
}

interface ReviewDatavizProps {
    reviews: EnrichedReview[];
    initialStudentId?: string;
    hideStudentSelector?: boolean;
    mode?: 'full' | 'progression_only';
}

export const ReviewDataviz: React.FC<ReviewDatavizProps> = ({ reviews, initialStudentId, hideStudentSelector, mode = 'full' }) => {
    const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId || '');

    const students = useMemo(() => {
        const map = new Map<string, string>();
        reviews.forEach(r => {
            if (!map.has(r.targetId)) {
                map.set(r.targetId, r.targetName);
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }, [reviews]);

    // Averages per Agency
    const agencyData = useMemo(() => {
        const map = new Map<string, { totalAttendance: number, totalQuality: number, totalInvolvement: number, count: number, name: string }>();
        reviews.forEach(r => {
            if (!map.has(r.agencyName)) {
                map.set(r.agencyName, { totalAttendance: 0, totalQuality: 0, totalInvolvement: 0, count: 0, name: r.agencyName });
            }
            const data = map.get(r.agencyName)!;
            data.totalAttendance += r.ratings.attendance;
            data.totalQuality += r.ratings.quality;
            data.totalInvolvement += r.ratings.involvement;
            data.count++;
        });

        return Array.from(map.values()).map(d => ({
            name: d.name,
            Assiduité: Number((d.totalAttendance / d.count).toFixed(2)),
            Qualité: Number((d.totalQuality / d.count).toFixed(2)),
            Implication: Number((d.totalInvolvement / d.count).toFixed(2)),
            count: d.count
        })).sort((a, b) => b.count - a.count);
    }, [reviews]);

    // Average rating progression over weeks
    const progressionData = useMemo(() => {
        const map = new Map<string, { totalScore: number, count: number, studentScore: number, studentCount: number, week: string }>();
        reviews.forEach(r => {
            const weekKey = `Semaine ${r.weekId}`;
            if (!map.has(weekKey)) {
                map.set(weekKey, { totalScore: 0, count: 0, studentScore: 0, studentCount: 0, week: weekKey });
            }
            const data = map.get(weekKey)!;
            data.totalScore += r.totalScore || 0;
            data.count++;

            // Use the target selector, or fallback if they just want their own data
            const effectiveStudentId = selectedStudentId || initialStudentId;

            if (effectiveStudentId && r.targetId === effectiveStudentId) {
                data.studentScore += r.totalScore || 0;
                data.studentCount++;
            }
        });

        const effectiveStudentId = selectedStudentId || initialStudentId;

        return Array.from(map.values())
            .map(d => {
                const globalAvg = Number((d.totalScore / (d.count || 1)).toFixed(2));
                const studentAvg = effectiveStudentId && d.studentCount > 0 ? Number((d.studentScore / d.studentCount).toFixed(2)) : null;
                return {
                    week: d.week,
                    MoyenneGlobale: globalAvg,
                    MoyenneEtudiant: studentAvg,
                    count: d.count
                };
            })
            .sort((a, b) => a.week.localeCompare(b.week));
    }, [reviews, selectedStudentId, initialStudentId]);

    if (reviews.length === 0) {
        return (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500">
                Pas assez de données pour afficher la dataviz.
            </div>
        );
    }

    const effectiveStudentId = selectedStudentId || initialStudentId;

    const renderProgressionChart = () => (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h3 className="text-lg font-bold text-slate-800">Évolution dans le temps (Bilans RH)</h3>
                {!hideStudentSelector && (
                    <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500 max-w-[200px]"
                    >
                        <option value="">Par rapport à (Optionnel)</option>
                        {students.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                )}
            </div>
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} domain={[0, 5]} />
                        <RechartsTooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Line name="Moyenne Globale" type="monotone" dataKey="MoyenneGlobale" stroke="#94A3B8" strokeWidth={2} dot={{r: 4}} strokeDasharray="5 5" />
                        {effectiveStudentId && (
                            <Line name={students.find(s => s.id === effectiveStudentId)?.name || 'Étudiant'} type="monotone" dataKey="MoyenneEtudiant" stroke="#10B981" strokeWidth={3} dot={{r: 6, fill: '#10B981'}} activeDot={{r: 8}} connectNulls />
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    if (mode === 'progression_only') {
        return renderProgressionChart();
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Graphique Moyennes par Agence */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Moyennes des critères par Agence</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={agencyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} domain={[0, 5]} />
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{fill: '#F1F5F9'}}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="Assiduité" fill="#818CF8" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Qualité" fill="#34D399" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Implication" fill="#FBBF24" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {renderProgressionChart()}
            </div>
        </div>
    );
};
