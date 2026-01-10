
# 🏗️ Architecture Logicielle - RNP Studio Manager

## 1. Vue d'ensemble

**RNP Studio Manager** est une Single Page Application (SPA) conçue pour gamifier la gestion de projet étudiant. L'application repose sur une architecture **Serverless** (Firebase) et une approche **Data-Driven UI**.

### Principes Clés (Vibe Coding)
1.  **Single Source of Truth (SSOT)** : Firestore est l'unique source de vérité. L'état local React n'est qu'un reflet temporaire des données distantes.
2.  **Event-Sourcing Lite** : Les modifications critiques (Changement de note, crise financière) sont stockées sous forme d'événements (`eventLog`) dans les documents, permettant de retracer l'historique et de générer des graphiques.
3.  **Admin-Driven Logic** : Il n'y a pas de "Backend Job" automatique. C'est le client "Admin" qui, lorsqu'il est connecté, exécute les calculs hebdomadaires (salaires, loyers) via des fonctions batch.

---

## 2. Stack Technique

| Couche | Technologie | Rôle |
| :--- | :--- | :--- |
| **Frontend** | React 18 + TypeScript | Framework UI et typage strict des données métier. |
| **Build Tool** | Vite | Compilation rapide et Hot Module Replacement (HMR). |
| **Styling** | Tailwind CSS | Styling utilitaire pour une UI cohérente et rapide. |
| **Backend (BaaS)** | Firebase (v8/v9 Compat) | Base de données (Firestore), Auth, Storage. |
| **IA** | Groq API (Llama 3) | Assistant virtuel pour l'analyse financière et la génération de scénarios. |
| **State Management** | React Context API | Gestion de l'état global et injection des dépendances. |

---

## 3. Modèle de Données (Firestore Schema)

La base de données NoSQL est structurée en 4 collections principales.

### A. `agencies` (Collection Principale)
Contient l'état complet d'une agence (groupe d'étudiants).
*   `id`: string
*   `ve_current`: number (Note de groupe /100)
*   `budget_real`: number (Trésorerie en PiXi)
*   `members`: Array<Student> (Données embarquées des étudiants pour réduire les lectures)
*   `eventLog`: Array<GameEvent> (Journal des transactions et crises)
*   `progress`: Map (Suivi des livrables par semaine)

### B. `users` (Profils Auth)
Table de liaison entre l'Authentification Google et le jeu.
*   `uid`: string (Firebase Auth ID)
*   `role`: 'admin' | 'student' | 'pending'
*   `agencyId`: string (Lien vers l'agence)

### C. `weeks` (Configuration)
Données statiques/dynamiques du calendrier pédagogique.
*   `deliverables`: Liste des attendus.
*   `locked`: Booléen pour débloquer le contenu progressivement.

### D. `resources` (Wiki)
Contenu pédagogique partagé.

---

## 4. Gestion d'État (Context Architecture)

L'application évite Redux au profit d'une architecture modulaire basée sur les Contextes React.

### `AuthContext` (Sécurité & Session)
*   **Rôle** : Gère la session utilisateur Firebase.
*   **Logique critique** : `attemptAutoHeal`.
    *   Lorsqu'un étudiant se connecte avec Google, le système scanne les agences pour trouver un membre "fantôme" (pré-créé) avec un nom similaire.
    *   Si trouvé, il effectue une fusion (Merge) des IDs pour lier le compte Google au profil de jeu.

### `GameContext` (Cerveau de l'App)
Suite au refactoring, ce contexte est un **orchestrateur** qui assemble plusieurs hooks spécialisés :

1.  **`useGameSync` (Data Layer)**
    *   Gère les abonnements `onSnapshot` (Websockets) vers Firestore.
    *   Assure la synchronisation temps réel.

2.  **`useFinanceLogic` (Economy Layer)**
    *   Contient la logique comptable : Paiement des loyers, versement des salaires, transferts P2P.
    *   Gère les règles de faillite (-5000 PiXi).

3.  **`useGameMechanics` (Gameplay Layer)**
    *   Gère les interactions complexes : Fusions (Mergers), Votes démocratiques, Black Ops (Attaques entre agences).
    *   Calcule les multiplicateurs de performance.

### `UIContext` (Interface)
*   Gère les modales globales (Confirmation) et les Toasts (Notifications).

---

## 5. Flux de Données (Data Flow)

### Lecture (Read Flow)
1.  **Firebase** détecte un changement (ex: L'admin change une note).
2.  **Firestore** pousse la nouvelle donnée via le WebSocket.
3.  **`useGameSync`** reçoit le snapshot et met à jour le state `agencies`.
4.  **`GameContext`** diffuse le nouveau tableau aux composants.
5.  **`StudentAgencyView`** se re-rend et affiche la nouvelle note.
*   *Latence estimée : < 100ms.*

### Écriture (Write Flow - Ex: Dépôt de fichier)
1.  Utilisateur upload un fichier.
2.  **Firebase Storage** stocke le fichier et renvoie une URL.
3.  Le composant appelle `updateAgency` du Context.
4.  **`useGameMechanics`** crée un objet `GameEvent` local.
5.  **Firestore** reçoit la mise à jour du document Agence (optimistic UI non nécessaire car très rapide).

---

## 6. Points d'Attention & Algorithmes

### A. Calcul de la Performance (Team Multiplier)
Pour éviter que les étudiants ne "campent" sur leurs acquis, un multiplicateur est appliqué aux gains de VE.
> `Multiplier = 1 + ((MoyenneScoreMembres - 50) / 100)`
*   Cela incite les meilleurs à aider les plus faibles, car une moyenne basse ralentit la croissance de l'agence.

### B. Gestion des Erreurs (Safe Handling)
*   Le code utilise massivement l'Optional Chaining (`?.`) pour éviter les écrans blancs si une donnée manque.
*   Le système de `try/catch` dans les hooks logiques envoie des Toasts d'erreur à l'utilisateur au lieu de crasher.

### C. Sécurité (Firestore Rules)
*   Actuellement en mode "Développement" (`allow read, write: if request.auth != null`).
*   **Roadmap Prod** : Restreindre l'écriture des collections `weeks` et `resources` aux seuls admins via des Custom Claims ou une vérification d'email.

## 7. Structure des Dossiers

```
src/
├── components/         # Composants React (Vues)
│   ├── admin/          # Dashboard Professeur
│   ├── student/        # Vue Étudiant (Missions, Marché...)
│   └── ...
├── contexts/           # Logique Métier (State)
│   ├── auth/           # Logique de connexion et réparation
│   ├── game/           # Hooks découpés (Finance, Sync, Mechanics)
│   └── ...
├── config/             # Constantes (Règles du jeu, Assets)
├── services/           # Wrappers API (Firebase, Groq)
└── types.ts            # Définitions TypeScript (Contrat de données)
```
