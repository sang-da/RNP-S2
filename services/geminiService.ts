
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateAgencyNames = async (constraints: { space: string; style: string; client: string }) => {
  try {
    const model = "gemini-3-flash-preview";
    const prompt = `
      Tu es un expert en branding pour des agences de design d'espace et de motion design.
      Le projet étudiant est basé sur 3 contraintes :
      - Espace : ${constraints.space}
      - Style : ${constraints.style}
      - Client : ${constraints.client}

      Propose 3 noms d'agence créatifs, courts et percutants qui reflètent ce mélange unique, ainsi qu'une "Tagline" (slogan) pour chacun.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: {type: Type.STRING},
                    tagline: {type: Type.STRING}
                },
                required: ['name', 'tagline']
            }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini Error:", error);
    return [
      { name: "Erreur Studio", tagline: "L'IA a besoin de repos" },
      { name: "Fallback Agency", tagline: "Génération manuelle requise" }
    ];
  }
};

export const generateFeedback = async (deliverableName: string, context: string) => {
   try {
    const model = "gemini-3-flash-preview";
    const prompt = `
      Tu es un professeur de Direction Artistique et Technique (RNP).
      Un étudiant vient de soumettre le livrable : "${deliverableName}".
      Description contextuelle : "${context}".
      
      Donne un feedback constructif et court (max 3 phrases) encourageant l'étudiant à vérifier la cohérence visuelle et la narration, comme si tu étais un directeur de création exigeant mais bienveillant.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    return "Bon travail, continuez à itérer sur la qualité visuelle.";
  }
}
