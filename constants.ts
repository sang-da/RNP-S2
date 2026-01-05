

import { Agency, CycleType, WeekModule, GameEvent, Student, Badge, CycleAwardDefinition } from './types';

// --- ASSETS / MASCOTTES ---
// Base URL pointing to the main branch to ensure we get the renamed files
const ASSET_BASE = "https://raw.githubusercontent.com/sang-da/svg/main";

export const MASCOTS = {
    // Landing Page
    LANDING_HERO: `${ASSET_BASE}/PiXi_Cloud.png`,
    
    // Market Overview (Santé financière)
    MARKET_RICH: `${ASSET_BASE}/PiXi_Extremely_Rich.png`,
    MARKET_STABLE: `${ASSET_BASE}/Pixi_Moderately_Wealthy.png`, 
    MARKET_POOR: `${ASSET_BASE}/Pixi_Struggling.png`,
    
    // Mercato
    MERCATO_SEARCH: `${ASSET_BASE}/PiXi_Searching.png`,
    
    // Global Utility (Logo, Favicon, Soumission)
    LOGO: `${ASSET_BASE}/PiXi_2.png`, 
};

// --- GAME RULES / BALANCING ---
export const GAME_RULES = {
    // REVENUS
    REVENUE_BASE: 1500, // Subvention fixe hebdomadaire
    REVENUE_VE_MULTIPLIER: 30, // 50 VE = 1500 PiXi de bonus
    
    // DÉPENSES
    SALARY_MULTIPLIER: 10, // Score 80 = 800 PiXi/semaine.
    AGENCY_RENT: 500, // Charges fixes hebdomadaires (Loyer)

    // CRÉATION D'ENTREPRISE
    CREATION_COST_PIXI: 2000,
    CREATION_COST_SCORE: 20,

    // PLAFONDS DE VERRE (VE CAPS)
    VE_CAP_1_MEMBER: 60,
    VE_CAP_2_3_MEMBERS: 80,
    VE_CAP_4_PLUS_MEMBERS: 100,
};

// --- BADGE DEFINITIONS ---
export const BADGE_DEFINITIONS: Badge[] = [
    { id: 'survivor', label: 'Survivant', description: 'Avoir survécu à une dette critique sans faillite.', icon: 'shield' },
    { id: 'visionary', label: 'Visionnaire', description: '3 rendus consécutifs notés A.', icon: 'eye' },
    { id: 'wealthy', label: 'Licorne', description: 'Avoir dépassé 20 000 PiXi de trésorerie.', icon: 'crown' },
    { id: 'teamwork', label: 'Esprit de Corps', description: 'Moyenne évaluation par pairs > 4.5/5.', icon: 'users' },
];

// --- GRANDS PRIX CYCLES ---
export const CYCLE_AWARDS: CycleAwardDefinition[] = [
    {
        id: 'award_c1',
        cycleId: CycleType.MARQUE_BRIEF,
        title: 'Le "Golden Brief"',
        description: 'La meilleure cohérence stratégique (Problème / Cible / Identité).',
        veBonus: 15,
        weeklyBonus: 250, // Bonus récurrent par semaine
        iconName: 'compass'
    },
    {
        id: 'award_c2',
        cycleId: CycleType.NARRATION_IA,
        title: 'Prix Narration',
        description: 'Storytelling captivant et culturellement pertinent.',
        veBonus: 20,
        weeklyBonus: 350,
        iconName: 'mic'
    },
    {
        id: 'award_c3',
        cycleId: CycleType.LOOKDEV,
        title: 'Prix "Vision"',
        description: 'L\'image la plus aboutie techniquement et artistiquement.',
        veBonus: 25,
        weeklyBonus: 500,
        iconName: 'eye'
    },
    {
        id: 'award_c4',
        cycleId: CycleType.PACKAGING,
        title: 'Prix "Signature"',
        description: 'Le projet global le plus professionnel et vendable.',
        veBonus: 40,
        weeklyBonus: 800,
        iconName: 'crown'
    }
];

// --- CONFIGURATION DES ÉQUIPES ACTIVES ---
// Les équipes existent toujours, mais sont réduites au minimum vital si non spécifiées.
const TEAMS_CONFIG = [
    // --- CLASSE A ---
    {
        id: 'a1',
        name: 'Équipe 1',
        classId: 'A' as const,
        members: ["Aubine", "Kassandra", "Jessica"]
    },
    {
        id: 'a2',
        name: 'Équipe 2',
        classId: 'A' as const,
        members: ["Maëlys", "Ronelle"]
    },
    {
        id: 'a3',
        name: 'Équipe 3',
        classId: 'A' as const,
        members: ["Gloria", "Roxane"] 
    },
    {
        id: 'a4',
        name: 'Équipe 4',
        classId: 'A' as const,
        members: ["Sarah", "Marie-Trinité"] 
    },
    {
        id: 'a5',
        name: 'Équipe 5',
        classId: 'A' as const,
        members: ["Lydia", "Korell"] 
    },
    {
        id: 'a6',
        name: 'Équipe 6',
        classId: 'A' as const,
        members: ["Shaneen"] 
    },

    // --- CLASSE B ---
    {
        id: 'a7',
        name: 'Équipe 7',
        classId: 'B' as const,
        members: ["Ruth-De-Franck", "Loïs"]
    },
    {
        id: 'a8',
        name: 'Équipe 8',
        classId: 'B' as const,
        members: ["Vianney", "Elicia"]
    },
    {
        id: 'a9',
        name: 'Équipe 9',
        classId: 'B' as const,
        members: ["Jennifer", "Brunelle"]
    },
    {
        id: 'a10',
        name: 'Équipe 10',
        classId: 'B' as const,
        members: ["Mira", "Grâce", "Ashley"]
    },
    {
        id: 'a11',
        name: 'Équipe 11',
        classId: 'B' as const,
        members: ["Esther"] 
    },
    {
        id: 'a12',
        name: 'Équipe 12',
        classId: 'B' as const,
        members: ["Rayane"] 
    }
];

// --- POOL DE CHÔMAGE (Le reste des étudiants) ---
const UNASSIGNED_POOL_A = [
    "Pascal", "Rolyx", "Noriane", "Ian", 
    "Emeraude", "Loan", "Lidwine", "Tiffany", "Iris"
];

const UNASSIGNED_POOL_B = [
    "Stessy", "Zirwath", "Coralie", "Faghez", "Tryphose", "Ghintia", 
    "Achabys", "Duamel", "Erudice", "Lindsay"
];

export const INITIAL_WEEKS: { [key: string]: WeekModule } = {
  "1": {
    id: "1",
    title: "Lancement & Définition",
    type: "FUN/CHILL",
    objectives: ["Définir le problème local", "Identifier la cible", "Choisir le lieu", "Nommer l'agence"],
    deliverables: [
      { id: "d_charter", name: "Charte de Projet", description: "Formulaire de définition du projet (Nom, Problème, Cible, Lieu)", status: 'pending' },
      { id: "d2", name: "Feuille de route S1", description: "Planning prévisionnel des 4 prochaines semaines", status: 'pending' }
    ],
    locked: false,
    status: 'pending',
    schedule: { 
        classA: { date: '2026-01-07', slot: 'APRÈS-MIDI' }, // Mercredi 13h-16h
        classB: { date: '2026-01-06', slot: 'MATIN' }       // Mardi 9h-12h
    }
  },
  "2": {
    id: "2",
    title: "Recherche & Storyboard",
    type: "THÉORIE",
    objectives: ["Storyboard avant/après", "Plan d'images", "Moodboard"],
    deliverables: [
      { id: "d3", name: "Storyboard (12 vignettes)", description: "Esquisse narrative du projet", status: 'pending' }
    ],
    locked: false,
    status: 'pending',
    schedule: { 
        classA: { date: '2026-01-14', slot: 'APRÈS-MIDI' },
        classB: { date: '2026-01-13', slot: 'MATIN' }
    }
  },
  "3": {
    id: "3",
    title: "Production Base & Scènes",
    type: "TECHNIQUE",
    objectives: ["Set-up projet", "Blocages lumière", "Rendu test"],
    deliverables: [
      { id: "d4", name: "10 Rendus Bruts", description: "Preuve de concept visuelle", status: 'pending' },
      { id: "d5", name: "Plan clé animé (Brouillon)", description: "Test animation caméra", status: 'pending' }
    ],
    locked: true,
    status: 'pending',
    schedule: { 
        classA: { date: '2026-01-28', slot: 'APRÈS-MIDI' },
        classB: { date: '2026-01-27', slot: 'MATIN' }
    }
  },
  "4": {
    id: "4",
    title: "IA Vidéo & Parallax",
    type: "FUN/CHILL",
    objectives: ["Séquence IA 10-15s", "Documentation éthique"],
    deliverables: [
      { id: "d6", name: "Séquence IA Intégrée", description: "Vidéo générée/modifiée par IA", status: 'pending' },
      { id: "d7", name: "Justification Écrite", description: "5-8 lignes sur l'usage IA", status: 'pending' }
    ],
    locked: true,
    status: 'pending',
    schedule: { 
        classA: { date: '2026-02-04', slot: 'APRÈS-MIDI' },
        classB: { date: '2026-02-03', slot: 'MATIN' }
    }
  },
  "5": {
    id: "5",
    title: "Caméras Avancées & Lumière",
    type: "THÉORIE",
    objectives: ["Trajectoires cohérentes", "DOF animé", "Maîtrise Key/Fill/Rim"],
    deliverables: [
      { id: "d_s17_1", name: "2 Plans Avancés", description: "Rendus démontrant la maîtrise lumière/caméra", status: 'pending' },
      { id: "d_s17_2", name: "Notes Techniques", description: "Explication des choix caméra/lumière (Shotlist)", status: 'pending' }
    ],
    locked: true,
    status: 'pending',
    schedule: { 
        classA: { date: '2026-02-11', slot: 'APRÈS-MIDI' },
        classB: { date: '2026-02-10', slot: 'MATIN' }
    }
  },
  "6": {
    id: "6",
    title: "Milestone PoC (45s)",
    type: "TECHNIQUE",
    objectives: ["Livrer version agence lisible", "QA Sheet"],
    deliverables: [
      { id: "d8", name: "PoC 45s", description: "Preuve de concept vidéo complète", status: 'pending' },
      { id: "d9", name: "QA Sheet Signée", description: "Gate 1: Go/No-Go", status: 'pending' }
    ],
    locked: true,
    status: 'pending',
    schedule: { 
        classA: { date: '2026-02-18', slot: 'APRÈS-MIDI' },
        classB: { date: '2026-02-17', slot: 'MATIN' }
    }
  },
  "7": {
    id: "7",
    title: "Itérations Massives",
    type: "FUN/CHILL",
    objectives: ["Explorer variantes (Lumière/Matière)", "A/B Testing", "Documentation variantes"],
    deliverables: [
      { id: "d_s19_1", name: "Contact Sheet (50 rendus)", description: "Planche contact des itérations exploratoires", status: 'pending' },
      { id: "d_s19_2", name: "Rapport Progression", description: "Preuve d'avancement vers les 50 rendus", status: 'pending' }
    ],
    locked: true,
    status: 'pending',
    schedule: { 
        classA: { date: '2026-03-04', slot: 'APRÈS-MIDI' },
        classB: { date: '2026-03-03', slot: 'MATIN' }
    }
  },
  "8": {
    id: "8",
    title: "Direction & Sélection",
    type: "THÉORIE",
    objectives: ["Fixer la DA finale", "Critères de sélection", "Cohérence Marque"],
    deliverables: [
      { id: "d_s20_1", name: "5 Key Visuals (Retouchés)", description: "La sélection finale post-comité DA", status: 'pending' },
      { id: "d_s20_2", name: "Note d'intention", description: "Justification des choix de sélection", status: 'pending' }
    ],
    locked: true,
    status: 'pending',
    schedule: { 
        classA: { date: '2026-03-11', slot: 'APRÈS-MIDI' },
        classB: { date: '2026-03-10', slot: 'MATIN' }
    }
  },
  "9": {
    id: "9",
    title: "Poster & Portfolio",
    type: "TECHNIQUE",
    objectives: ["Packaging Pro", "Lisibilité A1", "Portfolio 6-10 pages"],
    deliverables: [
      { id: "d_s21_1", name: "Poster A1", description: "Affiche promotionnelle du projet", status: 'pending' },
      { id: "d_s21_2", name: "Mini-Portfolio PDF", description: "Deck de présentation du projet (6-10 pages)", status: 'pending' }
    ],
    locked: true,
    status: 'pending',
    schedule: { 
        classA: { date: '2026-03-18', slot: 'APRÈS-MIDI' },
        classB: { date: '2026-03-17', slot: 'MATIN' }
    }
  },
  "10": {
    id: "10",
    title: "Automation & Packaging",
    type: "FUN/CHILL",
    objectives: ["Accélérer Shotlist", "Normalisation dossiers", "Scripts répétitifs"],
    deliverables: [
      { id: "d_s22_1", name: "Package Normalisé", description: "Structure de dossiers conforme aux attentes", status: 'pending' },
      { id: "d_s22_2", name: "Sources Propres", description: "Nettoyage des fichiers sources", status: 'pending' }
    ],
    locked: true,
    status: 'pending',
    schedule: { 
        classA: { date: '2026-03-25', slot: 'APRÈS-MIDI' },
        classB: { date: '2026-03-24', slot: 'MATIN' }
    }
  },
  "11": {
    id: "11",
    title: "Conformité Export",
    type: "THÉORIE",
    objectives: ["Certification formats (H.264, LUFS)", "Stress Tests", "Checklist Conformité"],
    deliverables: [
      { id: "d_s23_1", name: "Release Candidate (Vidéo)", description: "Export quasi-final pour Gate 2 (Conformité OK)", status: 'pending' },
      { id: "d_s23_2", name: "Checklist Conformité", description: "Document QA validé", status: 'pending' }
    ],
    locked: true,
    status: 'pending',
    schedule: { classA: null, classB: null }
  },
  "12": {
    id: "12",
    title: "JURY FINAL",
    type: "JURY",
    objectives: ["Défendre la démarche", "Démontrer cohérence marque", "Soutenance Orale"],
    deliverables: [
      { id: "d_s24_1", name: "Vidéo Finale (45-60s)", description: "Le rendu définitif Avant/Après", status: 'pending' },
      { id: "d_s24_2", name: "Pack Jury Complet", description: "Vidéo + 5 KV + Poster A1 + A3 Process + Portfolio", status: 'pending' }
    ],
    locked: true,
    status: 'pending',
    schedule: { classA: null, classB: null }
  }
};

const generateMockAgencies = (): Agency[] => {
  const agencies: Agency[] = [];
  let globalStudentIndex = 0; // Unique ID generator

  // Helper to create member objects
  const createMembers = (names: string[], classId: 'A' | 'B'): Student[] => {
    return names.map((name, i) => ({
      id: `s-${globalStudentIndex++}`,
      name: name,
      role: 'Associé', // Rôle standardisé
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(' ', '')}`,
      individualScore: 80,
      wallet: 0, // NEW: Initial Wallet
      classId: classId,
      connectionStatus: 'offline',
      history: []
    }));
  };

  // Generate Agencies from TEAMS_CONFIG
  TEAMS_CONFIG.forEach(team => {
      const members = createMembers(team.members, team.classId);

      agencies.push({
          id: team.id,
          name: team.name,
          tagline: "En attente de définition...",
          ve_current: 0,
          status: 'fragile',
          classId: team.classId,
          budget_real: 0,
          budget_valued: 0,
          weeklyTax: 0,
          weeklyRevenueModifier: 0, // NEW FIELD
          eventLog: [
             { id: `e-${team.id}-1`, date: "2024-02-01", type: "INFO", label: "Création Agence", deltaVE: 0, description: "Ouverture du compte PiXi (0)." }
          ],
          members: members,
          peerReviews: [],
          currentCycle: CycleType.MARQUE_BRIEF,
          projectDef: {
            problem: "",
            target: "",
            location: "",
            gesture: "",
            isLocked: false
          },
          mercatoRequests: [],
          constraints: { space: "", style: "", client: "" },
          progress: JSON.parse(JSON.stringify(INITIAL_WEEKS)),
          branding: { color: 'indigo' },
          badges: []
      });
  });

  // Add the "Unassigned" Agency (Chômage Pool)
  const unassignedMembersA = createMembers(UNASSIGNED_POOL_A, 'A');
  const unassignedMembersB = createMembers(UNASSIGNED_POOL_B, 'B');

  agencies.push({
      id: 'unassigned',
      name: "Vivier / Chômage",
      tagline: "En recherche d'opportunité",
      ve_current: 0,
      status: 'critique',
      classId: 'ALL', 
      budget_real: 0,
      budget_valued: 0,
      weeklyTax: 0,
      weeklyRevenueModifier: 0,
      eventLog: [],
      members: [...unassignedMembersA, ...unassignedMembersB], // Merge everyone here
      peerReviews: [],
      currentCycle: CycleType.MARQUE_BRIEF,
      projectDef: { problem: "", target: "", location: "", gesture: "", isLocked: true },
      mercatoRequests: [],
      constraints: { space: "", style: "", client: "" },
      progress: {},
      branding: { color: 'slate' },
      badges: []
  });

  return agencies;
};

export const MOCK_AGENCIES: Agency[] = generateMockAgencies();

export const CONSTRAINTS_POOL = {
  space: [],
  style: [],
  client: []
};