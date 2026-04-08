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

export const getWeightedGroupCriterionScore = (result: StudentEvalResult, aiScore: number, weights: any) => {
    const totalWeight = weights.group.ve + weights.group.budget + weights.group.ai;
    if (totalWeight === 0) return 0;
    return (result.veScore * weights.group.ve + result.budgetScore * weights.group.budget + aiScore * weights.group.ai) / totalWeight;
};

export const getWeightedIndividualCriterionScore = (result: StudentEvalResult, aiScore: number, weights: any) => {
    const totalWeight = weights.individual.baseScore + weights.individual.peerReviews + weights.individual.ai;
    if (totalWeight === 0) return 0;
    return (result.baseIndividualScore * weights.individual.baseScore + result.peerReviewScore * weights.individual.peerReviews + aiScore * weights.individual.ai) / totalWeight;
};

export const getFinalGroupScore = (result: StudentEvalResult, weights: any) => {
    if (!result.groupEvaluation || result.groupEvaluation.length === 0) return 0;
    const sum = result.groupEvaluation.reduce((acc, crit) => acc + getWeightedGroupCriterionScore(result, crit.score, weights), 0);
    return sum / result.groupEvaluation.length;
};

export const getFinalIndividualScore = (result: StudentEvalResult, weights: any) => {
    if (!result.individualEvaluation || result.individualEvaluation.length === 0) return 0;
    const sum = result.individualEvaluation.reduce((acc, crit) => acc + getWeightedIndividualCriterionScore(result, crit.score, weights), 0);
    return sum / result.individualEvaluation.length;
};

export const generateGroupPrompt = (result: StudentEvalResult, weights: any) => {
    const groupScores = result.groupEvaluation.map(crit => {
        const finalScore = getWeightedGroupCriterionScore(result, crit.score, weights);
        return `${crit.criterionId}: ${finalScore.toFixed(1)} | Justification: "${crit.feedback}"`;
    }).join('\n');

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

export const generateIndividualPrompt = (result: StudentEvalResult, weights: any) => {
    const indScores = result.individualEvaluation.map(crit => {
        const finalScore = getWeightedIndividualCriterionScore(result, crit.score, weights);
        return `${crit.criterionId}: ${finalScore.toFixed(1)} | Justification: "${crit.feedback}"`;
    }).join('\n');

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
