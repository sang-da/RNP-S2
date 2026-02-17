
import { 
    LayoutDashboard, PieChart, Landmark, Contact, Medal, HeartHandshake, 
    TrendingUp, Bot, KeyRound, CalendarRange, Users, Briefcase, Flame, 
    EyeOff, FolderOpen, MonitorPlay, Settings, ShoppingBag
} from 'lucide-react';

export const ADMIN_MENU_STRUCTURE = [
    {
        title: "Pilotage & Simulation",
        items: [
            { id: 'OVERVIEW', label: 'Vue Globale', icon: LayoutDashboard },
            { id: 'VIEWS', label: 'Simulateur & Vues', icon: MonitorPlay },
            { id: 'RESOURCES', label: 'Ressources & Wiki', icon: FolderOpen },
        ]
    },
    {
        title: "Gestion Projets",
        items: [
            { id: 'PROJECTS', label: 'Suivi Projets', icon: Briefcase },
            { id: 'SCHEDULE', label: 'Calendrier & Cycles', icon: CalendarRange },
            { id: 'CRISIS', label: 'Zone de Crise', icon: Flame },
            { id: 'AI_ASSISTANT', label: 'Co-Pilote IA', icon: Bot },
        ]
    },
    {
        title: "Finance & RH",
        items: [
            { id: 'MARKET', label: 'Marché Live', icon: TrendingUp },
            { id: 'BANK', label: 'Banque Centrale', icon: Landmark },
            { id: 'STUDENT_TRACKER', label: 'Dossiers Étudiants', icon: Contact },
            { id: 'BADGES', label: 'Salle des Trophées', icon: Medal },
            { id: 'PEER_REVIEWS', label: 'Bilans & Feedbacks', icon: HeartHandshake },
            { id: 'MERCATO', label: 'Mercato RH', icon: Users },
        ]
    },
    {
        title: "Système & Outils",
        items: [
            { id: 'ANALYTICS', label: 'Data Analytics', icon: PieChart },
            { id: 'ACCESS', label: 'Accès & Comptes', icon: KeyRound },
            { id: 'BLACK_MARKET', label: 'Market Control', icon: EyeOff },
            { id: 'SETTINGS', label: 'Paramètres', icon: Settings },
        ]
    }
];
