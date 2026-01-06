
// --- GAME RULES / BALANCING ---
export const GAME_RULES = {
    // REVENUS
    REVENUE_BASE: 1500, // Subvention fixe hebdomadaire
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
};

export const CONSTRAINTS_POOL = {
  space: ["Hall de Gare", "Friche Industrielle", "Parvis Église", "Toit Terrasse", "Parking Souterrain", "Kiosque Abandonné"],
  style: ["Cyberpunk", "Art Déco", "Brutalisme Végétal", "Minimalisme Japonais", "Steampunk", "Bauhaus"],
  client: ["Marque de Luxe", "ONG Humanitaire", "Collectif d'Artistes", "Mairie de Quartier", "Start-up Tech", "Festival de Musique"]
};
