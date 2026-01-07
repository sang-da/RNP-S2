
import { Agency, AIInsight } from '../types';
import { GROQ_KEY, GROQ_MODEL, GROQ_API_URL } from '../functions/groqConfig';

const SYSTEM_PROMPT = `
Tu es le "Chief Operating Officer" (COO) IA d'une école de design. Tu assistes l'enseignant principal.
Ta mission est d'analyser les données financières, pédagogiques et humaines des agences étudiantes pour détecter :
1. URGENT : Risques de faillite imminente (-5000 PiXi), décrochage technique grave, ou conflit humain.
2. WARNING : Signaux faibles (baisse de VE, trésorerie qui fond trop vite, passager clandestin).
3. OPPORTUNITY : Groupes qui sur-performent et s'ennuient, méritant un challenge "Dungeon Master" ou un investissement.

IMPORTANT : Tu dois retourner UNIQUEMENT un tableau JSON valide. Pas de texte avant ou après.
Format :
[
  {
    "id": "unique_string",
    "type": "URGENT" | "WARNING" | "OPPORTUNITY",
    "title": "Titre court",
    "analysis": "Analyse concise.",
    "targetAgencyId": "id_agence",
    "suggestedAction": {
        "label": "Action",
        "actionType": "CRISIS" | "REWARD" | "MESSAGE" | "AUDIT"
    }
  }
]
`;

export const analyzeAgenciesWithGroq = async (agencies: Agency[]): Promise<AIInsight[]> => {
    // Vérification de sécurité pour la clé
    if (!GROQ_KEY || GROQ_KEY === "TA_CLE_GROQ_ICI") {
        console.error("Clé Groq manquante dans functions/groqConfig.ts");
        throw new Error("Clé API Groq non configurée.");
    }

    // 1. Préparation de la Payload optimisée
    const gameContext = agencies
        .filter(a => a.id !== 'unassigned')
        .map(a => ({
            id: a.id,
            name: a.name,
            ve: a.ve_current,
            budget: a.budget_real,
            project: a.projectDef.problem ? `${a.projectDef.problem} pour ${a.projectDef.target}` : "Non défini",
            recent_events: a.eventLog.slice(-2).map(e => ({ label: e.label, ve: e.deltaVE })),
        }));

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: `Analyse ces données d'agences : ${JSON.stringify(gameContext)}` }
                ],
                temperature: 0.5, // Plus bas pour plus de rigueur JSON
                max_tokens: 2048,
                response_format: { type: "json_object" } // Force le mode JSON (supporté par Llama 3.3)
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Groq API Error Detail:", errorData);
            throw new Error(`Erreur API Groq (${response.status}): ${errorData?.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // Parsing robuste
        let insights: AIInsight[] = [];
        try {
            const jsonResponse = JSON.parse(content);
            // Parfois le modèle met le tableau dans une clé (ex: "insights": [...])
            if (Array.isArray(jsonResponse)) {
                insights = jsonResponse;
            } else if (jsonResponse.insights && Array.isArray(jsonResponse.insights)) {
                insights = jsonResponse.insights;
            } else {
                // Tentative de récupération des valeurs si c'est un objet étrange
                insights = Object.values(jsonResponse).filter(v => typeof v === 'object') as any;
            }
        } catch (parseError) {
            console.error("JSON Parse Error", parseError, content);
            return [];
        }

        // Ajout d'ID uniques si manquants
        return insights.map((insight, idx) => ({
            ...insight,
            id: insight.id || `ai-insight-${Date.now()}-${idx}`
        }));

    } catch (error) {
        console.error("Analysis Failed", error);
        throw error;
    }
};
