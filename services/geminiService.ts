
// SERVICE RETIRÉ : Toutes les fonctionnalités liées à l'IA ont été désactivées à la demande de l'utilisateur.
// Ce fichier est conservé comme coquille vide pour éviter de casser d'éventuels imports résiduels lors de la compilation,
// bien que tous les appels aient été supprimés des composants.

import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY });

export const generateAgencyNames = async (constraints: any) => {
    return [];
};

export const generateFeedback = async (deliverableName: string, context: string) => {
    return "";
}

export interface QuizAnalysisResult {
    summary: string;
    averageSentiment: string;
    positivePoints: string[];
    negativePoints: string[];
    actionPlan: string[];
}

export const analyzeQuizResults = async (quizTitle: string, quizDescription: string, answersData: any[]): Promise<QuizAnalysisResult | null> => {
    try {
        const model = "gemini-3.1-pro-preview";
        const prompt = `
            Tu es un expert en analyse de données et en pédagogie.
            Voici les résultats d'un quiz ou sondage intitulé "${quizTitle}" (${quizDescription}).
            
            Données des réponses (format JSON) :
            ${JSON.stringify(answersData)}
            
            Analyse ces données et fournis un résumé structuré.
            Concentre-toi sur les opinions générales, les points forts, les points faibles, et propose un plan d'action (ce qu'il faut retenir ou faire).
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING, description: "Résumé général des opinions et des résultats." },
                        averageSentiment: { type: Type.STRING, description: "Sentiment général (ex: Positif, Mitigé, Négatif, Enthousiaste, etc.)." },
                        positivePoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Liste des points positifs soulevés." },
                        negativePoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Liste des points négatifs ou axes d'amélioration." },
                        actionPlan: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Plan d'action ou recommandations (ce qu'il faut apprendre/faire)." }
                    },
                    required: ["summary", "averageSentiment", "positivePoints", "negativePoints", "actionPlan"]
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text) as QuizAnalysisResult;
        }
        return null;
    } catch (error) {
        console.error("Erreur lors de l'analyse IA :", error);
        return null;
    }
};
