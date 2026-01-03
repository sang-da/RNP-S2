# RNP Stonk App — Spécifications Produit

## 1. Vision
Une WebApp unique avec deux vues distinctes partageant une **Single Source of Truth** (Base de vérité unique).
L'application gamifie le suivi pédagogique sous forme de marché boursier ("Stonk").

## 2. Règles Produit (Non négociables)
1.  **Event-first** : Tout changement (VE, Budget, Crise) est un *Event* immuable dans une Timeline.
2.  **Transparence** : Les étudiants voient tout (VE, Règles, Events publics) sauf les notes privées.
3.  **Zéro Débat** : L'app fait foi. L'historique prouve les variations.
4.  **Anti-Triche** : Pas de valorisation sans preuve (URL/Fichier).

## 3. Interface Utilisateur (UX)

### Vue Admin (Enseignant)
*   **Action Rapide** (< 20s) : Créer une crise, modifier la VE, valider un checkpoint.
*   **Contrôle Total** : Ajout/Retrait membres, gestion des statuts.

### Vue Student (Étudiant)
*   **Read-Only** (principalement) : Consultation de la VE, du Budget, des Objectifs.
*   **Timeline** : Visualisation claire des gains/pertes (ex: "-10 VE : Inflation").
*   **Dépôt** : Soumission de preuves via URL.

## 4. Modèle de Données (Simplifié)
*   `students` : Profils, rôles, scores individuels.
*   `enterprises` : Agences, VE courante, Budgets (Réel/Valorisé).
*   `events` : La pièce maîtresse. Type (Crisis, Checkpoint, VE_Delta), Valeur, Commentaire.