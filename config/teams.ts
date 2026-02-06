
import { Agency, CycleType, GameEvent, Student, Badge } from '../types';
import { BADGE_DEFINITIONS, S1_INDIVIDUAL_WINNERS, S1_AVERAGES } from './awards';
import { INITIAL_WEEKS } from './weeks';
import { GAME_RULES } from './rules';

// --- LISTES DE RÉFÉRENCE POUR LES BADGES S1 (L'HISTORIQUE) ---
// Ces listes servent uniquement à distribuer les badges aux bonnes personnes
const S1_GOLD_MEMBERS = ["Zirwath", "Aubine", "Maëlys", "Tiffany", "Roxane"];
const S1_SILVER_MEMBERS = ["Rayane", "Erudice", "Pascal", "Jennifer"];
const S1_BRONZE_MEMBERS = ["Tryphose", "Sarah", "Grâce", "Stessy"];

// --- POOLS COMPLETS (POUR RÉFÉRENCE ET CHÔMAGE) ---
const STUDENTS_CLASSE_A_POOL = [
    "Marie-Trinité", "Jessica", "Lydia", "Ronelle", "Tiffany",
    "Ian", "Kassandra", "Aubine", "Lidwine", "Sarah",
    "Maëlys", "Rebecca", "Rolyx", "Emeraude", "Shaneen",
    "Noriane", "Pascal", "Roxane", "Loan", "Korell", "Iris"
];

const STUDENTS_CLASSE_B_POOL = [
    "Tryphose", "Vianney", "Esther", "Achabys", "Zirwath",
    "Elicia", "Loïs", "Coralie", "Ruth", "Lindsay",
    "Ghintia", "Rayane", "Ashley", "Faghez", "Erudice",
    "Myra", "Brunelle", "Stessy", "Duamel", "Grâce", "Jennifer"
];

// --- DEFINITION DES EQUIPES MANUELLES ---
const TEAMS_A_SPECIFIC = [
    ["Roxane", "Sarah"],
    ["Maëlys", "Ronelle"],
    ["Iris", "Aubine", "Jessica"],
    ["Shaneen", "Lydia"],
    ["Rebecca", "Korell"],
    ["Kassandra", "Pascal"]
];

const TEAMS_B_SPECIFIC = [
    ["Rayane"],
    ["Faghez", "Achabys"],
    ["Coralie", "Myra"],
    ["Grâce", "Ashley", "Tryphose"],
    ["Ruth", "Loïs", "Brunelle"], // "Ruth" correspond à Ruth-De-Franck dans les stats S1
    ["Esther", "Erudice"]
];

const generateMockAgencies = (): Agency[] => {
  const agencies: Agency[] = [];
  let globalStudentIndex = 0;

  // --- FONCTION DE CRÉATION D'ÉTUDIANT ---
  const createStudent = (name: string, classId: 'A' | 'B'): Student => {
      // 1. Récupération des données S1 (Score & Awards)
      const individualAward = S1_INDIVIDUAL_WINNERS[name];
      const averageS1 = S1_AVERAGES[name] || 10;
      
      // 2. Calcul du Score de départ S2
      // Formule : SMIG (30) + Moyenne S1 (x2 pour base 40) + Bonus Badges (Indiv + Group)
      const baseScore = 30;
      const s1Part = averageS1 * 2;
      
      let bonusScore = 0;

      // A. Bonus Badges Individuels
      // Or = 10, Argent = 7.5, Bronze = 5
      if (individualAward) {
          if (individualAward.badge === 's1_gold') bonusScore += 10;
          else if (individualAward.badge === 's1_silver') bonusScore += 7.5;
          else if (individualAward.badge === 's1_bronze') bonusScore += 5;
      }

      // B. Bonus Badges Groupe
      // Or = 10, Argent = 7.5, Bronze = 5
      if (S1_GOLD_MEMBERS.includes(name)) {
          bonusScore += 10; 
      } else if (S1_SILVER_MEMBERS.includes(name)) {
          bonusScore += 7.5;
      } else if (S1_BRONZE_MEMBERS.includes(name)) {
          bonusScore += 5;
      }

      const calculatedScore = Math.round(baseScore + s1Part + bonusScore);

      // 3. Attribution des Badges (Visuels)
      const studentBadges: Badge[] = [];

      // A. Badge Individuel (Major, Vice-Major...)
      if (individualAward) {
          const badgeDef = BADGE_DEFINITIONS.find(b => b.id === individualAward.badge);
          if (badgeDef) studentBadges.push(badgeDef);
      }

      // B. Badge Historique Groupe S1 (Or/Argent/Bronze)
      if (S1_GOLD_MEMBERS.includes(name)) {
          const b = BADGE_DEFINITIONS.find(def => def.id === 's1_gold_group');
          if (b) studentBadges.push(b);
      }
      if (S1_SILVER_MEMBERS.includes(name)) {
          const b = BADGE_DEFINITIONS.find(def => def.id === 's1_silver_group');
          if (b) studentBadges.push(b);
      }
      if (S1_BRONZE_MEMBERS.includes(name)) {
          const b = BADGE_DEFINITIONS.find(def => def.id === 's1_bronze_group');
          if (b) studentBadges.push(b);
      }

      return {
        id: `s-${globalStudentIndex++}`, // ID technique unique
        name: name,
        role: 'Associé',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(' ', '')}`,
        individualScore: calculatedScore,
        wallet: individualAward ? individualAward.amount : 0, // Cash prize S1 si applicable
        karma: 50, // Karma initial NEUTRE (Base 50)
        classId: classId,
        connectionStatus: 'offline',
        badges: studentBadges, // Liste des badges calculée
        history: individualAward ? [{
            date: "2024-02-01",
            agencyId: "system",
            agencyName: "RNP Awards",
            action: "JOINED",
            contextVE: 0,
            contextBudget: 0,
            reason: `Prix S1 (+${individualAward.amount} PiXi)`
        }] : []
      };
  };

  // --- 1. CRÉATION DES AGENCES CLASSE A (Assignées) ---
  TEAMS_A_SPECIFIC.forEach((membersNames, index) => {
      const agencyNum = index + 1;
      const agencyId = `agency_A_${agencyNum}`;
      const members = membersNames.map(name => createStudent(name, 'A'));

      agencies.push({
          id: agencyId,
          name: `Agence A${agencyNum}`,
          tagline: "Nouvelle Agence S2",
          ve_current: 0, // START AT 0
          status: 'critique', // Start in critic because VE < 40
          classId: 'A',
          budget_real: 0,
          budget_valued: 0,
          weeklyTax: 0,
          weeklyRevenueModifier: 0,
          eventLog: [
             { id: `e-${agencyId}-1`, date: "2024-02-01", type: "INFO", label: "Création Agence", deltaVE: 0, description: "Ouverture du compte PiXi (0)." }
          ],
          members: members,
          currentCycle: CycleType.MARQUE_BRIEF,
          projectDef: { problem: "", target: "", location: "", gesture: "", isLocked: false },
          mercatoRequests: [],
          transactionRequests: [], // Init empty
          constraints: { space: "", style: "", client: "" },
          progress: JSON.parse(JSON.stringify(INITIAL_WEEKS)),
          branding: { color: 'indigo' }, // Couleur par défaut Classe A
          badges: []
      });
  });

  // --- 2. CRÉATION DES AGENCES CLASSE B (Assignées) ---
  TEAMS_B_SPECIFIC.forEach((membersNames, index) => {
      const agencyNum = index + 1;
      const agencyId = `agency_B_${agencyNum}`;
      const members = membersNames.map(name => createStudent(name, 'B'));

      agencies.push({
          id: agencyId,
          name: `Agence B${agencyNum}`,
          tagline: "Nouvelle Agence S2",
          ve_current: 0, // START AT 0
          status: 'critique',
          classId: 'B',
          budget_real: 0,
          budget_valued: 0,
          weeklyTax: 0,
          weeklyRevenueModifier: 0,
          eventLog: [
             { id: `e-${agencyId}-1`, date: "2024-02-01", type: "INFO", label: "Création Agence", deltaVE: 0, description: "Ouverture du compte PiXi (0)." }
          ],
          members: members,
          currentCycle: CycleType.MARQUE_BRIEF,
          projectDef: { problem: "", target: "", location: "", gesture: "", isLocked: false },
          mercatoRequests: [],
          transactionRequests: [], // Init empty
          constraints: { space: "", style: "", client: "" },
          progress: JSON.parse(JSON.stringify(INITIAL_WEEKS)),
          branding: { color: 'cyan' }, // Couleur par défaut Classe B
          badges: []
      });
  });

  // --- 3. GESTION DES CHÔMEURS (Tous ceux qui ne sont pas dans les listes spécifiques) ---
  const assignedA = TEAMS_A_SPECIFIC.flat();
  const assignedB = TEAMS_B_SPECIFIC.flat();

  const unemployedMembers: Student[] = [];

  // Filtrer Classe A
  STUDENTS_CLASSE_A_POOL.forEach(name => {
      if (!assignedA.includes(name)) {
          unemployedMembers.push(createStudent(name, 'A'));
      }
  });

  // Filtrer Classe B
  STUDENTS_CLASSE_B_POOL.forEach(name => {
      if (!assignedB.includes(name)) {
          unemployedMembers.push(createStudent(name, 'B'));
      }
  });

  // Agence Chômage / Vivier
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
      members: unemployedMembers, // Tous les restants
      currentCycle: CycleType.MARQUE_BRIEF,
      projectDef: { problem: "", target: "", location: "", gesture: "", isLocked: true },
      mercatoRequests: [],
      transactionRequests: [],
      constraints: { space: "", style: "", client: "" },
      progress: {},
      branding: { color: 'slate' },
      badges: []
  });

  return agencies;
};

export const MOCK_AGENCIES: Agency[] = generateMockAgencies();
