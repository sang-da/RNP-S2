
import { Agency } from '../types';

// --- GAME RULES / BALANCING ---
export const GAME_RULES = {
    // REVENUS
    REVENUE_BASE: 0, // Subvention fixe supprimée (Méritocratie pure)
    REVENUE_VE_MULTIPLIER: 30, // 50 VE = 1500 PiXi de bonus
    
    // DÉPENSES
    SALARY_MULTIPLIER: 10, // Score 80 = 800 PiXi/semaine.
    SALARY_CAP_FOR_STUDENT: 800, // Au delà de 800 (Score 80), l'argent part dans le loyer
    AGENCY_RENT: 500, // Charges fixes hebdomadaires (Loyer)

    // CREATION
    CREATION_COST_PIXI: 2000,
    CREATION_COST_SCORE: 20,

    // PLAFONDS DE VERRE (VE CAPS)
    VE_CAP_1_MEMBER: 60,
    VE_CAP_2_3_MEMBERS: 80,
    VE_CAP_4_PLUS_MEMBERS: 100,

    // UNLOCKS (Semaines d'activation)
    UNLOCK_WEEK_BLACK_OPS: 3,
    UNLOCK_WEEK_MERGERS: 6,

    // BLACK OPS COSTS
    COST_AUDIT: 500, // Cher mais peut rapporter gros (baisse VE adverse)
    COST_LEAK: 300, // Pour voir le brief en avance
    
    // MERGERS
    MERGER_VE_THRESHOLD: 40, // Une agence doit être sous 40 VE pour être rachetée
    MERGER_MAX_MEMBERS: 6, // Impossible de fusionner si total > 6
};

export const CONSTRAINTS_POOL = {
  space: ["Hall de Gare", "Friche Industrielle", "Parvis Église", "Toit Terrasse", "Parking Souterrain", "Kiosque Abandonné"],
  style: ["Cyberpunk", "Art Déco", "Brutalisme Végétal", "Minimalisme Japonais", "Steampunk", "Bauhaus"],
  client: ["Marque de Luxe", "ONG Humanitaire", "Collectif d'Artistes", "Mairie de Quartier", "Start-up Tech", "Festival de Musique"]
};

// --- HELPER FUNCTION: PERFORMANCE MULTIPLIER ---
// Calcule un multiplicateur basé sur la moyenne des scores individuels des membres.
// Pivot à 50/100 = 1.0x
// Range: 0.5x (si score 0) à 1.5x (si score 100)
export const getAgencyPerformanceMultiplier = (agency: Agency): number => {
    if (!agency.members || agency.members.length === 0) return 1;
    
    const totalScore = agency.members.reduce((acc, m) => acc + m.individualScore, 0);
    const avgScore = totalScore / agency.members.length;
    
    // Formule : 1 + ((Moyenne - 50) / 100)
    // Ex: Moyenne 80 -> 1 + (30/100) = 1.3x
    // Ex: Moyenne 40 -> 1 + (-10/100) = 0.9x
    const multiplier = 1 + ((avgScore - 50) / 100);
    
    // Clamp de sécurité (Min 0.5x, Max 1.5x)
    return Math.max(0.5, Math.min(1.5, multiplier));
};
