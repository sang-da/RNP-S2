
# 🌟 Best Practices : Devenir un Vibe Coder

Vous voulez créer votre propre app similaire ? Voici les leçons tirées du développement de RNP Manager.

## 1. Respectez l'UI (User Interface)

*   **Cohérence :** N'utilisez pas 50 tons de gris. Utilisez `slate-50`, `slate-200`, `slate-900`.
*   **Hierarchie :** Les infos importantes doivent être grosses et grasses (`text-3xl font-bold`). Les détails secondaires petits et gris (`text-xs text-slate-400`).
*   **Feedback :** Utilisez des `Toast` (notifications popup) pour confirmer chaque action.
*   **États de chargement :** Si une donnée charge, affichez un `Loader` (spinner), pas une page blanche.

## 2. Prompter l'IA comme un Senior

Si vous utilisez ChatGPT ou Claude pour coder :
*   **Donnez le contexte :** "Je travaille sur une app React/Firebase. Voici mon fichier `types.ts`. Crée-moi un composant qui..."
*   **Soyez spécifique sur le style :** "Utilise Tailwind CSS, fais des bords arrondis `rounded-2xl`, et des ombres douces."
*   **Demandez de la sécurité :** "Ajoute des vérifications pour éviter que l'app crash si la donnée est nulle."

## 3. Sécurité et Robustesse

*   **Optional Chaining (`?.`)** : Abusez-en. `user?.name` vaut mieux que `user.name` si `user` n'est pas encore chargé. Cela évite l'écran blanc de la mort.
*   **Guard Clauses** : Au début de vos fonctions, rejetez les cas invalides.
    ```typescript
    if (!user) return; // Arrête tout si pas d'user
    // Le reste du code...
    ```

## 4. Organisation du Code

*   **Séparation des préoccupations :**
    *   La logique d'affichage -> Dans le Composant (`.tsx`).
    *   La logique métier (calculs) -> Dans un Hook ou un Context.
    *   La configuration -> Dans `constants.ts`.
*   **Noms de variables clairs :** `isModalOpen` est mieux que `open`. `handleDeleteClick` est mieux que `func1`.

## 5. Le "Polish" (Fignolage)

C'est ce qui différencie un projet étudiant d'un produit pro.
*   Ajoutez des transitions CSS (`transition-all duration-300`).
*   Ajoutez des effets de survol (`hover:bg-slate-100`).
*   Gérez les erreurs gracieusement (Message sympa plutôt que "Error 500").

---

**Conclusion :**
RNP Manager a été construit en itérant rapidement, mais en gardant toujours une structure saine. 
Le code est propre, typé, et l'interface est pensée pour l'utilisateur final.
C'est ça, le **Vibe Coding**. À vous de jouer ! 🚀
