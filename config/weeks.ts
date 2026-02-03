
import { WeekModule } from '../types';

const DEFAULT_SCORING = {
    pointsA: 10,
    pointsB: 4,
    penaltyLatePerDay: 5,
    penaltyConstraint: 10,
    expectedTargetVE: 10
};

export const INITIAL_WEEKS: { [key: string]: WeekModule } = {
  "1": {
    id: "1",
    cycleId: 1,
    title: "Lancement & Définition",
    type: "FUN/CHILL",
    isVisible: true,
    objectives: ["Définir le problème local", "Identifier la cible", "Choisir le lieu", "Nommer l'agence"],
    deliverables: [
      { id: "d_report_1", name: "Compte Rendu Hebdo", description: "Résumé des activités, décisions et roadmap.", status: 'pending' },
      { id: "d_charter", name: "Charte de Projet", description: "Formulaire de définition du projet (Contexte, Problème, Cible, Lieu, Thème)", status: 'pending' },
      { id: "d_branding", name: "Nom du Studio", description: "Définition du nom officiel et de la tagline.", status: 'pending' },
      { id: "d_logo", name: "Logo du Studio", description: "Image carrée (PNG/JPG). Sera utilisée comme avatar de l'agence.", status: 'pending' }
    ],
    locked: false,
    status: 'pending',
    schedule: { classA: { date: '2026-01-07', slot: 'APRÈS-MIDI' }, classB: { date: '2026-01-06', slot: 'MATIN' } },
    scoring: { ...DEFAULT_SCORING, expectedTargetVE: 15 }
  },
  "2": {
    id: "2",
    cycleId: 1,
    title: "Recherche & Storyboard",
    type: "THÉORIE",
    isVisible: true,
    objectives: ["Storyboard avant/après", "Plan d'images", "Moodboard"],
    deliverables: [
      { id: "d_report_2", name: "Compte Rendu Hebdo", description: "Résumé des activités et décisions.", status: 'pending' },
      { id: "d3", name: "Storyboard (12 vignettes)", description: "Esquisse narrative du projet", status: 'pending' }
    ],
    locked: false,
    status: 'pending',
    schedule: { classA: { date: '2026-01-14', slot: 'APRÈS-MIDI' }, classB: { date: '2026-01-13', slot: 'MATIN' } },
    scoring: DEFAULT_SCORING
  },
  "3": {
    id: "3",
    cycleId: 1,
    title: "Production Base & Scènes",
    type: "TECHNIQUE",
    isVisible: false,
    objectives: ["Set-up projet", "Blocages lumière", "Rendu test"],
    deliverables: [
      { id: "d_report_3", name: "Compte Rendu Hebdo", description: "Résumé des activités et décisions.", status: 'pending' },
      { id: "d4", name: "10 Rendus Bruts", description: "Preuve de concept visuelle", status: 'pending' }
    ],
    locked: true,
    status: 'pending',
    schedule: { classA: { date: '2026-01-28', slot: 'APRÈS-MIDI' }, classB: { date: '2026-01-27', slot: 'MATIN' } },
    scoring: DEFAULT_SCORING
  },
  "4": {
    id: "4",
    cycleId: 2,
    title: "IA Vidéo & Parallax",
    type: "FUN/CHILL",
    isVisible: false,
    objectives: ["Séquence IA 10-15s", "Documentation éthique"],
    deliverables: [
      { id: "d_report_4", name: "Compte Rendu Hebdo", description: "Résumé des activités et décisions.", status: 'pending' },
      { id: "d6", name: "Séquence IA Intégrée", description: "Vidéo générée/modifiée par IA", status: 'pending' }
    ],
    locked: true,
    status: 'pending',
    schedule: { classA: { date: '2026-02-04', slot: 'APRÈS-MIDI' }, classB: { date: '2026-02-03', slot: 'MATIN' } },
    scoring: { ...DEFAULT_SCORING, pointsA: 8, expectedTargetVE: 8 }
  },
  "5": {
    id: "5",
    cycleId: 2,
    title: "Caméras Avancées & Lumière",
    type: "THÉORIE",
    isVisible: false,
    objectives: ["Trajectoires cohérentes", "DOF animé", "Maîtrise Key/Fill/Rim"],
    deliverables: [
      { id: "d_report_5", name: "Compte Rendu Hebdo", description: "Résumé des activités et décisions.", status: 'pending' },
      { id: "d_s17_1", name: "2 Plans Avancés", description: "Rendus démontrant la maîtrise lumière/caméra", status: 'pending' }
    ],
    locked: true,
    status: 'pending',
    schedule: { classA: { date: '2026-02-11', slot: 'APRÈS-MIDI' }, classB: { date: '2026-02-10', slot: 'MATIN' } },
    scoring: DEFAULT_SCORING
  },
  "6": {
    id: "6",
    cycleId: 2,
    title: "Milestone PoC (45s)",
    type: "TECHNIQUE",
    isVisible: false,
    objectives: ["Livrer version agence lisible", "QA Sheet"],
    deliverables: [
      { id: "d_report_6", name: "Compte Rendu Hebdo", description: "Résumé des activités et décisions.", status: 'pending' },
      { id: "d8", name: "PoC 45s", description: "Preuve de concept vidéo complète", status: 'pending' }
    ],
    locked: true,
    status: 'pending',
    schedule: { classA: { date: '2026-02-18', slot: 'APRÈS-MIDI' }, classB: { date: '2026-02-17', slot: 'MATIN' } },
    scoring: { ...DEFAULT_SCORING, expectedTargetVE: 20 }
  },
  "7": {
    id: "7",
    cycleId: 3,
    title: "Itérations Massives",
    type: "FUN/CHILL",
    isVisible: false,
    objectives: ["Explorer variantes (Lumière/Matière)", "A/B Testing", "Documentation variantes"],
    deliverables: [
      { id: "d_report_7", name: "Compte Rendu Hebdo", description: "Résumé des activités et décisions.", status: 'pending' },
      { id: "d_s19_1", name: "Contact Sheet (50 rendus)", description: "Planche contact des itérations exploratoires", status: 'pending' }
    ],
    locked: true,
    status: 'pending',
    schedule: { classA: { date: '2026-03-04', slot: 'APRÈS-MIDI' }, classB: { date: '2026-03-03', slot: 'MATIN' } },
    scoring: DEFAULT_SCORING
  },
  "8": {
    id: "8",
    cycleId: 3,
    title: "Direction & Sélection",
    type: "THÉORIE",
    isVisible: false,
    objectives: ["Fixer la DA finale", "Critères de sélection", "Cohérence Marque"],
    deliverables: [
      { id: "d_report_8", name: "Compte Rendu Hebdo", description: "Résumé des activités et décisions.", status: 'pending' },
      { id: "d_s20_1", name: "5 Key Visuals (Retouchés)", description: "La sélection finale post-comité DA", status: 'pending' }
    ],
    locked: true,
    status: 'pending',
    schedule: { classA: { date: '2026-03-11', slot: 'APRÈS-MIDI' }, classB: { date: '2026-03-10', slot: 'MATIN' } },
    scoring: DEFAULT_SCORING
  },
  "9": {
    id: "9",
    cycleId: 3,
    title: "Poster & Portfolio",
    type: "TECHNIQUE",
    isVisible: false,
    objectives: ["Packaging Pro", "Lisibilité A1", "Portfolio 6-10 pages"],
    deliverables: [
      { id: "d_report_9", name: "Compte Rendu Hebdo", description: "Résumé des activités et décisions.", status: 'pending' },
      { id: "d_s21_1", name: "Poster A1", description: "Affiche promotionnelle du projet", status: 'pending' },
      { id: "d_s21_2", name: "Mini-Portfolio PDF", description: "Deck de présentation du projet (6-10 pages)", status: 'pending' }
    ],
    locked: true,
    status: 'pending',
    schedule: { classA: { date: '2026-03-18', slot: 'APRÈS-MIDI' }, classB: { date: '2026-03-17', slot: 'MATIN' } },
    scoring: DEFAULT_SCORING
  },
  "10": {
    id: "10",
    cycleId: 4,
    title: "Automation & Packaging",
    type: "FUN/CHILL",
    isVisible: false,
    objectives: ["Accélérer Shotlist", "Normalisation dossiers", "Scripts répétitifs"],
    deliverables: [
      { id: "d_report_10", name: "Compte Rendu Hebdo", description: "Résumé des activités et décisions.", status: 'pending' },
      { id: "d_s22_1", name: "Package Normalisé", description: "Structure de dossiers conforme aux attentes", status: 'pending' }
    ],
    locked: true,
    status: 'pending',
    schedule: { classA: { date: '2026-03-25', slot: 'APRÈS-MIDI' }, classB: { date: '2026-03-24', slot: 'MATIN' } },
    scoring: DEFAULT_SCORING
  },
  "11": {
    id: "11",
    cycleId: 4,
    title: "Conformité Export",
    type: "THÉORIE",
    isVisible: false,
    objectives: ["Certification formats (H.264, LUFS)", "Stress Tests", "Checklist Conformité"],
    deliverables: [
      { id: "d_report_11", name: "Compte Rendu Hebdo", description: "Résumé des activités et décisions.", status: 'pending' },
      { id: "d_s23_1", name: "Release Candidate (Vidéo)", description: "Export quasi-final pour Gate 2 (Conformité OK)", status: 'pending' }
    ],
    locked: true,
    status: 'pending',
    schedule: { classA: null, classB: null },
    scoring: DEFAULT_SCORING
  },
  "12": {
    id: "12",
    cycleId: 4,
    title: "JURY FINAL",
    type: "JURY",
    isVisible: false,
    objectives: ["Défendre la démarche", "Démontrer cohérence marque", "Soutenance Orale"],
    deliverables: [
      { id: "d_report_12", name: "Compte Rendu Final", description: "Bilan global du semestre.", status: 'pending' },
      { id: "d_s24_1", name: "Vidéo Finale (45-60s)", description: "Le rendu définitif Avant/Après", status: 'pending' }
    ],
    locked: true,
    status: 'pending',
    schedule: { classA: null, classB: null },
    scoring: { ...DEFAULT_SCORING, pointsA: 30, pointsB: 15, expectedTargetVE: 40 }
  }
};
