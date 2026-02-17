
import React, { useState } from 'react';
import { Agency } from '../../../types';
import { askGroq } from '../../../services/groqService';
import { useUI } from '../../../contexts/UIContext';
import { Fingerprint, RefreshCw, User } from 'lucide-react';

export const Profiler: React.FC<{agencies: Agency[]}> = ({ agencies }) => {
    const { toast } = useUI();
    const [targetStudentId, setTargetStudentId] = useState("");
    const [profileResult, setProfileResult] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);

    const handleAnalyze = async () => {
        if(!targetStudentId) return;
        setLoading(true);
        
        let studentData = null;
        let agencyContext = null;

        for (const a of agencies) {
            const s = a.members.find(m => m.id === targetStudentId);
            if (s) {
                studentData = s;
                agencyContext = a;
                break;
            }
        }

        if (!studentData) { setLoading(false); return; }

        const prompt = `Analyse le profil de l'étudiant ${studentData.name}.
        Données : Score ${studentData.individualScore}/100, Rôle: ${studentData.role}, Wallet: ${studentData.wallet}.
        Agence : ${agencyContext?.name} (VE: ${agencyContext?.ve_current}).
        
        Génère un JSON STRICT : { "psychological_profile": "...", "soft_skills": { "leadership": 0-100, "teamwork": 0-100, "reliability": 0-100 }, "verdict": "...", "recommendation": "..." }`;

        try {
            const result = await askGroq(prompt, { student: studentData }, "Tu es un profiler RH expert. JSON.");
            const jsonStr = result.substring(result.indexOf('{'), result.lastIndexOf('}') + 1);
            setProfileResult(JSON.parse(jsonStr));
        } catch (error) {
            toast('error', "Erreur Analyse.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full p-6">
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Sélectionnez un étudiant</label>
                    <select 
                        value={targetStudentId}
                        onChange={e => setTargetStudentId(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    >
                        <option value="">-- Choisir un profil --</option>
                        {agencies.map(agency => (
                            <optgroup key={agency.id} label={agency.name}>
                                {agency.members.map(member => (
                                    <option key={member.id} value={member.id}>
                                        {member.name} (Score: {member.individualScore})
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>
                <div className="flex items-end">
                    <button 
                        onClick={handleAnalyze}
                        disabled={loading || !targetStudentId}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors h-[48px] shadow-lg"
                    >
                        {loading ? <RefreshCw className="animate-spin"/> : <Fingerprint/>}
                        Lancer le Profilage
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-slate-100 rounded-3xl p-6 overflow-y-auto">
                {profileResult ? (
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-slate-900 rounded-full text-white"><User size={32}/></div>
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900">Rapport Confidentiel</h3>
                                    <p className="text-slate-500 text-sm">ID Sujet: {targetStudentId.slice(0,8)}</p>
                                </div>
                            </div>
                            <div className="px-6 py-3 rounded-xl border-2 border-slate-300 font-black text-xl uppercase tracking-widest text-slate-500">
                                {profileResult.verdict}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                                <h4 className="font-bold text-slate-400 uppercase text-xs tracking-widest border-b pb-2">Métriques</h4>
                                <MetricBar label="Leadership" value={profileResult.soft_skills.leadership} color="bg-indigo-500" />
                                <MetricBar label="Esprit d'Équipe" value={profileResult.soft_skills.teamwork} color="bg-pink-500" />
                                <MetricBar label="Fiabilité" value={profileResult.soft_skills.reliability} color="bg-cyan-500" />
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                                <h4 className="font-bold text-slate-400 uppercase text-xs tracking-widest border-b pb-2 mb-4">Profil Psychologique</h4>
                                <p className="text-sm text-slate-700 leading-relaxed italic mb-6">"{profileResult.psychological_profile}"</p>
                                <div className="mt-auto bg-slate-50 p-4 rounded-xl border-l-4 border-indigo-500">
                                    <p className="text-xs font-bold text-indigo-500 uppercase mb-1">Recommendation IA</p>
                                    <p className="text-sm font-bold text-slate-900">{profileResult.recommendation}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                        <Fingerprint size={64} className="mb-4"/>
                        <p className="font-bold">En attente de données...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const MetricBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div>
        <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
            <span>{label}</span>
            <span>{value}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${color}`} style={{ width: `${value}%` }}></div>
        </div>
    </div>
);
