export const generateSociometricPrompt = (
    minDate: string,
    maxDate: string,
    totalFired: number,
    totalResigned: number,
    totalTransfers: number,
    totalPhantomMarketTxs: number,
    totalP2PTransfers: number,
    totalJuryEvents: number,
    totalStudents: number
) => `
Generate a Sociometric & Behavioral Audit Memo based on the following gamification experiment dataset.

Context of the Simulation (RNP Manager):
- This is a cohort of ${totalStudents} students grouped into competing agencies.
- "Transfers/Poaching" means a student left one agency to join another.
- "Resignations" (Resigned) mean a student quit their agency voluntarily.
- "Fired" means the agency kicked the student out.
- "Phantom Market" means underground operations, cheating checks, or black market purchases.
- "P2P Transfers" mean direct money (PiXi) transfers between students (often indicating shadow economy or bailout loans).

Dataset to analyze:
Format: Professional Markdown Document.
Language: French.
Sections: 
- Dynamique de l'Emploi de la Promotion (Fired: ${totalFired}, Resigned: ${totalResigned}, Transfers/Poaching: ${totalTransfers})
- Économie Souterraine & Espace Fantôme (Transactions Black Market / Backdoor / Enchères: ${totalPhantomMarketTxs}, P2P Transfers: ${totalP2PTransfers})
- Intervention Externe (Actions Jury: ${totalJuryEvents})
- Analyse des Interactions Sociales (Analyze what these numbers tell us about the cohort's trust, collaboration, mobility, and propensity for shadow-economy hacking vs regular agency work. Note the flow of the workforce across the promotion.)

Write it formally as an academic abstract/memo. Do not invent numbers, only use those provided. Be deeply analytical from a sociological perspective.
`;
