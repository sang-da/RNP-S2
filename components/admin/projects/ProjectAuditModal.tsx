
import React, { useState, useEffect } from 'react';
import { Modal } from '../../Modal';
import { Agency, AuditResult } from '../../../types';
import { askGroq } from '../../../services/groqService';
import { Sparkles, AlertTriangle, CheckCircle2, RefreshCw, XCircle, Target, BrainCircuit, Calculator } from 'lucide-react';
import { doc, updateDoc, db } from '../../../services/firebase';
import { useUI } from '../../../contexts/UIContext';

interface ProjectAuditModalProps {
    isOpen: boolean;
    onClose: () => void;
    agency: Agency;
    onAuditComplete?: () => void; // Callback pour refresh parent si besoin
}

export const ProjectAuditModal: React.FC<ProjectAuditModalProps> = ({ isOpen, onClose, agency, onAuditComplete }) => {
    const { toast } = useUI();
    const [loading, setLoading] = useState(false);
    const [audit, setAudit] = useState<AuditResult | null>(null);

    // Initialisation : On charge les données existantes s'il y en a
    useEffect(() => {
        if (isOpen && agency) {
            if (agency.aiAudit) {
                setAudit(agency.aiAudit);
                setLoading(false);
            } else {
                runDualAudit(); // Si pas d'audit, on lance
            }
        }
    }, [isOpen, agency]);

    const runDualAudit = async () => {
        setLoading(true);
        setAudit(null);

        // --- PROMPT 1 : LE CALCULATEUR (STRICT & FROID) ---
        const promptScore = `
            Agis comme un algorithme de notation financière et structurelle ultra-strict. Pas de sentiment.
            
            Analyse ce projet :
            - Thème : ${agency.projectDef.theme || "Non défini"}
            - Problème : ${agency.projectDef.problem || "Non défini"}
            - Cible : ${agency.projectDef.target || "Non défini"}
            - Lieu : ${agency.projectDef.location || "Non défini"}

            Barème de notation (Sois SÉVÈRE, la moyenne est à 50/100) :
            - 0-30 : Incohérent ou vide.
            - 31-50 : Passable mais banal.
            - 51-70 : Bon projet solide.
            - 71-85 : Excellent.
            - 86-100 : Révolutionnaire (Extrêmement rare).

            Sortie JSON STRICT :
            {
                "concept_score": (integer 0-100, note la cohérence problème/solution),
                "viability_score": (integer 0-100, note le réalisme et l'intérêt marché)
            }
        `;

        // --- PROMPT 2 : LE DIRECTEUR CRÉATIF (CRITIQUE & INSPIRANT) ---
        const promptText = `
            Agis comme un Directeur de Création impitoyable et visionnaire (type jury de concours d'architecture).
            Tu t'adresses directement à l'agence "${agency.name}".
            
            Données du projet :
            - Thème : ${agency.projectDef.theme || "Vide"}
            - Problème : ${agency.projectDef.problem || "Vide"}
            - Cible : ${agency.projectDef.target || "Vide"}
            - Geste Archi : ${agency.projectDef.gesture || "Vide"}
            - Direction Artistique : ${agency.projectDef.direction || "Vide"}

            Sortie JSON STRICT :
            {
                "strengths": ["point fort 1", "point fort 2"],
                "weaknesses": ["faille 1", "faille 2"],
                "verdict": "Un paragraphe cinglant mais constructif sur le potentiel du projet.",
                "pivot_idea": "Une idée radicale pour améliorer le concept.",
                "roast": "Une phrase sarcastique ou drôle pour les taquiner."
            }
        `;

        try {
            // Lancement PARALLÈLE
            const [scoreResponse, textResponse] = await Promise.all([
                askGroq(promptScore, {}, "Tu es un auditeur strict. JSON uniquement."),
                askGroq(promptText, {}, "Tu es un Directeur de Création expert. JSON uniquement.")
            ]);

            // Parsing
            const jsonScore = JSON.parse(scoreResponse.substring(scoreResponse.indexOf('{'), scoreResponse.lastIndexOf('}') + 1));
            const jsonText = JSON.parse(textResponse.substring(textResponse.indexOf('{'), textResponse.lastIndexOf('}') + 1));

            // Fusion des résultats
            const finalResult: AuditResult = {
                concept_score: jsonScore.concept_score,
                viability_score: jsonScore.viability_score,
                strengths: jsonText.strengths,
                weaknesses: jsonText.weaknesses,
                verdict: jsonText.verdict,
                pivot_idea: jsonText.pivot_idea,
                roast: jsonText.roast,
                date: new Date().toISOString()
            };

            setAudit(finalResult);

            // SAUVEGARDE EN BASE DE DONNÉES (Pour éviter de relancer à chaque fois)
            await updateDoc(doc(db, "agencies", agency.id), { aiAudit: finalResult });
            if (onAuditComplete) onAuditComplete();

        } catch (error) {
            console.error("Audit Dual Failed", error);
            toast('error', "Échec de l'audit IA. Réessayez.");
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-500';
        if (score >= 60) return 'text-indigo-500';
        if (score >= 40) return 'text-amber-500';
        return 'text-red-500';
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Audit IA : ${agency.name}`}>
            <div className="min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 space-y-6">
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center gap-2 animate-bounce">
                                <div className="p-3 bg-indigo-100 rounded-full text-indigo-600"><Calculator size={24}/></div>
                                <span className="text-[10px] font-bold uppercase">Scoring</span>
                            </div>
                            <div className="flex flex-col items-center gap-2 animate-bounce animation-delay-200">
                                <div className="p-3 bg-purple-100 rounded-full text-purple-600"><BrainCircuit size={24}/></div>
                                <span className="text-[10px] font-bold uppercase">Analyse</span>
                            </div>
                        </div>
                        <p className="font-medium text-sm">Le Jury Délibère...</p>
                    </div>
                ) : audit ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        
                        {/* SCORES HEADER */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10"><Calculator size={48}/></div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-1">Concept</span>
                                <span className={`text-4xl font-black ${getScoreColor(audit.concept_score)}`}>{audit.concept_score}</span>
                                <span className="text-xs text-slate-400">/100</span>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10"><Target size={48}/></div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-1">Viabilité</span>
                                <span className={`text-4xl font-black ${getScoreColor(audit.viability_score)}`}>{audit.viability_score}</span>
                                <span className="text-xs text-slate-400">/100</span>
                            </div>
                        </div>

                        {/* VERDICT & ROAST */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                                <BrainCircuit size={18} className="text-indigo-600"/> Verdict du Jury
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
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={64}/></div>
                            <h4 className="font-bold text-sm mb-2 flex items-center gap-2 relative z-10">
                                <Sparkles size={16} className="text-yellow-300"/> Idée de Pivot
                            </h4>
                            <p className="text-sm font-medium leading-relaxed opacity-90 relative z-10">
                                {audit.pivot_idea}
                            </p>
                        </div>

                        <div className="flex justify-between items-center text-xs text-slate-400">
                            <span>Dernière MAJ: {new Date(audit.date).toLocaleString()}</span>
                            <button 
                                onClick={runDualAudit}
                                className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors bg-indigo-50 px-3 py-1.5 rounded-lg"
                            >
                                <RefreshCw size={12}/> Relancer l'audit
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-[300px] text-red-400">
                        <AlertTriangle size={32} className="mb-2"/>
                        <p>Erreur lors de l'analyse. Veuillez réessayer.</p>
                        <button onClick={runDualAudit} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-bold text-slate-600">Réessayer</button>
                    </div>
                )}
            </div>
        </Modal>
    );
};
