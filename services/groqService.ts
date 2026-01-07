
import { Agency, AIInsight } from '../types';

// Nous utilisons fetch directement pour éviter les dépendances lourdes et pour le prototypage rapide.
// Dans un environnement de prod, la clé API serait sécurisée côté serveur ou via un proxy.
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `
Tu es le "Chief Operating Officer" (COO) IA d'une école de design. Tu assistes l'enseignant principal.
Ta mission est d'analyser les données financières, pédagogiques et humaines des agences étudiantes pour détecter :
1. URGENT : Risques de faillite imminente (-5000 PiXi), décrochage technique grave, ou conflit humain (basé sur les reviews).
2. WARNING : Signaux faibles (baisse de VE, trésorerie qui fond trop vite, passager clandestin).
3. OPPORTUNITY : Groupes qui sur-performent et s'ennuient, méritant un challenge "Dungeon Master" ou un investissement.

Tu dois analyser non seulement les chiffres mais aussi le CONTEXTE (Description du projet, Charte) pour proposer des scénarios narratifs adaptés.
Par exemple, si un groupe travaille sur un projet "Écologique" et sur-performe, propose une opportunité liée à une "Subvention Verte". Si un groupe est en faillite, propose un "Rachat de dette contre perte de contrôle".

FORMAT DE RÉPONSE ATTENDU (JSON Array uniquement) :
[
  {
    "id": "unique_id",
    "type": "URGENT" | "WARNING" | "OPPORTUNITY",
    "title": "Titre court et percutant",
    "analysis": "Analyse concise du problème ou de l'opportunité (max 2 phrases).",
    "targetAgencyId": "id_agence",
    "suggestedAction": {
        "label": "Nom du bouton d'action",
        "actionType": "CRISIS" | "REWARD" | "MESSAGE" | "AUDIT"
    }
  }
]
`;

export const analyzeAgenciesWithGroq = async (agencies: Agency[], apiKey: string): Promise<AIInsight[]> => {
    // 1. Préparation de la Payload (On nettoie pour économiser des tokens)
    const gameContext = agencies
        .filter(a => a.id !== 'unassigned')
        .map(a => ({
            id: a.id,
            name: a.name,
            ve: a.ve_current,
            budget: a.budget_real,
            members_count: a.members.length,
            project_context: {
                problem: a.projectDef.problem,
                target: a.projectDef.target,
                gesture: a.projectDef.gesture
            },
            recent_events: a.eventLog.slice(-3).map(e => ({ type: e.type, label: e.label, ve: e.deltaVE })),
            // Calcul simple de variance pour détecter les conflits (simulé ici si pas de reviews récentes)
            team_cohesion: "Inconnue (Pas assez de reviews)" 
        }));

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama3-70b-8192", // Modèle performant et rapide
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: `Voici l'état actuel des agences (JSON): ${JSON.stringify(gameContext)}. Analyse-les et propose 3 à 5 insights majeurs.` }
                ],
                temperature: 0.7,
                max_tokens: 1024,
                response_format: { type: "json_object" } // Force le JSON si supporté, sinon le prompt le demande déjà
            })
        });

        if (!response.ok) {
            throw new Error(`Groq API Error: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // Parsing robuste
        let insights: AIInsight[] = [];
        try {
            // Parfois les modèles bavardent, on essaie d'extraire le JSON
            const jsonMatch = content.match(/\[.*\]/s);
            const jsonStr = jsonMatch ? jsonMatch[0] : content;
            insights = JSON.parse(jsonStr);
        } catch (parseError) {
            console.error("JSON Parse Error", parseError, content);
            // Fallback manuel ou tableau vide
            return [];
        }

        return insights;

    } catch (error) {
        console.error("Analysis Failed", error);
        throw error;
    }
};
