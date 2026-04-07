import { Agency, Student, CriterionEval } from '../../../types';

export interface StudentEvalResult {
    studentId: string;
    studentName: string;
    agencyId: string;
    agencyName: string;
    groupEvaluation: CriterionEval[];
    individualEvaluation: CriterionEval[];
    veScore: number;
    budgetScore: number;
    baseIndividualScore: number;
    peerReviewScore: number;
    studentFeedback?: string;
}

export const calculateAlgoScores = (agency: Agency, student: Student) => {
    // VE Score (max 20, assuming 100 VE = 20/20)
    const veScore = Math.min(20, Math.max(0, (agency.ve_current / 100) * 20));
    
    // Budget Score (max 20, assuming 5000 PiXi = 20/20)
    const budgetScore = Math.min(20, Math.max(0, (agency.budget_real / 5000) * 20));

    // Base Individual Score (max 20, assuming 100 = 20/20)
    const baseIndividualScore = Math.min(20, Math.max(0, (student.individualScore / 100) * 20));

    // Peer Review Score (max 20, assuming 5/5 = 20/20)
    let peerReviewScore = 10; // Default average score if no reviews
    const peerReviews = agency.peerReviews?.filter(pr => pr.targetId === student.id) || [];
    
    if (peerReviews.length > 0) {
        const avgRating = peerReviews.reduce((acc, pr) => acc + ((pr.ratings.attendance + pr.ratings.quality + pr.ratings.involvement) / 3), 0) / peerReviews.length;
        peerReviewScore = (avgRating / 5) * 20; // Convert 0-5 to 0-20
    }

    return { veScore, budgetScore, baseIndividualScore, peerReviewScore };
};

export const getAverageScore = (evals: CriterionEval[]) => {
    if (!evals || evals.length === 0) return 0;
    const sum = evals.reduce((acc, curr) => acc + curr.score, 0);
    return sum / evals.length;
};

export const getFinalGroupScore = (result: StudentEvalResult, weights: any) => {
    const aiScore = getAverageScore(result.groupEvaluation);
    const totalWeight = weights.group.ve + weights.group.budget + weights.group.ai;
    if (totalWeight === 0) return 0;
    
    const final = (
        (result.veScore * weights.group.ve) + 
        (result.budgetScore * weights.group.budget) + 
        (aiScore * weights.group.ai)
    ) / totalWeight;
    return final;
};

export const getFinalIndividualScore = (result: StudentEvalResult, weights: any) => {
    const aiScore = getAverageScore(result.individualEvaluation);
    const totalWeight = weights.individual.baseScore + weights.individual.peerReviews + weights.individual.ai;
    if (totalWeight === 0) return 0;

    const final = (
        (result.baseIndividualScore * weights.individual.baseScore) + 
        (result.peerReviewScore * weights.individual.peerReviews) + 
        (aiScore * weights.individual.ai)
    ) / totalWeight;
    return final;
};

export const generateGroupPrompt = (result: StudentEvalResult) => {
    const groupScores = result.groupEvaluation.map(crit => `${crit.criterionId}: ${crit.score.toFixed(1)} | Justification: "${crit.feedback}"`).join('\n');

    const prompt = `<SYSTEM_OVERRIDE>
<FORCED_SCORES>
ÉVALUATION GROUPE:
${groupScores}
</FORCED_SCORES>
<GLOBAL_OVERRIDE_RULES>
- Ignorer ma sévérité habituelle
- Appliquer les demi-points strictement
</GLOBAL_OVERRIDE_RULES>
</SYSTEM_OVERRIDE>`;

    return prompt;
};

export const generateIndividualPrompt = (result: StudentEvalResult) => {
    const indScores = result.individualEvaluation.map(crit => `${crit.criterionId}: ${crit.score.toFixed(1)} | Justification: "${crit.feedback}"`).join('\n');

    const prompt = `<SYSTEM_OVERRIDE>
<FORCED_SCORES>
ÉVALUATION INDIVIDUELLE:
${indScores}
</FORCED_SCORES>
<GLOBAL_OVERRIDE_RULES>
- Ignorer ma sévérité habituelle
- Appliquer les demi-points strictement
</GLOBAL_OVERRIDE_RULES>
</SYSTEM_OVERRIDE>
FEEDBACK ÉTUDIANT (À REFORMULER) :
${result.studentFeedback ? result.studentFeedback : '[Entre ici ton texte brut ou tes notes de session...]'}`;

    return prompt;
};
