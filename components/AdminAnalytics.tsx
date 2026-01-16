
import React, { useMemo, useState } from 'react';
import { Agency, Student } from '../types';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, Users, Wallet, Trophy, AlertTriangle, Lightbulb, Activity, PieChart, Eye, EyeOff } from 'lucide-react';

interface AdminAnalyticsProps {
    agencies: Agency[];
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({ agencies }) => {
    const [showKarma, setShowKarma] = useState(false);
    
    // --- DATA PROCESSING ---
    const activeAgencies = useMemo(() => agencies.filter(a => a.id !== 'unassigned'), [agencies]);
    
    const allStudents = useMemo(() => {
        const students: (Student & { agencyName: string, agencyId: string })[] = [];
        activeAgencies.forEach(a => {
            a.members.forEach(m => students.push({ ...m, agencyName: a.name, agencyId: a.id }));
        });
        return students;
    }, [activeAgencies]);

    // 1. SCATTER DATA: TALENT vs AGENCY PERFORMANCE
    const scatterData = useMemo(() => {
        return activeAgencies.map(a => {
            const avgScore = a.members.length > 0 
                ? a.members.reduce((acc, m) => acc + m.individualScore, 0) / a.members.length 
                : 0;
            return {
                name: a.name,
                ve: a.ve_current, // Y Axis
                avgScore: Math.round(avgScore), // X Axis
                classId: a.classId,
                members: a.members.length
            };
        });
    }, [activeAgencies]);

    // 2. RADAR DATA: SOFT SKILLS (From Peer Reviews)
    const radarData = useMemo(() => {
        let totalAttendance = 0, totalQuality = 0, totalInvolvement = 0;
        let count = 0;

        activeAgencies.forEach(a => {
            a.peerReviews.forEach(r => {
                totalAttendance += r.ratings.attendance;
                totalQuality += r.ratings.quality;
                totalInvolvement += r.ratings.involvement;
                count++;
            });
        });

        if (count === 0) return [];

        return [
            { subject: 'Assiduité', A: parseFloat((totalAttendance / count).toFixed(2)), fullMark: 5 },
            { subject: 'Qualité', A: parseFloat((totalQuality / count).toFixed(2)), fullMark: 5 },
            { subject: 'Implication', A: parseFloat((totalInvolvement / count).toFixed(2)), fullMark: 5 },
        ];
    }, [activeAgencies]);

    // 3. WEALTH DISTRIBUTION
    const wealthData = useMemo(() => {
        const sorted = [...allStudents].sort((a,b) => (b.wallet || 0) - (a.wallet || 0));
        const top10 = sorted.slice(0, 10);
        const flop5 = sorted.slice(-5).reverse();
        return { top10, flop5 };
    }, [allStudents]);

    // 4. TOP PERFORMERS (High Potential)
    const topPerformers = useMemo(() => {
        return [...allStudents]
            .sort((a,b) => b.individualScore - a.individualScore)
            .slice(0, 5);
    }, [allStudents]);

    // 5. KARMA LIST
    const karmaList = useMemo(() => {
        return [...allStudents].sort((a,b) => (b.karma || 0) - (a.karma || 0));
    }, [allStudents]);

    // Custom Tooltip for Scatter
    const ScatterTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl text-xs">
                    <p className="font-bold text-slate-900 mb-1">{data.name}</p>
                    <p className="text-indigo-600 font-bold">VE: {data.ve}</p>
                    <p className="text-slate-500">Moy. Talent: {data.avgScore}/100</p>
                    <p className="text-slate-400 italic">{data.members} membres</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="animate-in fade-in duration-500 pb-20">
            <div className="mb-8">
                <h2 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-xl text-purple-700"><PieChart size={32}/></div>
                    Centre d'Analyse
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                    Métriques avancées pour détecter les anomalies et les talents cachés.
                </p>
            </div>

            {/* KPI ROW */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600"><Users size={24}/></div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">Effectif Total</p>
                        <p className="text-2xl font-bold text-slate-900">{allStudents.length}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><Activity size={24}/></div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">Moyenne Promo</p>
                        <p className="text-2xl font-bold text-slate-900">
                            {Math.round(allStudents.reduce((acc, s) => acc + s.individualScore, 0) / Math.max(1, allStudents.length))}
                            <span className="text-sm text-slate-400 font-medium">/100</span>
                        </p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-yellow-50 rounded-xl text-yellow-600"><Wallet size={24}/></div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">Masse Monétaire</p>
                        <p className="text-2xl font-bold text-slate-900">
                            {(allStudents.reduce((acc, s) => acc + (s.wallet || 0), 0) / 1000).toFixed(1)}k
                            <span className="text-sm text-slate-400 font-medium"> px</span>
                        </p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-50 rounded-xl text-red-600"><AlertTriangle size={24}/></div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase">Agences Fragiles</p>
                        <p className="text-2xl font-bold text-slate-900">
                            {activeAgencies.filter(a => a.ve_current < 40 || a.budget_real < 0).length}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                
                {/* 1. SCATTER CHART: Matrix Talent/Performance */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Lightbulb size={20} className="text-amber-500"/> Matrice Talent / Performance
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                <strong>Haut-Gauche :</strong> Agence performante mais équipe faible (Leadeurs ?).<br/>
                                <strong>Bas-Droite :</strong> Talents gâchés (Bons élèves, mauvaise gestion).
                            </p>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" dataKey="avgScore" name="Moyenne Talent" unit="/100" domain={[0, 100]} />
                                <YAxis type="number" dataKey="ve" name="Valeur Agence" unit=" VE" domain={[0, 100]} />
                                <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                                <Legend />
                                <Scatter name="Agences" data={scatterData} fill="#6366f1" shape="circle" />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. RADAR CHART: Soft Skills */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
                        <Users size={20} className="text-emerald-500"/> Radar RH (Moyenne Promo)
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">Basé sur les évaluations hebdomadaires entre pairs.</p>
                    
                    <div className="flex-1 min-h-[300px]">
                        {radarData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                    <PolarGrid stroke="#e2e8f0" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} />
                                    <Radar name="Promo" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                                    <Tooltip 
                                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}
                                        itemStyle={{color: '#065f46', fontWeight: 'bold'}}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                                Pas assez de données RH.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                
                {/* 3. HIGH POTENTIALS */}
                <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl lg:col-span-1">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                        <Trophy size={20} className="text-yellow-400"/> Top Performers
                    </h3>
                    <div className="space-y-4">
                        {topPerformers.map((student, i) => (
                            <div key={student.id} className="flex items-center gap-3 p-3 bg-white/10 rounded-xl border border-white/5">
                                <div className="font-bold text-lg text-white/50 w-6">#{i+1}</div>
                                <img src={student.avatarUrl} className="w-10 h-10 rounded-full bg-slate-800" />
                                <div className="flex-1 overflow-hidden">
                                    <p className="font-bold text-sm truncate">{student.name}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{student.agencyName}</p>
                                </div>
                                <div className="text-right">
                                    <span className="block font-bold text-emerald-400">{student.individualScore}</span>
                                    <span className="text-[10px] text-slate-500">SCORE</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. WEALTH DISTRIBUTION */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
                        <TrendingUp size={20} className="text-indigo-500"/> Inégalités Économiques (Top 10 vs Flop 5)
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={[...wealthData.top10, ...wealthData.flop5]}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} angle={-20} textAnchor="end" height={60}/>
                                <YAxis />
                                <Tooltip 
                                    cursor={{fill: '#f8fafc'}}
                                    contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0'}}
                                />
                                <Bar dataKey="wallet" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 5. SECRET KARMA POLICE */}
            <div className="bg-slate-100 rounded-3xl p-6 border-2 border-slate-200 relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                            <EyeOff size={20}/> Karma Police (Secret)
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Score caché comportemental (Donations +10, Retards -5, etc.)</p>
                    </div>
                    <button 
                        onClick={() => setShowKarma(!showKarma)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${showKarma ? 'bg-slate-900 text-white' : 'bg-white border text-slate-500'}`}
                    >
                        {showKarma ? <EyeOff size={16}/> : <Eye size={16}/>}
                        {showKarma ? 'Masquer' : 'Révéler'}
                    </button>
                </div>

                {showKarma ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4">
                        {karmaList.slice(0, 12).map((s, i) => (
                            <div key={s.id} className="bg-white p-3 rounded-xl flex items-center justify-between border border-slate-200">
                                <div className="flex items-center gap-3">
                                    <div className="text-xs font-bold text-slate-300 w-4">#{i+1}</div>
                                    <div>
                                        <p className="font-bold text-sm text-slate-800">{s.name}</p>
                                        <p className="text-[10px] text-slate-400">{s.agencyName}</p>
                                    </div>
                                </div>
                                <div className={`font-mono font-bold ${(s.karma || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {(s.karma || 0) > 0 ? '+' : ''}{s.karma || 0}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-24 flex items-center justify-center text-slate-400 text-sm italic">
                        Données masquées. Cliquez pour révéler.
                    </div>
                )}
            </div>
        </div>
    );
};
