
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

export const generateDeliverableMappingWithGroq = async (uniqueDeliverables: string[], referentialRules: string): Promise<any> => {
    const apiKey = getGroqKey();
    const apiUrl = getGroqApiUrl();
    if (!apiKey || apiKey.includes("TA_CLE")) throw new Error("Clé API Groq non configurée.");

    const prompt = `
Tu es un expert pédagogique. Ta mission est de mapper une liste de livrables aux critères d'un référentiel de compétences.
Pour chaque livrable, identifie les 1 à 3 critères (ex: C1.1, C4.2) qui sont les plus directement évalués par ce livrable.

RÉFÉRENTIEL :
${referentialRules}

LISTE DES LIVRABLES À MAPPER :
${uniqueDeliverables.map(d => `- ${d}`).join('\n')}

Retourne UNIQUEMENT un objet JSON avec cette structure exacte :
{
    "mapping": {
        "Nom du Livrable 1": ["C1.1", "C2.1"],
        "Nom du Livrable 2": ["C4.2"]
    }
}
Assure-toi que les clés du dictionnaire "mapping" correspondent EXACTEMENT aux noms des livrables fournis.
`;

    try {
        const response = await fetchWithFallback(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    { role: "system", content: "Tu es un expert pédagogique. Tu réponds uniquement en JSON valide." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.1,
                max_tokens: 2000,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || response.statusText);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        return JSON.parse(content);
    } catch (error) {
        console.error("Erreur Groq (generateDeliverableMappingWithGroq):", error);
        throw error;
    }
};

export const analyzeAgenciesWithGroq = async (agencies: Agency[]): Promise<AIInsight[]> => {
    const apiKey = getGroqKey();
    const apiUrl = getGroqApiUrl();
    if (!apiKey || apiKey.includes("TA_CLE")) throw new Error("Clé API Groq non configurée.");

    const gameContext = formatAgenciesForAI(agencies);

    try {
        const response = await fetchWithFallback(apiUrl, {
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

        const response = await fetchWithFallback(apiUrl, {
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
        const response = await fetchWithFallback(apiUrl, {
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
    membersEvaluation: Record<string, { criteria: CriterionEval[], studentFeedback: string }>;
}

let globalWorkingModel: string | null = null;

const fetchWithFallback = async (url: string, options: any, retriesPerModel = 5, initialBackoff = 2000): Promise<Response> => {
    let bodyObj;
    try {
        bodyObj = JSON.parse(options.body);
    } catch (e) {
        // If body is not JSON or not present, just use standard fetch
        return fetch(url, options);
    }

    const requestedModel = bodyObj.model || GROQ_MODEL;
    
    // If we already had to fallback globally, start with the known working model
    const primaryModel = globalWorkingModel || requestedModel;
    const fallbacks = [
        "groq/compound",
        "llama-3.3-70b-versatile"
    ];
    
    // Ensure primary is first, and remove duplicates
    const modelsToTry = [primaryModel, ...fallbacks.filter(m => m !== primaryModel)];

    for (let modelIndex = 0; modelIndex < modelsToTry.length; modelIndex++) {
        const currentModel = modelsToTry[modelIndex];
        bodyObj.model = currentModel;
        const newOptions = { ...options, body: JSON.stringify(bodyObj) };
        let backoff = initialBackoff;

        for (let attempt = 0; attempt < retriesPerModel; attempt++) {
            try {
                const response = await fetch(url, newOptions);
                
                if (response.ok) {
                    if (modelIndex > 0 || currentModel !== requestedModel) {
                        console.log(`[AI Fallback] Successfully used fallback model: ${currentModel}`);
                        globalWorkingModel = currentModel; // Remember this model for future calls
                    }
                    return response;
                }

                if (response.status === 429) {
                    const errorData = await response.clone().json().catch(() => ({}));
                    const errorMessage = errorData.error?.message || "";
                    
                    const match = errorMessage.match(/Please try again in ([0-9.]+)s/);
                    let waitTimeMs = backoff;
                    if (match && match[1]) {
                        waitTimeMs = parseFloat(match[1]) * 1000 + 1000; // add 1s buffer
                        console.warn(`[API Error 429 Rate Limit] Groq requested wait of ${match[1]}s. Waiting ${waitTimeMs}ms before retry...`);
                    } else {
                        console.warn(`[API Error 429 Rate Limit] Model ${currentModel} failed. Using exponential backoff: ${waitTimeMs}ms`);
                    }

                    if (attempt < retriesPerModel - 1) {
                        await new Promise(resolve => setTimeout(resolve, waitTimeMs));
                        backoff = waitTimeMs > backoff ? waitTimeMs : backoff * 1.5;
                        continue;
                    } else {
                        console.warn(`[API Error 429 Rate Limit] Max retries reached for model ${currentModel}. Switching to fallback.`);
                        break;
                    }
                } else if (response.status === 413) {
                    console.warn(`[API Error 413 Content Too Large] Model ${currentModel} failed. Switching immediately.`);
                    // Context limit exceeded, switch to another model that might have a larger context window
                    break;
                } else if (response.status >= 500) {
                    console.warn(`[API Error ${response.status}] Model ${currentModel} failed. Attempt ${attempt + 1}/${retriesPerModel}`);
                    if (attempt < retriesPerModel - 1) {
                        await new Promise(resolve => setTimeout(resolve, backoff));
                        backoff *= 2; // Exponential backoff
                    }
                } else {
                    // For other errors (e.g., 400 Bad Request), don't retry this model
                    console.warn(`[API Error ${response.status}] Model ${currentModel} failed with non-retryable error.`);
                    break; 
                }
            } catch (error) {
                console.warn(`[Network Error] Model ${currentModel} failed. Attempt ${attempt + 1}/${retriesPerModel}`, error);
                if (attempt < retriesPerModel - 1) {
                    await new Promise(resolve => setTimeout(resolve, backoff));
                    backoff *= 2;
                }
            }
        }
        
        if (modelIndex < modelsToTry.length - 1) {
            console.warn(`[AI Fallback] Switching to fallback model: ${modelsToTry[modelIndex + 1]}`);
        }
    }

    // If all fail, make one last attempt with the requested model to return its specific error
    bodyObj.model = requestedModel;
    return fetch(url, { ...options, body: JSON.stringify(bodyObj) });
};

export const evaluateAgencyWithGroq = async (agencyData: any, referentialRules: string, customPrompt?: string, dataConfig?: any): Promise<CriterionEval[]> => {
    const apiKey = getGroqKey();
    const apiUrl = getGroqApiUrl();
    if (!apiKey || apiKey.includes("TA_CLE")) throw new Error("Clé API Groq non configurée.");

    const defaultInstructions = `INSTRUCTIONS IMPORTANTES :
1. Vous devez faire une évaluation de l'ENTREPRISE (Groupe) basée sur la VE, le budget, le projet et les livrables.
2. Évaluez UNIQUEMENT les critères pertinents pour un travail de groupe (ex: gestion de projet, livrables, concept, faisabilité). Ignorez les critères purement individuels.
3. Pour chaque critère évalué, donnez une note sur 20.
4. Prenez impérativement en compte la VE et le Budget dans votre notation des compétences liées à la gestion et la performance.

Retournez UNIQUEMENT un objet JSON avec cette structure exacte :
{
    "groupEvaluation": [
        { "criterionId": "C1.1", "score": 15, "feedback": "Justification courte" }
    ]
}`;

    const config = dataConfig?.group || { ve: true, budget: true, projectDef: true, deliverables: true, events: true };

    // Calculate VE Trend
    let veTrendText = `Actuel: ${agencyData.ve_current || agencyData.ve}`;
    if (agencyData.ve_history && agencyData.ve_history.length > 0) {
        const firstVE = agencyData.ve_history[0].value;
        const lastVE = agencyData.ve_current || agencyData.ve;
        const minVE = Math.min(...agencyData.ve_history.map((h: any) => h.value), lastVE);
        const maxVE = Math.max(...agencyData.ve_history.map((h: any) => h.value), lastVE);
        veTrendText = `Départ: ${firstVE} | Actuel: ${lastVE} | Plus bas: ${minVE} | Plus haut: ${maxVE} | Tendance: ${lastVE >= firstVE ? 'CROISSANCE/STABILITÉ' : 'DÉCLIN'}`;
    }

    // Extract deliverables from all weeks
    const allDeliverables = Object.values(agencyData.progress || {}).flatMap((week: any) => week.deliverables || []);
    
    // Categorize deliverables
    const brandingDeliverables = allDeliverables.filter((d: any) => ['SPECIAL_LOGO', 'SPECIAL_BANNER', 'FORM_CHARTER', 'FORM_NAMING'].includes(d.type));
    const fileDeliverables = allDeliverables.filter((d: any) => ['FILE', 'LINK'].includes(d.type) || !d.type);

    // Calculate stats
    const countA = allDeliverables.filter((d: any) => d.grading?.quality === 'A').length;
    const countB = allDeliverables.filter((d: any) => d.grading?.quality === 'B').length;
    const countC = allDeliverables.filter((d: any) => d.grading?.quality === 'C').length;
    const countOnTime = allDeliverables.filter((d: any) => d.grading && d.grading.daysLate === 0).length;
    const countLate = allDeliverables.filter((d: any) => d.grading && d.grading.daysLate > 0).length;
    const countMVP = allDeliverables.filter((d: any) => d.grading?.mvpId || d.nominatedMvpId).length;

    const formatDeliverableList = (list: any[]) => list.map((d: any) => 
        `- "${d.name}" | Statut: ${d.status} | Note: ${d.grading?.quality || 'N/A'} | Retard: ${d.grading?.daysLate || 0}j | MVP: ${d.grading?.mvpId ? 'Oui' : 'Non'} | Feedback: "${d.feedback || 'Aucun'}"`
    ).join('\n');

    let deliverablesText = `
📁 Livrables de Conception & Recherche (Impacte BLOC 4 et BLOC 10) :
${formatDeliverableList(fileDeliverables) || 'Aucun'}

🎨 Livrables de Branding & Production (Impacte BLOC 11) :
${formatDeliverableList(brandingDeliverables) || 'Aucun'}
`;

    const eventsText = agencyData.eventLog?.map((e: any) => {
        let tag = "";
        if (e.type === 'CRISIS') tag = " [Test de Résilience - C10.5/C11.5]";
        if (e.type === 'BLACK_OP') tag = " [Action Offensive/Éthique - C5.2]";
        return `- ${e.date} : [${e.type}]${tag} ${e.label} (Impact VE: ${e.deltaVE || 0}, Budget: ${e.deltaBudgetReal || 0})`;
    }).join('\n') || 'Aucun événement majeur.';

    const prompt = `
En tant que jury final, évaluez l'agence "${agencyData.name}" sur CHAQUE CRITÈRE (C1.1, C2.1, etc.) du référentiel fourni.

Règles du référentiel :
${referentialRules}

Données de l'agence (Évaluation Groupe) :
${config.ve ? `- Valeur d'Entreprise (VE) : ${veTrendText}` : ''}
${config.budget ? `- Budget (Richesse) : ${agencyData.budget_real || agencyData.budget}€` : ''}
${config.projectDef ? `- Concept du projet : ${agencyData.projectDef?.concept || 'Non défini'}
- Cible : ${agencyData.projectDef?.target || 'Non défini'}
- Problème résolu : ${agencyData.projectDef?.problem || 'Non défini'}` : ''}

${config.deliverables ? `STATISTIQUES DES LIVRABLES :
- Total évalués : ${countA + countB + countC} (A: ${countA}, B: ${countB}, C: ${countC})
- Ponctualité : ${countOnTime} à l'heure, ${countLate} en retard
- Nominations MVP : ${countMVP}

DÉTAIL DES LIVRABLES ET FEEDBACKS :
${deliverablesText}` : ''}

${config.events ? `ÉVÉNEMENTS MARQUANTS (Fluctuations marché, crises, bonus) :
${eventsText}` : ''}

${customPrompt || defaultInstructions}
`;

    try {
        const response = await fetchWithFallback(apiUrl, {
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
                max_tokens: 2000,
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
        return jsonResponse.groupEvaluation || [];
    } catch (error) {
        console.error("Erreur Groq (evaluateAgencyWithGroq):", error);
        throw error;
    }
};

export const evaluateMemberWithGroq = async (agencyData: any, memberData: any, referentialRules: string, customPrompt?: string, dataConfig?: any): Promise<{ criteria: CriterionEval[], studentFeedback: string }> => {
    const apiKey = getGroqKey();
    const apiUrl = getGroqApiUrl();
    if (!apiKey || apiKey.includes("TA_CLE")) throw new Error("Clé API Groq non configurée.");

    const config = dataConfig?.individual || { role: true, individualScore: true, wallet: true, history: true, peerReviews: true, adminNotes: true };

    const peerReviewsForMember = agencyData.peerReviews?.filter((pr: any) => pr.targetId === memberData.id) || [];
    const peerReviewsText = peerReviewsForMember.map((pr: any) => `- Reviewer: ${pr.reviewerName}, Assiduité: ${pr.ratings.attendance}/5, Qualité: ${pr.ratings.quality}/5, Implication: ${pr.ratings.involvement}/5, Commentaire: "${pr.comment}"`).join('\n  ');
    
    const notesText = memberData.notes?.map((n: any) => `- Date: ${n.date}, Type: ${n.type}, Commentaire Admin: "${n.content}"`).join('\n  ') || 'Aucune note admin.';

    const defaultInstructions = `INSTRUCTIONS IMPORTANTES :
1. Évaluez l'étudiant UNIQUEMENT sur les critères pertinents pour un travail individuel (ex: communication, rôle, implication, posture professionnelle, expression). Ignorez les critères purement collectifs.
2. Pour chaque critère évalué, donnez une note sur 20.
3. Prenez en compte son rôle, son score individuel, les retours de ses pairs et les notes de l'admin.
4. ANALYSE RH CRITIQUE : Cherchez activement les contradictions. Si un étudiant a d'excellentes notes individuelles mais de mauvaises évaluations par ses pairs, sanctionnez sévèrement les compétences du BLOC 8 (Coopérer) et soulignez-le.
5. Générez un profil RH structuré dans l'objet "profile".

Retournez UNIQUEMENT un objet JSON avec cette structure exacte :
{
    "criteria": [
        { "criterionId": "C2.1", "score": 14, "feedback": "Justification courte" }
    ],
    "profile": {
        "archetype": "Le Solitaire Technique / Le Leader Charismatique...",
        "superpower": "Ce qu'il fait de mieux...",
        "achillesHeel": "Son point faible critique...",
        "advice": "Un conseil brut et direct pour son avenir pro."
    }
}`;

    const historyText = memberData.history?.map((h: any) => {
        let tag = "";
        if (['TRANSFER', 'RESIGNED'].includes(h.action)) tag = " [Mobilité/Initiative - Lié à C5.1/C8.3]";
        if (['PROMOTED', 'DEMOTED'].includes(h.action)) tag = " [Évolution de rôle - Lié à C5.1]";
        if (h.action === 'FIRED') tag = " [Rupture d'équipe - Lié à C8.2/C5.2]";
        
        return `- ${h.date} (Semaine ${h.weekId}) : [${h.action}]${tag} Agence ${h.agencyName} (VE: ${h.contextVE || 'N/A'}) ${h.reason ? `Motif: "${h.reason}"` : ''}`;
    }).join('\n  ') || 'Aucun historique de transfert.';

    const prompt = `
En tant que jury final et profiler RH expert, évaluez l'étudiant "${memberData.name}" de l'agence "${agencyData.name}".

Règles du référentiel :
${referentialRules}

DONNÉES DE L'ÉTUDIANT :
${config.role ? `- Rôle : ${memberData.role}` : ''}
${config.individualScore ? `- Score Individuel : ${memberData.individualScore}/100` : ''}
${config.wallet ? `- Portefeuille : ${memberData.wallet || 0} PiXi` : ''}
- Agence : ${agencyData.name} (VE: ${agencyData.ve_current || agencyData.ve}, Budget: ${agencyData.budget_real || agencyData.budget})

${config.history ? `HISTORIQUE DES AGENCES :\n  ${historyText}` : ''}

${config.peerReviews ? `ÉVALUATIONS REÇUES (Peer Reviews) :\n  ${peerReviewsText || 'Aucune évaluation des pairs.'}` : ''}

${config.adminNotes ? `NOTES PÉDAGOGIQUES (Admin) :\n  ${notesText}` : ''}

${customPrompt || defaultInstructions}
`;

    try {
        const response = await fetchWithFallback(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    { role: "system", content: "Tu es un jury d'évaluation expert et un profiler RH. Tu réponds uniquement en JSON valide." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 2000,
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
            criteria: jsonResponse.criteria || [],
            studentFeedback: jsonResponse.studentFeedback || ""
        };
    } catch (error) {
        console.error("Erreur Groq (evaluateMemberWithGroq):", error);
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
