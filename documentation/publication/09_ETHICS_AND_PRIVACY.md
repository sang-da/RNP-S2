# 09 - Ethics, Data Privacy, and Anonymization

Releasing an educational analytics tool and its dataset into Open Science (via Zenodo and GitHub) requires strict adherence to privacy and ethical standards. This document outlines the protocols integrated into the RNP Manager project.

## 1. The Anonymization Protocol for GitHub/Zenodo
The GitHub repository acts as the engine, and the Zenodo publication acts as the analysis. To protect student identities:
*   **Database Scrubbing**: The exported Firebase schemas and JSON dumps included as datasets on Zenodo are fully pseudonymized (e.g., student names replaced by UUIDs like `student-alpha-098`, identifying metadata removed).
*   **Environment Variables**: All university-specific identifiers, API keys (Groq, Firebase), and proprietary institutional naming conventions have been abstracted to the `.env.example` file.
*   **Avatar-First Interaction**: During the simulation, students are encouraged to use pseudonyms or agency identities, which naturally creates a layer of obfuscation.

## 2. GDPR and FERPA Compliance
*   **Data Minimization**: The platform only collects data strictly necessary for the simulation (email for OAuth, in-game actions, text deliverables). It actively avoids collecting demographic or biometric data.
*   **The Right to be Forgotten**: Scripts exist within the admin dashboard to completely purge a student's history or decouple their OAuth ID from the game records at the end of the academic year.
*   **Transparency**: Students are briefed at the start of the module (Tutorial 00) that their interactions are logged as "Game Events" for both grading and research purposes, adhering to informed consent protocols.

## 3. Psychological Safety and The "Fail-Safe"
A major ethical consideration in gamification is the stress induced by simulated "bankruptcy" or "firing" (Mercato).
*   **The Sandbox Boundary**: The teacher must maintain a rigid boundary: a failure in the simulation (e.g., agency dissolution) is an *event in the game*, not an *academic failure*. 
*   **Recovery Mechanics**: The game rules ensure no student is ever permanently "game over." Unemployed students can be subsidized by the state (Admin Bank) or trigger a "Backdoor" mechanic to restart. The algorithm is designed to induce stress, *followed by a clear path to redemption*.
*   **Algorithmic Bias Mitigation**: The AI (Groq) is used for narrative generation and grading *suggestions*, but the human "Game Master" retains absolute veto power. The AI never automatically deducts VE or fires students without admin confirmation.