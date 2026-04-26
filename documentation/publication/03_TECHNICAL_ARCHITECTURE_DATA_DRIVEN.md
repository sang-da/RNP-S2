# 03 - Technical Architecture & Data-Driven UI

The RNP Manager is built on a modern, real-time web stack designed for instantaneous feedback and high resilience.

## 1. Stack Overview
*   **Frontend**: React 18, TypeScript, Vite.
*   **Styling**: Tailwind CSS, heavily utilizing fluid layouts and gamified UI elements.
*   **Backend & Database**: Firebase (Firestore, Auth, Storage) operating in a serverless capacity.
*   **AI Integration**: Groq API (Llama 3 / Whisper) for automated analysis, dynamic crisis generation, and dictation.

## 2. Single Source of Truth (SSOT) and Event-Sourcing Lite
To avoid syncing issues in a fast-paced game environment, the architecture strictly adheres to a Data-Driven UI model.
*   **Firestore Websockets**: The `GameContext` sets up `onSnapshot` listeners. When an admin deducts 10 VE from an agency, the database updates, pushes the event via websocket, and the React tree re-renders in <100ms.
*   **Event Log**: Every major action (financial transfer, VE change, mission submission) generates a `GameEvent`. This ensures complete traceability and "Zero Debate" between students and teachers.

## 3. Modularity and The Context Architecture
Instead of using Redux, which can be verbose, the application uses highly specialized React Contexts:
*   `useGameSync`: Handles the raw websocket data streams.
*   `useFinanceLogic`: Encapsulates all mathematical rules (salaries, rent, bankruptcy).
*   `useGameMechanics`: Manages complex interactions like Mergers, Black Ops, and Democratic Voting.

## 4. AI as the "Creative Director"
A unique feature of this architecture is the integration of the Groq API. The LLM acts as an assistant to the Administrator:
*   **AIBriefing & Profiler**: It analyzes the current state of all agencies and suggests narrative interventions.
*   **Crisis Generator**: It creates context-aware crises (e.g., if an agency is too rich, the AI generates an "Inflation" or "Tax Audit" narrative).
*   **Automated Feedback**: Assisting the admin in grading massive amounts of text deliverables quickly.

## 5. Security and Role-Based Access
*   **Roles**: Admin, Student, Jury.
*   **Firebase Rules**: Strict security rules ensure students cannot write to other agencies' data or view private grading notes, while still maintaining real-time read access to public market data.
