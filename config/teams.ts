
import { Agency, CycleType, GameEvent, Student, Badge } from '../types';
import { BADGE_DEFINITIONS, S1_INDIVIDUAL_WINNERS, S1_GROUP_BONUSES } from './awards';
import { INITIAL_WEEKS } from './weeks';
import { GAME_RULES } from './rules';

// --- CONFIGURATION DES ÉQUIPES ACTIVES ---
// Reconfiguré pour matcher les groupes gagnants du S1
const TEAMS_CONFIG = [
    {
        id: 'agency_gold',
        name: 'Agence Alpha (Or S1)',
        classId: 'A' as const, // Mixte en réalité, assigné A par défaut
        members: ["Zirwath", "Aubine", "Maëlys", "Tiffany", "Roxane"]
    },
    {
        id: 'agency_silver',
        name: 'Agence Beta (Argent S1)',
        classId: 'B' as const,
        members: ["Rayane", "Erudice", "Pascal", "Jennifer"]
    },
    {
        id: 'agency_bronze',
        name: 'Agence Gamma (Bronze S1)',
        classId: 'B' as const,
        members: ["Tryphose", "Sarah", "Grâce", "Stessy"]
    },
    {
        id: 'agency_allstars',
        name: 'Agence Delta',
        classId: 'A' as const,
        members: ["Marie-Trinité", "Loïs", "Esther", "Coralie"] // Regroupement des individuels restants
    },
    {
        id: 'agency_5',
        name: 'Agence Epsilon',
        classId: 'A' as const,
        members: ["Kassandra", "Jessica", "Ronelle", "Gloria"]
    },
    {
        id: 'agency_6',
        name: 'Agence Zeta',
        classId: 'A' as const,
        members: ["Lydia", "Korell", "Shaneen"]
    },
    {
        id: 'agency_7',
        name: 'Agence Eta',
        classId: 'B' as const,
        members: ["Ruth-De-Franck", "Vianney", "Elicia", "Brunelle"]
    },
    {
        id: 'agency_8',
        name: 'Agence Theta',
        classId: 'B' as const,
        members: ["Mira", "Ashley", "Ian", "Emeraude"]
    }
];

// --- POOL DE CHÔMAGE (Le reste des étudiants) ---
const UNASSIGNED_POOL = [
    "Pascal", "Rolyx", "Noriane", "Lidwine", "Iris", // Reste A
    "Faghez", "Ghintia", "Achabys", "Duamel", "Lindsay" // Reste B
];

const generateMockAgencies = (): Agency[] => {
  const agencies: Agency[] = [];
  let globalStudentIndex = 0;

  const createMembers = (names: string[], classId: 'A' | 'B', teamId?: string): Student[] => {
    return names.map((name) => {
      // Check for Individual Awards
      const award = S1_INDIVIDUAL_WINNERS[name];
      
      // FORMULE DE SCORE CORRIGÉE : SMIG (30) + BONUS (20) + 0 (Moyenne S1 non fournie)
      const baseScore = 30; // SMIG
      const s1Score = 0;    // Moyenne S1 (Non fournie pour l'instant)
      const bonusScore = 20; // Bonus de départ
      const calculatedScore = baseScore + s1Score + bonusScore;

      // BADGES
      const studentBadges: Badge[] = [];
      
      // 1. Badge Individuel (Solo)
      if (award) {
          const badgeDef = BADGE_DEFINITIONS.find(b => b.id === award.badge);
          if (badgeDef) studentBadges.push(badgeDef);
      }

      // 2. Badge de Groupe (Team)
      // On attribue le badge de groupe directement à l'étudiant pour qu'il s'affiche sur son profil
      if (teamId === 'agency_gold') {
          const groupBadge = BADGE_DEFINITIONS.find(b => b.id === 's1_gold_group');
          if (groupBadge) studentBadges.push(groupBadge);
      } else if (teamId === 'agency_silver') {
          const groupBadge = BADGE_DEFINITIONS.find(b => b.id === 's1_silver_group');
          if (groupBadge) studentBadges.push(groupBadge);
      } else if (teamId === 'agency_bronze') {
          const groupBadge = BADGE_DEFINITIONS.find(b => b.id === 's1_bronze_group');
          if (groupBadge) studentBadges.push(groupBadge);
      }

      return {
        id: `s-${globalStudentIndex++}`,
        name: name,
        role: 'Associé',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(' ', '')}`,
        individualScore: calculatedScore,
        wallet: award ? award.amount : 0, // INJECTION CASH PRIZE
        classId: classId,
        connectionStatus: 'offline',
        badges: studentBadges, // ASSIGNATION BADGES (Solo + Groupe)
        history: award ? [{
            date: "2024-02-01",
            agencyId: "system",
            agencyName: "RNP Awards",
            action: "JOINED",
            contextVE: 0,
            contextBudget: 0,
            reason: `Prix S1 ${award.badge.includes('gold') ? 'OR' : award.badge.includes('silver') ? 'ARGENT' : 'BRONZE'} (+${award.amount} PiXi)`
        }] : []
      };
    });
  };

  // Generate Agencies from TEAMS_CONFIG
  TEAMS_CONFIG.forEach(team => {
      // Pass team.id to createMembers to assign Group Badges to students
      const members = createMembers(team.members, team.classId, team.id);
      
      // Check for Group Awards (Revenue Bonus)
      const revenueBonus = S1_GROUP_BONUSES[team.id] || 0;
      
      // Add Group Badge to Agency (Cosmetic for the agency card)
      const agencyBadges: Badge[] = [];
      if (team.id === 'agency_gold') agencyBadges.push(BADGE_DEFINITIONS.find(b => b.id === 's1_gold_group')!);
      if (team.id === 'agency_silver') agencyBadges.push(BADGE_DEFINITIONS.find(b => b.id === 's1_silver_group')!);
      if (team.id === 'agency_bronze') agencyBadges.push(BADGE_DEFINITIONS.find(b => b.id === 's1_bronze_group')!);

      agencies.push({
          id: team.id,
          name: team.name,
          tagline: revenueBonus > 0 ? "Lauréat S1 - Excellence RNP" : "En attente de définition...",
          ve_current: revenueBonus > 0 ? 60 : 50, // Bonus start VE for winners
          status: 'stable',
          classId: team.classId,
          budget_real: 0,
          budget_valued: 0,
          weeklyTax: 0,
          weeklyRevenueModifier: revenueBonus, // INJECTION REVENU RÉCURRENT
          eventLog: [
             { id: `e-${team.id}-1`, date: "2024-02-01", type: "INFO", label: "Création Agence", deltaVE: 0, description: "Ouverture du compte PiXi (0)." },
             ...(revenueBonus > 0 ? [{ id: `e-${team.id}-2`, date: "2024-02-01", type: "INFO", label: "Bonus S1", deltaVE: 10, description: `Bonus récurrent activé: +${revenueBonus} PiXi/sem.` } as GameEvent] : [])
          ],
          members: members,
          peerReviews: [],
          currentCycle: CycleType.MARQUE_BRIEF,
          projectDef: { problem: "", target: "", location: "", gesture: "", isLocked: false },
          mercatoRequests: [],
          constraints: { space: "", style: "", client: "" },
          progress: JSON.parse(JSON.stringify(INITIAL_WEEKS)),
          branding: { color: revenueBonus > 0 ? 'amber' : 'indigo' },
          badges: agencyBadges.filter(Boolean)
      });
  });

  // Add the "Unassigned" Agency
  const unassignedMembers = createMembers(UNASSIGNED_POOL, 'A'); // Default class A for pool, mixed later
  // Fix classIds for pool
  unassignedMembers.forEach(m => {
      if (['Stessy', 'Zirwath', 'Coralie', 'Faghez', 'Tryphose', 'Ghintia', 'Achabys', 'Duamel', 'Erudice', 'Lindsay'].includes(m.name)) {
          m.classId = 'B';
      }
  });

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
      members: unassignedMembers,
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
