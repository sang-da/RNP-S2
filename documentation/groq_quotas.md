# ⚡ Quotas Groq API - Version Gratuite (Free Tier)

> **Dernière mise à jour :** 30/12/2025
> **Statut :** Référence pour l'intégration des modèles Llama et Whisper via Groq Cloud.

Ces limites s'appliquent aux clés API gratuites générées sur la console Groq Cloud. Groq se distingue par une inférence ultra-rapide (LPU), idéale pour les tâches nécessitant une faible latence.

## 💬 Chat Completions (Texte)

| Modèle | RPM (Req/Min) | RPD (Req/Jour) | TPM (Tokens/Min) | TPD (Tokens/Jour) |
| :--- | :---: | :---: | :---: | :---: |
| **allam-2-7b** | 30 | 7K | 6K | 500K |
| **groq/compound** | 30 | 250 | 70K | Illimité |
| **groq/compound-mini** | 30 | 250 | 70K | Illimité |
| **llama-3.1-8b-instant** | 30 | 14.4K | 6K | 500K |
| **llama-3.3-70b-versatile** | 30 | 1K | 12K | 100K |
| **meta-llama/llama-4-maverick-17b-128e-instruct** | 30 | 1K | 6K | 500K |
| **meta-llama/llama-4-scout-17b-16e-instruct** | 30 | 1K | 30K | 500K |
| **meta-llama/llama-guard-4-12b** | 30 | 14.4K | 15K | 500K |
| **meta-llama/llama-prompt-guard-2-22m** | 30 | 14.4K | 15K | 500K |
| **meta-llama/llama-prompt-guard-2-86m** | 30 | 14.4K | 15K | 500K |
| **moonshotai/kimi-k2-instruct** | 60 | 1K | 10K | 300K |
| **moonshotai/kimi-k2-instruct-0905** | 60 | 1K | 10K | 300K |
| **openai/gpt-oss-120b** | 30 | 1K | 8K | 200K |
| **openai/gpt-oss-20b** | 30 | 1K | 8K | 200K |
| **openai/gpt-oss-safeguard-20b** | 30 | 1K | 8K | 200K |
| **qwen/qwen3-32b** | 60 | 1K | 6K | 500K |

## 🎙️ Speech to Text (Transcription)

| Modèle | RPM (Req/Min) | RPD (Req/Jour) | Audio Sec/Heure | Audio Sec/Jour |
| :--- | :---: | :---: | :---: | :---: |
| **whisper-large-v3** | 20 | 2K | 7.2K | 28.8K |
| **whisper-large-v3-turbo** | 20 | 2K | 7.2K | 28.8K |

## 🗣️ Text to Speech (Synthèse Vocale)

| Modèle | RPM (Req/Min) | RPD (Req/Jour) | TPM (Tokens/Min) | TPD (Tokens/Jour) |
| :--- | :---: | :---: | :---: | :---: |
| **canopylabs/orpheus-arabic-saudi** | 10 | 100 | 1.2K | 3.6K |
| **canopylabs/orpheus-v1-english** | 10 | 100 | 1.2K | 3.6K |
| **playai-tts** | 10 | 100 | 1.2K | 3.6K |
| **playai-tts-arabic** | 10 | 100 | 1.2K | 3.6K |

## 🚀 Impact sur CHOPS App

L'intégration de Groq offre des alternatives stratégiques pour les utilisateurs "Custom / Local" (via l'onglet BYOK) :

1.  **Vitesse** : Les modèles `llama-3.1-8b-instant` sont parfaits pour les tâches de classification et de tagging (Suggestion de Tags, Résumés TL;DR) où la vitesse prime sur la profondeur.
2.  **Transcription** : `whisper-large-v3` via Groq est souvent plus rapide que l'implémentation standard, permettant une transcription quasi-temps réel pour les mémos vocaux longs.
3.  **Volume** : Avec 14.4K requêtes/jour sur les petits modèles Llama, c'est une excellente solution de repli si les quotas Gemini Flash (20 RPD en Tier 1) sont atteints.
