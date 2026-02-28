import { useState } from 'react';
import { Agency, AuditResult } from '../types';
import { askGroq } from '../services/groqService';
import { doc, updateDoc, db } from '../services/firebase';

export const useProjectAudit = (agency: Agency, onAuditComplete?: () => void) => {
    const [loading, setLoading] = useState(false);
    const [audit, setAudit] = useState<AuditResult | null>(agency.aiAudit || null);
    const [error, setError] = useState<string | null>(null);

    const runDualAudit = async () => {
        setLoading(true);
        setError(null);
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
            setError("Échec de l'audit IA. Réessayez.");
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        audit,
        error,
        runDualAudit
    };
};
