
export enum CycleType {
  MARQUE_BRIEF = "Cycle 1: Marque & Brief",
  NARRATION_IA = "Cycle 2: Narration & IA",
  LOOKDEV = "Cycle 3: Look-dev & Sélection",
  PACKAGING = "Cycle 4: Packaging & Soutenance"
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

export interface Deliverable {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'submitted' | 'validated' | 'rejected';
  score?: number; // 0-100
  feedback?: string;
  fileUrl?: string;
  // Grading Details
  submissionDate?: string;
  grading?: {
    quality: 'A' | 'B' | 'C' | 'REJECTED';
    daysLate: number;
    constraintBroken: boolean;
    finalDelta: number;
  }
}

export interface ClassSession {
    date: string; // YYYY-MM-DD
    slot: 'MATIN' | 'APRÈS-MIDI' | 'JOURNÉE';
}

export interface WeekModule {
  id: string;
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
}

export interface Student {
  id: string;
  name: string;
  role: string; // Standardisé (ex: "Associé")
  avatarUrl: string;
  individualScore: number; // 0-100
  cvUrl?: string; // URL vers le PDF du CV
  classId: 'A' | 'B'; // Gestion des deux promotions
  connectionStatus?: 'online' | 'offline' | 'pending'; // Nouveau champ
}

export type EventType = 'CRISIS' | 'VE_DELTA' | 'BUDGET_DELTA' | 'CHECKPOINT' | 'INFO' | 'PAYROLL' | 'REVENUE';

export interface GameEvent {
  id: string;
  date: string; // ISO String
  type: EventType;
  label: string; // Titre court (ex: "Pénurie matériaux")
  description?: string;
  deltaVE?: number; // Impact sur la VE (ex: -15)
  deltaBudgetReal?: number;
  deltaBudgetValued?: number;
}

export interface ProjectDefinition {
  problem: string;      // Problème réel et local
  target: string;       // Qui souffre (Persona)
  location: string;     // Où ça se passe
  gesture: string;      // Geste architectural unique
  isLocked: boolean;    // Validé par le prof ?
}

export interface MercatoRequest {
  id: string;
  type: 'HIRE' | 'FIRE'; // HIRE = Agence veut un chômeur, FIRE = Étudiant veut partir
  studentId: string; // La cible du mouvement
  studentName: string;
  requesterId?: string; // Qui a fait la demande (pour différencier démission/renvoi)
  targetAgencyId: string; // L'agence concernée
  status: 'PENDING' | 'REJECTED';
  date: string;
}

// --- NEW TYPES FOR GAMIFICATION ---

export type BrandColor = 'indigo' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'slate';

export interface AgencyBranding {
    color: BrandColor;
    bannerUrl?: string;
}

export interface Badge {
    id: string;
    label: string;
    description: string;
    icon: string; // Identifier for Lucide icon or image path
    unlockedAt?: string;
}

export interface Agency {
  id: string;
  name: string;
  tagline: string;
  logoUrl?: string;
  members: Student[];
  peerReviews: PeerReview[];
  classId: 'A' | 'B' | 'ALL'; // ALL pour l'agence Chômage
  
  // Data Driven by Events
  ve_current: number; // 0-100 (La note/valeur)
  budget_real: number; // En XOF ou €
  budget_valued: number; // En XOF ou €
  
  status: 'stable' | 'fragile' | 'critique';
  
  eventLog: GameEvent[]; // Source of Truth
  
  currentCycle: CycleType;
  
  // New Project Structure
  projectDef: ProjectDefinition;
  
  // Mercato Requests (Pending)
  mercatoRequests: MercatoRequest[];

  // Legacy constraints
  constraints: {
    space: string;
    style: string;
    client: string;
  };
  
  progress: {
    [weekId: string]: WeekModule;
  };

  // --- NEW FIELDS ---
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

// --- WIKI / RESOURCES ---
export interface WikiResource {
    id: string;
    title: string;
    description?: string;
    type: 'PDF' | 'VIDEO' | 'LINK' | 'ASSET';
    url: string;
    targetClass: 'ALL' | 'A' | 'B';
    date: string;
}
