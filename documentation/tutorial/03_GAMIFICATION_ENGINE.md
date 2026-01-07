
# 🎮 Gamification Engine : Coder les Règles du Jeu

RNP Manager n'est pas Excel. C'est un jeu.
Comment coder des mécanismes de jeu (règles, pénalités, bonus) dans une app React ?

## 1. La Boucle de Gameplay

Le jeu fonctionne par **Cycles Hebdomadaires**.
Dans `GameContext.tsx`, nous avons des fonctions "Batch" (traitement par lot) que l'Admin déclenche :

1.  `processFinance('A')` : Calcule les loyers et verse les salaires pour la Classe A.
2.  `processPerformance('A')` : Analyse les notes et ajuste la VE.

### Exemple : Le Salaire Dynamique
L'étudiant est payé selon son score individuel.

*Code conceptuel :*
```typescript
const salaire = student.individualScore * 10; // Score 80 = 800 PiXi
// Si l'agence est pauvre, on ne peut pas payer tout le monde !
if (agency.budget < 0) {
   // Gel des salaires (Logique de crise)
}
```

## 2. Le Système de Badges

Pour motiver, il faut récompenser.
Nous avons un tableau `BADGE_DEFINITIONS` dans `constants.ts`.
L'interface vérifie simplement si l'étudiant possède l'ID du badge pour afficher l'icône correspondante.

C'est de la logique purement visuelle (`StudentAgencyView.tsx`) basée sur des données statiques.

## 3. Le Marché et la VE (Valeur d'Entreprise)

La VE est calculée dynamiquement.
Nous utilisons un **Graphique (Recharts)** dans `MarketOverview.tsx` pour visualiser l'historique.

**L'astuce "Vibe Coding" :**
Au lieu de stocker la valeur historique de la VE chaque jour (ce qui prendrait trop de place), nous la recalculons à la volée en rejouant l'historique des événements (`eventLog`).

*   Départ : 0
*   Event 1 (+10) -> Total 10
*   Event 2 (-5) -> Total 5

Cela permet d'avoir un graphique précis sans complexifier la base de données.

## 4. Les "Black Ops" et Interactions

Nous avons ajouté des interactions PvP (Player vs Player) : Audit, Fuite d'info.
C'est simplement une fonction qui :
1.  Vérifie si l'agence A a assez d'argent.
2.  Déduit l'argent de l'agence A.
3.  Ajoute un événement de crise (Malus VE) dans l'historique de l'agence B.

C'est simple, mais l'impact émotionnel pour l'utilisateur est fort.

## Leçon de Vibe Coding #3 : Feedback Loop

Pour qu'une app soit engageante :
1.  **Action** (L'étudiant clique sur un bouton).
2.  **Règle** (Le code vérifie si c'est possible).
3.  **Conséquence** (La base de données change).
4.  **Feedback** (Un Toast "Succès" apparait, un son joue, le graphique bouge).

**Ne laissez jamais une action sans feedback visuel immédiat.**
