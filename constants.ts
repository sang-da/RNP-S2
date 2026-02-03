
import { TrendingUp, Eye, Vote, FileX, Skull, Zap } from 'lucide-react';

export * from './config/assets';
export * from './config/rules';
export * from './config/awards';
export * from './config/weeks';
export * from './config/teams';
export * from './config/manuels';

export const BLACK_MARKET_ITEMS = [
    { 
        id: 'SHORT_SELL', 
        label: 'Short Selling', 
        price: 500, 
        icon: TrendingUp, 
        desc: "Parier sur la chute d'une agence. Si elle perd de la VE au prochain bilan, vous gagnez 1000 PiXi.",
        requiresTarget: true,
        category: 'FINANCE'
    },
    { 
        id: 'DOXXING', 
        label: 'Doxxing RH', 
        price: 600, 
        icon: Eye, 
        desc: "Révèle l'identité des auteurs de mauvaises notes (< 3/5) dans votre agence cette semaine.",
        requiresTarget: false,
        category: 'INTEL' 
    },
    { 
        id: 'FAKE_CERT', 
        label: 'Faux Certificat', 
        price: 500, 
        icon: FileX, 
        desc: "Efface rétroactivement un retard noté sur un livrable. Risque de détection: 20%.",
        requiresTarget: false,
        category: 'CHEAT' 
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
    { 
        id: 'BUY_VOTE', 
        label: 'Bourrage d\'Urne', 
        price: 200, 
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
