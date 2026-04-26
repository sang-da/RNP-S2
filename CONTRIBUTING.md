# Contributing to RNP Manager
*(Ce fichier est disponible en anglais pour la plateforme open source)*

Thank you for your interest in contributing to the **RNP Studio Manager** framework, an Open Science project designed to revolutionize project-based learning via gamified stock-market mechanisms.

Whether you're a teacher wanting to suggest a new "Scenario/Crisis", an educational researcher running metrics on our event logs, or a developer patching React code, your input is incredibly valuable.

## 1. How to Report Bugs
If you find a logic bug (e.g., the Mercato tax calculation is wrong) or a UI issue:
1. Check the existing Issues on the GitHub repository.
2. If none exists, open a new Issue. Provide as much detail as possible: steps to reproduce, browser version, and your current environment configuration (especially if you self-host the Firebase backend).

## 2. Setting Up Your Development Environment
To get started making code changes:
1. Fork the repository.
2. Create a local Firebase project as described in `/documentation/tutorial/05_DEPLOYMENT_GUIDE.md`.
3. Create your `.env` file pointing to your personal Firebase/Groq testing instances.
4. Run `npm install` and `npm run dev`.

## 3. Pull Request (PR) Workflow
1. Create a feature branch originating from `main` (e.g., `feature/custom-peer-review-algo` or `fix/p2p-transfer-validation`).
2. Adhere to the existing code style:
   - TypeScript strict mode is enabled.
   - We use Tailwind CSS utility classes. Avoid `<style>` blocks.
   - No external state libraries (Redux/Zustand); stick to our custom React Contexts (`contexts/game/`) to handle the Firestore Websocket logic.
3. Write a coherent PR description. If your PR changes the economy or game rules, **please update the corresponding documentation** in `/documentation/manuels/`.
4. Wait for a code review by the core maintainers.

## 4. Contributing to Pedagogical Research (Open Science)
If you are an educator testing RNP Manager in your classroom:
- You don't need to write code to contribute!
- You can submit "Scenarios", "Crises Prompts", or "Syllabus Integration Guides" by opening a PR directly in the `/documentation/` folder.
- If you publish research papers citing our platform, please let us know so we can link them to the main Zenodo entry.

## 5. Security Vulnerabilities
If you discover a severe cheat/hack in the Firestore Security Rules (`firestore.rules` or `storage.rules`), **do not open a public issue.**
Please email the maintainers directly to ensure we can patch it before it is actively exploited in live university environments.
