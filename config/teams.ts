
import { Agency, CycleType, GameEvent, Student, Badge } from '../types';
import { BADGE_DEFINITIONS, S1_INDIVIDUAL_WINNERS, S1_AVERAGES } from './awards';
import { INITIAL_WEEKS } from './weeks';
import { GAME_RULES } from './rules';

// --- CONFIGURATION DES GAGNANTS GROUPES S1 (POUR BADGES) ---
const S1_GOLD_TEAM_MEMBERS = ["Zirwath", "Aubine", "Maëlys", "Tiffany", "Roxane"];
const S1_SILVER_TEAM_MEMBERS = ["Rayane", "Erudice", "Pascal", "Jennifer"];
const S1_BRONZE_TEAM_MEMBERS = ["Tryphose", "Sarah", "Grâce", "Stessy"];

// --- LISTE COMPLÈTE DES ÉTUDIANTS ---
const STUDENTS_CLASSE_A = [
    "Marie-Trinité", "Jessica", "Lydia", "Ronelle", "Tiffany", 
    "Ian", "Kassandra", "Aubine", "Lidwine", "Sarah", 
    "Maëlys", "Rebecca", "Rolyx", "Emeraude", "Shaneen", 
    "Noriane", "Pascal", "Roxane", "Loan", "Korell", "Iris"
];

const STUDENTS_CLASSE_B = [
    "Tryphose", "Vianney", "Esther", "Achabys", "Zirwath", 
    "Elicia", "Loïs", "Coralie", "Ruth-De-Franck", "Lindsay", 
    "Ghintia", "Rayane", "Ashley", "Faghez", "Erudice", 
    "Mira", "Brunelle", "Stessy", "Duamel", "Grâce", "Jennifer"
];

// --- GÉNÉRATEUR ---
const generateMockAgencies = (): Agency[] => {
  const agencies: Agency[] = [];
  let globalStudentIndex = 0;

  // Helper pour créer un étudiant
  const createStudent = (name: string, classId: 'A' | 'B'): Student => {
      // 1. DATA S1
      const award = S1_INDIVIDUAL_WINNERS[name];
      const averageS1 = S1_AVERAGES[name] || 10;
      
      // 2. SCORE CALCULATION
      // Formule: 30 (Base) + (MoyenneS1 / 20 * 40) + 20 (Bonus)
      const baseScore = 30;
      const s1Part = (averageS1 / 20) * 40;
      const bonusScore = 20;
      const calculatedScore = Math.round(baseScore + s1Part + bonusScore);

      // 3. BADGES
      const studentBadges: Badge[] = [];

      // Badge Individuel (Solo)
      if (award) {
          const badgeDef = BADGE_DEFINITIONS.find(b => b.id === award.badge);
          if (badgeDef) studentBadges.push(badgeDef);
      }

      // Badge de Groupe S1 (Attribué à l'individu)
      if (S1_GOLD_TEAM_MEMBERS.includes(name)) {
          const b = BADGE_DEFINITIONS.find(def => def.id === 's1_gold_group');
          if (b) studentBadges.push(b);
      }
      if (S1_SILVER_TEAM_MEMBERS.includes(name)) {
          const b = BADGE_DEFINITIONS.find(def => def.id === 's1_silver_group');
          if (b) studentBadges.push(b);
      }
      if (S1_BRONZE_TEAM_MEMBERS.includes(name)) {
          const b = BADGE_DEFINITIONS.find(def => def.id === 's1_bronze_group');
          if (b) studentBadges.push(b);
      }

      return {
        id: `s-${globalStudentIndex++}`,
        name: name,
        role: 'Associé',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(' ', '')}`,
        individualScore: calculatedScore,
        wallet: award ? award.amount : 0,
        classId: classId,
        connectionStatus: 'offline',
        badges: studentBadges,
        history: award ? [{
            date: "2024-02-01",
            agencyId: "system",
            agencyName: "RNP Awards",
            action: "JOINED",
            contextVE: 0,
            contextBudget: 0,
            reason: `Prix S1 (+${award.amount} PiXi)`
        }] : []
      };
  };

  // --- CRÉATION DES 12 AGENCES S2 ---
  // Agences 1-6 : Classe A
  // Agences 7-12 : Classe B
  
  // Fonction de distribution équitable
  const chunkArray = (array: string[], parts: number) => {
      const result = [];
      for (let i = 0; i < parts; i++) {
          result.push(array.slice(Math.ceil((i * array.length) / parts), Math.ceil(((i + 1) * array.length) / parts)));
      }
      return result;
  };

  const teamsA = chunkArray(STUDENTS_CLASSE_A, 6); // Répartit les 21 élèves A en 6 groupes
  const teamsB = chunkArray(STUDENTS_CLASSE_B, 6); // Répartit les 21 élèves B en 6 groupes

  // Génération Agences A (1 à 6)
  teamsA.forEach((membersList, index) => {
      const agencyId = `agency_${index + 1}`;
      const members = membersList.map(name => createStudent(name, 'A'));
      
      agencies.push({
          id: agencyId,
          name: `Agence ${index + 1}`,
          tagline: "Nouvelle Agence S2",
          ve_current: 50,
          status: 'stable',
          classId: 'A',
          budget_real: 0,
          budget_valued: 0,
          weeklyTax: 0,
          weeklyRevenueModifier: 0,
          eventLog: [
             { id: `e-${agencyId}-1`, date: "2024-02-01", type: "INFO", label: "Création Agence", deltaVE: 0, description: "Ouverture du compte PiXi (0)." }
          ],
          members: members,
          peerReviews: [],
          currentCycle: CycleType.MARQUE_BRIEF,
          projectDef: { problem: "", target: "", location: "", gesture: "", isLocked: false },
          mercatoRequests: [],
          constraints: { space: "", style: "", client: "" },
          progress: JSON.parse(JSON.stringify(INITIAL_WEEKS)),
          branding: { color: 'indigo' },
          badges: []
      });
  });

  // Génération Agences B (7 à 12)
  teamsB.forEach((membersList, index) => {
      const agencyId = `agency_${index + 7}`;
      const members = membersList.map(name => createStudent(name, 'B'));
      
      agencies.push({
          id: agencyId,
          name: `Agence ${index + 7}`,
          tagline: "Nouvelle Agence S2",
          ve_current: 50,
          status: 'stable',
          classId: 'B',
          budget_real: 0,
          budget_valued: 0,
          weeklyTax: 0,
          weeklyRevenueModifier: 0,
          eventLog: [
             { id: `e-${agencyId}-1`, date: "2024-02-01", type: "INFO", label: "Création Agence", deltaVE: 0, description: "Ouverture du compte PiXi (0)." }
          ],
          members: members,
          peerReviews: [],
          currentCycle: CycleType.MARQUE_BRIEF,
          projectDef: { problem: "", target: "", location: "", gesture: "", isLocked: false },
          mercatoRequests: [],
          constraints: { space: "", style: "", client: "" },
          progress: JSON.parse(JSON.stringify(INITIAL_WEEKS)),
          branding: { color: 'cyan' },
          badges: []
      });
  });

  // Agence Chômage (Vide au départ car tout le monde est assigné)
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
      members: [],
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
