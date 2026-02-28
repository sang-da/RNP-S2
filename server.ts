
import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Multer setup for audio files
  const storage = multer.memoryStorage();
  const upload = multer({ storage });

  // Transcription endpoint (Whisper + LLM Post-processing)
  app.post("/api/transcribe", upload.single("file"), async (req, res) => {
    console.log("[SERVER] Transcription request received");
    try {
      if (!req.file) {
        console.error("[SERVER] No file in request");
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { reviewerName, targetName, agencyName } = req.body;
      console.log("[SERVER] Context:", { reviewerName, targetName, agencyName });

      const apiKey = process.env.VITE_GROQ_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("[SERVER] No API Key found in process.env");
        return res.status(500).json({ error: "No API Key configured on server" });
      }

      console.log("[SERVER] Calling Groq Whisper...");
      // 1. WHISPER TRANSCRIPTION
      const whisperFormData = new FormData();
      whisperFormData.append("file", req.file.buffer, {
        filename: "audio.webm",
        contentType: req.file.mimetype || "audio/webm",
      });
      whisperFormData.append("model", "whisper-large-v3-turbo");
      whisperFormData.append("language", "fr");
      whisperFormData.append("prompt", `Feedback de ${reviewerName || 'un étudiant'} pour ${targetName || 'son collègue'} dans l'agence ${agencyName || 'de design'}.`);

      const whisperResponse = await axios.post(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        whisperFormData,
        {
          headers: {
            ...whisperFormData.getHeaders(),
            'Authorization': `Bearer ${apiKey}`,
          },
          timeout: 30000
        }
      );

      const rawText = whisperResponse.data.text;
      console.log("[SERVER] Whisper raw text:", rawText);

      if (!rawText || rawText.trim().length < 2) {
        return res.json({ text: "", raw: "" });
      }

      console.log("[SERVER] Calling Groq Llama for cleanup...");
      // 2. LLM POST-PROCESSING (Best Practice: Clean & Professionalize)
      const llmResponse = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.3-70b-versatile",
          messages: [
            { 
              role: "system", 
              content: `Tu es un assistant expert en communication pédagogique. Ta mission est de nettoyer une transcription audio de feedback entre étudiants. 
              CONTEXTE : ${reviewerName || 'Un étudiant'} évalue ${targetName || 'son collègue'} au sein de l'agence ${agencyName || 'RNP'}.
              
              DIRECTIVES :
              1. Supprime les hésitations (euh, bah, alors, etc.).
              2. Corrige la ponctuation et la grammaire.
              3. Rends le texte fluide et professionnel tout en conservant scrupuleusement le sens et le ton original.
              4. Si le ton est critique, garde-le mais rends-le constructif.
              5. Retourne UNIQUEMENT le texte corrigé, sans introduction ni conclusion.` 
            },
            { 
              role: "user", 
              content: `Voici la transcription brute à nettoyer : "${rawText}"` 
            }
          ],
          temperature: 0.3,
          max_tokens: 1024
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const cleanedText = llmResponse.data.choices[0].message.content;
      console.log("[SERVER] Cleaned text:", cleanedText);

      res.json({ 
        text: cleanedText,
        raw: rawText
      });
    } catch (error: any) {
      const errorData = error.response?.data || error.message;
      console.error("[SERVER] Transcription error:", errorData);
      res.status(500).json({ 
        error: "Failed to transcribe audio", 
        details: errorData 
      });
    }
  });

  // API 404 handler
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
