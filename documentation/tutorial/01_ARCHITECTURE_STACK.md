
# 🏗️ Architecture & Stack Technique

Pour construire une application moderne, rapide et maintenable, nous avons choisi une stack éprouvée. Voici pourquoi.

## 1. Le Frontend : React + TypeScript + Vite

*   **React** : C'est la bibliothèque standard pour les interfaces dynamiques. Nous utilisons une approche **100% Composants Fonctionnels & Hooks** (`useState`, `useEffect`, `useMemo`).
*   **TypeScript** : Indispensable. En "Vibe Coding", on veut éviter les bugs bêtes. Typer nos données (voir `types.ts`) permet à l'IDE de nous corriger avant même de lancer l'app.
    *   *Exemple :* Si vous essayez d'accéder à `agency.money` alors que la propriété s'appelle `agency.budget_real`, TypeScript bloquera la compilation.
*   **Vite** : L'outil de build ultra-rapide. Pas de temps à perdre à attendre que le serveur se lance.

## 2. Le Styling : Tailwind CSS

Pourquoi pas du CSS classique ?
Dans une approche rapide, sauter entre un fichier `.tsx` et un fichier `.css` tue le "flow".
Avec **Tailwind**, on style directement dans le composant.

*   **Design System implicite :** On utilise des classes utilitaires (`bg-slate-50`, `text-indigo-600`, `rounded-xl`). Cela garantit que toute l'app a la même cohérence visuelle sans effort.
*   **Responsive :** `md:flex-row` permet de gérer le mobile et le desktop en une seule ligne.

## 3. Le Backend (Serverless) : Firebase

Nous n'avons pas créé de serveur API classique (Node/Express). Nous utilisons **Firebase** comme un "Backend-as-a-Service".

*   **Firestore (Base de données)** : Une base NoSQL temps réel. C'est magique pour ce type d'app : quand l'admin change une note, l'écran de l'étudiant se met à jour *instantanément* sans recharger la page.
*   **Auth** : Gestion des utilisateurs (Google Login).
*   **Storage** : Stockage des fichiers (PDFs, Images des rendus).

## 4. Structure des Dossiers

Le projet est organisé pour que tout soit facile à trouver :

```
/
├── src/
│   ├── components/      # Les briques LEGO de l'app
│   │   ├── admin/       # Composants spécifiques prof
│   │   ├── student/     # Composants spécifiques élèves
│   │   ├── Layout.tsx   # Le cadre global (Header, fond)
│   │   └── Modal.tsx    # Composant réutilisable partout
│   ├── contexts/        # La gestion d'état globale (Cerveau de l'app)
│   ├── config/          # Les constantes (Règles du jeu, Assets)
│   ├── services/        # Connexion à Firebase
│   ├── types.ts         # Le contrat de données (TRÈS IMPORTANT)
│   └── App.tsx          # Le point d'entrée qui décide quelle page afficher
```

## Leçon de Vibe Coding #1 : L'Architecture Modulaire

Ne mettez pas tout votre code dans un seul fichier géant.
*   Vous avez besoin d'un bouton spécifique ? -> Créez un composant.
*   Vous avez une logique complexe de calcul de salaire ? -> Mettez-la dans `config/rules.ts` ou un Hook.

**Diviser pour mieux régner (et mieux debugger).**
