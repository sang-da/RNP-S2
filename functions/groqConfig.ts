
// Ce fichier centralise la configuration Groq.
// Pour la production, il est recommandé d'utiliser des variables d'environnement (ex: import.meta.env.VITE_GROQ_KEY)

// ⚠️ REMPLACE LA VALEUR CI-DESSOUS PAR TA CLÉ GROQ COMMENÇANT PAR "gsk_"
// Tu peux la générer ici : https://console.groq.com/keys
export const GROQ_KEY = (import.meta as any).env?.VITE_GROQ_API_KEY || "TA_CLE_GROQ_ICI"; 

// Le modèle le plus performant actuellement sur Groq
export const GROQ_MODEL = "llama-3.3-70b-versatile";

// Configuration de l'API
export const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
