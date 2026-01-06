
import { Agency, CycleType, GameEvent, Student, Badge } from '../types';
import { BADGE_DEFINITIONS, S1_INDIVIDUAL_WINNERS, S1_AVERAGES } from './awards';
import { INITIAL_WEEKS } from './weeks';
import { GAME_RULES } from './rules';

// --- LISTES DE RÉFÉRENCE POUR LES BADGES S1 (L'HISTORIQUE) ---
// Ces listes servent uniquement à distribuer les badges aux bonnes personnes
const S1_GOLD_MEMBERS = ["Zirwath", "Aubine", "Maëlys", "Tiffany", "Roxane"];
const S1_SILVER_MEMBERS = ["Rayane", "Erudice", "Pascal", "Jennifer"];
const S1_BRONZE_MEMBERS = ["Tryphose", "Sarah", "Grâce", "Stessy"];

// --- LISTE OFFICIELLE DES ÉTUDIANTS S2 ---
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

const generateMockAgencies = (): Agency[] => {
  const agencies: Agency[] = [];
  let globalStudentIndex = 0;

  // --- FONCTION DE CRÉATION D'ÉTUDIANT ---
  const createStudent = (name: string, classId: 'A' | 'B'): Student => {
      // 1. Récupération des données S1 (Score & Awards)
      const individualAward = S1_INDIVIDUAL_WINNERS[name];
      const averageS1 = S1_AVERAGES[name] || 10;
      
      // 2. Calcul du Score de départ S2
      // Formule : Base (30) + Performance S1 (Moyenne/20 * 40) + Motivation (20)
      const baseScore = 30;
      const s1Part = (averageS1 / 20) * 40;
      const bonusScore = 20;
      const calculatedScore = Math.round(baseScore + s1Part + bonusScore);

      // 3. Attribution des Badges (Personnels + Historique Groupe)
      const studentBadges: Badge[] = [];

      // A. Badge Individuel (Major, Vice-Major...)
      if (individualAward) {
          const badgeDef = BADGE_DEFINITIONS.find(b => b.id === individualAward.badge);
          if (badgeDef) studentBadges.push(badgeDef);
      }

      // B. Badge Historique Groupe S1 (Or/Argent/Bronze)
      // On vérifie si l'étudiant faisait partie d'une équipe gagnante en S1
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

  // --- LOGIQUE DE RÉPARTITION (CHUNKING) ---
  // On divise les listes d'étudiants en groupes pour former les agences
  const chunkArray = (array: string[], size: number) => {
      const result = [];
      for (let i = 0; i < array.length; i += size) {
          result.push(array.slice(i, i + size));
      }
      return result;
  };

  // Répartition Classe A : 21 élèves / 6 Agences = ~3.5 élèves par agence (mix 3 et 4)
  // On mélange un peu pour l'exemple ou on prend l'ordre alphabétique/liste
  // Ici on prend l'ordre de la liste fournie.
  // 21 élèves divisés en 6 équipes -> On va faire des groupes manuels pour être sûr d'avoir 6 équipes.
  
  // Algorithme de distribution équitable pour avoir exactement 6 équipes
  const distributeStudents = (students: string[], teamCount: number) => {
      const teams: string[][] = Array.from({ length: teamCount }, () => []);
      students.forEach((student, index) => {
          teams[index % teamCount].push(student);
      });
      return teams;
  };

  const teamsA = distributeStudents(STUDENTS_CLASSE_A, 6); // 6 équipes Classe A
  const teamsB = distributeStudents(STUDENTS_CLASSE_B, 6); // 6 équipes Classe B

  // --- CRÉATION DES AGENCES ---

  // Agences 1 à 6 (Classe A)
  teamsA.forEach((membersNames, index) => {
      const agencyNum = index + 1;
      const agencyId = `agency_${agencyNum}`;
      const members = membersNames.map(name => createStudent(name, 'A'));

      agencies.push({
          id: agencyId,
          name: `Agence ${agencyNum}`,
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
          branding: { color: 'indigo' }, // Couleur par défaut Classe A
          badges: []
      });
  });

  // Agences 7 à 12 (Classe B)
  teamsB.forEach((membersNames, index) => {
      const agencyNum = index + 7;
      const agencyId = `agency_${agencyNum}`;
      const members = membersNames.map(name => createStudent(name, 'B'));

      agencies.push({
          id: agencyId,
          name: `Agence ${agencyNum}`,
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
          branding: { color: 'cyan' }, // Couleur par défaut Classe B
          badges: []
      });
  });

  // Agence Chômage (Vide au départ car tous les étudiants sont assignés)
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
