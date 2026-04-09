
// Ce fichier centralise la configuration Groq.
// Pour la production, il est recommandé d'utiliser des variables d'environnement (ex: import.meta.env.VITE_GROQ_KEY)

// ⚠️ REMPLACE LA VALEUR CI-DESSOUS PAR TA CLÉ GROQ COMMENÇANT PAR "gsk_"
// Tu peux la générer ici : https://console.groq.com/keys
export const getGroqKey = () => {
    if (typeof window !== 'undefined') {
        const localKey = localStorage.getItem('GROQ_API_KEY');
        if (localKey) return localKey;
    }
    return (import.meta as any).env?.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY || "TA_CLE_GROQ_ICI";
};

// Le modèle le plus performant actuellement sur Groq
export const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

// Configuration de l'API
export const getGroqApiUrl = () => {
    if (typeof window !== 'undefined') {
        const localUrl = localStorage.getItem('GROQ_API_URL');
        if (localUrl) return localUrl;
    }
    return (import.meta as any).env?.VITE_GROQ_API_URL || process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
};
