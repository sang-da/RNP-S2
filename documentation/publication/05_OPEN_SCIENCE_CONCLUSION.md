# 05 - Open Science and Conclusion

## 1. Why Open Science?
The choice to publish RNP Manager on Zenodo and its source code on GitHub (under an open-source license) stems from a commitment to Open Science. Pedagogical innovation thrives on reproducibility and iteration.
*   **Zenodo Publication**: Provides a DOI (Digital Object Identifier) for academic citing, ensuring that the theoretical framework, the algorithms used for grading (VE calculation, multiplier), and the psychological impact study are preserved and academically recognized.
*   **GitHub Release**: Provides the raw, anonymized codebase. Other educators and developers can fork the project, attach their own Firebase instances, and deploy their version of Studio Manager for their classrooms.

## 2. Anonymization and Reproducibility
To ensure the repository is ready for public release, all hardcoded student data, proprietary API keys, and internal university references have been stripped or moved to environment configurations (`.env.example`).
*   The `.env.example` provides the blueprint for connecting the required BaaS (Firebase) and AI providers (Groq).
*   The `config/` directory allows teachers to easily swap out "Awards," "Missions," and "Teams" without touching the core React logic.

## 3. Conclusion
RNP Manager demonstrates that Gamification in education can reach beyond simple badges and leaderboards. By simulating real-world economic pressures, human resources dilemmas, and market forces, students don't just learn about agency management—they live it.
The "Event-First," single-source-of-truth architecture guarantees fairness and drastically reduces the cognitive load on the teacher, turning them from a grader into a Game Master. Through this Open Science publication, we hope to inspire the next generation of active-learning platforms.
