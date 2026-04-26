# Outline for Scientific Publication (Open Science / Zenodo)

This directory contains the foundational texts required to construct a comprehensive white paper or academic journal article outlining the pedagogical, technical, and psychological architecture of RNP Manager.

## Table of Contents

*   **[00 - Abstract & Introduction](./00_ABSTRACT_INTRODUCTION.md)**: The executive summary of the project and its goals.
*   **[01 - Pedagogical Context and Motivation](./01_PEDAGOGICAL_CONTEXT_MOTIVATION.md)**: Why traditional grading systems fail and why this system was built.
*   **[02 - Gamification Framework and Mechanics](./02_GAMIFICATION_FRAMEWORK.md)**: Detailed breakdown of PiXi, VE, Mercato, and the economy.
*   **[03 - Technical Architecture & Data-Driven UI](./03_TECHNICAL_ARCHITECTURE_DATA_DRIVEN.md)**: How React, Firebase, and AI (Groq) power the simulation.
*   **[04 - Results, Impact, and Discussion](./04_RESULTS_IMPACT_DISCUSSION.md)**: The observed effects on student behavior and teacher ROI.
*   **[05 - Open Science and Conclusion](./05_OPEN_SCIENCE_CONCLUSION.md)**: The rationale for open-sourcing the tool and next steps.
*   **[06 - Problem Statement and Core Hypothesis](./06_PROBLEM_STATEMENT_HYPOTHESIS.md)**: Defining the "Passenger Syndrome" and the core problem being solved.
*   **[07 - Pedagogical Frameworks and Theories](./07_PEDAGOGICAL_THEORIES.md)**: Grounding the application in Self-Determination Theory and Experiential Learning.
*   **[08 - Methodology and Data Collection](./08_METHODOLOGY_DATA_COLLECTION.md)**: How to measure the success of the simulation via telemetry and surveys.
*   **[09 - Ethics, Data Privacy, and Anonymization](./09_ETHICS_AND_PRIVACY.md)**: Protecting student identities and ensuring psychological safety.
*   **[10 - Glossary and Taxonomy](./10_GLOSSARY_TAXONOMY.md)**: Key definitions (VE, PiXi, Mercato, Game Master) for the academic reader.

## Additional Documentation (Tutorials)
For the actual deployment and setup of the software corresponding to this publication, refer to the `../tutorial/` directory, notably:
*   `05_DEPLOYMENT_GUIDE.md`: Fast setup guide for educators.
*   `06_TEACHERS_PLAYBOOK.md`: The weekly operations manual.
*   `07_ECONOMY_BALANCING.md`: How to avoid hyperinflation in the simulation.
*   `08_ANTI_CHEAT_SYSTEMS.md`: Explaining the security measures and handling of dark finance.

## Publishing Steps
To convert this into your final Zenodo/arXiv submission:
1. Compile these markdown files into a single LaTeX or Word document.
2. Ensure the GitHub repository has a `CITATION.cff` file so others can cite your software.
3. Export an anonymized, minimal dataset (a JSON dump of the Event Logs with names removed) to attach as supplemental data on Zenodo to prove the telemetry capabilities.