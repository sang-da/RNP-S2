
import { Agency, AIInsight } from '../types';
import { getGroqKey, GROQ_MODEL, getGroqApiUrl } from '../functions/groqConfig';

const SYSTEM_PROMPT_BRIEFING = `
Tu es le "Game Master" IA d'une simulation d'agences étudiantes.
Ta mission est d'analyser les données (notamment overdue_count, financial_status, ve_status, et l'historique des événements) pour proposer des événements narratifs ciblés qui animent le jeu sans le détruire.

RÈGLES D'ANALYSE :
1. Le Retardataire (Sleeper) : overdue_count > 0. Action : URGENT (Sanction légère/Avertissement).
2. Le Sur-Performant : ve_status = EXCELLENT et financial_status = WEALTHY et overdue_count = 0. Action : OPPORTUNITY (Challenge/Crise de croissance).
3. Le Survivant : ve_status = DANGER ou financial_status = CRITICAL, mais overdue_count = 0. Action : OPPORTUNITY (Coup de pouce/Bonus).
4. Le Bon Élève : Tout est STABLE/AVERAGE et overdue_count = 0. Action : Ne rien faire (ne pas surcharger le jeu).

RÈGLES DE JUSTICE ET D'HISTORIQUE (TRÈS IMPORTANT) :
- Vérifie TOUJOURS "recent_events" et "members_history" pour voir si l'agence ou ses membres ont déjà subi une crise ou reçu un bonus récemment.
- Évalue la sévérité des crises passées (ex: un retrait de 50 VE est une sanction très lourde).
- ÉVITE de sanctionner plusieurs fois de suite les mêmes individus ou la même agence. Laisse-leur le temps de récupérer.
- Si une agence mérite une sanction mais a déjà subi une crise sévère récemment, propose plutôt un "WARNING" ou un "MESSAGE" sans impact chiffré.

IMPORTANT : Tu dois retourner UNIQUEMENT un tableau JSON valide. Pas de texte avant ou après.
Format :
[
  {
    "id": "unique_string",
    "type": "URGENT" | "WARNING" | "OPPORTUNITY",
    "title": "Titre de l'événement (ex: Client VIP, Bad Buzz)",
    "analysis": "Explication de ton choix basée sur les metrics et l'historique (ex: '2 livrables en retard, mais ayant déjà perdu 50 VE hier, simple avertissement').",
    "targetAgencyId": "id_agence",
    "suggestedAction": {
        "label": "Texte court de l'événement pour l'étudiant (ex: 'Un client exige un audit immédiat (-500 PiXi)')",
        "actionType": "CRISIS" | "REWARD" | "MESSAGE" | "AUDIT"
    }
  }
]
`;

const formatAgenciesForAI = (agencies: Agency[]) => {
    const now = new Date();
    return agencies
        .filter(a => a.id !== 'unassigned')
        .map(a => {
            // 1. Calcul des retards (overdue_count)
            let overdue_count = 0;
            if (a.progress) {
                Object.values(a.progress).forEach(week => {
                    week.deliverables.forEach(d => {
                        if (d.deadline && (d.status === 'pending' || d.status === 'rejected')) {
                            const deadlineDate = new Date(d.deadline);
                            if (deadlineDate < now) {
                                overdue_count++;
                            }
                        }
                    });
                });
            }

            // 2. Statut financier
            let financial_status = 'STABLE';
            if (a.budget_real < 1000) financial_status = 'CRITICAL';
            else if (a.budget_real > 5000) financial_status = 'WEALTHY';

            // 3. Statut VE (Vitalité)
            let ve_status = 'AVERAGE';
            if (a.ve_current < 30) ve_status = 'DANGER';
            else if (a.ve_current > 80) ve_status = 'EXCELLENT';

            return {
                id: a.id,
                name: a.name,
                class: a.classId,
                ve: a.ve_current,
                ve_status,
                budget: a.budget_real,
                financial_status,
                overdue_count,
                members: a.members.map(m => ({ 
                    name: m.name, 
                    score: m.individualScore, 
                    role: m.role,
                    history: m.history?.slice(-3).map(h => `${h.date}: ${h.action} (${h.agencyName})`) || [],
                    notes: m.notes?.slice(-3).map(n => `${n.date}: [${n.type}] ${n.content}`) || []
                })),
                project: a.projectDef.problem ? `${a.projectDef.problem} (${a.projectDef.target})` : "Non défini",
                recent_events: a.eventLog.slice(-10).map(e => {
                    const impacts = [];
                    if (e.deltaVE) impacts.push(`${e.deltaVE > 0 ? '+' : ''}${e.deltaVE} VE`);
                    if (e.deltaBudgetReal) impacts.push(`${e.deltaBudgetReal > 0 ? '+' : ''}${e.deltaBudgetReal} PiXi`);
                    const impactStr = impacts.length > 0 ? ` (Impact: ${impacts.join(', ')})` : '';
                    return `${e.date.split('T')[0]} - ${e.type}: ${e.label}${impactStr}`;
                }),
            };
        });
};

export const analyzeAgenciesWithGroq = async (agencies: Agency[]): Promise<AIInsight[]> => {
    const apiKey = getGroqKey();
    const apiUrl = getGroqApiUrl();
    if (!apiKey || apiKey.includes("TA_CLE")) throw new Error("Clé API Groq non configurée.");

    const gameContext = formatAgenciesForAI(agencies);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
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
export const askGroq = async (
    prompt: string, 
    contextData: any, 
    systemRole: string = "Tu es un assistant pédagogique expert.",
    history: {role: 'user'|'ai', content: string}[] = []
): Promise<string> => {
    const apiKey = getGroqKey();
    const apiUrl = getGroqApiUrl();
    if (!apiKey || apiKey.includes("TA_CLE")) throw new Error("Clé API Groq non configurée.");

    try {
        const messages = [
            { role: "system", content: `${systemRole} Voici les données actuelles du jeu : ${JSON.stringify(contextData)}` },
            ...history.map(h => ({ role: h.role === 'ai' ? 'assistant' : 'user', content: h.content })),
            { role: "user", content: prompt }
        ];

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: messages,
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

export interface QuizAnalysisResult {
    summary: string;
    averageSentiment: string;
    positivePoints: string[];
    negativePoints: string[];
    actionPlan: string[];
}

export const analyzeQuizResultsWithGroq = async (quizTitle: string, quizDescription: string, answersData: any[]): Promise<QuizAnalysisResult | null> => {
    const apiKey = getGroqKey();
    const apiUrl = getGroqApiUrl();
    if (!apiKey || apiKey.includes("TA_CLE")) throw new Error("Clé API Groq non configurée.");

    const systemPrompt = `
Tu es un expert en analyse de données et en pédagogie.
Voici les résultats d'un quiz ou sondage intitulé "${quizTitle}" (${quizDescription}).

Analyse ces données et fournis un résumé structuré.
Concentre-toi sur les opinions générales, les points forts, les points faibles, et propose un plan d'action (ce qu'il faut retenir ou faire).

IMPORTANT : Tu dois retourner UNIQUEMENT un objet JSON valide. Pas de texte avant ou après.
Format attendu :
{
    "summary": "Résumé général des opinions et des résultats.",
    "averageSentiment": "Sentiment général (ex: Positif, Mitigé, Négatif, Enthousiaste, etc.).",
    "positivePoints": ["Point positif 1", "Point positif 2"],
    "negativePoints": ["Point d'attention 1", "Point d'attention 2"],
    "actionPlan": ["Action 1", "Action 2"]
}
`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Données des réponses (format JSON) : ${JSON.stringify(answersData)}` }
                ],
                temperature: 0.5,
                max_tokens: 2048,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || response.statusText);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        const jsonResponse = JSON.parse(content);
        return jsonResponse as QuizAnalysisResult;

    } catch (error) {
        console.error("Groq Quiz Analysis Failed", error);
        return null;
    }
};

export interface CriterionEval {
    criterionId: string;
    score: number;
    feedback: string;
}

export interface DetailedEvaluationResult {
    groupEvaluation: CriterionEval[];
    membersEvaluation: Record<string, CriterionEval[]>;
}

export const evaluateAgencyAndMembersWithGroq = async (agencyData: any, referentialRules: string): Promise<DetailedEvaluationResult> => {
    const apiKey = getGroqKey();
    const apiUrl = getGroqApiUrl();
    if (!apiKey || apiKey.includes("TA_CLE")) throw new Error("Clé API Groq non configurée.");

    const membersData = agencyData.members.map((m: any) => {
        const peerReviewsForMember = agencyData.peerReviews?.filter((pr: any) => pr.targetId === m.id) || [];
        const peerReviewsText = peerReviewsForMember.map((pr: any) => `- Reviewer: ${pr.reviewerName}, Assiduité: ${pr.ratings.attendance}/5, Qualité: ${pr.ratings.quality}/5, Implication: ${pr.ratings.involvement}/5, Commentaire: "${pr.comment}"`).join('\n  ');
        
        const notesText = m.notes?.map((n: any) => `- Date: ${n.date}, Type: ${n.type}, Commentaire Admin: "${n.content}"`).join('\n  ') || 'Aucune note admin.';

        return `- ID: ${m.id}, Nom: ${m.name}, Rôle: ${m.role}, Score Individuel: ${m.individualScore}
  Évaluations des pairs :
  ${peerReviewsText || 'Aucune évaluation des pairs.'}
  Notes de l'administrateur :
  ${notesText}`;
    }).join('\n\n');

    const prompt = `
En tant que jury final, évaluez l'agence "${agencyData.name}" et chacun de ses membres sur CHAQUE CRITÈRE (C1.1, C2.1, etc.) du référentiel fourni.

Règles du référentiel :
${referentialRules}

Données de l'agence (Évaluation Groupe) :
- Valeur d'Entreprise (VE) : ${agencyData.ve}
- Budget (Richesse) : ${agencyData.budget}€
- Concept : ${agencyData.projectDef?.concept || 'Non défini'}
- Cible : ${agencyData.projectDef?.target || 'Non défini'}

Données des membres (Évaluation Individuelle, incluant les retours des pairs et les notes de l'admin) :
${membersData}

INSTRUCTIONS IMPORTANTES :
1. Vous devez faire DEUX évaluations parallèles :
   - Une évaluation de l'ENTREPRISE (Groupe) basée sur la VE et le projet.
   - Une évaluation INDIVIDUELLE pour CHAQUE membre basée sur son score individuel, son rôle, les évaluations de ses pairs (commentaires et notes) et les notes laissées par l'administrateur.
2. Pour chaque évaluation, vous devez donner une note sur 20 pour CHAQUE critère (C1.1, C2.1, etc.) trouvé dans le référentiel.
3. Utilisez les commentaires des pairs et de l'admin pour ajuster finement la note individuelle et justifier le feedback.

Retournez UNIQUEMENT un objet JSON avec cette structure exacte :
{
    "groupEvaluation": [
        { "criterionId": "C1.1", "score": 15, "feedback": "Justification courte" }
    ],
    "membersEvaluation": {
        "ID_DU_MEMBRE": [
            { "criterionId": "C1.1", "score": 14, "feedback": "Justification courte" }
        ]
    }
}
`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    { role: "system", content: "Tu es un jury d'évaluation expert. Tu réponds uniquement en JSON valide." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 4000,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || response.statusText);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        const jsonResponse = JSON.parse(content);
        return {
            groupEvaluation: jsonResponse.groupEvaluation || [],
            membersEvaluation: jsonResponse.membersEvaluation || {}
        };

    } catch (error) {
        console.error("Groq Detailed Evaluation Failed", error);
        throw error;
    }
};

// --- NOUVELLE FONCTION POUR LA TRANSCRIPTION AUDIO (WHISPER) ---
export const transcribeAudioWithGroq = async (audioBlob: Blob, promptContext: string = ""): Promise<string> => {
    const apiKey = getGroqKey();
    try {
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");
        formData.append("model", "whisper-large-v3-turbo");
        formData.append("language", "fr");
        if (promptContext) {
            formData.append("prompt", promptContext);
        }

        const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            body: formData
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || response.statusText);
        }

        const data = await response.json();
        return data.text;

    } catch (error) {
        console.error("Groq Transcription Failed", error);
        throw error;
    }
};
