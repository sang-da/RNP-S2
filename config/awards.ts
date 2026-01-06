
import { Badge, CycleAwardDefinition, CycleType } from '../types';

// --- BADGE DEFINITIONS ---
export const BADGE_DEFINITIONS: Badge[] = [
    { id: 'survivor', label: 'Survivant', description: 'Avoir survécu à une dette critique sans faillite.', icon: 'shield' },
    { id: 'visionary', label: 'Visionnaire', description: '3 rendus consécutifs notés A.', icon: 'eye' },
    { id: 'wealthy', label: 'Licorne', description: 'Avoir dépassé 20 000 PiXi de trésorerie.', icon: 'crown' },
    { id: 'teamwork', label: 'Esprit de Corps', description: 'Moyenne évaluation par pairs > 4.5/5.', icon: 'users' },
    // S1 AWARDS
    { id: 's1_gold', label: 'Or S1', description: 'Major de Promotion Semestre 1', icon: 'medal' },
    { id: 's1_silver', label: 'Argent S1', description: 'Vice-Major de Promotion Semestre 1', icon: 'medal' },
    { id: 's1_bronze', label: 'Bronze S1', description: 'Podium Promotion Semestre 1', icon: 'medal' },
    // GROUP AWARDS
    { id: 's1_gold_group', label: 'Agence Or S1', description: 'Meilleure Agence S1 (+200/sem)', icon: 'crown' },
    { id: 's1_silver_group', label: 'Agence Argent S1', description: 'Top Agence S1 (+150/sem)', icon: 'crown' },
    { id: 's1_bronze_group', label: 'Agence Bronze S1', description: 'Top Agence S1 (+100/sem)', icon: 'crown' },
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

// --- CONFIGURATION DES RÉCOMPENSES S1 ---
// SCORE LOGIC: BASE (30) + S1 (40/35/30/20) + BONUS (20)
export const S1_INDIVIDUAL_WINNERS: Record<string, { amount: number, badge: string, s1Score: number }> = {
    // CLASSE A
    "Maëlys": { amount: 1000, badge: 's1_gold', s1Score: 40 },
    "Marie-Trinité": { amount: 750, badge: 's1_silver', s1Score: 35 },
    "Sarah": { amount: 500, badge: 's1_bronze', s1Score: 30 },
    // CLASSE B
    "Loïs": { amount: 1000, badge: 's1_gold', s1Score: 40 },
    "Esther": { amount: 750, badge: 's1_silver', s1Score: 35 },
    "Coralie": { amount: 500, badge: 's1_bronze', s1Score: 30 }
};

export const S1_GROUP_BONUSES: Record<string, number> = {
    'agency_gold': 200,   // Or
    'agency_silver': 150, // Argent
    'agency_bronze': 100  // Bronze
};
