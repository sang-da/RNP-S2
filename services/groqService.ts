
import { Agency, AIInsight } from '../types';
import { GROQ_KEY, GROQ_MODEL, GROQ_API_URL } from '../functions/groqConfig';

const SYSTEM_PROMPT_BRIEFING = `
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

const formatAgenciesForAI = (agencies: Agency[]) => {
    return agencies
        .filter(a => a.id !== 'unassigned')
        .map(a => ({
            id: a.id,
            name: a.name,
            class: a.classId,
            ve: a.ve_current,
            budget: a.budget_real,
            members: a.members.map(m => ({ name: m.name, score: m.individualScore, role: m.role })),
            project: a.projectDef.problem ? `${a.projectDef.problem} (${a.projectDef.target})` : "Non défini",
            recent_events: a.eventLog.slice(-3).map(e => `${e.type}: ${e.label} (${e.deltaVE} VE)`),
        }));
};

export const analyzeAgenciesWithGroq = async (agencies: Agency[]): Promise<AIInsight[]> => {
    if (!GROQ_KEY || GROQ_KEY.includes("TA_CLE")) throw new Error("Clé API Groq non configurée.");

    const gameContext = formatAgenciesForAI(agencies);

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
                    { role: "system", content: SYSTEM_PROMPT_BRIEFING },
                    { role: "user", content: `Analyse ces données d'agences : ${JSON.stringify(gameContext)}` }
                ],
                temperature: 0.5,
                max_tokens: 2048,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) throw new Error(`Erreur API Groq (${response.status})`);

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        const jsonResponse = JSON.parse(content);
        let insights: AIInsight[] = [];
        
        if (Array.isArray(jsonResponse)) insights = jsonResponse;
        else if (jsonResponse.insights && Array.isArray(jsonResponse.insights)) insights = jsonResponse.insights;
        else insights = Object.values(jsonResponse).filter(v => typeof v === 'object') as any;

        return insights.map((insight, idx) => ({
            ...insight,
            id: insight.id || `ai-insight-${Date.now()}-${idx}`
        }));

    } catch (error) {
        console.error("Analysis Failed", error);
        throw error;
    }
};

// --- NOUVELLE FONCTION GÉNÉRIQUE POUR LE CO-PILOTE ---
export const askGroq = async (prompt: string, contextData: any, systemRole: string = "Tu es un assistant pédagogique expert."): Promise<string> => {
    if (!GROQ_KEY || GROQ_KEY.includes("TA_CLE")) throw new Error("Clé API Groq non configurée.");

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
                    { role: "system", content: `${systemRole} Voici les données actuelles du jeu : ${JSON.stringify(contextData)}` },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || response.statusText);
        }

        const data = await response.json();
        return data.choices[0].message.content;

    } catch (error) {
        console.error("Groq Chat Failed", error);
        throw error;
    }
};
