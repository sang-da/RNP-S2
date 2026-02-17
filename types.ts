

export type BrandColor = 'indigo' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'slate';

export interface BadgeReward {
    score?: number;   // Bonus Note Individuelle
    wallet?: number;  // Bonus Argent Personnel
    ve?: number;      // Bonus VE Agence
    budget?: number;  // Bonus Budget Agence
    karma?: number;   // Bonus Karma (Hidden Score)
}

export interface Badge {
    id: string;
    label: string;
    description: string;
    icon: string;
    unlockedAt?: string;
    rewards?: BadgeReward; // NOUVEAU
}

export interface CareerStep {
    weekId: string;
    agencyId: string;
    agencyName: string;
    role: string;
    scoreAtWeek: number;
    walletAtWeek: number;
}

export interface CareerHistoryItem {
    id: string; // Pour manipulation unique
    date: string;
    weekId: string; // "S1", "S2"...
    agencyName: string;
    action: 'JOINED' | 'LEFT' | 'PROMOTED' | 'DEMOTED' | 'TRANSFER';
    contextVE?: number;
    reason?: string;
}

export interface StudentNote {
    id: string;
    date: string;
    authorName: string;
    content: string;
    visibility: 'PRIVATE' | 'PUBLIC'; // PRIVATE = Staff only, PUBLIC = Visible par l'étudiant
    type: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

export interface AuditResult {
    concept_score: number;
    viability_score: number;
    strengths: string[];
    weaknesses: string[];
    verdict: string;
    pivot_idea: string;
    roast: string;
    date: string; // Date de l'audit pour savoir s'il est périmé
}

export interface Student {
    id: string;
    name: string;
    role: string;
    avatarUrl: string;
    individualScore: number;
    wallet: number;
    savings?: number;
    loanDebt?: number;
    karma?: number;
    streak?: number;
    classId: 'A' | 'B' | 'ALL';
    connectionStatus: 'online' | 'offline';
    badges?: Badge[];
    history?: CareerHistoryItem[]; // Now strictly typed
    notes?: StudentNote[]; // NOUVEAU
    cvUrl?: string;
}

export interface GameEvent {
    id: string;
    date: string;
    type: 'INFO' | 'CRISIS' | 'VE_DELTA' | 'REVENUE' | 'PAYROLL' | 'BLACK_OP' | 'BUDGET_DELTA';
    label: string;
    description: string;
    deltaVE?: number;
    deltaBudgetReal?: number;
}

export type DeliverableType = 'FILE' | 'LINK' | 'SPECIAL_LOGO' | 'SPECIAL_BANNER' | 'FORM_CHARTER' | 'FORM_NAMING';

export interface GradingConfig {
    quality: 'A' | 'B' | 'C';
    daysLate: number;
    constraintBroken: boolean;
    finalDelta: number;
    mvpId?: string;
}

export interface Deliverable {
    id: string;
    name: string;
    description: string;
    status: 'pending' | 'submitted' | 'validated' | 'rejected';
    type?: DeliverableType;
    fileUrl?: string;
    feedback?: string;
    submissionDate?: string;
    deadline?: string;
    selfAssessment?: 'A' | 'B' | 'C';
    nominatedMvpId?: string | null;
    grading?: GradingConfig;
}

export interface WeekScoringConfig {
    pointsA: number;
    pointsB: number;
    penaltyLatePerDay: number;
    penaltyConstraint: number;
    expectedTargetVE: number;
}

export interface WeekModule {
    id: string;
    cycleId: number;
    title: string;
    type: 'FUN/CHILL' | 'THÉORIE' | 'TECHNIQUE' | 'JURY';
    isVisible: boolean;
    objectives: string[];
    deliverables: Deliverable[];
    status: 'pending' | 'active' | 'completed';
    schedule: {
        classA?: { date: string, slot: 'MATIN' | 'APRÈS-MIDI' | 'JOURNÉE' } | null;
        classB?: { date: string, slot: 'MATIN' | 'APRÈS-MIDI' | 'JOURNÉE' } | null;
    };
    scoring?: WeekScoringConfig;
}

export interface MercatoRequest {
    id: string;
    type: 'HIRE' | 'FIRE' | 'FOUND_AGENCY';
    studentId: string;
    studentName: string;
    requesterId: string;
    targetAgencyId: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    date: string;
    motivation: string;
    votes?: { [userId: string]: 'APPROVE' | 'REJECT' };
}

export interface TransactionRequest {
    id: string;
    studentId: string;
    studentName: string;
    type: 'BUY_SCORE';
    amountPixi: number;
    amountScore: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    date: string;
}

export interface MergerRequest {
    id: string;
    requesterAgencyId: string;
    requesterAgencyName: string;
    targetAgencyId: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    date: string;
    offerDetails: string;
}

export interface ChallengeRequest {
    id: string;
    title: string;
    description: string;
    status: 'PENDING_VOTE' | 'ACCEPTED' | 'REJECTED';
    date: string;
    rewardVE: number; 
    rewardBudget: number;
    votes: { [studentId: string]: 'APPROVE' | 'REJECT' };
}

export enum CycleType {
    MARQUE_BRIEF = 'MARQUE_BRIEF',
    NARRATION_IA = 'NARRATION_IA',
    LOOKDEV = 'LOOKDEV',
    PACKAGING = 'PACKAGING',
}

export interface Agency {
    id: string;
    name: string;
    tagline: string;
    ve_current: number;
    veCapOverride?: number;
    status: 'stable' | 'fragile' | 'critique';
    classId: 'A' | 'B' | 'ALL';
    budget_real: number;
    budget_valued: number;
    weeklyTax: number;
    weeklyRevenueModifier: number;
    members: Student[];
    eventLog: GameEvent[];
    currentCycle: CycleType;
    projectDef: {
        problem: string;
        target: string;
        location: string;
        gesture: string;
        theme?: string;
        context?: string;
        direction?: string;
        isLocked: boolean;
    };
    mercatoRequests: MercatoRequest[];
    transactionRequests: TransactionRequest[];
    mergerRequests?: MergerRequest[];
    challenges?: ChallengeRequest[];
    constraints: { space: string; style: string; client: string };
    progress: { [weekId: string]: WeekModule };
    branding?: { color: BrandColor; bannerUrl?: string };
    logoUrl?: string;
    badges: Badge[];
    aiAudit?: AuditResult; // STOCKAGE DU RÉSULTAT
}

export interface PeerReview {
    id: string;
    weekId: string;
    date: string;
    reviewerId: string;
    reviewerName: string;
    targetId: string;
    targetName: string;
    agencyId: string;
    ratings: {
        attendance: number;
        quality: number;
        involvement: number;
    };
    comment: string;
    classId?: string; // Derived in UI often
}

export interface WikiResource {
    id: string;
    title: string;
    url: string;
    type: 'PDF' | 'VIDEO' | 'LINK' | 'ASSET';
    targetClass: 'ALL' | 'A' | 'B';
    date: string;
}

export interface GameConfig {
    id: string;
    currentCycle: number;
    currentWeek: number;
    autoPilot: boolean;
    lastFinanceRun: string | null;
    lastPerformanceRun: string | null;
}

export interface AIInsight {
    id: string;
    type: 'URGENT' | 'WARNING' | 'OPPORTUNITY';
    title: string;
    analysis: string;
    targetAgencyId: string;
    suggestedAction?: {
        label: string;
        actionType: 'CRISIS' | 'REWARD' | 'MESSAGE' | 'AUDIT';
    };
}

export interface CycleAwardDefinition {
    id: string;
    cycleId: CycleType;
    title: string;
    description: string;
    veBonus: number;
    weeklyBonus: number;
    iconName: string;
}

export interface CrisisPreset {
    label: string;
    defaultReason: string;
    deltaVE: number;
    deltaBudget: number;
    icon?: any;
    category: string;
    description: string;
}