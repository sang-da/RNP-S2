# 🏗️ Architecture Logicielle - RNP Studio Manager (V2.0.0 - Open Science Edition)

## 1. Vue d'ensemble

**RNP Studio Manager** est une Single Page Application (SPA) conçue pour gamifier la gestion de projet étudiant. L'application repose sur une architecture **Serverless** (Firebase) et une approche **Data-Driven UI**.

### Principes Clés (Vibe Coding)
1.  **Single Source of Truth (SSOT)** : Firestore est l'unique source de vérité. L'état local React n'est qu'un reflet temporaire des données distantes.
2.  **Event-Sourcing Lite** : Les modifications critiques (Changement de note, crise financière) sont stockées sous forme d'événements (`eventLog`) dans les documents, permettant de retracer l'historique et de générer des graphiques et audits impartiaux.
3.  **Admin-Driven Logic** : Il n'y a pas de "Backend Job" automatique. C'est le client "Admin" (le Game Master) qui exécute les calculs hebdomadaires (salaires, loyers, crises) via des fonctions de batch côté client sécurisées par Firestore Rules.

---

## 2. Stack Technique Actuelle

| Couche | Technologie | Rôle |
| :--- | :--- | :--- |
| **Frontend** | React 18 + TypeScript | Framework UI et typage strict des données métier garantissant l'intégrité du système. |
| **Build Tool** | Vite | Compilation rapide et optimisation de la production SPA. |
| **Styling** | Tailwind CSS | Styling utilitaire "Neo-Brutalism/Cyberpunk" pour l'immersion gamifiée. |
| **Backend (BaaS)** | Firebase | Base de données (Firestore), Auth, Storage, Rules strictes. |
| **IA Pédagogique** | Groq API (Llama 3 + Whisper) | Assistant virtuel pour l'analyse financière, la création de crises narratives et l'évaluation. |
| **State Management** | React Context API | Gestion modulaire de l'état asynchrone (Agences, Utilisateurs, Sync). |

---

## 3. Modèle de Données (Firestore Schema)

### A. `agencies` (Table Pivot)
*   `id`: string
*   `ve_current`: number (Note de groupe /100, la bourse de l'agence)
*   `budget_real`: number (Trésorerie en PiXi)
*   `members`: Array<Student> (Gestion RH interne, Statuts d'employabilité)
*   `eventLog`: Array<GameEvent> (Audit trail immuable)

### B. `users` & `Jury`
*   `uid`: string (Google Auth ID)
*   `role`: 'admin' | 'student' | 'jury' | 'pending'
*   Système de `autoHeal` pour relier automatiquement les comptes sociaux aux entités "in-game".

---

## 4. Hooks & Logique "GameContext"
Le refactoring complet a permis une modularité totale :
1.  **`useGameSync`** : Gère les `onSnapshot` et le Websocket Firetore.
2.  **`useFinanceLogic`** : Le système bancaire (Loyers, Faillites, Transferts P2P, Taxe Black Market).
3.  **`useGameMechanics`** : Les fusions (M&A), le vote démocratique, le Mercato (embauche, licenciements).

---

## 5. Intelligence Artificielle & Automatisation
Intégration profonde de l'agentivité via Groq :
*   **Creative Director** : Regarde la Data et propose des twists scénaristiques (Ex: "L'agence X est trop riche, imposons une taxe Carbone").
*   **AI Analysis** : Lit les livrables textuels et suggère une notation à l'Admin, gagnant des heures d'évaluation.
