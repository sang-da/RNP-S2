import { useState } from 'react';
import { transcribeAudioWithGroq, askGroq } from '../services/groqService';

interface UseVoiceDictationProps {
    onTranscriptionComplete: (text: string) => void;
    promptContext: string;
    systemPrompt: string;
    contextData?: any;
}

export const useVoiceDictation = ({ onTranscriptionComplete, promptContext, systemPrompt, contextData = {} }: UseVoiceDictationProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [error, setError] = useState<string | null>(null);

    const startRecording = async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks: BlobPart[] = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                await transcribeAudio(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setError("Impossible d'accéder au micro. Vérifiez les permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            setIsRecording(false);
        }
    };

    const transcribeAudio = async (blob: Blob) => {
        setIsTranscribing(true);
        try {
            // 1. Transcribe with Whisper
            const rawText = await transcribeAudioWithGroq(blob, promptContext);

            if (!rawText || rawText.trim() === '') {
                throw new Error("Aucune parole détectée.");
            }

            // 2. Clean and professionalize with Llama
            const cleanedText = await askGroq(
                `Voici la transcription brute à nettoyer :\n"${rawText}"`, 
                contextData, 
                systemPrompt
            );

            if (cleanedText) {
                onTranscriptionComplete(cleanedText);
            }
        } catch (err: any) {
            console.error("Transcription error:", err);
            setError(err.message || "Erreur lors de la transcription vocale avec Groq.");
        } finally {
            setIsTranscribing(false);
        }
    };

    return {
        isRecording,
        isTranscribing,
        error,
        startRecording,
        stopRecording,
        clearError: () => setError(null)
    };
};
