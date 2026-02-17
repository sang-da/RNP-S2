
import React, { useState } from 'react';
import { Student, Agency, Deliverable, PeerReview } from '../../../types';
import { User, Wallet, TrendingUp, Trophy, Activity, Star, BarChart2, FileText, Crown, Building2, Settings, ArrowRight, History, StickyNote, Lock, Globe, FileCog } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';
import { StudentEditModal } from './StudentEditModal';

interface StudentProfileProps {
    student: Student;
    agency: Agency;
    allAgencies: Agency[];
    timeline: any[];
    behaviorStats: any;
    portfolio: any[];
    chartData: any[];
    gradeDistribution: any[];
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ student, agency, allAgencies, timeline, behaviorStats, portfolio, chartData, gradeDistribution }) => {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const displayHistory = (student.history && student.history.length > 0) ? student.history.sort((a,b) => b.date.localeCompare(a.date)) : [];

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
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
                    <div className="flex justify-end mb-4">
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

            {/* NOTES PEDAGOGIQUES (NEW) */}
            {student.notes && student.notes.length > 0 && (
                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200 shadow-sm">
                    <h4 className="font-bold text-amber-900 flex items-center gap-2 mb-4"><StickyNote size={20}/> Notes & Suivi Pédagogique</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {student.notes.sort((a,b) => b.date.localeCompare(a.date)).map(note => (
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
                        
                        {displayHistory.length > 0 ? (
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
                        ) : timeline.length > 0 ? (
                            <div className="space-y-6 relative before:absolute before:left-[19px] before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-100">
                                {timeline.map((step, idx) => {
                                    const avgReceived = step.reviewsReceived.length ? (step.reviewsReceived.reduce((a:any,b:any) => a + (b.ratings.quality+b.ratings.attendance+b.ratings.involvement)/3, 0) / step.reviewsReceived.length) : 0;
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
                                                {step.reviewsReceived.length > 0 && (
                                                    <div className="mt-3 space-y-2">
                                                        <p className="text-[10px] font-bold uppercase text-slate-400">Feedbacks Reçus</p>
                                                        {step.reviewsReceived.map((r:any) => (
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

            <StudentEditModal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
                student={student} 
                agency={agency} 
                allAgencies={allAgencies}
            />
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
