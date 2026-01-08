
import { Book, Wallet, Building2, Users, Briefcase, Box, Calculator, Eye, Handshake } from 'lucide-react';

export const GAME_MANUALS = [
    {
        id: 'm01',
        title: '01. La Matrice',
        subtitle: 'Concept & Philosophie',
        icon: Book,
        color: 'text-indigo-500',
        content: `
# 0. Préambule
Oubliez le lycée. Oubliez le format "Professeur vs Élève".
Vous entrez dans le **RNP Studio Simulator**.

*   **L'enseignant** devient un **Client / Investisseur**. Il a de l'argent et des exigences.
*   **L'étudiant** devient un **Associé**. Il a des compétences et des parts de marché.
*   **Le Groupe** devient une **Agence**. Elle a une identité juridique et bancaire.

L'objectif n'est pas d'avoir 20/20. L'objectif est de **survivre économiquement** et de **dominer le marché**.

# 1. La Double Notation
Votre semestre sera validé par deux notes distinctes :

### A. La Note "Performance Agence" (60%)
*   **60% : La VE (Valeur d'Entreprise)**. C'est votre "cours de bourse".
*   **30% : Le Projet Final**. Qualité artistique et technique.
*   **10% : La Trésorerie**. Une entreprise riche est une entreprise bien gérée.

### B. La Note "Performance Associé" (40%)
*   **50% : Le Score Individuel**. Votre "niveau" RPG (0-100).
*   **30% : Le Projet Final**. (Solidarité).
*   **20% : Le Wealth (Richesse Perso)**. Vos salaires économisés.

# 2. Les 3 Piliers de la Survie
1.  **La VE (Réputation)** : Si 0, crédibilité nulle.
2.  **Le Cash (Oxygène)** : Si **-5000 PiXi**, c'est la **LIQUIDATION JUDICIAIRE**. Game Over.
3.  **Le Temps (Deadline)** : Retard = Perte de VE (-5 pts/jour).
`
    },
    {
        id: 'm02',
        title: '02. Votre Argent',
        subtitle: 'Finances Personnelles',
        icon: Wallet,
        color: 'text-emerald-500',
        content: `
# 1. Le Wallet Personnel
Cet argent vous appartient.

### Entrées (Gains)
*   **Salaire Hebdomadaire** : Versé chaque Lundi.
    *   Formule : **Score Individuel x 10**
    *   Exemple : Score 65 = **650 PiXi**.
*   **Bonus** : Primes exceptionnelles (MVP).

### Sorties (Dépenses)
*   **Coût de la Vie** : **-200 PiXi / semaine** (Automatique).
*   **Achats Boutique** : Acheter des points de score ou des délais.
*   **Investissement** : Sauver votre agence de la faillite.

# 2. L'Insolvabilité (Découvert)
Si votre Wallet passe en négatif (< 0) :
1.  **Malus de Score :** -5 points par semaine (Stress financier).
2.  **Restrictions :** Plus d'achats, plus de fondation de studio possible.

# 3. Stratégie
L'argent compte pour 20% de votre note.
Mais attention : Mieux vaut sacrifier 1000 PiXi pour sauver l'agence de la faillite que de garder ses économies et avoir 0 au semestre.
`
    },
    {
        id: 'm03',
        title: '03. L\'Entreprise',
        subtitle: 'Gestion & Faillite',
        icon: Building2,
        color: 'text-slate-500',
        content: `
# 1. Revenus (Chiffre d'Affaires)
Facturation automatique chaque semaine.
*   **Formule** : (VE Actuelle x 30) + Revenus Récurrents (Prix).
*   Exemple : 50 VE = **1500 PiXi / sem**.

# 2. Charges (Dépenses)
Ordre de prélèvement strict :
1.  **Loyer Studio** : **500 PiXi** (Fixe).
2.  **Salaires** : Somme des coûts des membres.

# 3. La Zone Rouge
*   **Dette (0 à -4999)** :
    *   Gel des Salaires (Vous ne touchez plus rien).
    *   Saisie sur compte personnel (Clause de solidarité pour payer le loyer).
*   **LIQUIDATION (-5000)** :
    *   Fermeture immédiate.
    *   Licenciement de tous les membres.
    *   VE reset à 0.
`
    },
    {
        id: 'm04',
        title: '04. Système RH',
        subtitle: 'Scores & Équipe',
        icon: Users,
        color: 'text-purple-500',
        content: `
# 1. Évaluation par les Pairs
Chaque semaine, notez vos collègues (Assiduité, Qualité, Implication).
Votre **Score Individuel** en dépend :
*   Moyenne > 4.5 : **+2 Points** (Bonus).
*   Moyenne < 2.0 : **-5 Points** (Sanction).

# 2. Le Licenciement (Fire)
Vous pouvez vous séparer d'un membre s'il nuit au groupe.
*   Vote requis : **75% de OUI**.
*   Coût : L'agence paie une indemnité en VE (Perte de compétence).

# 3. Le MVP (Most Valuable Player)
Sur chaque rendu noté **A**, l'enseignant désigne un MVP.
*   Gain : **+5 Points de Score** immédiats.
`
    },
    {
        id: 'm05',
        title: '05. Mercato',
        subtitle: 'Carrière & Recrutement',
        icon: Briefcase,
        color: 'text-blue-500',
        content: `
# 1. Le Vivier (Disponibilité)
Zone de départ pour les étudiants sans agence. Revenus = 0. Coût de la vie = -200.
Sortez-en vite.

# 2. Recrutement (Hire)
*   Postulez via l'onglet "Recrutement".
*   L'agence vote. Il faut **66% de OUI** pour intégrer un nouveau.

# 3. Fonder un Studio
*   Coût : **2000 PiXi** (Apport personnel).
*   Condition : Être dans le Vivier.
*   Risque : Démarrer seul est dangereux (Loyer 500 vs Revenus faibles). Recrutez vite !
`
    },
    {
        id: 'm06',
        title: '06. Production',
        subtitle: 'Fichiers & Rendus',
        icon: Box,
        color: 'text-amber-500',
        content: `
# 1. Nomenclature (STRICT)
Tout fichier mal nommé est **NON RENDU**.
*   Format : \`GROUPE_SEMxx_Type_vxx.ext\`
*   Ex : \`AGENCE-ALPHA_SEM03_Video_v01.mp4\`

# 2. Checklist Qualité
Avant d'upload :
1.  Bonne extension (.mp4 h264, .pdf).
2.  Poids < 50 Mo (sauf final).
3.  Upload avant l'heure exacte.

# 3. Le Rejet
Fichier corrompu ou hors-sujet = **0 VE**.
Vous devrez re-livrer avec une pénalité de retard.
`
    },
    {
        id: 'm07',
        title: '07. Notation',
        subtitle: 'Algorithme VE',
        icon: Calculator,
        color: 'text-cyan-500',
        content: `
# 1. Impact Brut
*   **A (Game Changer)** : **+10 VE**
*   **B (Standard)** : **+4 VE**
*   **C (Rejet)** : **0 VE**

# 2. Multiplicateur d'Équipe
Votre "Team Multiplier" dépend de la moyenne des Scores de vos membres.
*   Agence d'Élite (Moyenne 90) : x1.4 (Un A rapporte +14 VE).
*   Agence en Difficulté (Moyenne 20) : x0.7 (Un A rapporte +7 VE).

> **Stratégie :** Aidez vos collègues à monter leur score, sinon ils ralentissent la croissance de l'agence.
`
    },
    {
        id: 'm08',
        title: '08. Stratégie',
        subtitle: 'Opérations Spéciales',
        icon: Eye,
        color: 'text-red-500',
        content: `
# 1. Information (Leak)
*   Coût : **300 PiXi**.
*   Gain : Indice sur le Brief de la semaine prochaine.

# 2. Audit Externe (Action Offensive)
*   Coût : **500 PiXi**.
*   Ciblez une agence concurrente pour vérifier sa conformité.
    *   Si la cible est **Fragile** (VE < 40 ou Dette) : Le rapport révèle les failles (**-10 VE** pour eux).
    *   Si la cible est **Saine** : L'audit ne donne rien (**-20 VE** pour VOUS pour procédure abusive).

N'attaquez que si vous êtes sûr de votre coup.
`
    },
    {
        id: 'm09',
        title: '09. Fusions',
        subtitle: 'M&A',
        icon: Handshake,
        color: 'text-pink-500',
        content: `
# 1. La Cible
Une agence ne peut être rachetée que si elle est en position de faiblesse (**VE < 40**).

# 2. L'Offre
Une agence saine peut proposer une absorption.
*   Tous les membres sont transférés.
*   Toute la trésorerie (et la dette !) est transférée.
*   L'agence cible est dissoute.

# 3. Règle des 6
Interdiction de créer une super-agence de plus de **6 membres**.
`
    }
];
