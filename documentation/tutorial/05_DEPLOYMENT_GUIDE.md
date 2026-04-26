# 05 - Guide de Déploiement (Setup & Hosting)

Pour qu'un autre enseignant ou chercheur puisse réutiliser RNP Manager, voici le protocole de déploiement "from scratch".

## 1. Prérequis
- Un compte **Firebase** (Google Cloud).
- Un compte **Groq** (pour la clé API de l'IA).
- **Node.js** (v18+) et `npm` ou `yarn`.

## 2. Configuration Firebase (Le Cœur du Système)
RNP Manager ne requiert pas de serveur backend complexe (Node/Express), tout est géré par la plateforme Firebase (Serverless).
1. Créer un projet sur la console Firebase.
2. Activer **Firestore Database** (en mode production).
3. Activer **Firebase Authentication** (Méthode de connexion : Google uniquement).
4. Activer **Firebase Storage** (pour l'upload des livrables et avatars).
5. Déployer les règles de sécurité (`firestore.rules` et `storage.rules`) fournies à la racine du projet pour garantir que les étudiants ne puissent pas tricher.

## 3. Variables d'Environnement
Copiez le fichier `.env.example` vers `.env` et remplissez les clés avec celles fournies par Firebase et Groq.

```env
VITE_FIREBASE_API_KEY=votre_cle
VITE_FIREBASE_AUTH_DOMAIN=votre_domaine
VITE_FIREBASE_PROJECT_ID=votre_project_id
VITE_GROQ_API_KEY=votre_cle_groq
```

## 4. Initialisation de la Base de Données (Seeding)
Une fois l'application lancée en local (`npm run dev`), connectez-vous avec votre compte Google.
- Vous serez par défaut un utilisateur "Pending".
- Allez manuellement dans votre console Firestore, dans la collection `users`, trouvez votre document et changez le champ `role` à `"admin"`.
- Rafraîchissez la page. Vous avez maintenant accès au Dashboard d'Administration.

## 5. Déploiement en Production
L'application étant une SPA (Single Page Application) construite avec Vite, elle génère un dossier de fichiers statiques (`dist`).
Vous pouvez la déployer gratuitement et facilement sur :
- **Vercel** ou **Netlify** (Recommandé pour la simplicité CI/CD avec GitHub).
- **Firebase Hosting** (`firebase deploy --only hosting`).
- **Cloud Run** (Via Dockerfile, si vous souhaitez isoler le container).

Assurez-vous d'ajouter le domaine de déploiement à la liste des domaines autorisés dans Firebase Authentication pour que le login Google fonctionne.
