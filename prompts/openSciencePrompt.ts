export const generateOpenSciencePrompt = (
    minDate: string, 
    maxDate: string, 
    totalStudents: number, 
    totalCrises: number, 
    totalDismissals: number, 
    totalFinancialCharges: number, 
    successfulAgencies: number, 
    failedAgencies: number, 
    totalAgencies: number
) => `
Generate a comprehensive Open Science Research Memo based on the following gamification experiment dataset.

Context of the Simulation (RNP Manager):
- This is a teaching simulation where students are grouped into "Agencies". 
- An Agency succeeds if its VE (Valeur d'Entreprise) is >= 60.
- An Agency fails if it goes bankrupt or its VE drops < 40.
- Students do not succeed or fail individually in this metric; the AGENCY succeeds or fails. Students can be hired, fired, or transfer between agencies.

Dataset to analyze:
Format: Professional Markdown Document.
Language: French.
Sections: 
- Période & Population (Dates: ${minDate} to ${maxDate}, Students: ${totalStudents})
- Dynamique Financière & Sociale (Crises: ${totalCrises}, Dismissals: ${totalDismissals}, Total Financial Charges: ${totalFinancialCharges} PiXi)
- Réussite & Échec (Agencies Success: ${successfulAgencies}, Agencies Failures: ${failedAgencies}, Total Agencies: ${totalAgencies})
- Analyse Pédagogique (Extrapolate what this indicates about peer-regulation, accountability, and the gamified format's success. Focus on the fact that the simulation operates at the agency level, not just the individual level.)

Write it formally as an academic abstract/memo. Do not invent numbers, only use those provided. Be analytical and professional.
`;
