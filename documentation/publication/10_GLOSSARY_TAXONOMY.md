# 10 - Glossary and Taxonomy

To ensure the scientific publication is universally understood by educators, developers, and researchers, this taxonomy defines the core terminology used within the RNP Manager ecosystem.

## Core Concepts
*   **RNP**: Represents the name of the framework. Historically tied to the specific academic program, it functions as the brand name of the "Studio" environment.
*   **VE (Valeur d'Entreprise / Corporate Value)**: The primary macro-metric. It replaces the traditional "grade." It is public, ranks agencies on the leaderboard, and determines their overall standing at the end of the semester.
*   **PiXi**: The in-game fiat currency. It is the micro-metric used for operational survival. It is used to pay rents, salaries, unlock missions, and execute P2P transfers.
*   **Agency**: The equivalent of a "student group." However, it is treated as an incorporated entity with a bank account, an internal hierarchy, and a stock market valuation.

## Mechanics
*   **Mercato**: The transfer market. The system that allows students to resign, be fired, or be poached by rival agencies.
*   **Black Ops / Crises**: Dynamic, often unforeseen events triggered manually by the Admin or procedurally by the AI. They disrupt the market, forcing agencies to pivot their strategies quickly (e.g., "A server crash wiped your deliverables," "Economic taxation").
*   **The Event Log / Single Source of Truth**: The immutable timeline recorded in Firestore. If an action is not in the Event Log, it never happened. It eliminates all subjective arguments regarding grades or submissions.
*   **AutoHeal**: A backend system that automatically attempts to reconcile orphaned user accounts or missing data anomalies (e.g., a student logs in for the first time mid-semester).

## Roles
*   **Game Master (Admin/Teacher)**: Replaces the traditional "Professor" role. They inject liquidity, trigger crises, validate major milestones, and monitor the sociological health of the cohort.
*   **Employee / Associate (Student)**: The actor within the simulation, working to optimize both their personal PiXi wallet and their Agency's VE.
*   **Jury**: External professionals or stakeholders who are granted temporal access to the platform to evaluate final deliverables and influence the market.

## Architectural Concepts
*   **Vibe Coding**: A design philosophy emphasizing aesthetic immersion. The UI avoids looking like an academic LMS (Learning Management System), instead adopting dark modes, ticker-tapes, and cyberpunk UI elements to enforce roleplay.
*   **Data-Driven UI**: An architectural pattern where the React frontend has almost zero local state regarding game rules; it purely renders the data stream coming from the Firebase Websocket.