
import React, { useState } from 'react';
import { Agency, Student } from '../../../types';
import { Crown, Clock, Wallet, HelpCircle, Activity } from 'lucide-react';
import { GAME_RULES } from '../../../constants';
import { Modal } from '../../Modal';

interface SoloPanelProps {
    agency: Agency;
    student: Student;
}

export const SoloPanel: React.FC<SoloPanelProps> = ({ agency, student }) => {
    const [showRules, setShowRules] = useState(false);

    // Calcul visuel du Ratio de Survie
    const survivalWeeks = Math.floor(agency.budget_real / GAME_RULES.AGENCY_RENT);
    const isSafe = survivalWeeks >= 3;

    return (
        <div className="space-y-6">
            {/* HERO BANNER */}
            <div className="bg-indigo-900 text-white rounded-3xl p-8 relative overflow-hidden shadow-xl border border-indigo-700">
                <div className="absolute right-0 top-0 opacity-10 p-4">
                    <Crown size={180}/>
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">Mode Indépendant</span>
                        <Crown className="text-yellow-400" size={20}/>
                    </div>
                    <h2 className="text-3xl font-display font-bold mb-2">Tableau de Bord Solo</h2>
                    <p className="text-indigo-200 text-sm max-w-xl leading-relaxed">
                        En tant que Solopreneur, vous ne dépendez pas des votes de vos pairs.
                        Votre score est calculé algorithmiquement selon votre gestion du temps, de l'argent et votre lucidité.
                    </p>
                </div>
            </div>

            {/* METRICS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. HEALTH (VE) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                <Activity size={18} className="text-indigo-500"/> Performance (VE)
                            </h4>
                            <span className={`text-xl font-bold ${agency.ve_current >= 60 ? 'text-emerald-500' : 'text-amber-500'}`}>{agency.ve_current}</span>
                        </div>
                        <div className="space-y-2 text-xs text-slate-500">
                            <div className="flex justify-between"><span>VE ≥ 60</span> <span className="font-bold text-emerald-600">+2 Score</span></div>
                            <div className="flex justify-between"><span>VE ≥ 40</span> <span className="font-bold text-amber-600">+1 Score</span></div>
                            <div className="flex justify-between"><span>VE &lt; 40</span> <span className="font-bold text-red-600">0 / -2 Score</span></div>
                        </div>
                    </div>
                </div>

                {/* 2. SURVIVAL RATIO */}
                <div className={`p-6 rounded-2xl border shadow-sm flex flex-col justify-between ${isSafe ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className={`font-bold flex items-center gap-2 ${isSafe ? 'text-emerald-900' : 'text-red-900'}`}>
                                <Wallet size={18}/> Ratio de Survie
                            </h4>
                            <span className="font-bold text-lg">{survivalWeeks} Semaines</span>
                        </div>
                        <p className={`text-xs mb-3 ${isSafe ? 'text-emerald-700' : 'text-red-700'}`}>
                            {isSafe 
                                ? "Votre épargne sécurise l'avenir de l'agence. Bonus activé." 
                                : "Trésorerie trop faible (< 3 semaines). Pas de bonus."}
                        </p>
                    </div>
                    {isSafe && <div className="bg-white/50 px-3 py-1 rounded text-center text-xs font-bold text-emerald-800 uppercase">+2 Points Score</div>}
                </div>

                {/* 3. EARLY BIRD */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                <Clock size={18} className="text-amber-500"/> Early Bird
                            </h4>
                        </div>
                        <div className="space-y-2 text-xs text-slate-500">
                            <p className="leading-relaxed">Rendre vos fichiers en avance rapporte des points immédiats.</p>
                            <div className="flex justify-between mt-2"><span>&gt; 24h avant</span> <span className="font-bold text-emerald-600">+3 Score</span></div>
                            <div className="flex justify-between"><span>&gt; 12h avant</span> <span className="font-bold text-emerald-600">+1 Score</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="text-center">
                <button onClick={() => setShowRules(true)} className="text-slate-400 text-xs font-bold hover:text-indigo-600 flex items-center justify-center gap-1 mx-auto">
                    <HelpCircle size={12}/> Voir détails du calcul
                </button>
            </div>

            <Modal isOpen={showRules} onClose={() => setShowRules(false)} title="Règles Solopreneur">
                <div className="space-y-4 text-sm text-slate-600">
                    <p>En solo, vous cumulez les points de ces 3 catégories chaque semaine :</p>
                    <ul className="list-disc pl-4 space-y-1">
                        <li><strong>Santé Agence (Max +2)</strong> : Basé sur la VE.</li>
                        <li><strong>Survie (Max +2)</strong> : Basé sur le budget (>1500 PiXi).</li>
                        <li><strong>Early Bird (Max +3)</strong> : Par rendu effectué en avance.</li>
                    </ul>
                    <p className="mt-2 font-bold text-indigo-600">Bonus Lucidité : +2 si votre auto-évaluation correspond à la note de l'enseignant.</p>
                </div>
            </Modal>
        </div>
    );
};
