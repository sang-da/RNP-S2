
# 🧠 Data-Driven UI : Le Cerveau de l'Application

Dans une application moderne, l'interface (UI) n'est qu'un **reflet** des données.
Si vous changez la donnée, l'UI *doit* changer toute seule. C'est le principe de la Réactivité.

## 1. La "Single Source of Truth" (Source de Vérité Unique)

L'erreur classique des débutants est d'avoir des données éparpillées.
Dans RNP Manager, nous centralisons tout dans des **Contextes React** (`contexts/GameContext.tsx`).

### Le GameContext
C'est le chef d'orchestre. Il :
1.  Écoute Firebase en temps réel (`onSnapshot`).
2.  Stocke la liste des `agencies`, des `weeks`, etc.
3.  Fournit ces données à n'importe quel bouton ou tableau qui en a besoin.

```typescript
// Exemple simplifié
const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [agencies, setAgencies] = useState([]);

  // Dès qu'on lance l'app, on se branche sur la base de données
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "agencies"), (snapshot) => {
       // Hop, on met à jour les données locales
       setAgencies(snapshot.docs.map(d => d.data()));
    });
    return () => unsubscribe();
  }, []);

  return (
    <GameContext.Provider value={{ agencies }}>
      {children}
    </GameContext.Provider>
  );
};
```

Grâce à cela, si l'Admin clique sur "Ajouter 10 points", il modifie Firebase. Firebase notifie `GameContext`. `GameContext` met à jour `agencies`. L'écran de l'étudiant se redessine. **Tout ça en moins de 100ms.**

## 2. Le Modèle de Données (`types.ts`)

C'est le fichier le plus important du projet. Il définit de quoi on parle.
Regardez comment nous structurons une Agence pour la gamification :

```typescript
export interface Agency {
  id: string;
  name: string;
  
  // Les Stats "Jeu Vidéo"
  ve_current: number; // La barre de vie (0-100)
  budget_real: number; // Le compte en banque
  
  // L'historique (Crucial pour la transparence)
  eventLog: GameEvent[]; 
  
  // Les Membres
  members: Student[];
}
```

## 3. Event-First Design

Au lieu de juste modifier une valeur, nous créons des **Événements**.
Quand une crise arrive, on ne fait pas juste `ve = ve - 10`.
On crée un objet événement :

```json
{
  "type": "CRISIS",
  "label": "Krach Réputation",
  "deltaVE": -15,
  "description": "Perte de confiance suite à une polémique."
}
```

Et on l'ajoute à l'historique (`eventLog`).
Cela permet d'afficher un fil d'actualité ("News Ticker") et un graphique historique (`MarketOverview.tsx`) qui se dessinent tout seuls à partir de ces logs.

## Leçon de Vibe Coding #2 : Types & Contextes

1.  Commencez toujours par définir vos **Types** (`types.ts`). De quelles données ai-je besoin ?
2.  Créez un **Contexte** pour distribuer ces données.
3.  Ensuite seulement, dessinez l'UI.

**Une UI sans structure de données solide est une coquille vide.**
