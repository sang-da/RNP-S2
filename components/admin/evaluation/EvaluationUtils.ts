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
    deliverableScore: number; // NOUVEAU
    studentFeedback?: string;
}

export const calculateDeliverableScore = (agency: Agency, criterionId?: string, mapping?: Record<string, string[]>): number => {
    if (!agency.progress) return 10; // Default if no progress
    
    const allDeliverables = Object.values(agency.progress).flatMap(week => week.deliverables || []);
    if (allDeliverables.length === 0) return 10;

    let relevantDeliverables = allDeliverables;
    
    // Si un mapping et un critère sont fournis, on filtre les livrables pertinents
    if (criterionId && mapping) {
        relevantDeliverables = allDeliverables.filter(d => {
            const mappedCriteria = mapping[d.name];
            return mappedCriteria && mappedCriteria.includes(criterionId);
        });
        // S'il n'y a pas de livrables spécifiques pour ce critère, on peut retourner null ou une moyenne globale
        if (relevantDeliverables.length === 0) return -1; // -1 means no specific deliverables for this criterion
    }

    let totalScore = 0;
    let count = 0;

    relevantDeliverables.forEach(d => {
        if (!d.grading) return;
        
        let score = 0;
        if (d.grading.quality === 'A') score = 20;
        else if (d.grading.quality === 'B') score = 15;
        else if (d.grading.quality === 'C') score = 10;
        else return; // Non évalué

        if (d.grading.daysLate > 0) score -= (d.grading.daysLate * 2);
        if (d.grading.mvpId || d.nominatedMvpId) score += 2;

        score = Math.max(0, Math.min(20, score)); // Cap entre 0 et 20
        totalScore += score;
        count++;
    });

    if (count === 0) return 10; // Moyenne par défaut si aucun évalué
    return totalScore / count;
};

export const calculateAlgoScores = (agency: Agency, student: Student, mapping?: Record<string, string[]>) => {
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

    // Global Deliverable Score (fallback if no specific criterion mapping)
    const deliverableScore = calculateDeliverableScore(agency);

    return { veScore, budgetScore, baseIndividualScore, peerReviewScore, deliverableScore };
};

export const getAverageScore = (evals: CriterionEval[]) => {
    if (!evals || evals.length === 0) return 0;
    const sum = evals.reduce((acc, curr) => acc + curr.score, 0);
    return sum / evals.length;
};

export const getWeightedGroupCriterionScore = (result: StudentEvalResult, aiScore: number, weights: any, specificDeliverableScore?: number) => {
    const totalWeight = weights.group.ve + weights.group.budget + weights.group.ai + (weights.group.deliverables || 0);
    if (totalWeight === 0) return 0;
    
    const delivScore = specificDeliverableScore !== undefined && specificDeliverableScore >= 0 ? specificDeliverableScore : result.deliverableScore;
    
    return (result.veScore * weights.group.ve + 
            result.budgetScore * weights.group.budget + 
            delivScore * (weights.group.deliverables || 0) + 
            aiScore * weights.group.ai) / totalWeight;
};

export const getWeightedIndividualCriterionScore = (result: StudentEvalResult, aiScore: number, weights: any, specificDeliverableScore?: number) => {
    const totalWeight = weights.individual.baseScore + weights.individual.peerReviews + weights.individual.ai + (weights.individual.deliverables || 0);
    if (totalWeight === 0) return 0;
    
    const delivScore = specificDeliverableScore !== undefined && specificDeliverableScore >= 0 ? specificDeliverableScore : result.deliverableScore;

    return (result.baseIndividualScore * weights.individual.baseScore + 
            result.peerReviewScore * weights.individual.peerReviews + 
            delivScore * (weights.individual.deliverables || 0) + 
            aiScore * weights.individual.ai) / totalWeight;
};

export const getFinalGroupScore = (result: StudentEvalResult, weights: any, agency?: Agency, mapping?: Record<string, string[]>) => {
    if (!result.groupEvaluation || result.groupEvaluation.length === 0) return 0;
    const sum = result.groupEvaluation.reduce((acc, crit) => {
        const specificDelivScore = agency && mapping ? calculateDeliverableScore(agency, crit.criterionId, mapping) : -1;
        return acc + getWeightedGroupCriterionScore(result, crit.score, weights, specificDelivScore);
    }, 0);
    return sum / result.groupEvaluation.length;
};

export const getFinalIndividualScore = (result: StudentEvalResult, weights: any, agency?: Agency, mapping?: Record<string, string[]>) => {
    if (!result.individualEvaluation || result.individualEvaluation.length === 0) return 0;
    const sum = result.individualEvaluation.reduce((acc, crit) => {
        const specificDelivScore = agency && mapping ? calculateDeliverableScore(agency, crit.criterionId, mapping) : -1;
        return acc + getWeightedIndividualCriterionScore(result, crit.score, weights, specificDelivScore);
    }, 0);
    return sum / result.individualEvaluation.length;
};

export const generateGroupPrompt = (result: StudentEvalResult, weights: any, agency?: Agency, mapping?: Record<string, string[]>) => {
    const groupScores = result.groupEvaluation.map(crit => {
        const specificDelivScore = agency && mapping ? calculateDeliverableScore(agency, crit.criterionId, mapping) : -1;
        const finalScore = getWeightedGroupCriterionScore(result, crit.score, weights, specificDelivScore);
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

export const generateIndividualPrompt = (result: StudentEvalResult, weights: any, agency?: Agency, mapping?: Record<string, string[]>) => {
    const indScores = result.individualEvaluation.map(crit => {
        const specificDelivScore = agency && mapping ? calculateDeliverableScore(agency, crit.criterionId, mapping) : -1;
        const finalScore = getWeightedIndividualCriterionScore(result, crit.score, weights, specificDelivScore);
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
