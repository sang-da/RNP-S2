
import { Badge, CycleAwardDefinition, CycleType } from '../types';

// --- BADGE DEFINITIONS ---
export const BADGE_DEFINITIONS: Badge[] = [
    // PERFORMANCE
    { 
        id: 'legend_100', 
        label: 'Légende', 
        description: 'Première Agence à atteindre 100 VE. Le plafond de verre est brisé.', 
        icon: 'crown',
        rewards: { ve: 15, budget: 1000 } 
    },
    { 
        id: 'wealthy', 
        label: 'Licorne', 
        description: 'Avoir dépassé 20 000 PiXi de trésorerie.', 
        icon: 'trending-up',
        rewards: { score: 5 } // Bonus Score pour chaque membre
    },
    { 
        id: 'survivor', 
        label: 'Survivant', 
        description: 'Avoir survécu à une dette critique sans faillite.', 
        icon: 'shield',
        rewards: { score: 2 } 
    },
    
    // SKILLS
    { 
        id: 'visionary', 
        label: 'Visionnaire', 
        description: '3 rendus consécutifs notés A.', 
        icon: 'eye',
        rewards: { score: 5, wallet: 500 }
    },
    { 
        id: 'teamwork', 
        label: 'Esprit de Corps', 
        description: 'Moyenne évaluation par pairs > 4.5/5.', 
        icon: 'users',
        rewards: { score: 5 }
    },
    { 
        id: 'tech_wizard', 
        label: 'Tech Lead', // RENAMED FROM SORCIER
        description: 'MVP Technique désigné sur un rendu complexe.', 
        icon: 'zap',
        rewards: { score: 5, wallet: 250 }
    },

    // S1 AWARDS (HISTORIQUE - Pas de rewards auto car déjà donnés au S1)
    { id: 's1_gold', label: 'Or S1', description: 'Major de Promotion Semestre 1', icon: 'medal' },
    { id: 's1_silver', label: 'Argent S1', description: 'Vice-Major de Promotion Semestre 1', icon: 'medal' },
    { id: 's1_bronze', label: 'Bronze S1', description: 'Podium Promotion Semestre 1', icon: 'medal' },
    
    // GROUP AWARDS
    { id: 's1_gold_group', label: 'Agence Or S1', description: 'Meilleure Agence S1 (+200/sem)', icon: 'star' },
    { id: 's1_silver_group', label: 'Agence Argent S1', description: 'Top Agence S1 (+150/sem)', icon: 'star' },
    { id: 's1_bronze_group', label: 'Agence Bronze S1', description: 'Top Agence S1 (+100/sem)', icon: 'star' },
];

// --- GRANDS PRIX CYCLES ---
export const CYCLE_AWARDS: CycleAwardDefinition[] = [
    {
        id: 'award_c1',
        cycleId: CycleType.MARQUE_BRIEF,
        title: 'Le "Golden Brief"',
        description: 'La meilleure cohérence stratégique (Problème / Cible / Identité).',
        veBonus: 15,
        weeklyBonus: 250, 
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

// --- MOYENNES S1 (REAL DATA - SOURCE OF TRUTH) ---
// Format: Nom Exact -> Moyenne / 20
export const S1_AVERAGES: Record<string, number> = {
    // CLASSE A
    "Marie-Trinité": 14.97,
    "Jessica": 13.04,
    "Lydia": 10.07,
    "Ronelle": 9.17,
    "Tiffany": 14.95,
    "Ian": 11.74,
    "Kassandra": 11.96,
    "Aubine": 14.25,
    "Lidwine": 11.68,
    "Sarah": 13.39,
    "Maëlys": 15.44,
    "Rebecca": 13.84,
    "Rolyx": 13.16,
    "Emeraude": 7.1,
    "Shaneen": 12.2,
    "Noriane": 13.16,
    "Pascal": 11.77,
    "Roxane": 12.35,
    "Loan": 10.78,
    "Korell": 11.8,
    "Iris": 11.06,

    // CLASSE B
    "Tryphose": 11.9,
    "Vianney": 12.39,
    "Esther": 9.3,
    "Achabys": 11.54,
    "Zirwath": 13.95,
    "Elicia": 7.38,
    "Loïs": 14.97,
    "Coralie": 14.29,
    "Ruth": 13.49,
    "Lindsay": 11.96,
    "Ghintia": 12.53,
    "Rayane": 15.28,
    "Ashley": 11.9,
    "Faghez": 8.88,
    "Erudice": 13.68,
    "Myra": 8.25,
    "Brunelle": 8.9,
    "Stessy": 12.09,
    "Duamel": 14.67,
    "Grâce": 6.7,
    "Jennifer": 12.97
};

// --- CONFIGURATION DES RÉCOMPENSES S1 (WINNERS) ---
// Basé sur les moyennes ci-dessus
export const S1_INDIVIDUAL_WINNERS: Record<string, { amount: number, badge: string }> = {
    // CLASSE A
    "Maëlys": { amount: 1000, badge: 's1_gold' },
    "Marie-Trinité": { amount: 750, badge: 's1_silver' },
    "Sarah": { amount: 500, badge: 's1_bronze' },
    
    // CLASSE B
    "Loïs": { amount: 1000, badge: 's1_gold' }, 
    "Esther": { amount: 750, badge: 's1_silver' },
    "Coralie": { amount: 500, badge: 's1_bronze' }
};

export const S1_GROUP_BONUSES: Record<string, number> = {
    'agency_gold': 200,   // Or
    'agency_silver': 150, // Argent
    'agency_bronze': 100  // Bronze
};
