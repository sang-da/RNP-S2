
export enum CycleType {
  MARQUE_BRIEF = "Cycle 1: Marque & Brief",
  NARRATION_IA = "Cycle 2: Narration & IA",
  LOOKDEV = "Cycle 3: Look-dev & Sélection",
  PACKAGING = "Cycle 4: Packaging & Soutenance"
}

export interface GameConfig {
    id: string;
    currentCycle: number; // 1, 2, 3, 4
    autoPilot: boolean;
    lastFinanceRun: string | null; // Format "YYYY-WW" (Année-Semaine)
    lastPerformanceRun: string | null; // Format "YYYY-WW"
}

export interface PeerReview {
  id: string;
  date: string;
  weekId: string;
  reviewerId: string;
  reviewerName: string;
  targetId: string;
  targetName: string;
  ratings: {
    attendance: number; // 1-5
    quality: number; // 1-5
    involvement: number; // 1-5
  };
  comment: string;
}

export type DeliverableType = 'FILE' | 'LINK' | 'FORM_CHARTER' | 'FORM_NAMING' | 'SPECIAL_LOGO' | 'SPECIAL_BANNER';

export interface Deliverable {
  id: string;
  name: string;
  description: string;
  type?: DeliverableType;
  status: 'pending' | 'submitted' | 'validated' | 'rejected';
  score?: number; 
  feedback?: string;
  fileUrl?: string;
  deadline?: string; 
  selfAssessment?: 'A' | 'B' | 'C'; 
  nominatedMvpId?: string | null; 
  submissionDate?: string;
  grading?: {
    quality: 'A' | 'B' | 'C' | 'REJECTED';
    daysLate: number;
    constraintBroken: boolean;
    finalDelta: number;
    mvpId?: string | null;
  } | null;
}

export interface ClassSession {
    date: string; 
    slot: 'MATIN' | 'APRÈS-MIDI' | 'JOURNÉE';
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
  objectives: string[];
  deliverables: Deliverable[];
  locked: boolean;
  status?: 'pending' | 'in_progress' | 'validated';
  schedule: {
      classA: ClassSession | null;
      classB: ClassSession | null;
  };
  scoring?: WeekScoringConfig;
}

export interface StudentHistoryEntry {
    date: string;
    agencyId: string;
    agencyName: string;
    action: 'JOINED' | 'LEFT' | 'FIRED' | 'RESIGNED' | 'MERGED';
    contextVE: number;      
    contextBudget: number;  
    reason?: string;        
}

export interface Badge {
    id: string;
    label: string;
    description: string;
    icon: string; 
    unlockedAt?: string;
}

export interface Bet {
    id: string;
    targetAgencyId: string;
    targetAgencyName: string;
    amountWagered: number; 
    weekId: string; 
    status: 'ACTIVE' | 'WON' | 'LOST';
    date: string;
}

export interface Student {
  id: string;
  name: string;
  email?: string; 
  role: string; 
  avatarUrl: string;
  individualScore: number; 
  wallet: number; 
  karma?: number; 
  cvUrl?: string; 
  classId: 'A' | 'B'; 
  connectionStatus?: 'online' | 'offline' | 'pending';
  history?: StudentHistoryEntry[]; 
  badges?: Badge[]; 
  streak?: number; 
  activeBets?: Bet[]; 
}

export type EventType = 'CRISIS' | 'VE_DELTA' | 'BUDGET_DELTA' | 'CHECKPOINT' | 'INFO' | 'PAYROLL' | 'REVENUE' | 'BLACK_OP' | 'MERGER';

export interface GameEvent {
  id: string;
  date: string; 
  type: EventType;
  label: string; 
  description?: string;
  deltaVE?: number; 
  deltaBudgetReal?: number;
  deltaBudgetValued?: number;
}

export interface ProjectDefinition {
  problem: string;      
  target: string;       
  location: string;     
  gesture: string;      
  theme?: string;       
  direction?: string;   
  context?: string;     
  isLocked: boolean;    
}

export interface MercatoRequest {
  id: string;
  type: 'HIRE' | 'FIRE' | 'FOUND_AGENCY'; 
  studentId: string; 
  studentName: string;
  requesterId?: string; 
  targetAgencyId: string; 
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  date: string;
  motivation?: string; 
  votes?: { [studentId: string]: 'APPROVE' | 'REJECT' }; 
}

export interface ChallengeRequest {
    id: string;
    title: string;
    description: string;
    status: 'PENDING_VOTE' | 'ACCEPTED' | 'REJECTED';
    date: string;
    rewardVE: number; 
    votes: { [studentId: string]: 'APPROVE' | 'REJECT' };
}

export interface MergerRequest {
    id: string;
    requesterAgencyId: string;
    requesterAgencyName: string;
    targetAgencyId: string; 
    status: 'PENDING' | 'REJECTED';
    date: string;
    offerDetails: string; 
}

export interface TransactionRequest {
    id: string;
    studentId: string;
    studentName: string;
    type: 'BUY_SCORE';
    amountPixi: number;
    amountScore: number;
    status: 'PENDING' | 'REJECTED';
    date: string;
}

export interface AIInsight {
    id: string;
    type: 'URGENT' | 'WARNING' | 'OPPORTUNITY';
    title: string;
    analysis: string; 
    suggestedAction: {
        label: string;
        actionType: 'CRISIS' | 'REWARD' | 'MESSAGE' | 'AUDIT';
        payload?: any; 
    };
    targetAgencyId?: string;
    targetStudentId?: string;
}

export type BrandColor = 'indigo' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'slate';

export interface AgencyBranding {
    color: BrandColor;
    bannerUrl?: string;
}

export interface Agency {
  id: string;
  name: string;
  tagline: string;
  logoUrl?: string;
  members: Student[];
  peerReviews: PeerReview[];
  classId: 'A' | 'B' | 'ALL'; 
  ve_current: number; 
  veCapOverride?: number; 
  budget_real: number; 
  budget_valued: number; 
  weeklyTax: number; 
  weeklyRevenueModifier: number; 
  status: 'stable' | 'fragile' | 'critique';
  eventLog: GameEvent[]; 
  currentCycle: CycleType;
  projectDef: ProjectDefinition;
  mercatoRequests: MercatoRequest[];
  transactionRequests: TransactionRequest[];
  mergerRequests?: MergerRequest[];
  challenges?: ChallengeRequest[];
  constraints: {
    space: string;
    style: string;
    client: string;
  };
  progress: {
    [weekId: string]: WeekModule;
  };
  branding: AgencyBranding;
  badges: Badge[];
}

export interface AppState {
  userRole: 'admin' | 'student';
  selectedAgencyId: string | null;
  agencies: Agency[];
}

export interface CrisisPreset {
  label: string;
  description: string;
  deltaVE: number;
  deltaBudget: number;
  icon: any;
}

export interface CycleAwardDefinition {
    id: string;
    cycleId: CycleType;
    title: string;
    description: string;
    veBonus: number;
    weeklyBonus: number; 
    iconName: 'compass' | 'mic' | 'eye' | 'crown';
}

export interface WikiResource {
    id: string;
    title: string;
    description?: string;
    type: 'PDF' | 'VIDEO' | 'LINK' | 'ASSET';
    url: string;
    targetClass: 'ALL' | 'A' | 'B';
    date: string;
}
