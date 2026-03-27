
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

    // COÛT DE LA VIE & TAXES (NOUVEAU)
    COST_OF_LIVING: 200, // Déduit chaque semaine du portefeuille étudiant
    INJECTION_TAX: 0.20, // 20% de l'argent injecté disparait (Frais de dossier/Transac)
    POVERTY_SCORE_PENALTY: 5, // Malus de score si l'étudiant est à découvert (< 0 PiXi)

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

    // BANKRUPTCY
    BANKRUPTCY_THRESHOLD: -5000, // Seuil de faillite définitive
    BANKRUPTCY_THRESHOLD_HOLDING: -15000, // Seuil de faillite pour les Holdings

    // SEUILS DE VOTE (VOTING THRESHOLDS)
    VOTE_THRESHOLD_HIRE: 0.66, // 66% pour recruter
    VOTE_THRESHOLD_FIRE: 0.75, // 75% pour virer
    VOTE_THRESHOLD_CHALLENGE: 0.50, // 50% pour accepter une mission
};

export const HOLDING_RULES = {
    MIN_MEMBERS: 6, // Taille pour devenir Holding
    REVENUE_MULTIPLIER_STANDARD: 50, // 1 VE = 50 PiXi
    REVENUE_MULTIPLIER_PERFORMANCE: 70, // 1 VE = 70 PiXi (si croissance > 10)
    GROWTH_TARGET: 5, // +5 VE/semaine requis
    GROWTH_TARGET_BONUS: 10, // +10 VE/semaine pour bonus performance
    
    // EJECTABLE SEAT
    WEEKS_WITHOUT_MVP_LIMIT: 2, // Max semaines sans être MVP avant licenciement
    
    // BUYOUTS
    BUYOUT_VULTURE_THRESHOLD: -3000, // Budget < -3000 = Rachat forcé
    BUYOUT_FRIENDLY_VE_THRESHOLD: 60, // VE < 60 = Rachat amical possible
    
    // DIVIDENDS
    DIVIDEND_RATE_LOW: 0.05, // 5% si VE < 60
    DIVIDEND_RATE_MID: 0.10, // 10% si VE 60-80
    DIVIDEND_RATE_HIGH: 0.15, // 15% si VE > 80
    DIVIDEND_PERCENTAGE_SENIOR: 0.05, // 5% pour les seniors
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
    
    // Filtrage robuste pour éviter les crashs sur des membres "undefined"
    const validMembers = agency.members.filter(m => m && typeof m.individualScore === 'number');
    if (validMembers.length === 0) return 1;

    const totalScore = validMembers.reduce((acc, m) => acc + m.individualScore, 0);
    const avgScore = totalScore / validMembers.length;
    
    // Formule : 1 + ((Moyenne - 50) / 100)
    // Ex: Moyenne 80 -> 1 + (30/100) = 1.3x
    // Ex: Moyenne 40 -> 1 + (-10/100) = 0.9x
    const multiplier = 1 + ((avgScore - 50) / 100);
    
    // Clamp de sécurité (Min 0.5x, Max 1.5x)
    return Math.max(0.5, Math.min(1.5, multiplier));
};

// --- HELPER FUNCTION: VE CAP CALCULATOR ---
// Détermine le plafond de VE d'une agence en fonction de sa taille.
// PRIORITY : Manual Override > Founding Agency Rule > Standard Rules
export const calculateVECap = (agency: Agency): number => {
    // 1. Manual Override (The "God Mode")
    if (agency.veCapOverride !== undefined && agency.veCapOverride !== null && !isNaN(agency.veCapOverride)) {
        return agency.veCapOverride;
    }

    // 2. Comptage Robuste
    // On s'assure de ne pas compter des "slots" vides ou des objets mal formés
    const validMembers = agency.members ? agency.members.filter(m => m && m.id) : [];
    const memberCount = validMembers.length;

    // 3. Détection Agence Fondatrice (Legacy S1) ou Agence créée manuellement très tôt
    const isFoundingAgency = agency.id.startsWith('agency_');

    if (memberCount >= 4) return GAME_RULES.VE_CAP_4_PLUS_MEMBERS; // 100
    
    if (memberCount >= 2) return GAME_RULES.VE_CAP_2_3_MEMBERS; // 80 (Couvre 2 et 3)

    if (memberCount === 1) {
        // Si c'est un fondateur historique, pas de plafond "Solo" (100).
        // Sinon, plafond standard "Solo" (60) pour inciter au recrutement.
        return isFoundingAgency ? 100 : GAME_RULES.VE_CAP_1_MEMBER;
    }
    
    // Fallback si 0 membres
    return GAME_RULES.VE_CAP_1_MEMBER;
};

// --- HELPER FUNCTION: MARKET VE CALCULATOR ---
// Calcule la VE "Réelle" (Marché) en sommant tout l'historique, sans plafond.
export const calculateMarketVE = (agency: Agency): number => {
    if (!agency.eventLog) return 0;
    const STARTING_VE = 0;
    const marketVE = agency.eventLog.reduce((sum, e) => sum + (e.deltaVE || 0), STARTING_VE);
    return Math.max(0, marketVE);
};

// --- HELPER FUNCTION: VE SHIELD LOGIC ---
// Applique la logique de bouclier : la VE Marché protège la VE actuelle.
export const applyVEShield = (currentVE: number, veAdjustment: number, marketVE: number, veCap: number): number => {
    const newMarketVE = marketVE + veAdjustment;
    let finalVE = currentVE;

    if (currentVE > veCap) {
        // Cas Surplus (ex: Bonus exceptionnel)
        if (veAdjustment > 0) {
            finalVE = currentVE; // Pas de croissance organique au-delà du surplus
        } else {
            // On réduit le surplus, mais on ne descend pas sous le Cap tant que le Marché est haut
            const potentialWithLoss = currentVE + veAdjustment;
            finalVE = Math.max(veCap, potentialWithLoss);
            // Sécurité : si le marché s'effondre vraiment sous le Cap
            if (newMarketVE < finalVE) {
                finalVE = Math.max(0, newMarketVE);
            }
        }
    } else {
        // Cas Standard (sous ou au Cap)
        if (veAdjustment > 0) {
            // Croissance organique limitée par le Cap
            finalVE = Math.min(veCap, currentVE + veAdjustment);
            // On s'assure de ne pas dépasser la VE réelle (si anomalie)
            finalVE = Math.min(finalVE, Math.max(0, newMarketVE));
        } else {
            // Perte organique : LE BOUCLIER
            if (newMarketVE >= veCap) {
                finalVE = veCap; // Le surplus de VE Marché absorbe le choc
            } else {
                finalVE = Math.max(0, newMarketVE); // Plus de bouclier, on tombe
            }
        }
    }

    // Correction automatique : si une agence a une VE actuelle < Cap alors que son Marché est > Cap
    if (finalVE < veCap && newMarketVE >= veCap) {
        finalVE = veCap;
    }

    return finalVE;
};
