
import { TrendingUp, Eye, Vote, FileX, Skull, Zap, Dices, Cpu, Ghost, Database, Banknote, Activity, FileWarning, ArrowUpRight } from 'lucide-react';

export * from './config/assets';
export * from './config/rules';
export * from './config/awards';
export * from './config/weeks';
export * from './config/teams';
export * from './config/manuels';

export const BLACK_MARKET_ITEMS = [
    // --- INTEL & DATA ---
    { 
        id: 'DATA_MINER', 
        label: 'Deep Dive Audit', 
        price: 600, 
        icon: Database, 
        desc: "Rapport complet sur une agence : Trésorerie réelle, Burn Rate (semaines de survie), et tensions RH internes.",
        requiresTarget: true,
        category: 'INTEL' 
    },
    { 
        id: 'DOXXING', 
        label: 'Doxxing RH', 
        price: 500, 
        icon: Eye, 
        desc: "Révèle l'identité des auteurs de mauvaises notes (< 3/5) dans votre agence.",
        requiresTarget: false,
        category: 'INTEL' 
    },
    { 
        id: 'LEAK', 
        label: 'Fuite Industrielle', 
        price: 300, 
        icon: Zap, 
        desc: "Obtenir un indice sur le prochain brief avant tout le monde (Notif Admin).",
        requiresTarget: false,
        category: 'INTEL' 
    },

    // --- MANIPULATION & FINANCE ---
    { 
        id: 'PUMP_DUMP', 
        label: 'Pump & Dump', 
        price: 800, 
        icon: TrendingUp, 
        desc: "Manipulation de marché. La cible gagne +5 VE immédiatement, mais subira un Krach de -12 VE la semaine prochaine.",
        requiresTarget: true,
        category: 'ATTACK'
    },
    { 
        id: 'LAUNDERING', 
        label: 'Consulting Fantôme', 
        price: 200, // Coût transaction
        icon: Banknote, 
        desc: "Vendez votre réputation. Echangez 3 points de votre Score contre 1000 PiXi (Cash) immédiatement.",
        requiresTarget: false,
        category: 'FINANCE' 
    },
    { 
        id: 'SHORT_SELL', 
        label: 'Short Selling', 
        price: 500, 
        icon: ArrowUpRight, 
        desc: "Parier sur la chute d'une agence. Si elle perd de la VE au prochain bilan, vous gagnez 1200 PiXi.",
        requiresTarget: true,
        category: 'FINANCE'
    },

    // --- RISQUE & TRICHE ---
    { 
        id: 'CORRUPTED_FILE', 
        label: 'Fichier Corrompu', 
        price: 400, 
        icon: FileWarning, 
        desc: "Simule un bug d'upload pour un rendu manquant. 40% chance d'avoir un délai (B), 60% d'avoir 0 + Blâme.",
        requiresTarget: false,
        category: 'CHEAT' 
    },
    { 
        id: 'BUY_VOTE', 
        label: 'Bourrage d\'Urne', 
        price: 250, 
        icon: Vote, 
        desc: "Ajoute un vote 'APPROVE' fantôme sur une demande Mercato active.",
        requiresTarget: true,
        category: 'CHEAT' 
    },
    { 
        id: 'AUDIT_HOSTILE', 
        label: 'Audit Hostile', 
        price: 500, 
        icon: Skull, 
        desc: "Attaque la crédibilité d'une agence adverse fragile. (-10 VE si succès).",
        requiresTarget: true,
        category: 'ATTACK' 
    }
];
