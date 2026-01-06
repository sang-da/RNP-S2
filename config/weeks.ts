
import { WeekModule } from '../types';

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
    schedule: { classA: { date: '2026-01-07', slot: 'APRÈS-MIDI' }, classB: { date: '2026-01-06', slot: 'MATIN' } }
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
    schedule: { classA: { date: '2026-01-14', slot: 'APRÈS-MIDI' }, classB: { date: '2026-01-13', slot: 'MATIN' } }
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
    schedule: { classA: { date: '2026-01-28', slot: 'APRÈS-MIDI' }, classB: { date: '2026-01-27', slot: 'MATIN' } }
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
    schedule: { classA: { date: '2026-02-04', slot: 'APRÈS-MIDI' }, classB: { date: '2026-02-03', slot: 'MATIN' } }
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
    schedule: { classA: { date: '2026-02-11', slot: 'APRÈS-MIDI' }, classB: { date: '2026-02-10', slot: 'MATIN' } }
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
    schedule: { classA: { date: '2026-02-18', slot: 'APRÈS-MIDI' }, classB: { date: '2026-02-17', slot: 'MATIN' } }
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
    schedule: { classA: { date: '2026-03-04', slot: 'APRÈS-MIDI' }, classB: { date: '2026-03-03', slot: 'MATIN' } }
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
    schedule: { classA: { date: '2026-03-11', slot: 'APRÈS-MIDI' }, classB: { date: '2026-03-10', slot: 'MATIN' } }
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
    schedule: { classA: { date: '2026-03-18', slot: 'APRÈS-MIDI' }, classB: { date: '2026-03-17', slot: 'MATIN' } }
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
    schedule: { classA: { date: '2026-03-25', slot: 'APRÈS-MIDI' }, classB: { date: '2026-03-24', slot: 'MATIN' } }
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
