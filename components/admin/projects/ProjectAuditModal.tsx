
import React, { useState, useEffect } from 'react';
import { Modal } from '../../Modal';
import { Agency } from '../../../types';
import { askGroq } from '../../../services/groqService';
import { Sparkles, AlertTriangle, CheckCircle2, RefreshCw, XCircle, Lightbulb, Target } from 'lucide-react';

interface ProjectAuditModalProps {
    isOpen: boolean;
    onClose: () => void;
    agency: Agency;
}

interface AuditResult {
    concept_score: number;
    viability_score: number;
    strengths: string[];
    weaknesses: string[];
    verdict: string;
    pivot_idea: string;
    roast: string;
}

export const ProjectAuditModal: React.FC<ProjectAuditModalProps> = ({ isOpen, onClose, agency }) => {
    const [loading, setLoading] = useState(true);
    const [audit, setAudit] = useState<AuditResult | null>(null);

    useEffect(() => {
        if (isOpen && agency) {
            runAudit();
        }
    }, [isOpen, agency]);

    const runAudit = async () => {
        setLoading(true);
        setAudit(null);

        const prompt = `
            Agis comme un Directeur de Création impitoyable et visionnaire (type jury de concours d'architecture).
            Analyse ce projet étudiant :
            - Nom Agence : ${agency.name}
            - Thème : ${agency.projectDef.theme}
            - Problème : ${agency.projectDef.problem}
            - Cible : ${agency.projectDef.target}
            - Lieu : ${agency.projectDef.location}
            - Geste Architectural : ${agency.projectDef.gesture}
            - Direction Artistique : ${agency.projectDef.direction}

            Génère un rapport CRITIQUE au format JSON STRICT :
            {
                "concept_score": (0-100, note la cohérence globale),
                "viability_score": (0-100, note le réalisme et l'intérêt marché),
                "strengths": ["point fort 1", "point fort 2"],
                "weaknesses": ["faille 1", "faille 2"],
                "verdict": "Un paragraphe cinglant mais constructif sur le potentiel du projet.",
                "pivot_idea": "Une idée radicale pour améliorer le concept.",
                "roast": "Une phrase sarcastique ou drôle pour les taquiner."
            }
            Ne réponds QUE le JSON.
        `;

        try {
            const response = await askGroq(prompt, {}, "Tu es un expert critique en design et stratégie.");
            // Nettoyage au cas où le LLM ajoute du texte autour
            const jsonStr = response.substring(response.indexOf('{'), response.lastIndexOf('}') + 1);
            setAudit(JSON.parse(jsonStr));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-500';
        if (score >= 50) return 'text-amber-500';
        return 'text-red-500';
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Audit IA : ${agency.name}`}>
            <div className="min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 space-y-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={24}/>
                        </div>
                        <p className="animate-pulse font-medium">Le Directeur de Création analyse le dossier...</p>
                    </div>
                ) : audit ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        
                        {/* SCORES HEADER */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-1">Concept</span>
                                <span className={`text-4xl font-black ${getScoreColor(audit.concept_score)}`}>{audit.concept_score}</span>
                                <span className="text-xs text-slate-400">/100</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-1">Viabilité</span>
                                <span className={`text-4xl font-black ${getScoreColor(audit.viability_score)}`}>{audit.viability_score}</span>
                                <span className="text-xs text-slate-400">/100</span>
                            </div>
                        </div>

                        {/* VERDICT & ROAST */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                                <Target size={18} className="text-indigo-600"/> Verdict du Jury
                            </h4>
                            <p className="text-sm text-slate-700 leading-relaxed mb-4">
                                {audit.verdict}
                            </p>
                            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-xs italic text-indigo-800 flex gap-2">
                                <span className="font-black not-italic">🔥</span> "{audit.roast}"
                            </div>
                        </div>

                        {/* STRENGTHS / WEAKNESSES */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                <h5 className="font-bold text-emerald-800 text-xs uppercase mb-3 flex items-center gap-2">
                                    <CheckCircle2 size={14}/> Points Forts
                                </h5>
                                <ul className="space-y-2">
                                    {audit.strengths.map((s, i) => (
                                        <li key={i} className="text-xs text-emerald-700 font-medium flex gap-2 items-start">
                                            <span className="mt-1 w-1 h-1 rounded-full bg-emerald-400 shrink-0"></span> {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                                <h5 className="font-bold text-red-800 text-xs uppercase mb-3 flex items-center gap-2">
                                    <XCircle size={14}/> Faiblesses
                                </h5>
                                <ul className="space-y-2">
                                    {audit.weaknesses.map((s, i) => (
                                        <li key={i} className="text-xs text-red-700 font-medium flex gap-2 items-start">
                                            <span className="mt-1 w-1 h-1 rounded-full bg-red-400 shrink-0"></span> {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* PIVOT IDEA */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Lightbulb size={64}/></div>
                            <h4 className="font-bold text-sm mb-2 flex items-center gap-2 relative z-10">
                                <Lightbulb size={16} className="text-yellow-300"/> Idée de Pivot
                            </h4>
                            <p className="text-sm font-medium leading-relaxed opacity-90 relative z-10">
                                {audit.pivot_idea}
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <button 
                                onClick={runAudit}
                                className="text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                            >
                                <RefreshCw size={12}/> Régénérer l'audit
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[300px] text-red-400">
                        <AlertTriangle size={32} className="mb-2"/>
                        <p>Erreur lors de l'analyse. Veuillez réessayer.</p>
                        <button onClick={runAudit} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-bold text-slate-600">Réessayer</button>
                    </div>
                )}
            </div>
        </Modal>
    );
};
