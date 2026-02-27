
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

  // Transcription endpoint
  app.post("/api/transcribe", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const apiKey = process.env.VITE_GROQ_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "VITE_GROQ_API_KEY is not configured" });
      }

      const formData = new FormData();
      formData.append("file", req.file.buffer, {
        filename: "audio.webm",
        contentType: req.file.mimetype,
      });
      formData.append("model", "whisper-large-v3");

      const response = await axios.post(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      res.json(response.data);
    } catch (error: any) {
      console.error("Transcription error:", error.response?.data || error.message);
      res.status(500).json({ 
        error: "Failed to transcribe audio", 
        details: error.response?.data || error.message 
      });
    }
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
