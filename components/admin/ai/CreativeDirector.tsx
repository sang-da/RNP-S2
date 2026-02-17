
import React, { useState } from 'react';
import { Agency } from '../../../types';
import { askGroq } from '../../../services/groqService';
import { useUI } from '../../../contexts/UIContext';
import { useGame } from '../../../contexts/GameContext';
import { Rocket, Sparkles, RefreshCw, PenTool, Target, Coins } from 'lucide-react';

export const CreativeDirector: React.FC<{agencies: Agency[]}> = ({ agencies }) => {
    const { toast } = useUI();
    const { sendChallenge } = useGame();
    
    const [targetAgencyId, setTargetAgencyId] = useState(agencies.filter(a => a.id !== 'unassigned')[0]?.id || "");
    const [challengeForm, setChallengeForm] = useState({ title: '', description: '', rewardVE: 10, rewardBudget: 500 });
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        const agency = agencies.find(a => a.id === targetAgencyId);
        if(!agency) return;

        const prompt = `Agis comme un CLIENT EXIGEANT pour l'agence "${agency.name}".
        Projet : "${agency.projectDef.theme}" / Problème : "${agency.projectDef.problem}".
        Rédige un BRIEF DE MISSION SPÉCIALE (Challenge) précis.
        Format JSON: { "title": "...", "description": "..." }`;

        try {
            const result = await askGroq(prompt, {}, "Tu es un client VIP. JSON.");
            const jsonStr = result.substring(result.indexOf('{'), result.lastIndexOf('}') + 1);
            const parsed = JSON.parse(jsonStr);
            setChallengeForm(prev => ({ ...prev, title: parsed.title, description: parsed.description }));
        } catch(e) {
            toast('error', "Erreur IA.");
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!targetAgencyId || !challengeForm.title) return;
        await sendChallenge(targetAgencyId, challengeForm.title, challengeForm.description, challengeForm.rewardVE, challengeForm.rewardBudget);
        setChallengeForm({ title: '', description: '', rewardVE: 10, rewardBudget: 500 });
        toast('success', "Challenge envoyé !");
    };

    return (
        <div className="flex h-full">
            {/* LEFT CONFIG */}
            <div className="w-1/3 bg-slate-50 border-r border-slate-200 p-6 flex flex-col gap-6">
                <div>
                    <label className="block text-xs font-bold uppercase mb-2 text-slate-500">Agence Cible</label>
                    <select 
                        value={targetAgencyId} 
                        onChange={e => setTargetAgencyId(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-300 font-bold"
                    >
                        {agencies.filter(a => a.id !== 'unassigned').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                </div>
                
                <button 
                    onClick={handleGenerate} 
                    disabled={loading}
                    className="w-full py-4 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                    {loading ? <RefreshCw className="animate-spin"/> : <Sparkles/>}
                    Générer Idée
                </button>
            </div>

            {/* RIGHT FORM */}
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Rocket className="text-purple-600"/> Éditeur de Mission
                </h3>
                
                <div className="space-y-4 max-w-2xl">
                    <input 
                        type="text" 
                        value={challengeForm.title}
                        onChange={e => setChallengeForm({...challengeForm, title: e.target.value})}
                        className="w-full p-4 text-lg font-bold border border-slate-200 rounded-xl"
                        placeholder="Titre de la mission..."
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-400 mb-1 flex items-center gap-1"><Target size={12}/> Gain VE</label>
                            <input type="number" value={challengeForm.rewardVE} onChange={e => setChallengeForm({...challengeForm, rewardVE: Number(e.target.value)})} className="w-full p-3 border border-slate-200 rounded-xl font-bold"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-400 mb-1 flex items-center gap-1"><Coins size={12}/> Gain Budget</label>
                            <input type="number" value={challengeForm.rewardBudget} onChange={e => setChallengeForm({...challengeForm, rewardBudget: Number(e.target.value)})} className="w-full p-3 border border-slate-200 rounded-xl font-bold"/>
                        </div>
                    </div>

                    <textarea 
                        value={challengeForm.description}
                        onChange={e => setChallengeForm({...challengeForm, description: e.target.value})}
                        className="w-full p-4 h-48 border border-slate-200 rounded-xl resize-none text-sm leading-relaxed"
                        placeholder="Description détaillée du livrable attendu..."
                    />

                    <button 
                        onClick={handleSend}
                        disabled={!challengeForm.title}
                        className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                    >
                        <PenTool size={18}/> Envoyer l'Offre
                    </button>
                </div>
            </div>
        </div>
    );
};
